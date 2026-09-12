// English pronunciation service for kids:
// 1. Preload available voices immediately when the module loads
// 2. Ultra-fast instant playback (< 0.2s) via browser standard Web Speech API
// 3. Automatically selects clear, natural US voice tailored for young children (rate: 0.95)

let cachedVoice = null;

// Initialize and preload voices
function initVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const updateVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prefer natural American English voices
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

// Immediately initialize
initVoices();

/**
 * Pronounce English word or sentence
 * @param {string} text Word or sentence to speak
 * @param {string|null} audioUrl Local audio URL (if available)
 * @returns {Promise<boolean>}
 */
export function speakWord(text, audioUrl = null) {
  return new Promise((resolve) => {
    // 1. If valid local server audio (/uploads/...) is available
    if (audioUrl && audioUrl.startsWith('/uploads/')) {
      const audio = new Audio(audioUrl);
      
      // Limit timeout to 1.2s to prevent hanging on corrupted files
      const timeoutId = setTimeout(() => {
        console.warn(`[Audio] Audio file timed out after 1.2s, falling back to Web Speech.`);
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

    // 2. Default to instant Web Speech API playback (< 0.2s)
    speakWithWebSpeech(text, resolve);
  });
}

function speakWithWebSpeech(text, callback) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Browser does not support Web Speech API');
    if (callback) callback(false);
    return;
  }

  // Cancel prior utterances to pronounce new input immediately
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95; // Natural, clear cadence for kids
  utterance.pitch = 1.05; // Slightly cheerful pitch for toddlers

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

  // Speak immediately
  window.speechSynthesis.speak(utterance);
}
