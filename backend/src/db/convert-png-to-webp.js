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
 * Quét đệ quy tìm tất cả file .png trong thư mục
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
  console.log('🔍 Đang quét đệ quy các file .png trong:', imagesRoot);
  const pngFiles = getAllPngFiles(imagesRoot);

  console.log(`📌 Tìm thấy tổng cộng: ${pngFiles.length} file .png.\n`);

  if (pngFiles.length === 0) {
    console.log('✨ Không có file .png nào cần chuyển đổi.');
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

    // Đường dẫn file .webp cùng tên, cùng vị trí
    const webpPath = pngPath.substring(0, pngPath.lastIndexOf('.')) + '.webp';

    try {
      // 1. Chuyển đổi sang WebP bằng sharp với quality: 85
      await sharp(pngPath)
        .webp({ quality: 85 })
        .toFile(webpPath);

      // 2. Kiểm tra xác thực file .webp mới tạo: tồn tại và dung lượng > 0
      if (fs.existsSync(webpPath)) {
        const webpSize = fs.statSync(webpPath).size;
        if (webpSize > 0) {
          totalWebpSize += webpSize;

          // Xóa file .png gốc sau khi đã xác thực file webp thành công
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

          console.log(`[${i + 1}/${pngFiles.length}] ✅ Đã chuyển đổi: ${relativePath} (${formatBytes(originalSize)} -> ${formatBytes(webpSize)}, giảm ${savedPercent}%)`);
        } else {
          throw new Error('File WebP tạo ra có dung lượng 0 byte');
        }
      } else {
        throw new Error('Không tìm thấy file WebP sau khi xuất');
      }
    } catch (err) {
      failCount++;
      console.error(`[${i + 1}/${pngFiles.length}] ❌ Lỗi khi xử lý ${relativePath}:`, err.message);
    }
  }

  // 3. Đồng bộ Cơ sở dữ liệu SQLite
  console.log('\n🗄️ Đang kiểm tra và đồng bộ lại các trường image_url trong CSDL SQLite...');
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

  console.log(`✅ Đã đồng bộ ${dbUpdatedCount} bản ghi flashcard từ đuôi .png sang .webp trong SQLite.`);

  // 4. Báo cáo kết quả tổng kết
  const totalSaved = totalOriginalSize - totalWebpSize;
  const totalSavedPercent = totalOriginalSize > 0 ? ((totalSaved / totalOriginalSize) * 100).toFixed(1) : 0;

  console.log('\n================================================================');
  console.log('🎉 BÁO CÁO KẾT QUẢ CHUYỂN ĐỔI HÌNH ẢNH SANG WEBP');
  console.log('================================================================');
  console.log(`- Tổng số file PNG được xử lý: ${pngFiles.length}`);
  console.log(`- Số file thành công:          ${successCount}`);
  console.log(`- Số file thất bại:            ${failCount}`);
  console.log(`- Dung lượng PNG ban đầu:      ${formatBytes(totalOriginalSize)}`);
  console.log(`- Dung lượng WebP sau nén:     ${formatBytes(totalWebpSize)}`);
  console.log(`- Dung lượng tiết kiệm được:   ${formatBytes(totalSaved)} (Giảm ${totalSavedPercent}%)`);
  console.log(`- Số bản ghi CSDL đã đồng bộ:  ${dbUpdatedCount}`);
  console.log('================================================================\n');
}

convertPngToWebp().catch(e => {
  console.error('Lỗi quy trình:', e);
  process.exit(1);
});
