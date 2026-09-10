// Phát âm tiếng Anh với cơ chế Fallback thông minh:
// 1. Thử phát từ file audio URL (chất lượng studio hoặc backend)
// 2. Nếu không có hoặc lỗi: Tự động phát âm bằng Web Speech API (SpeechSynthesis)

export function speakWord(text, audioUrl = null) {
  return new Promise((resolve) => {
    // 1. Thử phát file audio nếu có
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => resolve(true);
      audio.onerror = () => {
        console.warn(`[AudioFallback] Lỗi tải file audio từ ${audioUrl}, chuyển sang Web Speech API.`);
        fallbackWebSpeech(text, resolve);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[AudioFallback] Trình duyệt chặn autoplay hoặc lỗi file:', err);
          fallbackWebSpeech(text, resolve);
        });
      }
      return;
    }

    // 2. Fallback Web Speech API
    fallbackWebSpeech(text, resolve);
  });
}

function fallbackWebSpeech(text, callback) {
  if (!('speechSynthesis' in window)) {
    console.warn('Trình duyệt không hỗ trợ Web Speech API');
    if (callback) callback(false);
    return;
  }

  // Dừng phát âm trước đó nếu có
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85; // Đọc chậm một chút để trẻ dễ nghe và bắt chước
  utterance.pitch = 1.1; // Tông giọng hơi cao, thân thiện với trẻ em

  // Tìm giọng US chuẩn nếu có
  const voices = window.speechSynthesis.getVoices();
  const usVoice = voices.find(v => v.lang.startsWith('en-US') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
  if (usVoice) {
    utterance.voice = usVoice;
  }

  utterance.onend = () => {
    if (callback) callback(true);
  };
  utterance.onerror = (e) => {
    console.error('Lỗi Web Speech:', e);
    if (callback) callback(false);
  };

  window.speechSynthesis.speak(utterance);
}
