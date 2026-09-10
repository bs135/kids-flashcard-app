import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesDir = path.resolve(__dirname, '../../uploads/images');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/**
 * Tạo URL prompt Pollinations.ai chuẩn hoạt hình cho trẻ em
 */
export function buildPollinationsUrl(word, category = '') {
  let promptText = '';
  const lowerWord = word.trim().toLowerCase();

  if (category === 'colors' || ['red', 'blue', 'yellow', 'green', 'pink', 'orange', 'purple', 'brown', 'black', 'white'].includes(lowerWord)) {
    const colorItems = {
      red: 'red apple and red paint splash',
      blue: 'blue ocean water drop and blue sky cloud',
      yellow: 'bright yellow smiling sun and yellow banana',
      green: 'green leaf and cute green frog',
      pink: 'sweet pink candy and pink flower',
      orange: 'juicy orange fruit and orange juice',
      purple: 'purple grapes cluster',
      brown: 'brown cute teddy bear',
      black: 'cute black hat',
      white: 'fluffy white cloud'
    };
    const item = colorItems[lowerWord] || `${lowerWord} color paint splash`;
    promptText = `simple ${item}, vibrant ${lowerWord} color, cute cartoon illustration for kids, clear object, simple white background, no human`;
  } else {
    promptText = `cute cartoon ${lowerWord} illustration for kids, 3d pixar style, colorful, clear single object, centered, simple white background, no human, high quality`;
  }

  const encodedPrompt = encodeURIComponent(promptText);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&nologo=true&seed=42`;
}

/**
 * Tải ảnh từ Pollinations.ai (kèm retry) và chuyển đổi sang WebP lưu tại /uploads/images/{cleanWord}.webp
 * @param {string} word Từ tiếng Anh
 * @param {string} category Chủ đề
 * @returns {Promise<string>} Đường dẫn cục bộ dạng /uploads/images/{cleanWord}.webp
 */
export async function downloadAndConvertKidImage(word, category = '') {
  const cleanWord = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `${cleanWord}.webp`;
  const filePath = path.join(imagesDir, filename);
  const publicUrl = `/uploads/images/${filename}`;

  // Nếu file đã tồn tại và hợp lệ (> 1KB) thì dùng cache
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
    return publicUrl;
  }

  const imageUrl = buildPollinationsUrl(word, category);

  // Thử tải với retry nếu gặp rate limit (429)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < 3) {
          console.log(`[ImageService] Rate limit 429 cho "${word}", đợi ${attempt * 2}s thử lại...`);
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }
        throw new Error(`HTTP error ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Dùng sharp để chuyển đổi sang WebP
      await sharp(buffer)
        .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .webp({ quality: 85 })
        .toFile(filePath);

      return publicUrl;
    } catch (error) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        console.warn(`[ImageService] Không thể tải ảnh cho "${word}":`, error.message);
        return imageUrl; // Fallback URL online nếu tải về máy thất bại
      }
    }
  }

  return imageUrl;
}
