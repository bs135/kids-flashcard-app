import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import db, { initDatabase } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Scan both legacy uploads/images and modular uploads/{seed,user}/images
const uploadsRoot = path.resolve(__dirname, '../../uploads');

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
  console.log('🔍 Recursively scanning for .png files in:', uploadsRoot);
  const pngFiles = getAllPngFiles(uploadsRoot);

  console.log(`📌 Found a total of: ${pngFiles.length} .png files.\n`);
  if (pngFiles.length === 0) {
    console.log('✨ No .png files require conversion. Running consistency sync only...');
  }

  let totalOriginalSize = 0;
  let totalWebpSize = 0;
  let successCount = 0;
  let failCount = 0;
  let dbUpdatedCount = 0;

  const convertedList = [];

  for (let i = 0; i < pngFiles.length; i++) {
    const pngPath = pngFiles[i];
    const relativePath = path.relative(uploadsRoot, pngPath);
    const originalSize = fs.statSync(pngPath).size;
    totalOriginalSize += originalSize;

    // Destination .webp path with same name in same directory
    const webpPath = pngPath.substring(0, pngPath.lastIndexOf('.')) + '.webp';
    const tempWebpPath = pngPath.substring(0, pngPath.lastIndexOf('.')) + '.tmp.webp';

    // Formulate the corresponding public URL path (e.g. /uploads/seed/images/...)
    const normalizedRelativePath = relativePath.replace(/\\/g, '/');
    const oldPublicUrl = `/uploads/${normalizedRelativePath}`;
    const newPublicUrl = oldPublicUrl.substring(0, oldPublicUrl.lastIndexOf('.')) + '.webp';

    try {
      // 1. Convert to WebP using sharp with quality: 85 into a temporary file
      await sharp(pngPath)
        .webp({ quality: 85 })
        .toFile(tempWebpPath);

      // 2. Validate newly generated .tmp.webp file: exists and non-empty
      if (fs.existsSync(tempWebpPath)) {
        const webpSize = fs.statSync(tempWebpPath).size;
        if (webpSize > 0) {
          const webpExistedBefore = fs.existsSync(webpPath);
          const backupWebpPath = `${webpPath}.bak`;

          // Stage existing webp if present for compensating recovery
          if (webpExistedBefore) {
            fs.copyFileSync(webpPath, backupWebpPath);
          }

          let syncedChanges = 0;
          let dbSyncApplied = false;
          try {
            // Promote new WebP into place
            fs.renameSync(tempWebpPath, webpPath);

            // Execute SQLite update transaction
            const syncCardTx = db.transaction(() => {
              // Match exact URL or URL with query parameters (e.g., ?t=...)
              const result = db.prepare(`
                UPDATE flashcards 
                SET image_url = ? 
                WHERE image_url = ? OR image_url LIKE ?
              `).run(newPublicUrl, oldPublicUrl, `${oldPublicUrl}?%`);
              syncedChanges = result.changes || 0;
            });
            syncCardTx();
            dbSyncApplied = true;

            // Only delete original PNG after DB update succeeds
            fs.unlinkSync(pngPath);

            // Clean up temporary backup of old WebP upon success
            if (webpExistedBefore && fs.existsSync(backupWebpPath)) {
              try { fs.unlinkSync(backupWebpPath); } catch (_) {}
            }

            if (syncedChanges > 0) {
              dbUpdatedCount += syncedChanges;
            }
          } catch (txOrFileErr) {
            if (dbSyncApplied) {
              try {
                db.prepare(`
                  UPDATE flashcards
                  SET image_url = ?
                  WHERE image_url = ?
                `).run(oldPublicUrl, newPublicUrl);
              } catch (_) {}
            }

            // Reconcile filesystem state if DB transaction or subsequent step fails:
            // 1. Remove newly placed WebP file
            try {
              if (fs.existsSync(webpPath)) {
                fs.unlinkSync(webpPath);
              }
            } catch (_) {}

            // 2. Restore previous WebP file if one existed before
            if (webpExistedBefore && fs.existsSync(backupWebpPath)) {
              try {
                fs.renameSync(backupWebpPath, webpPath);
              } catch (_) {}
            }

            throw txOrFileErr;
          }

          totalWebpSize += webpSize;
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
      if (fs.existsSync(tempWebpPath)) {
        try { fs.unlinkSync(tempWebpPath); } catch (_) {}
      }
      console.error(`[${i + 1}/${pngFiles.length}] ❌ Error processing ${relativePath}:`, err.message);
    }
  }

  // Synchronize any remaining matching records whose WebP counterpart already exists on disk
  console.log('\n🗄️ Verifying image_url consistency in SQLite database...');
  const allCards = db.prepare('SELECT id, image_url FROM flashcards').all();

  const updateCardStmt = db.prepare('UPDATE flashcards SET image_url = ? WHERE id = ?');
  const syncRemainingTx = db.transaction(() => {
    for (const card of allCards) {
      if (card.image_url) {
        // Strip query string (e.g. ?t=...) to normalize URL comparison
        const cleanImageUrl = card.image_url.split('?')[0].trim();
        if (cleanImageUrl.toLowerCase().endsWith('.png')) {
          const potentialWebpUrl = cleanImageUrl.substring(0, cleanImageUrl.lastIndexOf('.')) + '.webp';
          const relativeDiskPath = potentialWebpUrl.replace(/^\/uploads\//, '');
          const targetDiskFile = path.join(uploadsRoot, relativeDiskPath);
          // Only update database if the corresponding WebP file actually exists on disk
          if (fs.existsSync(targetDiskFile) && fs.statSync(targetDiskFile).size > 0) {
            updateCardStmt.run(potentialWebpUrl, card.id);
            dbUpdatedCount++;
          }
        }
      }
    }
  });
  syncRemainingTx();

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
