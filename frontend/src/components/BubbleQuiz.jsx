import MiniGameLayout from './common/MiniGameLayout';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Star, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';
import { speakWord } from '../services/speech';

export default function BubbleQuiz({ topics = [], initialTopic = null, allCards = [], onBack, onEarnStar }) {
  // Currently selected topic
  const [selectedTopicId, setSelectedTopicId] = useState(() => {
    if (initialTopic && initialTopic.id) return initialTopic.id;
    const saved = localStorage.getItem('kids_flashcard_last_topic_bubble');
    if (saved && topics.some(t => t.id === saved)) return saved;
    return topics[0]?.id || 'colors';
  });

  useEffect(() => {
    if (selectedTopicId) {
      localStorage.setItem('kids_flashcard_last_topic_bubble', selectedTopicId);
    }
  }, [selectedTopicId]);

  const [cards, setCards] = useState([]);
  const [targetCard, setTargetCard] = useState(null);
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
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
    setTimeLeft(45);
    setIsGameOver(false);
    setIsPlaying(true);
    pickNextQuestion();
  };

  // 45-second countdown timer
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

  const hasEnoughCards = cards.length >= 4;

  return (
    <MiniGameLayout
      theme="sky"
      title="Bong Bóng Từ Vựng"
      icon={<Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" />}
      onBack={onBack}
      scoreBadge={
        <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-100 text-amber-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold shadow-sm">
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
          <span className="text-sm sm:text-base">{score}</span>
        </div>
      }
      topics={topics}
      selectedTopicId={selectedTopicId}
      onSelectTopic={(id) => {
        if (!isPlaying || isGameOver) {
          if (soundEffects.playPop) soundEffects.playPop();
          setSelectedTopicId(id);
        }
      }}
      disabledTopic={isPlaying && !isGameOver}
      isPlaying={isPlaying}
      isGameOver={isGameOver}
      canStartGame={hasEnoughCards}
      startUnavailableContent={
        <div className="text-center p-6 bg-white rounded-3xl shadow-sm m-auto">
          <p className="text-lg font-bold text-slate-500">Chủ đề này chưa đủ 4 thẻ để chơi.</p>
          <p className="text-sm text-slate-400 mt-2">Vui lòng chọn chủ đề khác!</p>
        </div>
      }
      onStartGame={startGame}
      startIcon="🫧"
      startTitle="Bong Bóng Từ Vựng"
      startDescription="Nghe từ vựng và chọn đúng bong bóng tương ứng nhé. Cùng xem bé nổ được bao nhiêu bong bóng nào!"
      onRestartGame={() => startGame()}
      gameOverTitle="Hết Giờ Rồi!"
      gameOverSubtitle={`Bé đã ghi được ${score} điểm thật xuất sắc!`}
      gameOverContent={
        <div className="inline-flex items-center gap-2 bg-amber-100 border-2 border-amber-300 px-6 py-2.5 rounded-2xl shadow-sm mb-6 shrink-0 mt-4">
          <Trophy className="w-7 h-7 text-amber-500" />
          <span className="text-xl sm:text-2xl font-black text-amber-950 font-kids">
            Tổng Điểm: {score}
          </span>
        </div>
      }
      hintText="Chạm vào bong bóng đúng!"
      timerBadge={
        <div className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 shadow-sm font-extrabold text-xs sm:text-sm shrink-0 ${
          timeLeft <= 10 && isPlaying
            ? 'bg-rose-100 border-rose-300 text-rose-700 animate-bounce' 
            : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <span>⏱️</span>
          <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
        </div>
      }
    >
      {(!isPlaying || !targetCard) ? null : (
        <div className="flex-1 w-full h-full min-h-0 flex items-center justify-center p-1 sm:p-2">
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
                  {(bubbles || []).map((b) => {
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
        </div>
      )}
    </MiniGameLayout>
  );
}
