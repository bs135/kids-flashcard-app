import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';
import db, { initDatabase } from './db/schema.js';
import { generateVocabularyData } from './services/geminiService.js';
import { downloadAndConvertKidImage } from './services/imageService.js';
import { downloadWordAudio } from './services/edgeTtsService.js';
import { slugify } from './utils/slugify.js';
import { getMediaPath } from './utils/mediaPath.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database Schema
initDatabase();

// ----------------------------------------------------
// FEATURE FLAGS & RATE LIMITING CONFIGURATION
// ----------------------------------------------------
// IMAGE_AI_GENERATE_ENABLE: Defaults to false
const isImageAiEnabled = () => process.env.IMAGE_AI_GENERATE_ENABLE === 'true';

// FLASHCARD_GENERATE_ENABLE: Defaults to true
const isFlashcardAiEnabled = () => process.env.FLASHCARD_GENERATE_ENABLE !== 'false';

// FLASHCARD_GENERATE_RATE_LIMIT: Defaults to 5 (0 = unlimited)
const getFlashcardRateLimit = () => {
  const val = parseInt(process.env.FLASHCARD_GENERATE_RATE_LIMIT, 10);
  return isNaN(val) ? 5 : val;
};

// In-memory rate limiting map: ip -> { count: number, resetTime: number }
// Resets every 24 hours
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function getClientIp(request) {
  return request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip || '127.0.0.1';
}

function getRateLimitInfo(request) {
  const limit = getFlashcardRateLimit();
  if (limit <= 0) {
    return { limit: 0, used: 0, remaining: 999999, isExceeded: false };
  }

  const clientIp = getClientIp(request);
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record || now > record.resetTime) {
    return { limit, used: 0, remaining: limit, isExceeded: false };
  }

  const remaining = Math.max(0, limit - record.count);
  return {
    limit,
    used: record.count,
    remaining,
    isExceeded: remaining <= 0
  };
}

function incrementRateLimit(request, amount = 1) {
  const limit = getFlashcardRateLimit();
  if (limit <= 0) return;

  const clientIp = getClientIp(request);
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientIp, { count: amount, resetTime: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.count += amount;
  }
}

const fastify = Fastify({
  logger: true
});

// 1. Configure CORS for frontend access
await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// 1.1. Configure multipart upload for manual images
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum
  }
});

// 2. Serve static files from uploads folder (/uploads/images and /uploads/audio)
const uploadsPath = path.resolve(__dirname, '../uploads');
await fastify.register(fastifyStatic, {
  root: uploadsPath,
  prefix: '/uploads/',
  maxAge: '1h', // Allow browser revalidation when disk assets change
  immutable: false,
  decorateReply: false
});

// 2.1. Serve compiled Frontend SPA from public directory in Production
const publicDir = path.resolve(__dirname, '../public');
const hasPublicDir = fs.existsSync(publicDir) && fs.existsSync(path.join(publicDir, 'index.html'));

if (hasPublicDir) {
  fastify.log.info(`[Static Server] Found production frontend directory at: ${publicDir}`);
  await fastify.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: true
  });

  // SPA Fallback: route unmatched paths (except /api/* and /uploads/*) to index.html
  fastify.setNotFoundHandler((request, reply) => {
    const url = request.raw.url || '';
    if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: `Resource ${url} was not found on the server.`
      });
    }
    return reply.sendFile('index.html');
  });
} else {
  // 3. Root route for development environment
  fastify.get('/', async (request, reply) => {
    return {
      app: 'Kids English Flashcard Backend API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        config: '/api/v1/config',
        topics: '/api/v1/topics',
        cards_example: '/api/v1/topics/wild-animals/cards',
        progress: '/api/v1/progress'
      }
    };
  });
}

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 3.1. Public Config Route: Cung cấp Feature Flags & Rate Quota cho Frontend
fastify.get('/api/v1/config', async (request, reply) => {
  const rateInfo = getRateLimitInfo(request);
  return {
    imageAiEnabled: isImageAiEnabled(),
    flashcardAiEnabled: isFlashcardAiEnabled(),
    rateLimit: rateInfo.limit,
    remainingQuota: rateInfo.remaining,
    usedQuota: rateInfo.used
  };
});

