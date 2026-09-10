import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db, { initDatabase } from './db/schema.js';
import { generateVocabularyData } from './services/geminiService.js';
import { downloadAndConvertKidImage } from './services/imageService.js';
import { downloadWordAudio } from './services/edgeTtsService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Khởi tạo DB Schema
initDatabase();

const fastify = Fastify({
  logger: true
});

// 1. Cấu hình CORS để Frontend kết nối dễ dàng
await fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

// 2. Phục vụ static files từ thư mục uploads (/uploads/images và /uploads/audio) với cache tối ưu
const uploadsPath = path.resolve(__dirname, '../uploads');
await fastify.register(fastifyStatic, {
  root: uploadsPath,
  prefix: '/uploads/',
  maxAge: '7d', // Cache static media trong 7 ngày
  immutable: true
});

// 3. Root & Health check route
fastify.get('/', async (request, reply) => {
  return {
    app: 'Kids English Flashcard Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      topics: '/api/v1/topics',
      cards_example: '/api/v1/topics/animals/cards',
      progress: '/api/v1/progress'
    }
  };
});

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
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

// 4.2. Lấy danh sách flashcards theo Topic ID
fastify.get('/api/v1/topics/:topicId/cards', async (request, reply) => {
  const { topicId } = request.params;
  try {
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
  const { topic_id, words } = request.body || {};

  if (!topic_id) {
    return reply.status(400).send({ error: 'Vui lòng chọn hoặc cung cấp topic_id' });
  }

  if (!Array.isArray(words) || words.length === 0) {
    return reply.status(400).send({ error: 'Danh sách từ vựng không được để trống' });
  }

  // Kiểm tra xem Topic có tồn tại không
  const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topic_id);
  if (!topic) {
    return reply.status(404).send({ error: `Chủ đề '${topic_id}' không tồn tại trong hệ thống` });
  }

  try {
    fastify.log.info(`[Admin Generate] Bắt đầu xử lý ${words.length} từ cho chủ đề "${topic_id}"...`);

    // 1. Gọi Gemini API để sinh dữ liệu ngữ nghĩa & phiên âm
    const vocabData = await generateVocabularyData(words);

    const insertCard = db.prepare(`
      INSERT INTO flashcards (topic_id, word, phonetic, meaning_vi, example_en, example_vi, image_url, audio_url, difficulty)
      VALUES (@topic_id, @word, @phonetic, @meaning_vi, @example_en, @example_vi, @image_url, @audio_url, 1)
    `);

    const createdCards = [];

    // 2. Với từng từ, tải và tối ưu file hình ảnh .webp và audio .mp3
    for (const item of vocabData) {
      const cleanWord = item.word.trim();
      fastify.log.info(`[Admin Generate] Đang tải media cho: ${cleanWord}`);

      // Sinh ảnh hoạt hình WebP cục bộ
      const imageUrl = await downloadAndConvertKidImage(cleanWord, topic_id);

      // Sinh giọng đọc Edge-TTS MP3 cục bộ
      const audioUrl = await downloadWordAudio(cleanWord);

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

      const info = insertCard.run(cardPayload);
      createdCards.push({
        id: info.lastInsertRowid,
        ...cardPayload
      });
    }

    return reply.status(201).send({
      success: true,
      message: `Đã tạo thành công ${createdCards.length} thẻ flashcards!`,
      topic_id,
      cards: createdCards
    });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ error: 'Lỗi trong quá trình sinh Flashcards tự động: ' + err.message });
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
