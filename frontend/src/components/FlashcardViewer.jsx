import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Home, RotateCcw, Award, Shuffle } from 'lucide-react';
import Flashcard from './Flashcard';
import { soundEffects } from '../services/soundEffects';

export default function FlashcardViewer({ topic, cards = [], onBackToHome, onEarnStar }) {
  // Manage random 10-card deck for each study session
  const [activeCards, setActiveCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [maxIndexReached, setMaxIndexReached] = useState(0);

  // Randomly selects 10 cards from card pool
  const pickRandomCards = (sourceCards) => {
    if (!sourceCards || sourceCards.length === 0) return [];
    const shuffled = [...sourceCards].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
  };

  // Initialize 10-card session when topic or card pool changes
  useEffect(() => {
    setActiveCards(pickRandomCards(cards));
    setCurrentIndex(0);
    setMaxIndexReached(0);
    setIsFlipped(false);
    setHasInteracted(false);
    setIsCompleted(false);
  }, [cards, topic?.id]);

  const currentCard = activeCards[currentIndex];
  const progressPercent = activeCards.length > 0 ? Math.round(((currentIndex + 1) / activeCards.length) * 100) : 0;

  // Shuffle a new session (10 random cards)
  const handleShuffleNewSession = () => {
    soundEffects.playPop();
    setActiveCards(pickRandomCards(cards));
    setCurrentIndex(0);
    setMaxIndexReached(0);
    setIsFlipped(false);
    setHasInteracted(false);
    setIsCompleted(false);
  };

  // Advance to next card
  const handleNext = () => {
    soundEffects.playPop();
    setIsFlipped(false);
    setHasInteracted(false);

    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(prev => {
        const nextIdx = prev + 1;
        setMaxIndexReached(m => Math.max(m, nextIdx));
        return nextIdx;
      });
    } else {
      // Child completed all 10 cards in current session
      triggerCompletion();
    }
  };

  // Return to previous card
  const handlePrev = () => {
    if (currentIndex > 0) {
      soundEffects.playPop();
      setIsFlipped(false);
      setHasInteracted(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Trigger celebration confetti and reward stars
  const triggerCompletion = () => {
    setIsCompleted(true);
    soundEffects.playWin();

    // Fire celebration confetti
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (onEarnStar) {
      onEarnStar(3); // Award 3 stars on session completion
    }
  };

  const handleRestart = () => {
    handleShuffleNewSession();
  };

  const canGoNext = hasInteracted || currentIndex < maxIndexReached;

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* Top Section: Navigation bar & Progress bar */}
      <div className="shrink-0 mb-1 sm:mb-2 px-2 sm:px-4">
        {/* Top navigation bar */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 mb-1 sm:mb-2">
          {/* Map navigation button */}
          <button
            onClick={() => {
              soundEffects.playPop();
              onBackToHome();
            }}
            className="flex items-center gap-1 sm:gap-1.5 bg-white border-2 border-slate-200 hover:border-amber-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl font-bold text-slate-700 text-xs sm:text-sm shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
            title="Về bản đồ chủ đề"
          >
            <Home className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="hidden sm:inline">Bản đồ</span>
          </button>

          {/* Topic title badge */}
          <div className="flex items-center gap-1.5 bg-amber-100 border-2 border-amber-300 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl text-amber-900 font-bold text-xs sm:text-sm max-w-[150px] sm:max-w-[220px] truncate shadow-sm shrink-0">
            <span className="text-base sm:text-lg shrink-0">{topic?.icon}</span>
            <span className="truncate">{topic?.name_en}</span>
          </div>

          {/* Shuffle button & card counter */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Shuffle button */}
            <button
              onClick={handleShuffleNewSession}
              className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 bg-white border-2 border-slate-200 hover:border-purple-400 text-purple-600 rounded-xl shadow-sm transition-all hover:scale-110 active:scale-95 cursor-pointer"
              title="Xáo trộn 10 thẻ mới"
            >
              <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Card counter: 1 / 5 */}
            <div className="bg-white border-2 border-slate-200 px-2 sm:px-2.5 py-0.5 sm:py-1.5 rounded-xl font-black text-purple-600 text-xs sm:text-sm shadow-sm whitespace-nowrap">
              {activeCards.length > 0 ? currentIndex + 1 : 0}/{activeCards.length}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 sm:h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300 p-0.5">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-emerald-400 rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Center Section: 3D Flashcard or Completion Screen (fills available vertical space) */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center py-1 sm:py-2">
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="congrats"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-white border-3 sm:border-4 border-yellow-300 rounded-3xl p-5 sm:p-8 text-center shadow-bouncy space-y-4 sm:space-y-6 my-auto"
            >
              <div className="text-5xl sm:text-7xl animate-bounce">🎉</div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 font-kids mb-1 sm:mb-2">
                  Bé Giỏi Quá!
                </h3>
                <p className="text-xs sm:text-base font-semibold text-slate-600">
                  Bé đã hoàn thành 10 thẻ từ vựng chủ đề <strong>{topic?.name_vi}</strong>!
                </p>
              </div>

              {/* Reward badge */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-sm">
                <Award className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" />
                <span className="text-sm sm:text-lg font-black text-amber-900 font-kids">
                  Thưởng: +3 Sao Vàng ⭐
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 pt-2">
                <button
                  onClick={handleRestart}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white font-black px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl shadow-lg transition-transform active:scale-95 text-xs sm:text-base"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Học 10 Thẻ Mới</span>
                </button>

                <button
                  onClick={() => {
                    soundEffects.playPop();
                    onBackToHome();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-black px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl shadow-lg transition-transform active:scale-95 text-xs sm:text-base"
                >
                  <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Về Bản Đồ Chủ Đề</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full min-h-0 max-h-full flex items-center justify-center overflow-hidden"
            >
              {/* 3D Flashcard Component */}
              <Flashcard
                card={currentCard}
                isFlipped={isFlipped}
                onFlip={() => {
                  setIsFlipped(!isFlipped);
                  setHasInteracted(true);
                }}
                onAudioPlay={() => setHasInteracted(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Bottom Section: Navigation Prev/Next Buttons (pinned safely at bottom) */}
      {!isCompleted && (
        <div className="shrink-0 pt-1 sm:pt-2 pb-1 z-10 px-2 sm:px-4">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3.5 rounded-2xl font-bold text-xs sm:text-base transition-all ${
                currentIndex === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 shadow-bouncy active:shadow-bouncy-active'
              }`}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Thẻ Trước</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3.5 rounded-2xl font-black text-xs sm:text-base transition-all ${
                !canGoNext
                  ? 'bg-slate-300 text-slate-500 opacity-50 cursor-not-allowed pointer-events-none'
                  : 'bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white shadow-bouncy active:shadow-bouncy-active hover:scale-105'
              }`}
            >
              <span>{currentIndex === activeCards.length - 1 ? 'Hoàn Thành' : 'Thẻ Tiếp Theo'}</span>
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
