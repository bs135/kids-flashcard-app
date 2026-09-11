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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Khởi tạo DB Schema
initDatabase();

// ----------------------------------------------------
// FEATURE FLAGS & RATE LIMITING CONFIGURATION
// ----------------------------------------------------
// IMAGE_AI_GENERATE_ENABLE: Mặc định false
const isImageAiEnabled = () => process.env.IMAGE_AI_GENERATE_ENABLE === 'true';

// FLASHCARD_GENERATE_ENABLE: Mặc định true
const isFlashcardAiEnabled = () => process.env.FLASHCARD_GENERATE_ENABLE !== 'false';

// FLASHCARD_GENERATE_RATE_LIMIT: Mặc định 5 (0 = không giới hạn)
const getFlashcardRateLimit = () => {
  const val = parseInt(process.env.FLASHCARD_GENERATE_RATE_LIMIT, 10);
  return isNaN(val) ? 5 : val;
};

// In-memory rate limiting map: ip -> { count: number, resetTime: number }
// Reset sau mỗi 24 giờ (hoặc ngày mới)
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

// 1. Cấu hình CORS để Frontend kết nối dễ dàng
await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// 1.1. Cấu hình Multipart Upload cho ảnh thủ công
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB tối đa
  }
});

// 2. Phục vụ static files từ thư mục uploads (/uploads/images và /uploads/audio)
const uploadsPath = path.resolve(__dirname, '../uploads');
await fastify.register(fastifyStatic, {
  root: uploadsPath,
  prefix: '/uploads/',
  maxAge: '1h', // Cho phép trình duyệt revalidate khi file trên đĩa thay đổi
  immutable: false
});

// 3. Root & Health check route
fastify.get('/', async (request, reply) => {
  return {
    app: 'Kids English Flashcard Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      config: '/api/v1/config',
      topics: '/api/v1/topics',
      cards_example: '/api/v1/topics/animals/cards',
      progress: '/api/v1/progress'
    }
  };
});

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
// 4.1. Lấy danh sách tất cả chủ đề kèm số lượng thẻ & tiến trình
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

// 4.2. Lấy danh sách flashcards theo Topic ID (hỗ trợ cả topicId = 'all' cho chế độ Khám Phá Tổng Hợp)
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
        difficulty
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

// 4.3. Lấy thông tin tiến trình của bé (Stars & Thú cưng)
fastify.get('/api/v1/progress', async (request, reply) => {
  try {
    const progress = db.prepare('SELECT * FROM user_progress WHERE id = ?').get('default_kid');
    return progress || { stars: 0, feed_count: 0, pet_type: 'dino', pet_level: 1 };
  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch user progress' });
  }
});

// 4.4. Tạo chủ đề mới (Admin)
fastify.post('/api/v1/topics', async (request, reply) => {
  const { id, name_en, name_vi, icon, color_theme } = request.body || {};
  if (!name_en || !name_vi) {
    return reply.status(400).send({ error: 'Tên tiếng Anh và tiếng Việt là bắt buộc' });
  }

  const topicId = (id || name_en).trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  try {
    const insertTopic = db.prepare(`
      INSERT INTO topics (id, name_en, name_vi, icon, color_theme, display_order)
      VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM topics))
      ON CONFLICT(id) DO UPDATE SET
        name_en = excluded.name_en,
        name_vi = excluded.name_vi,
        icon = excluded.icon,
        color_theme = excluded.color_theme
    `);
    insertTopic.run(topicId, name_en, name_vi, icon || '📚', color_theme || 'amber');

    db.prepare(`
      INSERT OR IGNORE INTO topic_progress (topic_id, is_unlocked, cards_learned, quiz_high_score)
      VALUES (?, 1, 0, 0)
    `).run(topicId);

    const created = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId);
    return reply.status(201).send(created);
  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ error: 'Không thể tạo chủ đề' });
  }
});

