import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, RotateCw, Sparkles, BookOpen } from 'lucide-react';
import { speakWord } from '../services/speech';
import { soundEffects } from '../services/soundEffects';

export default function Flashcard({ card, isFlipped, onFlip }) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!card) return null;

  const handleAudioPlay = async (e) => {
    e.stopPropagation();
    soundEffects.playPop();
    setIsPlayingAudio(true);
    await speakWord(card.word, card.audio_url);
    setIsPlayingAudio(false);
  };

  const handleCardClick = () => {
    soundEffects.playFlip();
    onFlip();
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md h-[450px] perspective-1000 select-none cursor-pointer mx-auto">
      <motion.div
        onClick={handleCardClick}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full h-full relative transform-style-3d shadow-2xl rounded-3xl"
      >
        {/* ==================== MẶT TRƯỚC (FRONT) ==================== */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white border-4 border-amber-300 rounded-3xl p-6 flex flex-col items-center justify-between shadow-bouncy overflow-hidden">
          {/* Huy hiệu đỉnh & Nút lật gợi ý */}
          <div className="w-full flex justify-between items-center text-xs font-bold text-amber-700">
            <span className="bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              Chạm thẻ để xem nghĩa 🔄
            </span>
            <span className="text-xl">✨</span>
          </div>

          {/* Hình ảnh minh họa to rõ */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 my-2 rounded-2xl overflow-hidden border-4 border-amber-100 shadow-inner group">
            <img
              src={card.image_url}
              alt={card.word}
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
          </div>

          {/* Từ vựng tiếng Anh & Phiên âm IPA */}
          <div className="text-center w-full">
            <h3 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-wide font-kids">
              {card.word}
            </h3>
            {card.phonetic && (
              <p className="text-lg sm:text-xl font-medium text-purple-600 mt-1">
                {card.phonetic}
              </p>
            )}
          </div>

          {/* Nút Loa Phát Âm (Audio Button) To Tròn */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAudioPlay}
            disabled={isPlayingAudio}
            className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-300 hover:from-amber-500 hover:to-yellow-400 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white transition-all transform -translate-y-1"
            title="Nghe phát âm"
          >
            <Volume2 className={`w-8 h-8 text-amber-900 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
          </motion.button>
        </div>

        {/* ==================== MẶT SAU (BACK) ==================== */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 border-4 border-sky-300 rounded-3xl p-6 flex flex-col items-center justify-between shadow-bouncy overflow-hidden">
          {/* Huy hiệu mặt sau */}
          <div className="w-full flex justify-between items-center text-xs font-bold text-sky-700">
            <span className="bg-sky-100 px-3 py-1 rounded-full border border-sky-200">
              Nghĩa tiếng Việt 🇻🇳
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEffects.playFlip();
                onFlip();
              }}
              className="p-1 rounded-full bg-white/70 hover:bg-white text-slate-600 shadow-sm"
              title="Lật lại"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Nghĩa tiếng Việt chữ to rõ */}
          <div className="text-center my-auto">
            <span className="text-sm font-bold text-sky-600 uppercase tracking-widest block mb-1">
              Tiếng Việt có nghĩa là:
            </span>
            <h4 className="text-4xl sm:text-5xl font-black text-slate-800 font-kids">
              {card.meaning_vi}
            </h4>
          </div>

          {/* Ví dụ minh họa song ngữ */}
          {card.example_en && (
            <div className="w-full bg-white/90 border-2 border-sky-200 rounded-2xl p-4 text-left shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ví dụ câu:</span>
              </div>
              <p className="text-base font-bold text-slate-700 leading-snug">
                "{card.example_en}"
              </p>
              {card.example_vi && (
                <p className="text-sm font-semibold text-slate-500 mt-1 italic">
                  👉 {card.example_vi}
                </p>
              )}
            </div>
          )}

          {/* Nút Loa Lặp Lại Phát Âm ở mặt sau */}
          <button
            onClick={handleAudioPlay}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2.5 rounded-full shadow-md transition-transform transform active:scale-95 text-sm"
          >
            <Volume2 className="w-4 h-4" />
            <span>Nghe lại từ "{card.word}"</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
