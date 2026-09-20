import MiniGameLayout from './common/MiniGameLayout';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, Search, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';
import { speakWord, stopSpeech } from '../services/speech';
import { generateQuestionPrompt } from '../utils/promptHelper';

export default function EyeSpyGame({ topics = [], initialTopic = null, onBack, onEarnStar }) {
  const [selectedTopicId, setSelectedTopicId] = useState(() => {
    if (initialTopic && initialTopic.id) return initialTopic.id;
    const saved = localStorage.getItem('kids_flashcard_last_topic_eyespy');
    if (saved && topics.some(t => t.id === saved)) return saved;
    return topics[0]?.id || 'colors';
  });

  useEffect(() => {
    if (selectedTopicId) {
      localStorage.setItem('kids_flashcard_last_topic_eyespy', selectedTopicId);
    }
  }, [selectedTopicId]);

  const [cardsPool, setCardsPool] = useState([]);
  const cardsPoolRef = useRef([]);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [targetCard, setTargetCard] = useState(null);
  const [displayCards, setDisplayCards] = useState([]);
  const [shakingCardId, setShakingCardId] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');

const [totalTimeLeft, setTotalTimeLeft] = useState(30);
  const totalTimerRef = useRef(null);

  const speakTimeoutRef = useRef(null);
  const nextRoundTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      stopSpeech();
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
      if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    async function loadTopicCards() {
      try {
        const res = await fetch(`/api/v1/topics/${selectedTopicId}/cards`);
        if (res.ok) {
          const data = await res.json();
          const list = data.cards || [];
          setCardsPool(list);
          cardsPoolRef.current = list;
        }
      } catch (e) {
        console.error('Error loading cards for Eye Spy Game:', e);
      }
    }
    loadTopicCards();
  }, [selectedTopicId]);

  const handleSessionTimeout = () => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    stopSpeech();

    setIsPlaying(false);
    setIsGameOver(true);
    setIsChecking(false);

    setScore(currentScore => {
      let stars = 0;
      if (currentScore >= 100) stars = 3;
      else if (currentScore >= 50) stars = 2;
      else if (currentScore > 0) stars = 1;

      if (stars > 0 && onEarnStar) {
        onEarnStar(stars);
      }
      return currentScore;
    });

    try { if (soundEffects.playWin) soundEffects.playWin(); } catch (e) {}
    
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FBBF24', '#34D399', '#60A5FA', '#F87171']
    });
  };

  const startNewGame = (pool) => {
    setIsPlaying(true);
    stopSpeech();
    if (soundEffects.playPop) soundEffects.playPop();
    setScore(0);
    setCorrectCount(0);
    setIsGameOver(false);
    setIsChecking(false);

    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    setTotalTimeLeft(30);
    totalTimerRef.current = setInterval(() => {
      setTotalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(totalTimerRef.current);
          handleSessionTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    nextRound(pool);
  };

  const nextRound = (poolOverride = null) => {
    const pool = poolOverride || cardsPoolRef.current;
    if (!pool || pool.length === 0) return;

    setIsChecking(false);

    const target = pool[Math.floor(Math.random() * pool.length)];
    let distractors = pool.filter(c => c.id !== target.id);
    distractors = distractors.sort(() => 0.5 - Math.random());

    // Pick 4 distractor cards (5 cards total)
    let selectedDistractors = distractors.slice(0, 4);
    while (selectedDistractors.length < 4 && pool.length > 1) {
      selectedDistractors.push(distractors[Math.floor(Math.random() * distractors.length)]);
    }

    const allRoundCards = [target, ...selectedDistractors].sort(() => 0.5 - Math.random());

    const jitteredCards = allRoundCards.map((c, i) => {
      const scale = Number((0.7 + Math.random() * 0.6).toFixed(2));
      return {
        ...c,
        uniqueKey: `${c.id}-${i}-${Date.now()}`,
        scale: scale,
        rotate: Math.random() * 30 - 15,
        offsetX: Math.random() * 20 - 10,
        offsetY: Math.random() * 20 - 10
      };
    });

    const promptText = generateQuestionPrompt(target, selectedTopicId);

    setTargetCard(target);
    setDisplayCards(jitteredCards);
    setCurrentPrompt(promptText);

    // Cancel any lingering speech
    stopSpeech();
    
    // Short delay (200ms) to stabilize UI state and prevent audio overlap with sound effects
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
    speakTimeoutRef.current = setTimeout(() => {
      speakWord(promptText);
    }, 200);
  };

  const handleCardClick = (card) => {
    if (isChecking || isGameOver) return;

    if (card.id === targetCard.id) {
      setIsChecking(true);
      if (soundEffects.playCorrect) soundEffects.playCorrect();

      setScore(s => s + 10);
      setCorrectCount(c => c + 1);

      if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = setTimeout(() => {
        nextRound();
      }, 600);
    } else {
      if (soundEffects.playWrong) soundEffects.playWrong();
      setShakingCardId(card.uniqueKey);
      setTimeout(() => {
        setShakingCardId(null);
      }, 500);
    }
  };

  const hasEnoughCards = cardsPool.length >= 5;

  return (
    <MiniGameLayout
      title="Ai Tinh Mắt"
      icon={<Search className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-500" />}
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
          <p className="text-lg font-bold text-slate-500">Chủ đề này chưa đủ 5 thẻ để chơi.</p>
          <p className="text-sm text-slate-400 mt-2">Vui lòng chọn chủ đề khác!</p>
        </div>
      }
      onStartGame={() => startNewGame(cardsPoolRef.current)}
      startIcon="👀"
      startTitle="Ai Tinh Mắt"
      startDescription="Cùng bé luyện mắt và tìm ra hình ảnh chính xác nhất nhé!"
      onRestartGame={() => startNewGame(cardsPoolRef.current)}
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
      hintText="Hãy chạm vào đúng hình bé nghe thấy!"
      timerBadge={
        <div className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 shadow-sm font-extrabold text-xs sm:text-sm shrink-0 ${
          totalTimeLeft <= 10 && isPlaying
            ? 'bg-rose-100 border-rose-300 text-rose-700 animate-bounce' 
            : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <span>⏱️</span>
          <span>00:{totalTimeLeft < 10 ? `0${totalTimeLeft}` : totalTimeLeft}</span>
        </div>
      }
    >
      {!isPlaying ? null : (
        <div className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-center p-1 sm:p-2">
          <div className="shrink-0 text-center my-1 sm:my-2 px-1 flex flex-col items-center gap-2">
                <div className="inline-flex flex-row items-center gap-2 sm:gap-4 bg-white/95 border-2 sm:border-3 border-fuchsia-300 px-3 sm:px-6 py-2 sm:py-3 rounded-full shadow-md max-w-full mx-auto">
                  <button
                    onClick={() => {
                      soundEffects.playPop();
                      speakWord(currentPrompt);
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-400 hover:bg-amber-500 border-2 border-amber-300 flex items-center justify-center text-amber-950 shadow-sm active:scale-95 transition-transform shrink-0"
                    title="Nghe lại câu hỏi"
                  >
                    <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </button>

                  <div className="text-center min-w-[120px] px-1">
                    <div className="text-lg sm:text-2xl font-black text-slate-800 font-kids tracking-wide truncate">
                      {currentPrompt}
                    </div>
                    {targetCard && (
                      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-fuchsia-600">
                        Bé tìm "{targetCard.meaning_vi}"!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Eye Spy Grid (5 items flexbox) */}
              <div className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-1 sm:p-2">
                <div className="flex flex-wrap justify-center content-center gap-3 sm:gap-5 w-full h-full max-w-xl mx-auto p-2">
                  {displayCards.map((c) => {
                    const isShaking = shakingCardId === c.uniqueKey;
                    const isCorrect = isChecking && c.id === targetCard?.id;

                    return (
                      <motion.div
                        key={c.uniqueKey}
                        animate={
                          isShaking
                            ? { x: [-8, 8, -6, 6, -3, 3, 0] }
                            : isCorrect
                              ? { scale: [1, 1.2, 1], rotate: [c.rotate, 0, c.rotate] }
                            : { y: [0, -4, 0], transition: { repeat: Infinity, duration: 2 + Math.random()*2 } }
                        }
                        style={{
                          scale: c.scale,
                          rotate: `${c.rotate}deg`,
                          x: c.offsetX,
                          y: c.offsetY
                        }}
                        whileHover={!isChecking ? { scale: c.scale + 0.1, zIndex: 10 } : {}}
                        whileTap={!isChecking ? { scale: c.scale - 0.05 } : {}}
                        onClick={() => handleCardClick(c)}
                        className={`relative w-[100px] h-[100px] sm:w-[130px] sm:h-[130px] aspect-square rounded-2xl sm:rounded-3xl bg-white border-4 shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer select-none overflow-hidden shrink-0 ${
                          isCorrect ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] z-20' : 'border-white/80 hover:border-fuchsia-300'
                          }`}
                      >
                        <img
                          src={`${c.image_url}?t=${c.id}`}
                          alt={c.word}
                          className="w-[75%] h-[75%] object-contain pointer-events-none drop-shadow-sm"
                          loading="eager"
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
        </div>
      )}
    </MiniGameLayout>
  );
}
