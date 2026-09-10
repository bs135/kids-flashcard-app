import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const audioDir = path.resolve(__dirname, '../../uploads/audio');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

/**
 * Sinh file audio mp3 bằng Edge-TTS (giọng trẻ em / tự nhiên en-US-AnaNeural)
 * và lưu trực tiếp về backend/uploads/audio/{cleanWord}.mp3
 * @param {string} word Từ tiếng Anh
 * @param {string} [voiceName] Tên giọng đọc Microsoft Edge (mặc định: en-US-AnaNeural)
 * @returns {Promise<string>} Đường dẫn cục bộ dạng /uploads/audio/{cleanWord}.mp3
 */
export async function downloadWordAudio(word, voiceName = 'en-US-AnaNeural') {
  const cleanWord = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `${cleanWord}.mp3`;
  const filePath = path.join(audioDir, filename);
  const publicUrl = `/uploads/audio/${filename}`;

  // Nếu file đã tồn tại và có dung lượng > 0 thì tái sử dụng cache
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
    return publicUrl;
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    // toStream trả về { audioStream, metadataStream }
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
    console.warn(`[Edge-TTS] Lỗi sinh audio cho từ "${word}":`, error.message);
    // Thử fallback sang giọng en-US-JennyNeural
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
      console.error(`[Edge-TTS Fallback] Thất bại cho từ "${word}":`, fallbackError.message);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      return null;
    }
  }
}
