import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, RefreshCw, ArrowLeft, Volume2, Star, Search } from 'lucide-react';
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
  const [isWon, setIsWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const [targetCard, setTargetCard] = useState(null);
  const [displayCards, setDisplayCards] = useState([]);
  const [shakingCardId, setShakingCardId] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');

  // Turn Timer (10s)
  const [turnTimeLeft, setTurnTimeLeft] = useState(10);
  const roundTimerRef = useRef(null);

  // Session Timer (45s)
  const [totalTimeLeft, setTotalTimeLeft] = useState(45);
  const totalTimerRef = useRef(null);

  const speakTimeoutRef = useRef(null);
  const nextRoundTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
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
          startNewGame(list);
        }
      } catch (e) {
        console.error('Error loading cards for Eye Spy Game:', e);
      }
    }
    loadTopicCards();
  }, [selectedTopicId]);

  const handleSessionTimeout = () => {
    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    stopSpeech();

    setIsGameOver(true);
    setIsChecking(false);
    try { if (soundEffects.playWin) soundEffects.playWin(); } catch (e) {}
  };

  const handleTimeout = () => {
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);

    // 1. Tuyệt đối KHÔNG tăng điểm hay tăng số hình đã đúng
    // 2. Phát âm thanh báo hết giờ
    try { if (soundEffects.playWrong) soundEffects.playWrong(); } catch (e) {}

    // 3. Tự động chuyển ngay sang từ & hình mới sau 400ms
    if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
    nextRoundTimeoutRef.current = setTimeout(() => {
      nextRound(); // Gọi hàm bốc từ và sinh câu hỏi ngẫu nhiên mới
    }, 400);
  };

  const startNewGame = (pool) => {
    stopSpeech();
    soundEffects.playPop();
    setScore(0);
    setCorrectCount(0);
    setIsWon(false);
    setIsGameOver(false);
    setIsChecking(false);

    if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    setTotalTimeLeft(45);
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

    // Pick 4 distractors (5 cards total)
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

    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    setTurnTimeLeft(10);
    roundTimerRef.current = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(roundTimerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
    speakTimeoutRef.current = setTimeout(() => {
      speakWord(promptText);
    }, 300);
  };

  const handleCardClick = (card) => {
    if (isChecking || isWon || isGameOver) return;

    if (card.id === targetCard.id) {
      setIsChecking(true);
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      if (soundEffects.playCorrect) soundEffects.playCorrect();

      setScore(s => s + 10);
      setCorrectCount(c => {
        const newCount = c + 1;
        if (newCount >= 10) {
          if (totalTimerRef.current) clearInterval(totalTimerRef.current);
          if (speakTimeoutRef.current) clearTimeout(speakTimeoutRef.current);
          if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
          stopSpeech();

          nextRoundTimeoutRef.current = setTimeout(() => {
            setIsWon(true);
            setIsChecking(false);
            if (soundEffects.playWin) soundEffects.playWin();
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#FBBF24', '#34D399', '#60A5FA', '#F87171']
            });
            if (onEarnStar) onEarnStar(1);
          }, 600);
        } else {
          if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
          nextRoundTimeoutRef.current = setTimeout(() => {
            nextRound();
          }, 600);
        }
        return newCount;
      });
    } else {
      if (soundEffects.playWrong) soundEffects.playWrong();
      setShakingCardId(card.uniqueKey);
      setTimeout(() => {
        setShakingCardId(null);
      }, 500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-purple-50/50 rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative select-none">
      {/* Zone 1: Top Bar */}
      <div className="shrink-0 p-3 sm:p-4 flex items-center justify-between border-b border-slate-200 bg-white/80">
        <button
          onClick={() => {
            soundEffects.playPop();
            onBack();
          }}
          className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 hover:bg-fuchsia-100 text-slate-600 hover:text-fuchsia-600 transition-colors shadow-sm shrink-0"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="flex flex-col items-center justify-center min-w-0 px-2">
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 font-kids flex items-center gap-2 truncate">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-500" /> Ai Tinh Mắt?
          </h2>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 bg-fuchsia-100 text-fuchsia-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold shadow-sm shrink-0">
          <span className="text-sm sm:text-base font-kids">✨ Điểm: {score}</span>
        </div>
      </div>

      {/* Select Topic Banner */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <span className="text-xs sm:text-sm font-bold text-slate-500 shrink-0">Chủ đề:</span>
        {topics.map(t => (
          <button
            key={t.id}
            onClick={() => {
              soundEffects.playPop();
              setSelectedTopicId(t.id);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              selectedTopicId === t.id 
                ? 'bg-fuchsia-100 text-fuchsia-700 border-2 border-fuchsia-300'
                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
              }`}
          >
            {t.icon} {t.name_vi}
          </button>
        ))}
      </div>

      {/* Zone 2: Center Workspace */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col p-1.5 sm:p-3 relative">
        <div className="relative flex-1 min-h-0 w-full bg-gradient-to-b from-fuchsia-50 via-purple-50 to-white rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-fuchsia-300 shadow-bouncy overflow-hidden p-1.5 sm:p-4 flex flex-col">

          {(!isWon && !isGameOver) ? (
            <div className="flex flex-col h-full flex-1 min-h-0 relative z-20">
              {/* Target Prompt Box */}
              <div className="shrink-0 text-center my-1 sm:my-2 px-1 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-full">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-black text-xs sm:text-sm border-2 transition-colors ${
                    totalTimeLeft <= 10 ? 'bg-rose-100 border-rose-300 text-rose-600 animate-pulse' : 'bg-indigo-100 border-indigo-300 text-indigo-800'
                    }`}>
                    <span>⏳ </span>
                    <span>{totalTimeLeft}s</span>
                  </div>
                </div>

                <div className="inline-flex flex-row items-center gap-2 sm:gap-4 bg-white/95 border-2 sm:border-3 border-fuchsia-300 px-2 sm:px-3 py-2 sm:py-3 rounded-full shadow-md max-w-full mx-auto">
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
                      <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${turnTimeLeft === 0 ? 'text-rose-600' : 'text-fuchsia-600'}`}>
                        {turnTimeLeft === 0 ? "Hết giờ, qua câu mới!" : `Bé tìm "${targetCard.meaning_vi}"!`}
                      </div>
                    )}
                  </div>

                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center font-black text-sm sm:text-base shadow-sm shrink-0 transition-colors ${
                    turnTimeLeft <= 3 ? 'bg-rose-100 border-rose-300 text-rose-600 animate-pulse' : 'bg-amber-100 border-amber-300 text-amber-800'
                  }`}>
                    {turnTimeLeft}
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
          ) : isGameOver ? (
            /* Game Over screen */
            <div className="relative z-20 my-auto text-center py-6 animate-fade-in flex flex-col h-full items-center justify-center">
              <div className="text-5xl sm:text-6xl mb-3 shrink-0">⏰</div>
              <h3 className="text-2xl sm:text-4xl font-black text-rose-600 font-kids mb-2 shrink-0">
                Hết Giờ Rồi!
              </h3>
              <p className="text-slate-600 font-semibold mb-6 text-sm sm:text-base px-2 shrink-0">
                Bé đã tìm đúng {correctCount}/10 đồ vật. Hãy thử lại để đạt 10/10 nhé!
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startNewGame(cardsPoolRef.current)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-rose-500 to-red-500 text-white font-black text-sm sm:text-base px-6 py-3 rounded-full shadow-md border-2 border-rose-300 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Chơi Lại</span>
                </motion.button>
              </div>
            </div>
          ) : (
            /* Victory celebration screen */
            <div className="relative z-20 my-auto text-center py-6 animate-fade-in flex flex-col h-full items-center justify-center">
              <div className="text-5xl sm:text-6xl mb-3 animate-bounce shrink-0">🎉</div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-800 font-kids mb-2 shrink-0">
                Bé Mắt Tinh Quá!
              </h3>
              <p className="text-slate-600 font-semibold mb-6 text-sm sm:text-base px-2 shrink-0">
                Bé đã xuất sắc tìm đúng 10/10 đồ vật!
              </p>

              <div className="inline-flex items-center gap-3 bg-fuchsia-100 border-2 border-fuchsia-300 px-6 py-2.5 rounded-2xl shadow-sm mb-6 shrink-0">
                <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-amber-400" />
                <span className="text-lg sm:text-xl font-black text-fuchsia-900 font-kids">
                  Chiến Thắng!
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startNewGame(cardsPoolRef.current)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black text-sm sm:text-base px-6 py-3 rounded-full shadow-md border-2 border-fuchsia-300 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Chơi Lại Ván Mới</span>
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Bottom Controls (shrink-0) */}
      <div className="shrink-0 p-3 sm:p-4 bg-white/80 border-t border-slate-200 flex items-center justify-between">
        <div className="text-slate-600 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 truncate mr-2">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-fuchsia-500 shrink-0" /> <span className="truncate">Hãy chạm vào đúng hình bé nghe thấy!</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 shadow-sm font-extrabold text-xs sm:text-sm shrink-0 bg-white border-fuchsia-200 text-fuchsia-800">
          <span>✅ Đã tìm: {correctCount}/10</span>
        </div>
      </div>
    </div>
  );
}
