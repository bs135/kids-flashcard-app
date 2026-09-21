import MiniGameLayout from './common/MiniGameLayout';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Star, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';
import { speakWord } from '../services/speech';

// Pre-configured splash particle definitions for cartoon pop effect
const POP_PARTICLES = [
  { type: 'drop-cyan', size: 14, distOffset: 15 },
  { type: 'sparkle', emoji: '✨', distOffset: 38 },
  { type: 'drop-pink', size: 12, distOffset: 5 },
  { type: 'drop-yellow', size: 16, distOffset: 45 },
  { type: 'drop-cyan', size: 10, distOffset: 20 },
  { type: 'sparkle', emoji: '🌟', distOffset: 42 },
  { type: 'drop-pink', size: 15, distOffset: 12 },
  { type: 'drop-yellow', size: 11, distOffset: 32 },
  { type: 'sparkle', emoji: '✨', distOffset: 50 },
  { type: 'drop-cyan', size: 16, distOffset: 25 },
  { type: 'drop-pink', size: 13, distOffset: 16 },
  { type: 'sparkle', emoji: '💧', distOffset: 36 },
  { type: 'drop-yellow', size: 14, distOffset: 10 },
  { type: 'drop-cyan', size: 12, distOffset: 48 }
];

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
  const [poppingBubbleId, setPoppingBubbleId] = useState(null);

  const timerRef = useRef(null);
  const playAreaRef = useRef(null);
  const popTimerRef = useRef(null);
  const shakeTimerRef = useRef(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const isProcessingRef = useRef(false);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  // Measure and track play area dimensions
  useEffect(() => {
    if (!playAreaRef.current) return;

    const updateDimensions = () => {
      if (playAreaRef.current) {
        const { clientWidth, clientHeight } = playAreaRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setContainerDimensions(prev => {
            if (prev.width !== clientWidth || prev.height !== clientHeight) {
              return { width: clientWidth, height: clientHeight };
            }
            return prev;
          });
        }
      }
    };

    // Use a small delay for initial measurement to ensure DOM is ready
    const startTimeout = setTimeout(updateDimensions, 50);

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(playAreaRef.current);
    return () => {
      clearTimeout(startTimeout);
      resizeObserver.disconnect();
    };
  }, [isPlaying]);

  // Helper to safely get the current play area dimensions
  const getContainerDimensions = () => {
    if (playAreaRef.current && playAreaRef.current.clientWidth > 0) {
      return {
        width: playAreaRef.current.clientWidth,
        height: playAreaRef.current.clientHeight
      };
    }
    if (containerDimensions.width > 0) {
      return containerDimensions;
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const fallbackWidth = typeof window !== 'undefined'
      ? (isMobile ? Math.min(window.innerWidth - 24, 420) : Math.min(window.innerWidth - 64, 820))
      : 820;
    const fallbackHeight = isMobile ? 360 : 460;
    return { width: fallbackWidth, height: fallbackHeight };
  };

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
    isProcessingRef.current = false;
    setPoppingBubbleId(null);
    setShakingBubbleId(null);
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
    isProcessingRef.current = false;
    setPoppingBubbleId(null);
    setShakingBubbleId(null);
    soundEffects.playWin();
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // Calculate bubble positioning and animation based on screen size
  const computeBubbleGeometry = (card, idx, q, color, containerW, containerH, isMobile) => {
    const safePadding = isMobile ? 10 : 16;
    
    // Scale and size
    const baseSize = isMobile
      ? Math.max(72, Math.min(84, Math.floor(Math.min(containerW, containerH) * 0.22)))
      : Math.max(100, Math.min(122, Math.floor(Math.min(containerW, containerH) * 0.25)));
    const scale = Number((1.0 + Math.random() * 0.5).toFixed(2));
    const size = Math.round(baseSize * scale);
    
    // Center padding to ensure quadrants do not overlap in the middle
    const centerPadding = isMobile ? 20 : 32;
    const halfW = containerW / 2;
    const halfH = containerH / 2;
    
    // Compute strictly disjoint quadrant bounding boxes
    let qMinX, qMaxX, qMinY, qMaxY;
    if (q === 0) { // Top-Left
      qMinX = safePadding;
      qMaxX = Math.max(qMinX, halfW - size - centerPadding);
      qMinY = safePadding;
      qMaxY = Math.max(qMinY, halfH - size - centerPadding);
    } else if (q === 1) { // Top-Right
      qMinX = halfW + centerPadding;
      qMaxX = Math.max(qMinX, containerW - size - safePadding);
      qMinY = safePadding;
      qMaxY = Math.max(qMinY, halfH - size - centerPadding);
    } else if (q === 2) { // Bottom-Left
      qMinX = safePadding;
      qMaxX = Math.max(qMinX, halfW - size - centerPadding);
      qMinY = halfH + centerPadding;
      qMaxY = Math.max(qMinY, containerH - size - safePadding);
    } else { // Bottom-Right
      qMinX = halfW + centerPadding;
      qMaxX = Math.max(qMinX, containerW - size - safePadding);
      qMinY = halfH + centerPadding;
      qMaxY = Math.max(qMinY, containerH - size - safePadding);
    }

    // Anchor position
    const initialX = Math.round(qMinX + Math.random() * (qMaxX - qMinX));
    const initialY = Math.round(qMinY + Math.random() * (qMaxY - qMinY));

    // Constrain drift so bubbles NEVER leave their disjoint quadrant box
    const maxDriftX = isMobile ? 26 : 42;
    const maxDriftY = isMobile ? 22 : 36;
    
    const roomLeft = Math.max(0, initialX - qMinX);
    const roomRight = Math.max(0, qMaxX - initialX);
    const roomTop = Math.max(0, initialY - qMinY);
    const roomBottom = Math.max(0, qMaxY - initialY);

    const driftLeft = Math.min(roomLeft * 0.9, maxDriftX);
    const driftRight = Math.min(roomRight * 0.9, maxDriftX);
    const driftTop = Math.min(roomTop * 0.9, maxDriftY);
    const driftBottom = Math.min(roomBottom * 0.9, maxDriftY);

    const inwardX = (q === 0 || q === 2) ? 1 : -1;
    const inwardY = (q === 0 || q === 1) ? 1 : -1;
    
    const dx1 = Math.round(inwardX * (0.4 + Math.random() * 0.6) * (inwardX > 0 ? driftRight : driftLeft));
    const dx2 = Math.round(-inwardX * (0.3 + Math.random() * 0.5) * (inwardX > 0 ? driftLeft : driftRight));
    
    const dy1 = Math.round(inwardY * (0.4 + Math.random() * 0.6) * (inwardY > 0 ? driftBottom : driftTop));
    const dy2 = Math.round(-inwardY * (0.3 + Math.random() * 0.5) * (inwardY > 0 ? driftTop : driftBottom));

    return {
      id: `${card.id}-${Date.now()}-${idx}`,
      card,
      q, // Save quadrant to recompute later
      color,
      scale,
      size,
      initialX,
      initialY,
      xOffsets: [0, dx1, dx2],
      yOffsets: [0, dy1, dy2],
      floatDurationX: Number((6.0 + Math.random() * 3.0).toFixed(2)),
      floatDurationY: Number((6.2 + Math.random() * 2.8).toFixed(2)),
      floatDurationRotate: Number((5.5 + Math.random() * 2.5).toFixed(2)),
      floatDelay: Number((Math.random() * 0.6).toFixed(2)),
      floatRotate: Math.floor(Math.random() * 8 + 4) * (Math.random() > 0.5 ? 1 : -1)
    };
  };

  // Generate new question and 4 floating bubbles with randomized sizes
  const pickNextQuestion = () => {
    if (!cards || cards.length === 0) return;

    // Pick 1 random card as target
    const randomTarget = cards[Math.floor(Math.random() * cards.length)];
    setTargetCard(randomTarget);

    // Speak target word
    speakWord(randomTarget.word, randomTarget.audio_url);

    // Pick 3 distractor choices
    const otherCards = cards.filter(c => c.id !== randomTarget.id);
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));

    // Combine bubbles and shuffle options
    const currentOptions = [randomTarget, ...distractors].sort(() => 0.5 - Math.random());

    const bubbleColors = selectedTopicId === 'colors'
      ? ['from-white to-slate-100 border-slate-200 shadow-slate-100']
      : [
          'from-pink-400 to-rose-400 border-pink-300 shadow-pink-200',
          'from-sky-400 to-blue-500 border-sky-300 shadow-sky-200',
          'from-amber-400 to-yellow-400 border-amber-300 shadow-amber-200',
          'from-emerald-400 to-teal-500 border-emerald-300 shadow-emerald-200'
        ];

    const { width: containerWidth, height: containerHeight } = getContainerDimensions();
    const isMobile = containerWidth < 640;

    // Fisher-Yates shuffle for quadrants
    const quadrantIndices = [0, 1, 2, 3];
    for (let i = quadrantIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [quadrantIndices[i], quadrantIndices[j]] = [quadrantIndices[j], quadrantIndices[i]];
    }

    const generatedBubbles = currentOptions.map((card, idx) => {
      const q = quadrantIndices[idx % 4];
      const color = bubbleColors[idx % bubbleColors.length];
      return computeBubbleGeometry(card, idx, q, color, containerWidth, containerHeight, isMobile);
    });

    setBubbles(generatedBubbles);
  };

  // Recompute layout dynamically when container size changes
  useEffect(() => {
    if (!bubbles || bubbles.length === 0 || containerDimensions.width === 0) return;

    setBubbles(prevBubbles => {
      const { width: containerWidth, height: containerHeight } = containerDimensions;
      const isMobile = containerWidth < 640;

      return prevBubbles.map((b, idx) => {
        // Keep the original id, card, color, q, and animations so it seamlessly transitions
        const newGeo = computeBubbleGeometry(b.card, idx, b.q, b.color, containerWidth, containerHeight, isMobile);
        return {
          ...b,
          size: newGeo.size,
          scale: newGeo.scale,
          initialX: newGeo.initialX,
          initialY: newGeo.initialY,
          xOffsets: newGeo.xOffsets,
          yOffsets: newGeo.yOffsets
        };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerDimensions]);

  // Handle kid clicking a bubble
  const handleBubbleClick = (bubble) => {
    if (!targetCard || isProcessingRef.current || poppingBubbleId) return;

    if (bubble.card.id === targetCard.id) {
      // Correct -> trigger pop animation, play sound, increment score & award star
      isProcessingRef.current = true;
      setPoppingBubbleId(bubble.id);
      soundEffects.playPop();
      soundEffects.playCorrect();
      setScore(prev => prev + 10);
      onEarnStar(1);

      // Wait 520ms for full cartoon pop, shockwave, and splash particles before picking next question
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
      popTimerRef.current = setTimeout(() => {
        setBubbles(prev => prev.filter(b => b.id !== bubble.id));
        setPoppingBubbleId(null);
        isProcessingRef.current = false;
        pickNextQuestion();
      }, 520);
    } else {
      // Wrong -> shake bubble gently at place and play wrong sound
      soundEffects.playWrong();
      setShakingBubbleId(bubble.id);
      
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setShakingBubbleId(null);
      }, 450);
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
              <div
                ref={playAreaRef}
                className="relative flex-1 min-h-0 w-full overflow-hidden select-none"
              >
                {(bubbles || []).map((b) => {
                  const isShaking = shakingBubbleId === b.id;
                  const isPopping = poppingBubbleId === b.id;

                  return (
                    <motion.div
                      key={b.id}
                      style={{
                        position: 'absolute',
                        left: b.initialX,
                        top: b.initialY,
                        width: b.size,
                        height: b.size,
                        zIndex: isPopping ? 30 : 10
                      }}
                      animate={{
                        x: b.xOffsets,
                        y: b.yOffsets,
                        rotate: [0, b.floatRotate, -b.floatRotate, 0]
                      }}
                      transition={{
                        x: {
                          duration: b.floatDurationX,
                          repeat: Infinity,
                          repeatType: 'mirror',
                          ease: 'easeInOut',
                          delay: b.floatDelay
                        },
                        y: {
                          duration: b.floatDurationY,
                          repeat: Infinity,
                          repeatType: 'mirror',
                          ease: 'easeInOut',
                          delay: b.floatDelay
                        },
                        rotate: {
                          duration: b.floatDurationRotate,
                          repeat: Infinity,
                          repeatType: 'mirror',
                          ease: 'easeInOut'
                        }
                      }}
                    >
                      {/* 1. Instant Pop Flash Burst */}
                      {isPopping && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-white pointer-events-none z-[25] shadow-[0_0_30px_rgba(255,255,255,1)]"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{
                            scale: [0.8, 1.4, 0],
                            opacity: [0, 1, 0]
                          }}
                          transition={{
                            duration: 0.18,
                            ease: 'easeOut'
                          }}
                        />
                      )}

                      {/* 2. Epic Shockwave Ring */}
                      {isPopping && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-white/95 pointer-events-none z-20 shadow-[0_0_25px_rgba(255,255,255,0.9)]"
                          initial={{ scale: 0.8, opacity: 0.9, borderWidth: '5px' }}
                          animate={{
                            scale: [0.8, 2.2],
                            opacity: [0.9, 0],
                            borderWidth: ['5px', '1px']
                          }}
                          transition={{
                            duration: 0.4,
                            ease: 'easeOut'
                          }}
                        />
                      )}

                      {/* 3. Colorful splash particles and stars shooting outwards */}
                      {isPopping && POP_PARTICLES.map((p, pIdx) => {
                        const angleRad = (pIdx * (360 / POP_PARTICLES.length)) * (Math.PI / 180);
                        const distance = 65 + p.distOffset;
                        const targetX = Math.round(Math.cos(angleRad) * distance);
                        const targetY = Math.round(Math.sin(angleRad) * distance);
                        const randomRotate = (pIdx % 2 === 0 ? 1 : -1) * (120 + pIdx * 20);

                        return (
                          <motion.div
                            key={`pop-particle-${b.id}-${pIdx}`}
                            className="absolute left-1/2 top-1/2 -ml-3 -mt-3 w-6 h-6 flex items-center justify-center pointer-events-none z-30"
                            initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                            animate={{
                              x: [0, targetX],
                              y: [0, targetY],
                              scale: [0.5, 1.3, 0],
                              opacity: [1, 1, 0],
                              rotate: [0, randomRotate]
                            }}
                            transition={{
                              duration: 0.45,
                              ease: 'easeOut'
                            }}
                          >
                            {p.type === 'sparkle' ? (
                              <span className="text-base sm:text-xl leading-none select-none drop-shadow">
                                {p.emoji}
                              </span>
                            ) : p.type === 'drop-pink' ? (
                              <div
                                className="rounded-full bg-gradient-to-tr from-pink-400 via-rose-200 to-white border-2 border-white shadow-[0_0_8px_rgba(244,63,94,0.7)]"
                                style={{ width: p.size, height: p.size }}
                              />
                            ) : p.type === 'drop-yellow' ? (
                              <div
                                className="rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-white border-2 border-white shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                                style={{ width: p.size, height: p.size }}
                              />
                            ) : (
                              <div
                                className="rounded-full bg-gradient-to-tr from-sky-400 via-cyan-200 to-white border-2 border-white shadow-[0_0_8px_rgba(56,189,248,0.7)]"
                                style={{ width: p.size, height: p.size }}
                              />
                            )}
                          </motion.div>
                        );
                      })}

                      {/* 4. Inner bubble with touch interaction, wobble and juicy cartoon pop burst */}
                      <motion.button
                        type="button"
                        disabled={isProcessingRef.current || poppingBubbleId !== null}
                        aria-disabled={isProcessingRef.current || poppingBubbleId !== null}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                            e.preventDefault();
                            handleBubbleClick(b);
                          }
                        }}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.92 }}
                        animate={
                          isPopping
                            ? {
                                scale: [1, 1.35, 0],
                                opacity: [1, 1, 0],
                                filter: ['brightness(1)', 'brightness(2.5) contrast(1.2)', 'brightness(3)']
                              }
                            : isShaking
                            ? {
                                rotate: [-14, 14, -10, 10, -5, 5, 0],
                                scale: [1, 0.94, 1.06, 0.96, 1]
                              }
                            : {
                                scale: 1,
                                opacity: 1,
                                rotate: 0
                              }
                        }
                        transition={
                          isPopping
                            ? { duration: 0.18, ease: 'easeOut' }
                            : isShaking
                            ? { duration: 0.45, ease: 'easeInOut' }
                            : { duration: 0.2 }
                        }
                        onClick={() => handleBubbleClick(b)}
                        className={`w-full h-full rounded-full bg-gradient-to-br ${b.color} border-[3px] sm:border-4 flex items-center justify-center shadow-lg cursor-pointer focus:outline-none focus:ring-4 focus:ring-white/50 select-none overflow-hidden relative`}
                      >
                        {/* Bubble shine highlight reflection */}
                        <div
                          className="absolute top-2 left-2.5 sm:top-2.5 sm:left-3 bg-white/75 rounded-full pointer-events-none z-10"
                          style={{
                            width: Math.max(14, Math.round(b.size * 0.18)),
                            height: Math.max(7, Math.round(b.size * 0.09)),
                            transform: 'rotate(-35deg)'
                          }}
                        />

                        {/* Center card image */}
                        <div className="w-full h-full flex items-center justify-center p-2 sm:p-3">
                          <img
                            src={`${b.card.image_url}?t=${b.card.id}`}
                            alt={b.card.word}
                            className="max-w-[74%] max-h-[74%] object-contain pointer-events-none drop-shadow-md rounded-xl"
                            loading="eager"
                          />
                        </div>
                      </motion.button>
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
