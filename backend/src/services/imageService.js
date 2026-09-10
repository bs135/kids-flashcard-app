import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { refineImagePromptWithGemini } from './geminiService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesDir = path.resolve(__dirname, '../../uploads/images');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

/**
 * 1. Tìm kiếm và lấy URL ảnh thật/vector chuẩn xác từ Unsplash hoặc Pexels API
 * @param {string} word Từ vựng tiếng Anh
 * @param {string} category Chủ đề
 * @returns {Promise<string|null>} URL hình ảnh
 */
export async function searchRealVectorImageUrl(word, category = '') {
  const cleanWord = word.trim().toLowerCase();
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;

  // A. Thử Unsplash API (nếu có key)
  if (unsplashKey) {
    try {
      const query = encodeURIComponent(`${cleanWord} cartoon illustration vector`);
      const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=squarish&client_id=${unsplashKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const photo = data.results?.[0];
        if (photo?.urls?.regular || photo?.urls?.small) {
          return photo.urls.regular || photo.urls.small;
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
      const url = `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=square`;
      const res = await fetch(url, {
        headers: { Authorization: pexelsKey },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        const photo = data.photos?.[0];
        if (photo?.src?.large || photo?.src?.medium) {
          return photo.src.large || photo.src.medium;
        }
      }
    } catch (e) {
      console.warn(`[Pexels Search] Thất bại cho "${cleanWord}":`, e.message);
    }
  }

  // C. Unsplash Public Source Direct Fallback (Không cần API key)
  // Lấy ảnh định dạng square từ Unsplash Source query
  return `https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80`;
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
 * @param {string} word Từ tiếng Anh
 * @param {string} category Chủ đề
 * @param {string} [imageSource='ai_refined'] Nguồn tạo ảnh ('ai_refined' hoặc 'unsplash')
 * @param {boolean} [forceOverwrite=false] Ghi đè file ảnh nếu đã tồn tại
 * @returns {Promise<string>} Đường dẫn cục bộ /uploads/images/{cleanWord}.webp
 */
export async function downloadAndConvertKidImage(word, category = '', imageSource = 'ai_refined', forceOverwrite = false) {
  const cleanWord = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `${cleanWord}.webp`;
  const filePath = path.join(imagesDir, filename);
  const publicUrl = `/uploads/images/${filename}`;

  // Nếu không yêu cầu ghi đè và file đã tồn tại hợp lệ thì dùng cache
  if (!forceOverwrite && fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
    return publicUrl;
  }

  let sourceImageUrl = '';

  if (imageSource === 'unsplash') {
    // Chế độ Ảnh thật / Vector Unsplash
    sourceImageUrl = await searchRealVectorImageUrl(word, category);
  } else {
    // Chế độ AI Refined (Gemini Refiner + Pollinations.ai)
    sourceImageUrl = await buildAiRefinedImageUrl(word, category);
  }

  const success = await downloadAndSaveWebp(sourceImageUrl, filePath);
  if (success) {
    return publicUrl;
  }

  // Fallback nếu không tải được file cục bộ: trả về online URL
  return sourceImageUrl;
}
