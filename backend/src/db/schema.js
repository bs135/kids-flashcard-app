import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đảm bảo thư mục data/ tồn tại
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Đảm bảo thư mục uploads/ tồn tại
const uploadsDir = path.resolve(__dirname, '../../uploads');
const audioDir = path.resolve(uploadsDir, 'audio');
const imagesDir = path.resolve(uploadsDir, 'images');
[uploadsDir, audioDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Bật WAL mode để tăng tốc độ ghi và đọc đồng thời
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    -- 1. Bảng topics (Chủ đề)
    CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_vi TEXT NOT NULL,
        icon TEXT NOT NULL,
        color_theme TEXT DEFAULT 'amber',
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Bảng flashcards (Thẻ từ vựng)
    CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id TEXT NOT NULL,
        word TEXT NOT NULL,
        phonetic TEXT,
        meaning_vi TEXT NOT NULL,
        example_en TEXT,
        example_vi TEXT,
        image_url TEXT NOT NULL,
        audio_url TEXT,
        difficulty INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id);

    -- 3. Bảng user_progress (Tiến trình người dùng & Thú cưng)
    CREATE TABLE IF NOT EXISTS user_progress (
        id TEXT PRIMARY KEY DEFAULT 'default_kid',
        stars INTEGER DEFAULT 0,
        feed_count INTEGER DEFAULT 0,
        pet_type TEXT DEFAULT 'dino',
        pet_level INTEGER DEFAULT 1,
        streak_days INTEGER DEFAULT 1,
        last_active_date DATE DEFAULT (DATE('now')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Bảng topic_progress (Tiến trình theo chủ đề)
    CREATE TABLE IF NOT EXISTS topic_progress (
        topic_id TEXT PRIMARY KEY,
        is_unlocked INTEGER DEFAULT 1,
        cards_learned INTEGER DEFAULT 0,
        quiz_high_score INTEGER DEFAULT 0,
        FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
    );
  `);

  // Tạo user mặc định nếu chưa có
  const checkUser = db.prepare('SELECT id FROM user_progress WHERE id = ?').get('default_kid');
  if (!checkUser) {
    db.prepare(`
      INSERT INTO user_progress (id, stars, feed_count, pet_type, pet_level, streak_days)
      VALUES ('default_kid', 0, 0, 'dino', 1, 1)
    `).run();
  }

  return db;
}

export default db;
