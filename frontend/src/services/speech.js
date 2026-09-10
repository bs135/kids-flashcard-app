// Service phát âm tiếng Anh cho trẻ em:
// 1. Khởi tạo & nạp sẵn danh sách voices ngay khi module được load
// 2. Phát âm ngay lập tức (< 0.2s) bằng Web Speech API chuẩn trình duyệt
// 3. Tự động tìm giọng đọc US chuẩn, rõ ràng, tốc độ vừa phải cho trẻ (rate 0.95)

let cachedVoice = null;

// Khởi tạo và preload voices
function initVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const updateVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Ưu tiên chọn giọng đọc tiếng Anh Mỹ tự nhiên
    cachedVoice = voices.find(v => 
      v.lang.startsWith('en-US') && 
      (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Ava'))
    ) || voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
  };

  updateVoice();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoice;
  }
}

// Gọi khởi tạo ngay
initVoices();

/**
 * Phát âm từ tiếng Anh tức thì
 * @param {string} text Từ hoặc câu tiếng Anh cần đọc
 * @param {string|null} audioUrl File audio cục bộ (nếu có và muốn dùng)
 * @returns {Promise<boolean>}
 */
export function speakWord(text, audioUrl = null) {
  return new Promise((resolve) => {
    // 1. Nếu là file audio local hợp lệ từ server (/uploads/...) và không phải link bên thứ 3 chậm chạp
    if (audioUrl && audioUrl.startsWith('/uploads/')) {
      const audio = new Audio(audioUrl);
      
      // Giới hạn timeout 1.2 giây để tránh treo lâu nếu file lỗi
      const timeoutId = setTimeout(() => {
        console.warn(`[Audio] Audio file timeout sau 1.2s, chuyển sang Web Speech.`);
        audio.pause();
        audio.src = '';
        speakWithWebSpeech(text, resolve);
      }, 1200);

      audio.onplay = () => clearTimeout(timeoutId);
      audio.onended = () => resolve(true);
      audio.onerror = () => {
        clearTimeout(timeoutId);
        speakWithWebSpeech(text, resolve);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          clearTimeout(timeoutId);
          speakWithWebSpeech(text, resolve);
        });
      }
      return;
    }

    // 2. Mặc định phát âm NGAY LẬP TỨC bằng Web Speech API (< 0.2s)
    speakWithWebSpeech(text, resolve);
  });
}

function speakWithWebSpeech(text, callback) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Trình duyệt không hỗ trợ Web Speech API');
    if (callback) callback(false);
    return;
  }

  // Hủy các câu đọc dở trước đó để phát câu mới ngay lập tức
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95; // Tốc độ tự nhiên, rõ ràng, không bị chậm lề mề
  utterance.pitch = 1.05; // Cao hơn một chút, phát âm vui tươi cho trẻ nhỏ

  if (!cachedVoice) {
    const voices = window.speechSynthesis.getVoices();
    cachedVoice = voices.find(v => v.lang.startsWith('en-US')) || voices[0];
  }

  if (cachedVoice) {
    utterance.voice = cachedVoice;
  }

  utterance.onend = () => {
    if (callback) callback(true);
  };

  utterance.onerror = (e) => {
    console.warn('Web Speech error:', e);
    if (callback) callback(false);
  };

  // Phát âm ngay
  window.speechSynthesis.speak(utterance);
}
