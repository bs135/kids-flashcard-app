import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data/ directory exists
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads/ directory structure exists (seed & user)
const uploadsDir = path.resolve(__dirname, '../../uploads');
const seedImagesDir = path.resolve(uploadsDir, 'seed/images');
const seedAudioDir = path.resolve(uploadsDir, 'seed/audio');
const userImagesDir = path.resolve(uploadsDir, 'user/images');
const userAudioDir = path.resolve(uploadsDir, 'user/audio');

[uploadsDir, seedImagesDir, seedAudioDir, userImagesDir, userAudioDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for concurrent read/write throughput
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    -- 1. topics table
    CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_vi TEXT NOT NULL,
        icon TEXT NOT NULL,
        color_theme TEXT DEFAULT 'amber',
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. flashcards table
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
        is_custom INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE,
        UNIQUE(topic_id, word COLLATE NOCASE)
    );
    CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON flashcards(topic_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_flashcards_unique_word ON flashcards(topic_id, word COLLATE NOCASE);

    -- 3. user_progress table (User progression & Pet status)
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

    -- 4. topic_progress table (Per-topic progression status)
    CREATE TABLE IF NOT EXISTS topic_progress (
        topic_id TEXT PRIMARY KEY,
        is_unlocked INTEGER DEFAULT 1,
        cards_learned INTEGER DEFAULT 0,
        quiz_high_score INTEGER DEFAULT 0,
        FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
    );
  `);

  // Migration: Add is_custom column if table already exists without it
  const columns = db.pragma('table_info(flashcards)');
  const hasIsCustom = columns.some(col => col.name === 'is_custom');
  if (!hasIsCustom) {
    db.exec('ALTER TABLE flashcards ADD COLUMN is_custom INTEGER DEFAULT 0');
  }

  // Create default profile if not already present
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