// 4. API Endpoints
// 4.1. Retrieve all topics with card counts and progress
fastify.get('/api/v1/topics', async (request, reply) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        t.id, 
        t.name_en, 
        t.name_vi, 
        t.icon, 
        t.color_theme, 
        t.display_order,
        COUNT(f.id) AS total_cards,
        COALESCE(tp.is_unlocked, 1) AS is_unlocked,
        COALESCE(tp.cards_learned, 0) AS cards_learned
      FROM topics t
      LEFT JOIN flashcards f ON t.id = f.topic_id
      LEFT JOIN topic_progress tp ON t.id = tp.topic_id
      GROUP BY t.id
      ORDER BY t.display_order ASC
    `);
    const rows = stmt.all();
    return rows.map(r => ({
      ...r,
      is_unlocked: Boolean(r.is_unlocked)
    }));
  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch topics' });
  }
});

// 4.2. Retrieve flashcards by Topic ID (supports topicId = 'all' for All Words exploration mode)
fastify.get('/api/v1/topics/:topicId/cards', async (request, reply) => {
  const { topicId } = request.params;
  try {
    if (topicId === 'all') {
      const cards = db.prepare(`
        SELECT f.*, t.name_en as topic_name_en, t.name_vi as topic_name_vi 
        FROM flashcards f
        LEFT JOIN topics t ON f.topic_id = t.id
        ORDER BY RANDOM()
      `).all();

      return reply.send({
        topic: { 
          id: 'all', 
          name_en: 'All Topics', 
          name_vi: 'Tất Cả Từ Vựng', 
          icon: '🌟',
          color_theme: 'amber',
          total_cards: cards.length
        },
        cards: cards
      });
    }

    const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
    if (!topic) {
      return reply.status(404).send({ error: `Topic '${topicId}' not found` });
    }

    const cards = db.prepare(`
      SELECT 
        id, 
        topic_id, 
        word, 
        phonetic, 
        meaning_vi, 
        example_en, 
        example_vi, 
        image_url, 
        audio_url, 
        difficulty,
        is_custom
      FROM flashcards 
      WHERE topic_id = ?
      ORDER BY id ASC
    `).all(topicId);

    return {
      topic,
      total: cards.length,
      cards
    };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch flashcards' });
  }
});

// 4.3. Retrieve learner progression (Stars & Pet status)
fastify.get('/api/v1/progress', async (request, reply) => {
  try {
    const progress = db.prepare('SELECT * FROM user_progress WHERE id = ?').get('default_kid');
    return progress || { stars: 0, feed_count: 0, pet_type: 'dino', pet_level: 1 };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch user progress' });
  }
});

// 4.4. Create new topic (Admin)
fastify.post('/api/v1/topics', async (request, reply) => {
  const { id, name_en, name_vi, icon, color_theme } = request.body || {};
  if (!name_en || !name_vi) {
    return reply.status(400).send({ error: 'English and Vietnamese names are required' });
  }

  try {
    const topicId = id ? slugify(id) : slugify(name_en);
    const existingTopic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
    if (existingTopic) {
      return reply.status(409).send({ error: `Topic '${topicId}' already exists!` });
    }

    const nextOrder = (db.prepare('SELECT MAX(display_order) as maxOrder FROM topics').get().maxOrder || 0) + 1;

    db.prepare(`
      INSERT INTO topics (id, name_en, name_vi, icon, color_theme, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(topicId, name_en.trim(), name_vi.trim(), icon || '🌟', color_theme || 'amber', nextOrder);

    // Initialize per-topic progress entry
    db.prepare(`
      INSERT OR IGNORE INTO topic_progress (topic_id, is_unlocked, cards_learned, quiz_high_score)
      VALUES (?, 1, 0, 0)
    `).run(topicId);

    const created = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
    return reply.status(201).send({ success: true, topic: created });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Error creating topic: ' + err.message });
  }
});

