import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './schema.js';
import { slugify } from '../utils/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseImagesDir = path.resolve(__dirname, '../../uploads/images');
const baseAudioDir = path.resolve(__dirname, '../../uploads/audio');

initDatabase();

console.log('🚚 Starting media migration to topic-based subdirectories...');

const cards = db.prepare('SELECT id, topic_id, word, image_url, audio_url FROM flashcards').all();

const updateCard = db.prepare(`
  UPDATE flashcards 
  SET image_url = @image_url, audio_url = @audio_url 
  WHERE id = @id
`);

let movedImages = 0;
let movedAudio = 0;

for (const card of cards) {
  const topicSlug = slugify(card.topic_id);
  const wordSlug = slugify(card.word);

  // Create subdirectories if they do not exist
  const targetImageDir = path.join(baseImagesDir, topicSlug);
  const targetAudioDir = path.join(baseAudioDir, topicSlug);
  if (!fs.existsSync(targetImageDir)) fs.mkdirSync(targetImageDir, { recursive: true });
  if (!fs.existsSync(targetAudioDir)) fs.mkdirSync(targetAudioDir, { recursive: true });

  let newImageUrl = card.image_url;
  let newAudioUrl = card.audio_url;

  // 1. Move image file if currently located in root /uploads/images/
  if (card.image_url && card.image_url.startsWith('/uploads/images/')) {
    const oldFileName = path.basename(card.image_url.split('?')[0]);
    const oldFilePath = path.join(baseImagesDir, oldFileName);
    const newFilePath = path.join(targetImageDir, `${wordSlug}.webp`);

    if (fs.existsSync(oldFilePath) && oldFilePath !== newFilePath) {
      fs.renameSync(oldFilePath, newFilePath);
      movedImages++;
    }
    newImageUrl = `/uploads/images/${topicSlug}/${wordSlug}.webp`;
  }

  // 2. Move audio file if currently located in root /uploads/audio/
  if (card.audio_url && card.audio_url.startsWith('/uploads/audio/')) {
    const oldFileName = path.basename(card.audio_url.split('?')[0]);
    const oldFilePath = path.join(baseAudioDir, oldFileName);
    const newFilePath = path.join(targetAudioDir, `${wordSlug}.mp3`);

    if (fs.existsSync(oldFilePath) && oldFilePath !== newFilePath) {
      fs.renameSync(oldFilePath, newFilePath);
      movedAudio++;
    }
    newAudioUrl = `/uploads/audio/${topicSlug}/${wordSlug}.mp3`;
  }

  // 3. Update paths in SQLite database
  updateCard.run({
    id: card.id,
    image_url: newImageUrl,
    audio_url: newAudioUrl
  });
}

console.log(`✅ Completed migration: ${movedImages} images, ${movedAudio} audio files moved into topic subdirectories.`);
console.log('📋 Data after migration:');
const updatedCards = db.prepare('SELECT id, topic_id, word, image_url, audio_url FROM flashcards').all();
console.log(updatedCards);
