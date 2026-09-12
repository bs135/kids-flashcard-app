import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { slugify } from '../utils/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseAudioDir = path.resolve(__dirname, '../../uploads/audio');

if (!fs.existsSync(baseAudioDir)) {
  fs.mkdirSync(baseAudioDir, { recursive: true });
}

/**
 * Generates an MP3 audio file using Edge-TTS (natural child voice en-US-AnaNeural)
 * and stores it directly at backend/uploads/audio/{topicSlug}/{wordSlug}.mp3
 * @param {string} word English vocabulary word
 * @param {string} [topicSlug='general'] Topic slug identifier
 * @param {string} [voiceName='en-US-AnaNeural'] Microsoft Edge voice name
 * @returns {Promise<string>} Local relative URL format: /uploads/audio/{topicSlug}/{wordSlug}.mp3
 */
export async function downloadWordAudio(word, topicSlug = 'general', voiceName = 'en-US-AnaNeural') {
  const safeTopic = slugify(topicSlug);
  const safeWord = slugify(word);

  const topicAudioDir = path.join(baseAudioDir, safeTopic);
  if (!fs.existsSync(topicAudioDir)) {
    fs.mkdirSync(topicAudioDir, { recursive: true });
  }

  const filename = `${safeWord}.mp3`;
  const filePath = path.join(topicAudioDir, filename);
  const publicUrl = `/uploads/audio/${safeTopic}/${filename}`;

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
