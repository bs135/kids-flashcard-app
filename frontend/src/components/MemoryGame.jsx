import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy, RefreshCw, ArrowLeft, Volume2, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';
import { speakWord } from '../services/speech';

export default function MemoryGame({ topics = [], initialTopic = null, onBack, onEarnStar }) {
  const [selectedTopicId, setSelectedTopicId] = useState(() => {
    if (initialTopic && initialTopic.id) return initialTopic.id;
    return topics[0]?.id || 'colors';
  });

  const [cardsPool, setCardsPool] = useState([]);
  const [gameCards, setGameCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Load cards for selected topic
  useEffect(() => {
    async function loadTopicCards() {
      try {
        const res = await fetch(`/api/v1/topics/${selectedTopicId}/cards`);
        if (res.ok) {
          const data = await res.json();
          const list = data.cards || [];
          setCardsPool(list);
          initBoard(list);
        }
      } catch (e) {
        console.error('Error loading cards for Memory Game:', e);
      }
    }
    loadTopicCards();
  }, [selectedTopicId]);

  // Initialize board (pick 4-6 pairs = 8 or 12 cards)
  const initBoard = (pool) => {
    if (!pool || pool.length < 4) return;

    soundEffects.playPop();
    setFlippedIndices([]);
    setMatchedIds(new Set());
    setMoves(0);
    setIsWon(false);
    setIsChecking(false);

    // Pick 6 random cards (or maximum available)
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const pairCount = Math.min(6, shuffledPool.length);
    const selectedPairs = shuffledPool.slice(0, pairCount);

    // Duplicate each card into: 1 Image card and 1 Word card
    const board = [];
    selectedPairs.forEach((item) => {
      // Image Card
      board.push({
        uniqueKey: `${item.id}-image`,
        cardId: item.id,
        type: 'image',
        word: item.word,
        meaning_vi: item.meaning_vi,
        image_url: item.image_url,
        audio_url: item.audio_url
      });

      // Word Card
      board.push({
        uniqueKey: `${item.id}-word`,
        cardId: item.id,
        type: 'word',
        word: item.word,
        meaning_vi: item.meaning_vi,
        image_url: item.image_url,
        audio_url: item.audio_url
      });
    });

    // Shuffle cards on board
    const shuffledBoard = board.sort(() => 0.5 - Math.random());
    setGameCards(shuffledBoard);
  };

  // Handle kid clicking a card
  const handleCardClick = (index) => {
    if (isChecking) return;
    if (flippedIndices.includes(index)) return;

    const clickedCard = gameCards[index];
    if (matchedIds.has(clickedCard.cardId)) return;

    soundEffects.playFlip();

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    // If 2 cards are flipped -> check for match
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsChecking(true);

      const [firstIdx, secondIdx] = newFlipped;
      const cardA = gameCards[firstIdx];
      const cardB = gameCards[secondIdx];

      if (cardA.cardId === cardB.cardId && cardA.type !== cardB.type) {
        // Matched!
        setTimeout(() => {
          soundEffects.playCorrect();
          speakWord(cardA.word, cardA.audio_url);

          setMatchedIds(prev => {
            const next = new Set(prev);
            next.add(cardA.cardId);

            // Check victory condition (all pairs matched)
            if (next.size === gameCards.length / 2) {
              setTimeout(() => {
                handleWinGame();
              }, 600);
            }
            return next;
          });

          setFlippedIndices([]);
          setIsChecking(false);
        }, 500);
      } else {
        // Not a match -> shake gently and flip back after 1s
        setTimeout(() => {
          soundEffects.playWrong();
          setFlippedIndices([]);
          setIsChecking(false);
        }, 1100);
      }
    }
  };

  // Handle victory
  const handleWinGame = () => {
    setIsWon(true);
    soundEffects.playWin();
    onEarnStar(5); // Big reward: +5 Stars
    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 select-none">
      {/* Header & Navigation bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            soundEffects.playPop();
            onBack();
          }}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:border-amber-400 hover:text-amber-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quay Lại</span>
        </button>

        {/* Topic selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">Chủ đề:</span>
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="bg-white border-2 border-amber-300 text-amber-900 font-bold px-3 py-1.5 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {topics.map(t => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name_vi} ({t.name_en})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Memory game board arena */}
      <div className="relative min-h-[520px] bg-gradient-to-b from-amber-50 via-orange-50 to-white rounded-3xl border-4 border-amber-300 shadow-bouncy overflow-hidden p-6 flex flex-col justify-between">
        {/* In-game header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-white/90 border-2 border-amber-300 px-4 py-1.5 rounded-2xl shadow-sm">
            <span className="text-lg">🎯</span>
            <span className="text-sm font-extrabold text-amber-900 font-kids">
              Lượt lật: {moves}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/90 border-2 border-emerald-300 px-4 py-1.5 rounded-2xl shadow-sm">
            <span className="text-lg">✨</span>
            <span className="text-sm font-extrabold text-emerald-800 font-kids">
              Ghép đúng: {matchedIds.size} / {gameCards.length / 2} cặp
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9, rotate: -180 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            onClick={() => initBoard(cardsPool)}
            className="p-2.5 rounded-2xl bg-white border-2 border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700 shadow-sm cursor-pointer select-none flex items-center justify-center"
            title="Xáo trộn lại"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Card grid (3x4 or 4x3) */}
        {!isWon ? (
          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] sm:grid-cols-[repeat(4,minmax(0,1fr))] gap-3 sm:gap-4 my-auto w-full">
            {gameCards.map((card, index) => {
              const isFlipped = flippedIndices.includes(index) || matchedIds.has(card.cardId);
              const isMatched = matchedIds.has(card.cardId);

              // Calculate font size and check compound words
              const hasSpace = card.word ? card.word.includes(' ') : false;
              const wordLength = card.word ? card.word.length : 0;
              const wordFontSize = 
                wordLength > 10 ? 'text-[11px] sm:text-xs' :
                wordLength > 7  ? 'text-xs sm:text-sm' :
                wordLength > 5  ? 'text-xs sm:text-base' :
                'text-sm sm:text-lg';

              return (
                <div
                  key={card.uniqueKey}
                  className="w-full aspect-[4/5] relative min-w-0 min-h-0 rounded-2xl overflow-hidden"
                >
                  <motion.div
                    whileHover={isMatched ? {} : { scale: 1 }}
                    whileTap={isMatched ? {} : { scale: 0.98 }}
                    onClick={() => handleCardClick(index)}
                    className={`absolute inset-0 w-full h-full rounded-2xl cursor-pointer select-none transition-shadow duration-300 ${
                      isMatched ? 'opacity-85' : ''
                    }`}
                  >
                    <div
                      className={`absolute inset-0 w-full h-full rounded-2xl border-4 transition-all duration-300 flex flex-col items-center justify-center p-1 sm:p-2 text-center overflow-hidden box-border ${
                        isMatched
                          ? 'bg-emerald-50 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
                          : isFlipped
                          ? 'bg-white border-amber-400 shadow-md'
                          : 'bg-gradient-to-br from-amber-400 to-yellow-400 border-amber-300 hover:border-amber-500 shadow-sm'
                      }`}
                    >
                      {isFlipped ? (
                        card.type === 'image' ? (
                          <div className="w-full h-full flex flex-col items-center justify-between py-1 animate-fade-in overflow-hidden">
                            <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden p-0.5">
                              <img
                                src={`${card.image_url}?t=${card.cardId}`}
                                alt={card.word}
                                className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-sm rounded-lg"
                                loading="eager"
                              />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                              HÌNH ẢNH
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full max-w-full flex flex-col items-center justify-between py-1 animate-fade-in overflow-hidden">
                            <div className="flex-1 w-full max-w-full flex items-center justify-center min-h-0 px-0.5 overflow-hidden">
                              <span 
                                className={`w-full ${wordFontSize} font-black text-amber-950 font-kids tracking-tight leading-none text-center ${
                                  hasSpace ? 'break-normal' : 'whitespace-nowrap'
                                }`}
                                title={card.word}
                              >
                                {card.word}
                              </span>
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                              TỪ VỰNG
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl text-amber-950 drop-shadow-sm">❓</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Victory celebration screen */
          <div className="relative z-20 my-auto text-center py-8 animate-fade-in">
            <div className="text-7xl mb-3 animate-bounce">🎉</div>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-800 font-kids mb-2">
              Bé Có Trí Nhớ Siêu Đỉnh!
            </h3>
            <p className="text-slate-600 font-semibold mb-6">
              Bé đã tìm đúng toàn bộ các cặp từ vựng và hình ảnh sau <strong>{moves}</strong> lượt lật!
            </p>

            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-200 border-2 border-amber-300 px-6 py-2.5 rounded-2xl shadow-sm mb-6">
              <Star className="w-7 h-7 text-amber-500 fill-amber-400" />
              <span className="text-xl font-black text-amber-950 font-kids">
                Thưởng Nóng: +5 Sao Vàng ⭐
              </span>
            </div>

            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => initBoard(cardsPool)}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black text-base px-6 py-3 rounded-full shadow-md border-2 border-emerald-300 cursor-pointer"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Chơi Lại Ván Mới</span>
              </motion.button>

              <button
                onClick={() => {
                  soundEffects.playPop();
                  onBack();
                }}
                className="bg-white border-2 border-slate-300 text-slate-700 font-bold text-base px-6 py-3 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Về Bản Đồ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