// 4.5. Batch Generate Flashcards via Gemini + Local Media Download (Admin AI Generator)
fastify.post('/api/v1/admin/generate-batch', async (request, reply) => {
  // 1. Check Feature Flag: FLASHCARD_GENERATE_ENABLE
  if (!isFlashcardAiEnabled()) {
    return reply.status(403).send({
      error: 'FEATURE_DISABLED',
      message: 'AI flashcard generation feature is currently disabled.'
    });
  }

  const { topic_id, words = [], image_source = 'ai_refined' } = request.body || {};

  if (!topic_id || !Array.isArray(words) || words.length === 0) {
    return reply.status(400).send({ error: 'topic_id and words array are required' });
  }

  // Sanitize valid vocabulary entries
  const sanitizedWords = words
    .map(w => (typeof w === 'string' ? w.trim() : ''))
    .filter(w => w.length > 0);

  if (sanitizedWords.length === 0) {
    return reply.status(400).send({ error: 'No valid vocabulary words provided' });
  }

  // 2. Check IP Rate Limit
  const rateLimitInfo = getRateLimitInfo(request);
  if (rateLimitInfo.limit > 0 && rateLimitInfo.remaining <= 0) {
    return reply.status(429).send({
      error: 'QUOTA_EXCEEDED',
      message: `You have reached the maximum daily limit of ${rateLimitInfo.limit} AI-generated words. Please return tomorrow!`,
      limit: rateLimitInfo.limit,
      remaining: 0
    });
  }

  // If requested words exceed remaining quota
  if (rateLimitInfo.limit > 0 && sanitizedWords.length > rateLimitInfo.remaining) {
    return reply.status(429).send({
      error: 'QUOTA_EXCEEDED',
      message: `Requested words count (${sanitizedWords.length}) exceeds today's remaining quota (${rateLimitInfo.remaining} words).`,
      limit: rateLimitInfo.limit,
      remaining: rateLimitInfo.remaining
    });
  }

  // Verify whether topic exists
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topic_id);
  if (!topic) {
    return reply.status(404).send({ error: `Topic '${topic_id}' does not exist in the database` });
  }

  try {
    const imageAiActive = isImageAiEnabled();
    fastify.log.info(`[Admin Generate] Processing ${sanitizedWords.length} words for topic "${topic_id}" (AI image active: ${imageAiActive})...`);

    // 1. Invoke Gemini API for semantics and phonetics
    const vocabData = await generateVocabularyData(sanitizedWords);

    // Use ON CONFLICT(topic_id, word) DO UPDATE SET to avoid duplicates
    // Custom cards created from Admin have is_custom = 1
    const upsertCard = db.prepare(`
      INSERT INTO flashcards (topic_id, word, phonetic, meaning_vi, example_en, example_vi, image_url, audio_url, difficulty, is_custom)
      VALUES (@topic_id, @word, @phonetic, @meaning_vi, @example_en, @example_vi, @image_url, @audio_url, 1, 1)
      ON CONFLICT(topic_id, word COLLATE NOCASE) DO UPDATE SET
        phonetic = excluded.phonetic,
        meaning_vi = excluded.meaning_vi,
        example_en = excluded.example_en,
        example_vi = excluded.example_vi,
        image_url = excluded.image_url,
        audio_url = excluded.audio_url
    `);

    const createdCards = [];

    // 2. Download and optimize .webp image and .mp3 audio for each card
    for (const item of vocabData) {
      const cleanWord = item.word.trim();
      fastify.log.info(`[Admin Generate] Downloading media assets for: ${cleanWord}`);

      // Image processing: fetch AI image only if IMAGE_AI_GENERATE_ENABLE is true
      let imageUrl = '/uploads/seed/images/default-placeholder.webp';
      if (imageAiActive) {
        imageUrl = await downloadAndConvertKidImage(cleanWord, topic_id, image_source, false, 'user');
      }

      // Generate local Edge-TTS MP3 under user scope
      const audioUrl = await downloadWordAudio(cleanWord, topic_id, 'en-US-AnaNeural', 'user');

      const cardPayload = {
        topic_id,
        word: cleanWord,
        phonetic: item.phonetic,
        meaning_vi: item.meaning_vi,
        example_en: item.example_en,
        example_vi: item.example_vi,
        image_url: imageUrl,
        audio_url: audioUrl
      };

      upsertCard.run(cardPayload);

      // Re-fetch record from DB to obtain correct ID
      const savedCard = db.prepare('SELECT * FROM flashcards WHERE topic_id = ? AND word = ? COLLATE NOCASE').get(topic_id, cleanWord);
      if (savedCard) {
        createdCards.push(savedCard);
      }
    }

    // Increment rate limit usage by generated cards count
    incrementRateLimit(request, createdCards.length);

    return reply.status(201).send({
      success: true,
      message: `Successfully processed ${createdCards.length} flashcards!`,
      topic_id,
      cards: createdCards,
      quotaRemaining: getRateLimitInfo(request).remaining
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Error generating flashcards: ' + err.message });
  }
});

// 4.6. Regenerate Image for Single Card (Admin Regenerate Image)
fastify.post('/api/v1/admin/cards/:id/regenerate-image', async (request, reply) => {
  // Check Feature Flag for AI image generation
  if (!isImageAiEnabled()) {
    return reply.status(403).send({
      error: 'FEATURE_DISABLED',
      message: 'Automated AI image generation is currently disabled. Please upload images manually.'
    });
  }

  const { id } = request.params;
  const { imageSource = 'ai_refined' } = request.body || {};

  try {
    const card = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!card) {
      return reply.status(404).send({ error: `Flashcard with ID ${id} not found` });
    }

    fastify.log.info(`[Regenerate Image] Regenerating image for "${card.word}" via "${imageSource}"...`);

    // Determine target scope (preserve seed scope for default cards, user scope for custom cards)
    const targetScope = card.is_custom === 1 ? 'user' : 'seed';

    // Download and convert new image (force overwrite file on disk)
    const newImageUrl = await downloadAndConvertKidImage(card.word, card.topic_id, imageSource, true, targetScope);

    // Update SQLite database (save canonical relative path)
    db.prepare('UPDATE flashcards SET image_url = ? WHERE id = ?').run(newImageUrl, id);

    const updatedCard = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    // Append timestamp query parameter so client browser refreshes immediately
    updatedCard.image_url = `${updatedCard.image_url}?t=${Date.now()}`;

    return {
      success: true,
      message: `Successfully regenerated image for "${card.word}"!`,
      card: updatedCard
    };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Error regenerating image: ' + err.message });
  }
});

