import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './db/schema.js';

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
