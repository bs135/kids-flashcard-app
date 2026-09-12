import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { refineImagePromptWithGemini } from './geminiService.js';
import { slugify } from '../utils/slugify.js';
import { getMediaPath } from '../utils/mediaPath.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 1. Searches and fetches vector/illustration image URLs from Unsplash or Pexels API
 * Supports randomized pagination and result selection for fresh variations on regeneration
 * @param {string} word English vocabulary word
 * @param {string} category Topic category
 * @returns {Promise<string|null>} Image URL
 */
export async function searchRealVectorImageUrl(word, category = '') {
  const cleanWord = word.trim().toLowerCase();
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;

  // Pick random page between 1 and 5 for diverse results
  const randomPage = Math.floor(Math.random() * 5) + 1;

  // A. Try Unsplash API (if key exists)
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
      console.warn(`[Unsplash Search] Failed for "${cleanWord}":`, e.message);
    }
  }

  // B. Try Pexels API (if key exists)
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
      console.warn(`[Pexels Search] Failed for "${cleanWord}":`, e.message);
    }
  }

  // C. Fallback: If no image found via Unsplash/Pexels, generate via Pollinations with random seed
  const fallbackSeed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/cute%20cartoon%20${encodeURIComponent(cleanWord)}%20vector%20isolated%20white%20background?width=400&height=400&nologo=true&seed=${fallbackSeed}`;
}

/**
 * 2. Builds Pollinations.ai URL using Gemini-refined image prompt
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
 * 3. Downloads an image from a URL, resizes, and converts it to WebP on disk
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

      // Write optimized .webp file
      await sharp(buffer)
        .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .webp({ quality: 85 })
        .toFile(destinationFilePath);

      return true;
    } catch (err) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        console.warn(`[ImageService] Unable to save webp from ${sourceUrl}:`, err.message);
        return false;
      }
    }
  }
  return false;
}

/**
 * 4. Downloads and converts image for vocabulary word based on source ('ai_refined' | 'unsplash')
 * Stored in topic subdirectories:
 * - Seed scope: /uploads/seed/images/{topicSlug}/{wordSlug}.webp
 * - User scope: /uploads/user/images/{topicSlug}/{wordSlug}.webp
 * @param {string} word English vocabulary word
 * @param {string} topicSlug Topic category slug (e.g., 'pets-farm-animals', 'colors')
 * @param {string} [imageSource='ai_refined'] Image generation source ('ai_refined' or 'unsplash')
 * @param {boolean} [force=false] Force overwrite existing file (bypass disk cache)
 * @param {'user'|'seed'} [scope='user'] Target media scope ('user' for custom/runtime, 'seed' for initial seed)
 * @param {string|null} [userId=null] Optional user ID for multi-tenant isolation
 * @returns {Promise<string>} Local relative public URL
 */
export async function downloadAndConvertKidImage(
  word,
  topicSlug = 'general',
  imageSource = 'ai_refined',
  force = false,
  scope = 'user',
  userId = null
) {
  const safeTopic = slugify(topicSlug);
  const mediaInfo = getMediaPath({
    type: 'image',
    scope,
    topicSlug: safeTopic,
    word,
    ext: 'webp',
    userId
  });

  if (!fs.existsSync(mediaInfo.dirPath)) {
    fs.mkdirSync(mediaInfo.dirPath, { recursive: true });
  }

  // IF NOT FORCED AND FILE ALREADY EXISTS VALID ON DISK -> REUSE CACHE
  if (!force && fs.existsSync(mediaInfo.filePath) && fs.statSync(mediaInfo.filePath).size > 1024) {
    return mediaInfo.publicUrl;
  }

  // When force === true or file does not exist: fetch new source and overwrite
  let sourceImageUrl = '';

  if (imageSource === 'unsplash') {
    sourceImageUrl = await searchRealVectorImageUrl(word, safeTopic);
  } else {
    sourceImageUrl = await buildAiRefinedImageUrl(word, safeTopic);
  }

  const success = await downloadAndSaveWebp(sourceImageUrl, mediaInfo.filePath);
  if (success) {
    return mediaInfo.publicUrl;
  }

  // Fallback if local download fails: return online URL
  return sourceImageUrl;
}