// 4.5. API Sinh Flashcards Tự Động Hàng Loạt Bằng AI (Admin)
fastify.post('/api/v1/admin/generate-batch', async (request, reply) => {
  // 1. Kiểm tra Feature Flag tạo thẻ AI
  if (!isFlashcardAiEnabled()) {
    return reply.status(403).send({
      error: 'FEATURE_DISABLED',
      message: 'Tính năng tự động sinh thẻ bằng AI hiện đang tạm đóng theo cấu hình hệ thống.'
    });
  }

  // 2. Kiểm tra Rate Limit
  const rateInfo = getRateLimitInfo(request);
  if (rateInfo.isExceeded) {
    return reply.status(429).send({
      error: 'QUOTA_EXCEEDED',
      message: `Hệ thống đã đạt giới hạn tạo thẻ hôm nay (tối đa ${rateInfo.limit} thẻ). Vui lòng quay lại sau!`
    });
  }

  const { topic_id, words, image_source = 'ai_refined' } = request.body || {};

  if (!topic_id) {
    return reply.status(400).send({ error: 'Vui lòng chọn hoặc cung cấp topic_id' });
  }

  if (!Array.isArray(words) || words.length === 0) {
    return reply.status(400).send({ error: 'Danh sách từ vựng không được để trống' });
  }

  // Chuẩn hóa và loại bỏ các từ trùng lặp trong input đầu vào (Case-insensitive)
  const uniqueWordsMap = new Map();
  for (const rawWord of words) {
    const trimmed = String(rawWord || '').trim();
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      if (!uniqueWordsMap.has(lower)) {
        uniqueWordsMap.set(lower, trimmed);
      }
    }
  }

  const sanitizedWords = Array.from(uniqueWordsMap.values());
  if (sanitizedWords.length === 0) {
    return reply.status(400).send({ error: 'Không tìm thấy từ vựng hợp lệ' });
  }

  // Kiểm tra xem số từ yêu cầu có vượt quota còn lại không (nếu có giới hạn)
  if (rateInfo.limit > 0 && sanitizedWords.length > rateInfo.remaining) {
    return reply.status(429).send({
      error: 'QUOTA_EXCEEDED',
      message: `Hệ thống chỉ còn lại ${rateInfo.remaining} lượt tạo hôm nay, nhưng bạn đang yêu cầu tạo ${sanitizedWords.length} từ. Vui lòng giảm bớt số lượng từ!`
    });
  }

  // Kiểm tra xem Topic có tồn tại không
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topic_id);
  if (!topic) {
    return reply.status(404).send({ error: `Chủ đề '${topic_id}' không tồn tại trong hệ thống` });
  }

  try {
    const imageAiActive = isImageAiEnabled();
    fastify.log.info(`[Admin Generate] Bắt đầu xử lý ${sanitizedWords.length} từ cho chủ đề "${topic_id}" (Nguồn ảnh AI bật: ${imageAiActive})...`);

    // 1. Gọi Gemini API để sinh dữ liệu ngữ nghĩa & phiên âm
    const vocabData = await generateVocabularyData(sanitizedWords);

    // Sử dụng ON CONFLICT(topic_id, word) DO UPDATE SET để tránh bản ghi trùng lặp
    const upsertCard = db.prepare(`
      INSERT INTO flashcards (topic_id, word, phonetic, meaning_vi, example_en, example_vi, image_url, audio_url, difficulty)
      VALUES (@topic_id, @word, @phonetic, @meaning_vi, @example_en, @example_vi, @image_url, @audio_url, 1)
      ON CONFLICT(topic_id, word COLLATE NOCASE) DO UPDATE SET
        phonetic = excluded.phonetic,
        meaning_vi = excluded.meaning_vi,
        example_en = excluded.example_en,
        example_vi = excluded.example_vi,
        image_url = excluded.image_url,
        audio_url = excluded.audio_url
    `);

    const createdCards = [];

    // 2. Với từng từ, tải và tối ưu file hình ảnh .webp và audio .mp3
    for (const item of vocabData) {
      const cleanWord = item.word.trim();
      fastify.log.info(`[Admin Generate] Đang tải media cho: ${cleanWord}`);

      // Xử lý ảnh: Nếu IMAGE_AI_GENERATE_ENABLE là true thì mới tải ảnh tự động; nếu false thì gán ảnh mặc định
      let imageUrl = '/uploads/images/default-placeholder.webp';
      if (imageAiActive) {
        imageUrl = await downloadAndConvertKidImage(cleanWord, topic_id, image_source);
      }

      // Sinh giọng đọc Edge-TTS MP3 cục bộ theo thư mục topic_id
      const audioUrl = await downloadWordAudio(cleanWord, topic_id);

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

      // Lấy lại bản ghi từ DB để có ID chính xác (dù là tạo mới hay cập nhật)
      const savedCard = db.prepare('SELECT * FROM flashcards WHERE topic_id = ? AND word = ? COLLATE NOCASE').get(topic_id, cleanWord);
      if (savedCard) {
        createdCards.push(savedCard);
      }
    }

    // Tăng bộ đếm Rate Limit theo số thẻ đã tạo thành công
    incrementRateLimit(request, createdCards.length);

    return reply.status(201).send({
      success: true,
      message: `Đã xử lý thành công ${createdCards.length} thẻ flashcards!`,
      topic_id,
      cards: createdCards,
      quotaRemaining: getRateLimitInfo(request).remaining
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Lỗi trong quá trình sinh Flashcards tự động: ' + err.message });
  }
});

