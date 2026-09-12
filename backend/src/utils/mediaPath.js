import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from './slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for all media uploads
export const BASE_UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/**
 * Resolves disk file path and public URL for a media asset.
 * 
 * Supports two scopes:
 * - 'seed': Default system assets tracked by Git
 *   - images: uploads/seed/images/{topic_slug}/{word_slug}.webp -> /uploads/seed/images/{topic_slug}/{word_slug}.webp
 *   - audio:  uploads/seed/audio/{word_slug}.mp3 -> /uploads/seed/audio/{word_slug}.mp3
 * - 'user': User-generated / uploaded assets ignored by Git
 *   - images: uploads/user/images/{topic_slug}/{word_slug}.webp (or uploads/user/{userId}/images/...)
 *   - audio:  uploads/user/audio/{word_slug}.mp3
 * 
 * @param {Object} params
 * @param {'image'|'audio'} params.type Media type ('image' or 'audio')
 * @param {'seed'|'user'} [params.scope='user'] Scope ('seed' or 'user')
 * @param {string} [params.topicSlug='general'] Topic slug identifier
 * @param {string} params.word English vocabulary word
 * @param {string} [params.ext] Extension without dot ('webp' or 'mp3')
 * @param {string|null} [params.userId=null] Optional user/profile ID for future multi-tenant expansion
 * @returns {{ filePath: string, publicUrl: string, dirPath: string, filename: string }}
 */
export function getMediaPath({
  type,
  scope = 'user',
  topicSlug = 'general',
  word,
  ext = null,
  userId = null
}) {
  const safeScope = scope === 'seed' ? 'seed' : 'user';
  const safeType = type === 'audio' ? 'audio' : 'images';
  const safeTopic = slugify(topicSlug);
  const safeWord = slugify(word);
  const fileExtension = ext || (safeType === 'audio' ? 'mp3' : 'webp');
  const filename = `${safeWord}.${fileExtension}`;

  let relativeDirParts = [safeScope];

  // Optional multi-tenant user profile support for user-generated assets
  if (safeScope === 'user' && userId) {
    relativeDirParts.push(String(userId));
  }

  relativeDirParts.push(safeType);

  // Group images by topic slug; audio is kept flat for global sharing across topics
  if (safeType === 'images') {
    relativeDirParts.push(safeTopic);
  }

  const dirPath = path.join(BASE_UPLOADS_DIR, ...relativeDirParts);
  const filePath = path.join(dirPath, filename);
  const relativeUrlPath = [...relativeDirParts, filename].join('/');
  const publicUrl = `/uploads/${relativeUrlPath}`;

  return {
    dirPath,
    filePath,
    filename,
    publicUrl
  };
}

/**
 * Helper to convert disk paths or existing URLs into public URLs
 * @param {string} diskOrUrlPath
 * @returns {string} Public URL path starting with /uploads/...
 */
export function resolveMediaUrl(diskOrUrlPath) {
  if (!diskOrUrlPath) return '';
  if (diskOrUrlPath.startsWith('/uploads/')) return diskOrUrlPath;
  if (diskOrUrlPath.startsWith('http://') || diskOrUrlPath.startsWith('https://')) return diskOrUrlPath;

  const normalized = diskOrUrlPath.replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return normalized.substring(uploadsIndex);
  }
  return `/uploads/${normalized.replace(/^\/+/, '')}`;
}
