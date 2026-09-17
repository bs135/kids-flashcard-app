import fs from 'fs';
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

// In-flight media mutex locks to serialize operations (e.g. check-and-unlink, updates) per target file
const pendingMediaOps = new Map();

/**
 * Executes a function with a lock on a specific disk path to prevent race conditions.
 * @param {string} fullDiskPath 
 * @param {Function} operation 
 */
export async function withMediaLock(fullDiskPath, operation) {
  const previousLock = pendingMediaOps.get(fullDiskPath) || Promise.resolve();

  const currentOperation = (async () => {
    try {
      await previousLock;
    } catch (_) {
      // Ignore errors from previous operations in the queue
    }

    try {
      return await operation();
    } finally {
      if (pendingMediaOps.get(fullDiskPath) === currentOperation) {
        pendingMediaOps.delete(fullDiskPath);
      }
    }
  })();

  pendingMediaOps.set(fullDiskPath, currentOperation);
  return currentOperation;
}

/**
 * Acquires a media lock using a public URL to synchronize with file deletions.
 * @param {string} mediaUrl 
 * @param {Function} operation 
 */
export async function withMediaUrlLock(mediaUrl, operation) {
  if (!mediaUrl || typeof mediaUrl !== 'string') {
    return operation();
  }

  let cleanUrl = mediaUrl.split('?')[0].trim();
  cleanUrl = path.posix.normalize(cleanUrl);

  const relativePath = cleanUrl.replace(/^\/uploads\//, '');
  const fullDiskPath = path.resolve(BASE_UPLOADS_DIR, relativePath);

  return withMediaLock(fullDiskPath, operation);
}

/**
 * Safely deletes a user-generated media file from local disk.
 * Safety rules:
 * 1. Strictly ignores seed media files (/uploads/seed/...) and default-placeholder.webp.
 * 2. Only deletes if URL belongs to user uploads (/uploads/user/...).
 * 3. Checks if any other flashcards reference the same media URL before deleting.
 * 4. Serializes check-and-delete operations per file path to prevent race conditions.
 * 5. Asynchronous and handles errors gracefully without throwing to caller.
 * 
 * @param {string} mediaUrl Public URL of the media file
 * @param {import('better-sqlite3').Database} db Database instance
 * @param {'image'|'audio'} mediaType Media type for reference checking
 * @param {any} [logger=console] Logger instance (fastify.log or console)
 * @returns {Promise<boolean>} True if file was deleted, false otherwise
 */
export async function safeDeleteUserMediaFile(mediaUrl, db, mediaType, logger = console) {
  if (!mediaUrl || typeof mediaUrl !== 'string') return false;

  let cleanUrl = mediaUrl.split('?')[0].trim();
  // Normalize the URL path to eliminate dot segments (. and ..) and represent the canonical URL
  cleanUrl = path.posix.normalize(cleanUrl);

  // Strict safety check: Never delete default placeholder or seed assets
  if (cleanUrl.includes('default-placeholder.webp') || cleanUrl.includes('/uploads/seed/')) {
    return false;
  }

  // Must reside in user uploads
  if (!cleanUrl.startsWith('/uploads/user/')) {
    return false;
  }

  const USER_UPLOADS_DIR = path.resolve(BASE_UPLOADS_DIR, 'user');
  const relativePath = cleanUrl.replace(/^\/uploads\//, '');
  const fullDiskPath = path.resolve(BASE_UPLOADS_DIR, relativePath);

  // Prevent path traversal attacks and strictly enforce user upload boundary
  // e.g. prevents /uploads/user/../seed/... escaping into seed assets
  if (!fullDiskPath.startsWith(USER_UPLOADS_DIR + path.sep) && fullDiskPath !== USER_UPLOADS_DIR) {
    logger.warn?.(`[Safe Delete] Security warning: Path traversal attempt prevented for ${cleanUrl}`);
    return false;
  }

  return withMediaLock(fullDiskPath, async () => {
    try {
      // Check within serialization: Does any flashcard in DB still reference this media URL?
      if (db) {
        const column = mediaType === 'audio' ? 'audio_url' : 'image_url';
        // Query if any record matches clean URL or URL with query parameters
        const countStmt = db.prepare(`SELECT COUNT(*) as count FROM flashcards WHERE ${column} = ? OR ${column} LIKE ?`);
        const existingRefs = countStmt.get(cleanUrl, `${cleanUrl}?%`)?.count || 0;
        if (existingRefs > 0) {
          logger.info?.(`[Safe Delete] Media file ${cleanUrl} is still referenced by ${existingRefs} cards. Skipping deletion.`);
          return false;
        }
      }

      if (fs.existsSync(fullDiskPath)) {
        await fs.promises.unlink(fullDiskPath);
        logger.info?.(`[Safe Delete] Successfully removed orphaned user media file: ${fullDiskPath}`);
        return true;
      }
    } catch (err) {
      logger.warn?.(`[Safe Delete] Failed to delete user media file ${cleanUrl}: ${err.message}`);
    }
    return false;
  });
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
