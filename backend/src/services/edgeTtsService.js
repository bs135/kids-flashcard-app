import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { slugify } from '../utils/slugify.js';
import { getMediaPath } from '../utils/mediaPath.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates an MP3 audio file using Edge-TTS (natural child voice en-US-AnaNeural)
 * and stores it at:
 * - Seed scope: /uploads/seed/audio/{wordSlug}.mp3
 * - User scope: /uploads/user/audio/{wordSlug}.mp3
 * @param {string} word English vocabulary word
 * @param {string} [topicSlug='general'] Topic slug identifier (for logging/metadata)
 * @param {string} [voiceName='en-US-AnaNeural'] Microsoft Edge voice name
 * @param {'user'|'seed'} [scope='user'] Target media scope ('user' for custom/runtime, 'seed' for initial seed)
 * @param {string|null} [userId=null] Optional user ID for multi-tenant isolation
 * @returns {Promise<string>} Local relative public URL
 */
export async function downloadWordAudio(
  word,
  topicSlug = 'general',
  voiceName = 'en-US-AnaNeural',
  scope = 'user',
  userId = null
) {
  const safeTopic = slugify(topicSlug);
  const mediaInfo = getMediaPath({
    type: 'audio',
    scope,
    topicSlug: safeTopic,
    word,
    ext: 'mp3',
    userId
  });

  const filePath = mediaInfo.filePath;
  const publicUrl = mediaInfo.publicUrl;

  if (!fs.existsSync(mediaInfo.dirPath)) {
    fs.mkdirSync(mediaInfo.dirPath, { recursive: true });
  }

  // Reuse cached file if it exists and has size > 500 bytes
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
    return publicUrl;
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    // toStream returns { audioStream, metadataStream }
    const { audioStream } = tts.toStream(word.trim());
    const writeStream = fs.createWriteStream(filePath);

    await new Promise((resolve, reject) => {
      audioStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      audioStream.on('error', reject);
    });

    return publicUrl;
  } catch (error) {
    console.warn(`[Edge-TTS] Error generating audio for "${word}":`, error.message);
    // Fallback to en-US-JennyNeural voice
    try {
      const fallbackTts = new MsEdgeTTS();
      await fallbackTts.setMetadata('en-US-JennyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = fallbackTts.toStream(word.trim());
      const writeStream = fs.createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        audioStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        audioStream.on('error', reject);
      });

      return publicUrl;
    } catch (fallbackError) {
      console.error(`[Edge-TTS Fallback] Failed generating audio for "${word}":`, fallbackError.message);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      return null;
    }
  }
}
