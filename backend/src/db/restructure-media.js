import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './schema.js';
import { rawFlashcards } from './seed.js';
import { getMediaPath, BASE_UPLOADS_DIR } from '../utils/mediaPath.js';
import { slugify } from '../utils/slugify.js';

initDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 ================================================================');
console.log('📦 MEDIA STORAGE RESTRUCTURING MIGRATION');
console.log('   Separating Seed (tracked) and User (ignored) media assets');
console.log('================================================================\n');

// 1. Ensure target directory structure exists
const targetDirs = [
  path.join(BASE_UPLOADS_DIR, 'seed/images'),
  path.join(BASE_UPLOADS_DIR, 'seed/audio'),
  path.join(BASE_UPLOADS_DIR, 'user/images'),
  path.join(BASE_UPLOADS_DIR, 'user/audio')
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 2. Build map of default seed flashcards for identification
const seedMap = new Map();
rawFlashcards.forEach(card => {
  const key = `${slugify(card.topic_id)}:${slugify(card.word)}`;
  seedMap.set(key, card);
});

// 3. Move default placeholder image to seed/images if it exists
const legacyPlaceholderPath = path.join(BASE_UPLOADS_DIR, 'images/default-placeholder.webp');
const seedPlaceholderPath = path.join(BASE_UPLOADS_DIR, 'seed/images/default-placeholder.webp');
if (fs.existsSync(legacyPlaceholderPath)) {
  if (!fs.existsSync(seedPlaceholderPath)) {
    fs.copyFileSync(legacyPlaceholderPath, seedPlaceholderPath);
  }
  try { fs.unlinkSync(legacyPlaceholderPath); } catch (e) {}
  console.log('✅ Moved default-placeholder.webp -> uploads/seed/images/default-placeholder.webp');
}

// 4. Fetch all cards from SQLite
const allCards = db.prepare('SELECT * FROM flashcards').all();
console.log(`📋 Found ${allCards.length} flashcards in SQLite database.\n`);

let updatedImageCount = 0;
let updatedAudioCount = 0;
let movedImageFiles = 0;
let movedAudioFiles = 0;

const updateCardStmt = db.prepare(`
  UPDATE flashcards 
  SET image_url = @image_url, audio_url = @audio_url 
  WHERE id = @id
`);

// 5. Migrate files and database records for each card
for (const card of allCards) {
  const topicSlug = slugify(card.topic_id);
  const wordSlug = slugify(card.word);
  const isSeedCard = (card.is_custom === 0) || seedMap.has(`${topicSlug}:${wordSlug}`);
  const scope = isSeedCard ? 'seed' : 'user';

  // --- A. Process Image ---
  const targetImage = getMediaPath({
    type: 'image',
    scope,
    topicSlug,
    word: wordSlug,
    ext: 'webp'
  });

  if (!fs.existsSync(targetImage.dirPath)) {
    fs.mkdirSync(targetImage.dirPath, { recursive: true });
  }

  // Candidate legacy image paths
  const legacyImageCandidates = [
    // 1. Topic subdirectory: uploads/images/{topic}/{word}.webp
    path.join(BASE_UPLOADS_DIR, 'images', topicSlug, `${wordSlug}.webp`),
    // 2. Flat directory: uploads/images/{word}.webp
    path.join(BASE_UPLOADS_DIR, 'images', `${wordSlug}.webp`),
    // 3. Path currently in card.image_url if starting with /uploads/
    card.image_url && card.image_url.startsWith('/uploads/') 
      ? path.join(BASE_UPLOADS_DIR, card.image_url.replace('/uploads/', '').split('?')[0]) 
      : null
  ].filter(Boolean);

  let imageFoundOnDisk = false;

  // If already at target destination
  if (fs.existsSync(targetImage.filePath)) {
    imageFoundOnDisk = true;
  } else {
    // Check candidate legacy paths
    for (const legacyPath of legacyImageCandidates) {
      if (fs.existsSync(legacyPath) && legacyPath !== targetImage.filePath) {
        fs.copyFileSync(legacyPath, targetImage.filePath);
        try { fs.unlinkSync(legacyPath); } catch (e) {}
        movedImageFiles++;
        imageFoundOnDisk = true;
        break;
      }
    }
  }

  // Determine new image URL
  let newImageUrl = card.image_url;
  if (imageFoundOnDisk) {
    newImageUrl = targetImage.publicUrl;
    if (newImageUrl !== card.image_url) {
      updatedImageCount++;
    }
  } else if (card.image_url && card.image_url.includes('default-placeholder.webp')) {
    newImageUrl = '/uploads/seed/images/default-placeholder.webp';
    if (newImageUrl !== card.image_url) {
      updatedImageCount++;
    }
  }

  // --- B. Process Audio ---
  const targetAudio = getMediaPath({
    type: 'audio',
    scope,
    topicSlug,
    word: wordSlug,
    ext: 'mp3'
  });

  if (!fs.existsSync(targetAudio.dirPath)) {
    fs.mkdirSync(targetAudio.dirPath, { recursive: true });
  }

  const legacyAudioCandidates = [
    // 1. Topic subdirectory: uploads/audio/{topic}/{word}.mp3
    path.join(BASE_UPLOADS_DIR, 'audio', topicSlug, `${wordSlug}.mp3`),
    // 2. Flat directory: uploads/audio/{word}.mp3
    path.join(BASE_UPLOADS_DIR, 'audio', `${wordSlug}.mp3`),
    // 3. Current URL if in uploads
    card.audio_url && card.audio_url.startsWith('/uploads/') 
      ? path.join(BASE_UPLOADS_DIR, card.audio_url.replace('/uploads/', '').split('?')[0]) 
      : null
  ].filter(Boolean);

  let audioFoundOnDisk = false;

  // If already at target destination
  if (fs.existsSync(targetAudio.filePath)) {
    audioFoundOnDisk = true;
  } else {
    for (const legacyPath of legacyAudioCandidates) {
      if (fs.existsSync(legacyPath) && legacyPath !== targetAudio.filePath) {
        fs.copyFileSync(legacyPath, targetAudio.filePath);
        try { fs.unlinkSync(legacyPath); } catch (e) {}
        movedAudioFiles++;
        audioFoundOnDisk = true;
        break;
      }
    }
  }

  let newAudioUrl = card.audio_url;
  if (audioFoundOnDisk) {
    newAudioUrl = targetAudio.publicUrl;
    if (newAudioUrl !== card.audio_url) {
      updatedAudioCount++;
    }
  }

  // Update DB record if URLs changed
  if (newImageUrl !== card.image_url || newAudioUrl !== card.audio_url) {
    updateCardStmt.run({
      id: card.id,
      image_url: newImageUrl,
      audio_url: newAudioUrl
    });
  }
}

// 6. Check for any remaining files in legacy uploads/images and uploads/audio
function moveRemainingFiles(srcSubDir, defaultType, defaultScope = 'user') {
  const fullSrcDir = path.join(BASE_UPLOADS_DIR, srcSubDir);
  if (!fs.existsSync(fullSrcDir)) return;

  const entries = fs.readdirSync(fullSrcDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(fullSrcDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'seed' || entry.name === 'user') continue;
      // Recurse directory
      moveRemainingFiles(path.join(srcSubDir, entry.name), defaultType, defaultScope);
      // Clean up empty directory
      try {
        const remaining = fs.readdirSync(entryPath);
        if (remaining.length === 0) {
          fs.rmdirSync(entryPath);
        }
      } catch (e) {}
    } else {
      // It's a file
      const ext = path.extname(entry.name).replace('.', '').toLowerCase();
      const baseName = path.basename(entry.name, path.extname(entry.name));
      const target = getMediaPath({
        type: defaultType,
        scope: defaultScope,
        topicSlug: 'general',
        word: baseName,
        ext
      });

      if (!fs.existsSync(target.dirPath)) {
        fs.mkdirSync(target.dirPath, { recursive: true });
      }

      if (!fs.existsSync(target.filePath)) {
        fs.copyFileSync(entryPath, target.filePath);
      }
      try { fs.unlinkSync(entryPath); } catch (e) {}
    }
  }
}