// 4.6. API Tái Tạo Lại Ảnh Cho Một Thẻ Đơn Lẻ (Admin Regenerate Image)
fastify.post('/api/v1/admin/cards/:id/regenerate-image', async (request, reply) => {
  // Kiểm tra Feature Flag tạo ảnh AI
  if (!isImageAiEnabled()) {
    return reply.status(403).send({
      error: 'FEATURE_DISABLED',
      message: 'Tính năng tạo ảnh AI tự động hiện đang tạm tắt. Vui lòng sử dụng tính năng tải ảnh thủ công từ máy tính.'
    });
  }

  const { id } = request.params;
  const { imageSource = 'ai_refined' } = request.body || {};

  try {
    const card = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!card) {
      return reply.status(404).send({ error: `Không tìm thấy flashcard với ID ${id}` });
    }

    fastify.log.info(`[Regenerate Image] Đang tạo lại ảnh cho từ "${card.word}" theo nguồn "${imageSource}"...`);

    // Tải và chuyển đổi ảnh mới (buộc ghi đè file với forceOverwrite = true)
    const newImageUrl = await downloadAndConvertKidImage(card.word, card.topic_id, imageSource, true);

    // Cập nhật CSDL (lưu đường dẫn gốc vào DB)
    db.prepare('UPDATE flashcards SET image_url = ? WHERE id = ?').run(newImageUrl, id);

    const updatedCard = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    // Nối thêm query param t=timestamp để client nhận diện ngay ảnh mới
    updatedCard.image_url = `${updatedCard.image_url}?t=${Date.now()}`;

    return {
      success: true,
      message: `Đã tạo lại ảnh thành công cho từ "${card.word}"!`,
      card: updatedCard
    };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Lỗi khi tái tạo ảnh: ' + err.message });
  }
});

// 4.7. API Cập Nhật Thông Tin Thẻ Thủ Công (Admin Edit Flashcard)
fastify.put('/api/v1/cards/:id', async (request, reply) => {
  const { id } = request.params;
  const { word, phonetic, meaning_vi, example_en, example_vi, image_url } = request.body || {};

  try {
    const card = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!card) {
      return reply.status(404).send({ error: `Không tìm thấy flashcard với ID ${id}` });
    }

    const updatedWord = word !== undefined ? String(word).trim() : card.word;
    const updatedPhonetic = phonetic !== undefined ? String(phonetic).trim() : card.phonetic;
    const updatedMeaningVi = meaning_vi !== undefined ? String(meaning_vi).trim() : card.meaning_vi;
    const updatedExampleEn = example_en !== undefined ? String(example_en).trim() : card.example_en;
    const updatedExampleVi = example_vi !== undefined ? String(example_vi).trim() : card.example_vi;
    const updatedImageUrl = image_url !== undefined ? String(image_url).trim() : card.image_url;

    db.prepare(`
      UPDATE flashcards 
      SET 
        word = ?, 
        phonetic = ?, 
        meaning_vi = ?, 
        example_en = ?, 
        example_vi = ?, 
        image_url = ?
      WHERE id = ?
    `).run(
      updatedWord,
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
      message: 'Cập nhật thẻ thành công!',
      card: freshCard
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Lỗi khi cập nhật thẻ: ' + err.message });
  }
});

// 4.8. API Upload Hình Ảnh Thủ Công (Admin Manual Image Upload)
fastify.post('/api/v1/cards/:id/upload-image', async (request, reply) => {
  const { id } = request.params;

  try {
    const card = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    if (!card) {
      return reply.status(404).send({ error: `Không tìm thấy flashcard với ID ${id}` });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Vui lòng chọn một file ảnh để tải lên' });
    }

    // Đọc toàn bộ nội dung file ảnh vào Buffer
    const buffer = await data.toBuffer();
    if (!buffer || buffer.length === 0) {
      return reply.status(400).send({ error: 'File ảnh không có nội dung' });
    }

    // Chuẩn bị thư mục đích: backend/uploads/images/{topic_slug}
    const safeTopic = slugify(card.topic_id || 'general');
    const safeWord = slugify(card.word);
    const targetDir = path.resolve(__dirname, `../uploads/images/${safeTopic}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `${safeWord}.webp`;
    const targetFilePath = path.join(targetDir, filename);

    // Chuyển đổi và nén sang định dạng .webp chất lượng 85 bằng Sharp
    await sharp(buffer)
      .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .webp({ quality: 85 })
      .toFile(targetFilePath);

    // Cập nhật lại trường image_url trong CSDL (lưu path gốc)
    const basePublicUrl = `/uploads/images/${safeTopic}/${filename}`;
    db.prepare('UPDATE flashcards SET image_url = ? WHERE id = ?').run(basePublicUrl, id);

    const freshCard = db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id);
    // Kèm query timestamp để trình duyệt load ngay ảnh mới
    const freshUrlWithTimestamp = `${basePublicUrl}?t=${Date.now()}`;
    freshCard.image_url = freshUrlWithTimestamp;

    return reply.send({
      success: true,
      message: 'Tải và nén ảnh thành công!',
      image_url: freshUrlWithTimestamp,
      card: freshCard
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Lỗi khi upload ảnh: ' + err.message });
  }
});

// Khởi động server
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
