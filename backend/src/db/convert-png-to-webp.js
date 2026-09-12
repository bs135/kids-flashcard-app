import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import db, { initDatabase } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesRoot = path.resolve(__dirname, '../../uploads/images');

initDatabase();

/**
 * Recursively scans and collects all .png files within a directory
 */
function getAllPngFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getAllPngFiles(fullPath));
    } else if (item.isFile() && item.name.toLowerCase().endsWith('.png')) {
      results.push(fullPath);
    }
  }
  return results;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function convertPngToWebp() {
  console.log('🔍 Recursively scanning for .png files in:', imagesRoot);
  const pngFiles = getAllPngFiles(imagesRoot);

  console.log(`📌 Found a total of: ${pngFiles.length} .png files.\n`);

  if (pngFiles.length === 0) {
    console.log('✨ No .png files require conversion.');
    return;
  }

  let totalOriginalSize = 0;
  let totalWebpSize = 0;
  let successCount = 0;
  let failCount = 0;

  const convertedList = [];

  for (let i = 0; i < pngFiles.length; i++) {
    const pngPath = pngFiles[i];
    const relativePath = path.relative(imagesRoot, pngPath);
    const originalSize = fs.statSync(pngPath).size;
    totalOriginalSize += originalSize;

    // Destination .webp path with same name in same directory
    const webpPath = pngPath.substring(0, pngPath.lastIndexOf('.')) + '.webp';

    try {
      // 1. Convert to WebP using sharp with quality: 85
      await sharp(pngPath)
        .webp({ quality: 85 })
        .toFile(webpPath);

      // 2. Validate newly generated .webp file: exists and non-empty
      if (fs.existsSync(webpPath)) {
        const webpSize = fs.statSync(webpPath).size;
        if (webpSize > 0) {
          totalWebpSize += webpSize;

          // Delete original .png file once WebP is verified
          fs.unlinkSync(pngPath);
          successCount++;

          const savedBytes = originalSize - webpSize;
          const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

          convertedList.push({
            relative: relativePath,
            origSize: formatBytes(originalSize),
            newSize: formatBytes(webpSize),
            saved: formatBytes(savedBytes),
            percent: `${savedPercent}%`
          });

          console.log(`[${i + 1}/${pngFiles.length}] ✅ Converted: ${relativePath} (${formatBytes(originalSize)} -> ${formatBytes(webpSize)}, reduced by ${savedPercent}%)`);
        } else {
          throw new Error('Generated WebP file has 0 byte size');
        }
      } else {
        throw new Error('WebP file not found after output');
      }
    } catch (err) {
      failCount++;
      console.error(`[${i + 1}/${pngFiles.length}] ❌ Error processing ${relativePath}:`, err.message);
    }
  }

  // 3. Synchronize SQLite database
  console.log('\n🗄️ Checking and synchronizing image_url fields in SQLite database...');
  const allCards = db.prepare('SELECT id, image_url FROM flashcards').all();
  let dbUpdatedCount = 0;

  const updateCardStmt = db.prepare('UPDATE flashcards SET image_url = ? WHERE id = ?');

  for (const card of allCards) {
    if (card.image_url && card.image_url.toLowerCase().includes('.png')) {
      const updatedUrl = card.image_url.replace(/\.png/gi, '.webp');
      updateCardStmt.run(updatedUrl, card.id);
      dbUpdatedCount++;
    }
  }

  console.log(`✅ Synchronized ${dbUpdatedCount} flashcard records from .png to .webp in SQLite.`);

  // 4. Summary report
  const totalSaved = totalOriginalSize - totalWebpSize;
  const totalSavedPercent = totalOriginalSize > 0 ? ((totalSaved / totalOriginalSize) * 100).toFixed(1) : 0;

  console.log('\n================================================================');
  console.log('🎉 WEBP IMAGE CONVERSION SUMMARY REPORT');
  console.log('================================================================');
  console.log(`- Total PNG files processed: ${pngFiles.length}`);
  console.log(`- Successfully converted:   ${successCount}`);
  console.log(`- Failed conversions:       ${failCount}`);
  console.log(`- Original PNG total size:  ${formatBytes(totalOriginalSize)}`);
  console.log(`- Compressed WebP total size:${formatBytes(totalWebpSize)}`);
  console.log(`- Storage saved:            ${formatBytes(totalSaved)} (Reduced by ${totalSavedPercent}%)`);
  console.log(`- Database records updated: ${dbUpdatedCount}`);
  console.log('================================================================\n');
}

convertPngToWebp().catch(e => {
  console.error('Conversion process error:', e);
  process.exit(1);
});
