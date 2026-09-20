import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, RotateCw, BookOpen } from 'lucide-react';
import { speakWord, stopSpeech } from '../services/speech';
import { soundEffects } from '../services/soundEffects';

export default function Flashcard({ card, isFlipped, onFlip, onAudioPlay }) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (!card) return null;

  const handleAudioPlay = async (e) => {
    e.stopPropagation();
    soundEffects.playPop();
    if (onAudioPlay) onAudioPlay();
    setIsPlayingAudio(true);
    await speakWord(card.word, card.audio_url);
    setIsPlayingAudio(false);
  };

  const handleCardClick = () => {
    soundEffects.playFlip();
    onFlip();
  };

  return (
    <div className="w-full h-full max-w-sm sm:max-w-md max-h-full flex items-center justify-center perspective-1000 select-none cursor-pointer mx-auto p-1">
      <motion.div
        onClick={handleCardClick}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        className="h-full max-h-full w-auto max-w-full aspect-[3/4] sm:aspect-[4/5] relative transform-style-3d shadow-2xl rounded-3xl flex flex-col mx-auto"
      >
        {/* ==================== FRONT SIDE ==================== */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white border-3 sm:border-4 border-amber-300 rounded-3xl p-2.5 sm:p-5 flex flex-col items-center justify-between shadow-bouncy overflow-hidden">
          {/* Header badge & flip hint */}
          <div className="w-full flex justify-between items-center text-xs font-bold text-amber-700 shrink-0">
            <span className="bg-amber-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-amber-200 text-[10px] sm:text-xs">
              Chạm thẻ để xem nghĩa 🔄
            </span>
            <span className="text-base sm:text-xl">✨</span>
          </div>

          {/* Large illustration image container (expands dynamically to fill vertical space) */}
          <div className="relative flex-1 min-h-0 w-full my-1 sm:my-2 rounded-2xl overflow-hidden border-2 sm:border-4 border-amber-100 shadow-inner group flex items-center justify-center p-1 sm:p-2">
            <img
              src={card.image_url?.includes('?') ? card.image_url : `${card.image_url}?v=${card.id || ''}`}
              alt={card.word}
              className="max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
              loading="eager"
            />
          </div>

          {/* English Word, IPA phonetics & Audio Button */}
          <div className="w-full shrink-0 flex flex-col items-center gap-1 sm:gap-2 pb-1 sm:pb-2">
            <div className="text-center w-full">
              <h3 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-wide font-kids leading-tight">
                {card.word}
              </h3>
              {card.phonetic && (
                <p className="text-xs sm:text-base font-medium text-purple-600 mt-0.5">
                  {card.phonetic}
                </p>
              )}
            </div>

            {/* Circular Audio Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAudioPlay}
              disabled={isPlayingAudio}
              className="w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-tr from-amber-400 to-yellow-300 hover:from-amber-500 hover:to-yellow-400 text-white rounded-full flex items-center justify-center shadow-lg border-2 sm:border-4 border-white transition-all shrink-0"
              title="Nghe phát âm"
            >
              <Volume2 className={`w-5 h-5 sm:w-7 sm:h-7 text-amber-900 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* ==================== BACK SIDE ==================== */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 border-3 sm:border-4 border-sky-300 rounded-3xl p-3 sm:p-5 flex flex-col items-center justify-between shadow-bouncy overflow-hidden">
          {/* Back badge */}
          <div className="w-full flex justify-between items-center text-xs font-bold text-sky-700 shrink-0">
            <span className="bg-sky-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-sky-200 text-[10px] sm:text-xs">
              Nghĩa tiếng Việt
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
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Vietnamese definition */}
          <div className="text-center my-auto px-1">
            <span className="text-[10px] sm:text-sm font-bold text-sky-600 uppercase tracking-widest block mb-0.5 sm:mb-1">
              Tiếng Việt có nghĩa là:
            </span>
            <h4 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-800 font-kids leading-tight">
              {card.meaning_vi}
            </h4>
          </div>

          {/* Bilingual contextual example */}
          {card.example_en && (
            <div className="w-full bg-white/90 border border-sky-200 sm:border-2 rounded-2xl p-2.5 sm:p-4 text-left shadow-sm shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-indigo-600 mb-0.5 sm:mb-1">
                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Ví dụ câu:</span>
              </div>
              <p className="text-xs sm:text-base font-bold text-slate-700 leading-snug">
                "{card.example_en}"
              </p>
              {card.example_vi && (
                <p className="text-[11px] sm:text-sm font-semibold text-slate-500 mt-0.5 italic">
                  👉 {card.example_vi}
                </p>
              )}
            </div>
          )}

          {/* Pronunciation replay button */}
          {card.example_en ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAudioPlay) onAudioPlay();
                stopSpeech();
                speakWord(card.example_en);
              }}
              className="mt-1 sm:mt-2 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-md transition-transform transform active:scale-95 shrink-0"
              title="Nghe câu ví dụ"
            >
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          ) : (
            <button
              onClick={handleAudioPlay}
              className="mt-1 sm:mt-2 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-md transition-transform transform active:scale-95 shrink-0"
              title="Nghe lại từ"
            >
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