// 4.7. Update Flashcard Information Manually (Admin Edit Flashcard)
fastify.put('/api/v1/cards/:id', async (request, reply) => {
  const { id } = request.params;
  const { word, phonetic, meaning_vi, example_en, example_vi, image_url } = request.body || {};

  try {
    const card = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!card) {
      return reply.status(404).send({ error: `Không tìm thấy flashcard với ID ${id}` });
    }

    const updatedPhonetic = phonetic !== undefined ? String(phonetic).trim() : card.phonetic;
    const updatedMeaningVi = meaning_vi !== undefined ? String(meaning_vi).trim() : card.meaning_vi;
    const updatedExampleEn = example_en !== undefined ? String(example_en).trim() : card.example_en;
    const updatedExampleVi = example_vi !== undefined ? String(example_vi).trim() : card.example_vi;
    const updatedImageUrl = image_url !== undefined ? String(image_url).trim() : card.image_url;

    // Lock the word field to preserve media file path integrity (.webp, .mp3)
    db.prepare(`
      UPDATE flashcards 
      SET 
        phonetic = ?, 
        meaning_vi = ?, 
        example_en = ?, 
        example_vi = ?, 
        image_url = ?
      WHERE id = ?
    `).run(
      updatedPhonetic,
      updatedMeaningVi,
      updatedExampleEn,
      updatedExampleVi,
      updatedImageUrl,
      id
    );

    const freshCard = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    return reply.send({
      success: true,
      message: 'Flashcard updated successfully!',
      card: freshCard
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Error updating card: ' + err.message });
  }
});

// 4.8. Manual Image Upload API (Admin Manual Image Upload)
fastify.post('/api/v1/cards/:id/upload-image', async (request, reply) => {
  const { id } = request.params;

  try {
    const card = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!card) {
      return reply.status(404).send({ error: `Flashcard with ID ${id} not found` });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Please select an image file to upload' });
    }

    // Read full image content into Buffer
    const buffer = await data.toBuffer();
    if (!buffer || buffer.length === 0) {
      return reply.status(400).send({ error: 'Uploaded file is empty' });
    }

    // Prepare target path using getMediaPath utility (scope: 'user')
    const safeTopic = slugify(card.topic_id || 'general');
    const mediaInfo = getMediaPath({
      type: 'image',
      scope: 'user',
      topicSlug: safeTopic,
      word: card.word,
      ext: 'webp'
    });

    if (!fs.existsSync(mediaInfo.dirPath)) {
      fs.mkdirSync(mediaInfo.dirPath, { recursive: true });
    }

    // Convert and compress to .webp with quality 85 using Sharp
    await sharp(buffer)
      .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .webp({ quality: 85 })
      .toFile(mediaInfo.filePath);

    // Update image_url field in SQLite database (save canonical path)
    const basePublicUrl = mediaInfo.publicUrl;
    db.prepare('UPDATE flashcards SET image_url = ? WHERE id = ?').run(basePublicUrl, id);

    const freshCard = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    // Append timestamp query parameter for immediate client cache-busting
    const freshUrlWithTimestamp = `${basePublicUrl}?t=${Date.now()}`;
    freshCard.image_url = freshUrlWithTimestamp;

    return reply.send({
      success: true,
      message: 'Image uploaded and converted successfully!',
      image_url: freshUrlWithTimestamp,
      card: freshCard
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Error uploading image: ' + err.message });
  }
});

// 4.9. Delete Flashcard API (Only allows deleting custom user cards with is_custom = 1)
fastify.delete('/api/v1/cards/:id', async (request, reply) => {
  const { id } = request.params;

  try {
    const card = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!card) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Flashcard with ID ${id} not found` });
    }

    // Permission check: If system default card (is_custom === 0), disallow deletion
    if (!card.is_custom || card.is_custom === 0) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Cannot delete default system flashcards!'
      });
    }

    // Delete record from SQLite
    db.prepare('DELETE FROM flashcards WHERE id = ?').run(id);

    // Clean up local disk files if present (prevent orphan storage leaks)
    // Note: Never delete default placeholder image
    try {
      if (card.image_url && !card.image_url.includes('default-placeholder.webp')) {
        const cleanImagePath = card.image_url.split('?')[0];
        if (cleanImagePath.startsWith('/uploads/')) {
          const relativePath = cleanImagePath.replace('/uploads/', '');
          const fullDiskPath = path.resolve(__dirname, '../uploads', relativePath);
          if (fs.existsSync(fullDiskPath)) {
            fs.unlinkSync(fullDiskPath);
            fastify.log.info(`[Delete Card] Deleted local image: ${fullDiskPath}`);
          }
        }
      }

      if (card.audio_url) {
        const cleanAudioPath = card.audio_url.split('?')[0];
        if (cleanAudioPath.startsWith('/uploads/')) {
          const relativePath = cleanAudioPath.replace('/uploads/', '');
          const fullDiskPath = path.resolve(__dirname, '../uploads', relativePath);
          if (fs.existsSync(fullDiskPath)) {
            fs.unlinkSync(fullDiskPath);
            fastify.log.info(`[Delete Card] Deleted local audio: ${fullDiskPath}`);
          }
        }
      }
    } catch (cleanupErr) {
      fastify.log.warn(`[Delete Card] Error cleaning orphan media files: ${cleanupErr.message}`);
    }

    return reply.send({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Error deleting card: ' + err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Kids Flashcard Backend is running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
