import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { refineImagePromptWithGemini } from './geminiService.js';
import { slugify } from '../utils/slugify.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseImagesDir = path.resolve(__dirname, '../../uploads/images');

if (!fs.existsSync(baseImagesDir)) {
  fs.mkdirSync(baseImagesDir, { recursive: true });
}

/**
 * 1. Tìm kiếm và lấy URL ảnh thật/vector chuẩn xác từ Unsplash hoặc Pexels API
 * Hỗ trợ lấy ngẫu nhiên theo page hoặc chọn ngẫu nhiên trong danh sách kết quả để mỗi lần regenerate ra ảnh mới
 * @param {string} word Từ vựng tiếng Anh
 * @param {string} category Chủ đề
 * @returns {Promise<string|null>} URL hình ảnh
 */
export async function searchRealVectorImageUrl(word, category = '') {
  const cleanWord = word.trim().toLowerCase();
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;

  // Chọn trang ngẫu nhiên từ 1 đến 5 để lấy kết quả phong phú
  const randomPage = Math.floor(Math.random() * 5) + 1;

  // A. Thử Unsplash API (nếu có key)
  if (unsplashKey) {
    try {
      const query = encodeURIComponent(`${cleanWord} illustration vector`);
      const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=10&page=${randomPage}&orientation=squarish&client_id=${unsplashKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        if (results.length > 0) {
          const randomPhoto = results[Math.floor(Math.random() * results.length)];
          const photoUrl = randomPhoto?.urls?.regular || randomPhoto?.urls?.small;
          if (photoUrl) return photoUrl;
        }
      }
    } catch (e) {
      console.warn(`[Unsplash Search] Thất bại cho "${cleanWord}":`, e.message);
    }
  }

  // B. Thử Pexels API (nếu có key)
  if (pexelsKey) {
    try {
      const query = encodeURIComponent(`${cleanWord} illustration`);
      const url = `https://api.pexels.com/v1/search?query=${query}&per_page=10&page=${randomPage}&orientation=square`;
      const res = await fetch(url, {
        headers: { Authorization: pexelsKey },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        const photos = data.photos || [];
        if (photos.length > 0) {
          const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
          const photoUrl = randomPhoto?.src?.large || randomPhoto?.src?.medium;
          if (photoUrl) return photoUrl;
        }
      }
    } catch (e) {
      console.warn(`[Pexels Search] Thất bại cho "${cleanWord}":`, e.message);
    }
  }

  // C. Fallback: Nếu không tìm được ảnh từ Unsplash/Pexels, sinh qua Pollinations với seed ngẫu nhiên
  const fallbackSeed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/cute%20cartoon%20${encodeURIComponent(cleanWord)}%20vector%20isolated%20white%20background?width=400&height=400&nologo=true&seed=${fallbackSeed}`;
}

/**
 * 2. Tạo URL Pollinations.ai sử dụng Prompt đã được Gemini tinh chỉnh (AI Refined)
 * @param {string} word
 * @param {string} category
 * @returns {Promise<string>}
 */
export async function buildAiRefinedImageUrl(word, category = '') {
  const seed = Math.floor(Math.random() * 1000000);
  const refinedPrompt = await refineImagePromptWithGemini(word, category);
  const encodedPrompt = encodeURIComponent(refinedPrompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&nologo=true&seed=${seed}`;
}

/**
 * 3. Tải ảnh từ URL bất kỳ, resize và chuyển đổi thành định dạng WebP lưu vào đĩa
 * @param {string} sourceUrl
 * @param {string} destinationFilePath
 * @returns {Promise<boolean>}
 */
async function downloadAndSaveWebp(sourceUrl, destinationFilePath) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }
        throw new Error(`HTTP error ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Ghi đè file ảnh .webp mới
      await sharp(buffer)
        .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .webp({ quality: 85 })
        .toFile(destinationFilePath);

      return true;
    } catch (err) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        console.warn(`[ImageService] Không thể lưu webp từ ${sourceUrl}:`, err.message);
        return false;
      }
    }
  }
  return false;
}

/**
 * 4. Tải và chuyển đổi ảnh cho từ vựng theo nguồn lựa chọn ('ai_refined' | 'unsplash')
 * Lưu trữ theo thư mục con phân tách theo từng chủ đề: /uploads/images/{topicSlug}/{wordSlug}.webp
 * @param {string} word Từ tiếng Anh
 * @param {string} topicSlug Chủ đề (VD: 'domestic-animals', 'colors')
 * @param {string} [imageSource='ai_refined'] Nguồn tạo ảnh ('ai_refined' hoặc 'unsplash')
 * @param {boolean} [force=false] Bắt buộc ghi đè file ảnh cũ (bỏ qua cache file trên đĩa)
 * @returns {Promise<string>} Đường dẫn cục bộ /uploads/images/{topicSlug}/{wordSlug}.webp
 */
export async function downloadAndConvertKidImage(word, topicSlug = 'general', imageSource = 'ai_refined', force = false) {
  const safeTopic = slugify(topicSlug);
  const safeWord = slugify(word);

  const topicImagesDir = path.join(baseImagesDir, safeTopic);
  if (!fs.existsSync(topicImagesDir)) {
    fs.mkdirSync(topicImagesDir, { recursive: true });
  }

  const filename = `${safeWord}.webp`;
  const filePath = path.join(topicImagesDir, filename);
  const publicUrl = `/uploads/images/${safeTopic}/${filename}`;

  // NẾU KHÔNG FORCE VÀ FILE ĐÃ TỒN TẠI HỢP LỆ TRÊN ĐĨA -> DÙNG CACHE
  if (!force && fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
    return publicUrl;
  }

  // Khi force === true hoặc file chưa có: Bắt buộc lấy nguồn ảnh mới và tải ghi đè
  let sourceImageUrl = '';

  if (imageSource === 'unsplash') {
    sourceImageUrl = await searchRealVectorImageUrl(word, safeTopic);
  } else {
    sourceImageUrl = await buildAiRefinedImageUrl(word, safeTopic);
  }

  const success = await downloadAndSaveWebp(sourceImageUrl, filePath);
  if (success) {
    return publicUrl;
  }

  // Fallback nếu không tải được file cục bộ: trả về online URL
  return sourceImageUrl;
}
