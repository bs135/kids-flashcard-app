import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Home, CheckCircle2, RotateCcw, Award, Shuffle } from 'lucide-react';
import Flashcard from './Flashcard';
import { soundEffects } from '../services/soundEffects';

export default function FlashcardViewer({ topic, cards = [], onBackToHome, onEarnStar }) {
  // Manage random 5-card deck for each study session
  const [activeCards, setActiveCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Randomly selects 5 cards from card pool
  const pickRandomCards = (sourceCards) => {
    if (!sourceCards || sourceCards.length === 0) return [];
    const shuffled = [...sourceCards].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  };

  // Initialize 5-card session when topic or card pool changes
  useEffect(() => {
    setActiveCards(pickRandomCards(cards));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  }, [cards, topic?.id]);

  const currentCard = activeCards[currentIndex];
  const progressPercent = activeCards.length > 0 ? Math.round(((currentIndex + 1) / activeCards.length) * 100) : 0;

  // Shuffle a new session (5 random cards)
  const handleShuffleNewSession = () => {
    soundEffects.playPop();
    setActiveCards(pickRandomCards(cards));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  // Advance to next card
  const handleNext = () => {
    soundEffects.playPop();
    setIsFlipped(false);

    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Child completed all 5 cards in current session
      triggerCompletion();
    }
  };

  // Return to previous card
  const handlePrev = () => {
    if (currentIndex > 0) {
      soundEffects.playPop();
      setIsFlipped(false);
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

  return (
    <div className="max-w-md mx-auto px-4 py-5">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 mb-5">
        {/* Map navigation button */}
        <button
          onClick={() => {
            soundEffects.playPop();
            onBackToHome();
          }}
          className="flex items-center gap-1.5 bg-white border-2 border-slate-200 hover:border-amber-400 px-3 py-1.5 rounded-2xl font-bold text-slate-700 text-sm shadow-sm transition-all hover:scale-105 active:scale-95"
          title="Về bản đồ chủ đề"
        >
          <Home className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="hidden sm:inline">Bản đồ</span>
        </button>

        {/* Topic title badge */}
        <div className="flex items-center gap-1.5 bg-amber-100 border-2 border-amber-300 px-3 py-1.5 rounded-2xl text-amber-900 font-bold text-sm max-w-[170px] sm:max-w-[220px] truncate shadow-sm">
          <span className="text-lg shrink-0">{topic?.icon}</span>
          <span className="truncate">{topic?.name_en}</span>
        </div>

        {/* Shuffle button & card counter */}
        <div className="flex items-center gap-2">
          {/* Shuffle button */}
          <button
            onClick={handleShuffleNewSession}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white border-2 border-slate-200 hover:border-purple-400 text-purple-600 rounded-xl shadow-sm transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="Xáo trộn 5 thẻ mới"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Card counter: 1 / 5 */}
          <div className="bg-white border-2 border-slate-200 px-2.5 py-1 sm:py-1.5 rounded-xl font-black text-purple-600 text-xs sm:text-sm shadow-sm whitespace-nowrap">
            {activeCards.length > 0 ? currentIndex + 1 : 0}/{activeCards.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-slate-200 rounded-full mb-6 overflow-hidden border border-slate-300 p-0.5">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-emerald-400 rounded-full"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Completion celebration screen OR Flashcard */}
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.div
            key="congrats"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white border-4 border-yellow-300 rounded-3xl p-8 text-center shadow-bouncy space-y-6 my-8"
          >
            <div className="text-7xl animate-bounce">🎉</div>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-800 font-kids">
              Hoan Hô Bé! Giỏi Quá! 🏆
            </h3>
            <p className="text-slate-600 font-semibold text-lg">
              Bé đã học xong tất cả các từ vựng về chủ đề <strong className="text-amber-600">{topic?.name_en}</strong>!
            </p>

            {/* 3 Stars reward */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-100 to-yellow-200 border-2 border-amber-400 px-6 py-3 rounded-3xl shadow-md">
              <span className="text-3xl">⭐ ⭐ ⭐</span>
              <span className="text-xl font-black text-amber-900 font-kids">+3 Sao Vàng</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={handleRestart}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3.5 rounded-2xl transition-transform active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Học Lại Bộ Này</span>
              </button>
              <button
                onClick={() => {
                  soundEffects.playPop();
                  onBackToHome();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-black px-8 py-3.5 rounded-2xl shadow-lg transition-transform active:scale-95"
              >
                <Home className="w-5 h-5" />
                <span>Về Bản Đồ Chủ Đề</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {/* 3D Flashcard Component */}
            <Flashcard
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped(!isFlipped)}
            />

            {/* Previous / Next Card navigation buttons */}
            <div className="flex items-center justify-between gap-4 mt-8">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base transition-all ${
                  currentIndex === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-300 shadow-bouncy active:shadow-bouncy-active'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Thẻ Trước</span>
              </button>

              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white py-3.5 rounded-2xl font-black text-base shadow-bouncy active:shadow-bouncy-active transition-all"
              >
                <span>{currentIndex === activeCards.length - 1 ? 'Hoàn Thành' : 'Thẻ Tiếp Theo'}</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