// Clean up remaining files in legacy uploads/images and uploads/audio
moveRemainingFiles('images', 'image', 'user');
moveRemainingFiles('audio', 'audio', 'user');

// 7. Safely remove legacy empty directories
['images', 'audio'].forEach(subDir => {
  const dirPath = path.join(BASE_UPLOADS_DIR, subDir);
  if (fs.existsSync(dirPath)) {
    try {
      const items = fs.readdirSync(dirPath);
      if (items.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`🧹 Removed legacy empty directory: uploads/${subDir}`);
      }
    } catch (e) {}
  }
});

// 8. Summary report
const seedImagesCount = fs.existsSync(path.join(BASE_UPLOADS_DIR, 'seed/images'))
  ? fs.readdirSync(path.join(BASE_UPLOADS_DIR, 'seed/images'), { recursive: true }).filter(f => typeof f === 'string' && f.endsWith('.webp')).length
  : 0;

const seedAudioCount = fs.existsSync(path.join(BASE_UPLOADS_DIR, 'seed/audio'))
  ? fs.readdirSync(path.join(BASE_UPLOADS_DIR, 'seed/audio')).filter(f => f.endsWith('.mp3')).length
  : 0;

console.log('\n================================================================');
console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY');
console.log('================================================================');
console.log(`- Database records updated: ${updatedImageCount} image URLs, ${updatedAudioCount} audio URLs`);
console.log(`- Physical files moved:     ${movedImageFiles} images, ${movedAudioFiles} audio files`);
console.log(`- Total seed images:        ${seedImagesCount} webp files`);
console.log(`- Total seed audio:         ${seedAudioCount} mp3 files`);
console.log('================================================================\n');
