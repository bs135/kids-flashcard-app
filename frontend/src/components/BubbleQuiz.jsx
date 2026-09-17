import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles, Star, Trophy, RefreshCw, X, ArrowLeft, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';
import { speakWord } from '../services/speech';

export default function BubbleQuiz({ topics = [], initialTopic = null, allCards = [], onBack, onEarnStar }) {
  // Currently selected topic
  const [selectedTopicId, setSelectedTopicId] = useState(() => {
    if (initialTopic && initialTopic.id) return initialTopic.id;
    return topics[0]?.id || 'colors';
  });

  const [cards, setCards] = useState([]);
  const [targetCard, setTargetCard] = useState(null);
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [shakingBubbleId, setShakingBubbleId] = useState(null);

  const timerRef = useRef(null);

  // Load cards for selected topic
  useEffect(() => {
    async function loadCards() {
      try {
        const res = await fetch(`/api/v1/topics/${selectedTopicId}/cards`);
        if (res.ok) {
          const data = await res.json();
          setCards(data.cards || []);
        }
      } catch (e) {
        console.error('Error loading cards for bubble game:', e);
      }
    }
    loadCards();
  }, [selectedTopicId]);

  // Start new game session
  const startGame = () => {
    soundEffects.playPop();
    setScore(0);
    setTimeLeft(25);
    setIsGameOver(false);
    setIsPlaying(true);
    pickNextQuestion();
  };

  // 25-second countdown timer
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeLeft]);

  // End game session
  const endGame = () => {
    setIsPlaying(false);
    setIsGameOver(true);
    soundEffects.playWin();
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // Generate new question and 3-4 bubbles
  const pickNextQuestion = () => {
    if (!cards || cards.length === 0) return;

    // Pick 1 random card as target
    const randomTarget = cards[Math.floor(Math.random() * cards.length)];
    setTargetCard(randomTarget);

    // Speak target word
    speakWord(randomTarget.word, randomTarget.audio_url);

    // Pick 2-3 distractor choices
    const otherCards = cards.filter(c => c.id !== randomTarget.id);
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));

    // Combine bubbles and shuffle positions
    const currentOptions = [randomTarget, ...distractors].sort(() => 0.5 - Math.random());

    const bubbleColors = [
      'from-pink-400 to-rose-400 border-pink-300 shadow-pink-200',
      'from-sky-400 to-blue-500 border-sky-300 shadow-sky-200',
      'from-amber-400 to-yellow-400 border-amber-300 shadow-amber-200',
      'from-emerald-400 to-teal-500 border-emerald-300 shadow-emerald-200'
    ];

    const generatedBubbles = currentOptions.map((card, idx) => {
      // Independent random floating animations for each bubble
      const floatDuration = Number((2.2 + Math.random() * 1.6).toFixed(2)); // 2.2s to 3.8s
      const floatDelay = Number((Math.random() * 0.8).toFixed(2));          // 0s to 0.8s
      const floatPeakY = Math.floor(-14 - Math.random() * 10);              // -14px to -24px
      const floatPeakX = Math.floor(Math.random() * 12 - 6);                // -6px to +6px
      const floatRotate = Math.floor(Math.random() * 8 - 4);                // -4deg to +4deg

      return {
        id: `${card.id}-${Date.now()}-${idx}`,
        card,
        color: bubbleColors[idx % bubbleColors.length],
        floatDuration,
        floatDelay,
        floatPeakY,
        floatPeakX,
        floatRotate
      };
    });

    setBubbles(generatedBubbles);
  };

  // Handle kid clicking a bubble
  const handleBubbleClick = (bubble) => {
    if (!targetCard) return;

    if (bubble.card.id === targetCard.id) {
      // Correct -> pop bubble, increment score & award star
      soundEffects.playPop();
      soundEffects.playCorrect();
      setScore(prev => prev + 10);
      onEarnStar(1);

      // Hide popped bubble
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));

      // Switch to next word after 0.4s
      setTimeout(() => {
        pickNextQuestion();
      }, 400);
    } else {
      // Wrong -> shake bubble gently and play buzzer
      soundEffects.playWrong();
      setShakingBubbleId(bubble.id);
      setTimeout(() => setShakingBubbleId(null), 500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-sky-50/50 rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative select-none">
      {/* Zone 1: Top Bar (shrink-0) */}
      <div className="shrink-0 p-3 sm:p-4 flex items-center justify-between border-b border-slate-200 bg-white/80">
        <button
          onClick={() => {
            soundEffects.playPop();
            onBack();
          }}
          className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-600 transition-colors shadow-sm shrink-0"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="flex flex-col items-center justify-center min-w-0 px-2">
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 font-kids flex items-center gap-2 truncate">
            <span className="text-2xl sm:text-3xl hidden sm:inline">🫧</span> Bong Bóng
          </h2>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-100 text-amber-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold shadow-sm shrink-0">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
          <span className="text-sm sm:text-base">{score}</span>
        </div>
      </div>

      {/* Select Topic Banner */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <span className="text-xs sm:text-sm font-bold text-slate-500 shrink-0">Chủ đề:</span>
        {topics.map(t => (
          <button
            key={t.id}
            onClick={() => {
              if (!isPlaying) {
                soundEffects.playPop();
                setSelectedTopicId(t.id);
              }
            }}
            disabled={isPlaying}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              selectedTopicId === t.id 
                ? 'bg-sky-100 text-sky-700 border-2 border-sky-300' 
                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
            } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t.icon} {t.name_vi}
          </button>
        ))}
      </div>

      {/* Zone 2: Center Workspace (flex-1 min-h-0 overflow-hidden) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col p-1.5 sm:p-3 relative">
        <div className="relative flex-1 min-h-0 w-full bg-gradient-to-b from-sky-100 via-indigo-50 to-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-sky-300 shadow-bouncy overflow-hidden p-1 sm:p-4 flex flex-col justify-between">
          {/* Background decorative clouds */}
          <div className="absolute top-6 left-8 text-4xl opacity-40 animate-pulse pointer-events-none hidden sm:block">☁️</div>
          <div className="absolute top-16 right-12 text-5xl opacity-40 animate-pulse pointer-events-none hidden sm:block">☁️</div>

          {/* State 1: Not started */}
          {!isPlaying && !isGameOver && (
            <div className="relative z-20 my-auto text-center py-2 sm:py-8 flex flex-col h-full items-center justify-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-4 rounded-3xl bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-3xl sm:text-5xl shadow-lg border-4 border-white animate-bounce shrink-0">
                🫧
              </div>
              <h3 className="text-xl sm:text-4xl font-black text-slate-800 font-kids mb-1.5 sm:mb-2 shrink-0">
                Sẵn sàng chưa bé ơi?
              </h3>
              <p className="text-slate-600 max-w-md mx-auto text-xs sm:text-base font-medium mb-4 sm:mb-6 px-2 shrink-0">
                Lắng nghe từ tiếng Anh được đọc và bấm vỡ quả bóng chứa hình ảnh đúng trước khi bóng bay mất nhé! 🎈
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-black text-sm sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full shadow-lg border-2 sm:border-3 border-amber-300 cursor-pointer shrink-0"
              >
                BẮT ĐẦU CHƠI NGAY 🚀
              </motion.button>
            </div>
          )}

          {/* State 2: Playing */}
          {isPlaying && targetCard && (
            <div className="flex flex-col h-full flex-1 min-h-0 relative z-20">
              {/* Target word pronunciation box */}
              <div className="shrink-0 text-center my-1 sm:my-2 px-1">
                <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/95 border-2 sm:border-3 border-sky-300 px-3.5 sm:px-6 py-1.5 sm:py-3 rounded-full shadow-md max-w-full">
                  <button
                    onClick={() => {
                      soundEffects.playPop();
                      speakWord(targetCard.word, targetCard.audio_url);
                    }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-amber-400 hover:bg-amber-500 border-2 border-amber-300 flex items-center justify-center text-amber-950 shadow-sm active:scale-95 transition-transform shrink-0"
                    title="Nghe lại"
                  >
                    <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </button>
                  <div className="text-left min-w-0">
                    <div className="text-[10px] sm:text-xs font-bold text-sky-600 uppercase tracking-wide">
                      Hãy tìm quả bóng:
                    </div>
                    <div className="text-lg sm:text-2xl font-black text-slate-800 font-kids tracking-wide truncate">
                      {targetCard.word}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bubble floating area */}
              <div className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1 sm:p-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-6 items-center justify-center h-full max-h-full aspect-[4/3] sm:aspect-[16/7] w-auto max-w-full px-1 sm:px-6 py-1">
                  {bubbles.map((b) => {
                    const isShaking = shakingBubbleId === b.id;

                    return (
                      <motion.div
                        key={b.id}
                        animate={
                          isShaking
                            ? { x: [-8, 8, -6, 6, -3, 3, 0] }
                            : {
                                y: [0, b.floatPeakY, 2, 0],
                                x: [0, b.floatPeakX, -b.floatPeakX / 2, 0],
                                rotate: [0, b.floatRotate, -b.floatRotate, 0]
                              }
                        }
                        transition={{
                          duration: isShaking ? 0.45 : b.floatDuration,
                          delay: isShaking ? 0 : b.floatDelay,
                          repeat: isShaking ? 0 : Infinity,
                          ease: 'easeInOut'
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleBubbleClick(b)}
                        className={`relative w-auto h-full max-w-[110px] max-h-[110px] sm:max-w-[140px] sm:max-h-[140px] aspect-square rounded-full bg-gradient-to-br ${b.color} border-3 sm:border-4 p-2 sm:p-3.5 flex items-center justify-center shadow-lg cursor-pointer select-none overflow-hidden mx-auto my-auto`}
                      >
                        {/* Bubble shine highlight reflection */}
                        <div className="absolute top-2 left-3 w-5 h-2.5 sm:w-6 sm:h-3 bg-white/75 rounded-full rotate-[-35deg] pointer-events-none z-10" />

                        {/* Center card image */}
                        <div className="w-full h-full flex items-center justify-center p-0.5">
                          <img
                            src={`${b.card.image_url}?t=${b.card.id}`}
                            alt={b.card.word}
                            className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-md rounded-xl"
                            loading="eager"
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* State 3: Game Over */}
          {isGameOver && (
            <div className="relative z-20 my-auto text-center py-6 animate-fade-in flex flex-col h-full items-center justify-center">
              <div className="text-5xl sm:text-6xl mb-2 animate-bounce shrink-0">🏆</div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-800 font-kids mb-1 shrink-0">
                Tuyệt Vời Bé Ơi!
              </h3>
              <p className="text-slate-600 font-semibold mb-4 text-sm sm:text-base px-2 shrink-0">
                Bé đã làm vỡ rất nhiều bong bóng xuất sắc!
              </p>

              <div className="inline-flex items-center gap-3 bg-amber-100 border-2 border-amber-300 px-6 py-2.5 rounded-2xl shadow-sm mb-6 shrink-0">
                <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-400" />
                <span className="text-lg sm:text-xl font-black text-amber-950 font-kids">
                  Tổng Điểm: {score}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black text-sm sm:text-base px-6 py-3 rounded-full shadow-md border-2 border-emerald-300 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Chơi Lại Nhé</span>
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Bottom Controls (shrink-0) */}
      <div className="shrink-0 p-3 sm:p-4 bg-white/80 border-t border-slate-200 flex items-center justify-between">
        <div className="text-slate-600 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 truncate mr-2">
           <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 shrink-0" /> <span className="truncate">Nghe từ và nổ đúng bóng!</span>
        </div>
        <div className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 shadow-sm font-extrabold text-xs sm:text-sm shrink-0 ${
          timeLeft <= 10 && isPlaying
            ? 'bg-rose-100 border-rose-300 text-rose-700 animate-bounce' 
            : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <span>⏱️</span>
          <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
        </div>
      </div>
    </div>
  );

}
