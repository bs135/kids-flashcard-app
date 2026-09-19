import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, Star, Ear } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';
import { speakWord, stopSpeech } from '../services/speech';

export default function AudioMatchGame({ topics = [], initialTopic = null, onBack, onEarnStar }) {
  const [selectedTopicId, setSelectedTopicId] = useState(() => {
    if (initialTopic && initialTopic.id) return initialTopic.id;
    const saved = localStorage.getItem('kids_flashcard_last_topic_audiomatch');
    if (saved && topics.some(t => t.id === saved)) return saved;
    return topics[0]?.id || 'colors';
  });

  useEffect(() => {
    if (selectedTopicId) {
      localStorage.setItem('kids_flashcard_last_topic_audiomatch', selectedTopicId);
    }
  }, [selectedTopicId]);

  const [cardsPool, setCardsPool] = useState([]);
  const [leftAudioCards, setLeftAudioCards] = useState([]);
  const [rightImageCards, setRightImageCards] = useState([]);
  
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [selectedLeft, setSelectedLeft] = useState(null); // card id
  const [selectedRight, setSelectedRight] = useState(null); // card id
  
  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [shakeId, setShakeId] = useState(null); // for mismatch animation

  useEffect(() => {
    return () => stopSpeech();
  }, [selectedTopicId]);

  useEffect(() => {
    async function loadTopicCards() {
      try {
        const res = await fetch(`/api/v1/topics/${selectedTopicId}/cards`);
        if (res.ok) {
          const data = await res.json();
          const list = data.cards || [];
          setCardsPool(list);
          setIsPlaying(false);
          setIsWon(false);
        }
      } catch (e) {
        console.error('Error loading cards for AudioMatchGame:', e);
      }
    }
    loadTopicCards();
  }, [selectedTopicId]);

    const startGame = () => {
    if (soundEffects.playPop) soundEffects.playPop();
    setIsPlaying(true);
    setIsWon(false);
    initBoard(cardsPool);
  };

  const initBoard = (pool) => {
    if (!pool || pool.length < 4) return;
    
    stopSpeech();
    soundEffects.playPop();
    setMatchedIds(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setIsChecking(false);
    setScore(0);
    setIsWon(false);

    // Pick 4 random cards
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const selectedCards = shuffledPool.slice(0, 4);

    // Left column: 4 audio cards
    const leftCol = [...selectedCards].sort(() => 0.5 - Math.random());
    // Right column: 4 image cards, shuffled differently
    const rightCol = [...selectedCards].sort(() => 0.5 - Math.random());

    setLeftAudioCards(leftCol);
    setRightImageCards(rightCol);
  };

  const checkMatch = async (leftId, rightId) => {
    setIsChecking(true);
    
    if (leftId === rightId) {
      // Match!
      soundEffects.playStar();
      setMatchedIds(prev => new Set(prev).add(leftId));
      setScore(s => s + 10);
      
      setSelectedLeft(null);
      setSelectedRight(null);
      setIsChecking(false);
      
      // Check Win
      if (matchedIds.size + 1 === 4) {
        setTimeout(() => {
          setIsWon(true);
          soundEffects.playWin();
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#FBBF24', '#34D399', '#60A5FA', '#F87171']
          });
          if (onEarnStar) onEarnStar(1); // reward 1 star for winning
        }, 500);
      }
    } else {
      // Mismatch!
      soundEffects.playWrong();
      setShakeId(rightId);
      
      setTimeout(() => {
        setShakeId(null);
        setSelectedLeft(null);
        setSelectedRight(null);
        setIsChecking(false);
      }, 600);
    }
  };

  const handleLeftClick = (card) => {
    if (isChecking || matchedIds.has(card.id)) return;
    
    // Play sound
    if (card.audio_url) {
      const audio = new Audio(card.audio_url);
      audio.play().catch(e => {
        console.log('Audio fallback', e);
        speakWord(card.word);
      });
    } else {
      speakWord(card.word);
    }

    const newLeft = selectedLeft === card.id ? null : card.id;
    setSelectedLeft(newLeft);

    if (newLeft && selectedRight) {
      checkMatch(newLeft, selectedRight);
    }
  };

  const handleRightClick = (card) => {
    if (isChecking || matchedIds.has(card.id)) return;
    
    const newRight = selectedRight === card.id ? null : card.id;
    setSelectedRight(newRight);

    if (selectedLeft && newRight) {
      checkMatch(selectedLeft, newRight);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-sky-50/50 rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Zone 1: Top Bar (shrink-0) */}
      <div className="shrink-0 p-3 sm:p-4 flex items-center justify-between border-b border-slate-200 bg-white/80">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 font-kids flex items-center gap-2">
            <Volume2 className="w-6 h-6 text-sky-500" /> Nghe Âm Đoán Hình
          </h2>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-100 text-amber-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold shadow-sm">
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
          <span className="text-sm sm:text-base">{matchedIds.size}/4</span>
        </div>
      </div>

      {/* Select Topic Banner */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <span className="text-xs sm:text-sm font-bold text-slate-500 shrink-0">Chủ đề:</span>
        {topics.map(topic => (
          <button
            key={topic.id}
            onClick={() => {
              if (!isPlaying) {
                if (soundEffects.playPop) soundEffects.playPop();
                setSelectedTopicId(topic.id);
              }
            }}
            disabled={isPlaying}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              selectedTopicId === topic.id 
                ? 'bg-sky-100 text-sky-700 border-2 border-sky-300' 
                : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
            } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {topic.icon} {topic.name_vi}
          </button>
        ))}
      </div>

      {/* Zone 2: Center Workspace (flex-1 min-h-0 overflow-hidden) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden h-full max-w-xl mx-auto flex items-center justify-center p-1 sm:p-3">
        {cardsPool.length < 4 ? (
          <div className="text-center p-6 bg-white rounded-3xl shadow-sm">
            <p className="text-lg font-bold text-slate-500">Chủ đề này chưa đủ 4 thẻ để chơi.</p>
            <p className="text-sm text-slate-400 mt-2">Vui lòng chọn chủ đề khác!</p>
          </div>
        ) : !isPlaying && !isWon ? (
          <div className="relative z-20 my-auto text-center py-4 sm:py-8 animate-fade-in flex flex-col items-center justify-center h-full w-full">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-4 rounded-3xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-3xl sm:text-5xl shadow-lg border-4 border-white animate-bounce">
              🎧
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-slate-800 font-kids mb-1.5 sm:mb-2">
              Nghe Âm Đoán Hình
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-xs sm:text-base font-medium mb-4 sm:mb-6 px-2">
              Lắng nghe âm thanh phát ra từ chiếc loa và chạm vào hình ảnh tương ứng để ghép cặp chuẩn xác nhé! 🎵
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-black text-sm sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full shadow-lg border-2 sm:border-3 border-amber-300 cursor-pointer"
            >
              BẮT ĐẦU CHƠI NGAY 🚀
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full h-full max-h-full items-stretch">
            {/* Left Column (Audio) */}
            <div className="flex flex-col gap-1.5 sm:gap-2.5 w-full h-full min-h-0">
              {leftAudioCards.map((card) => {
                const isMatched = matchedIds.has(card.id);
                const isSelected = selectedLeft === card.id;
                return (
                  <button
                    key={'left-' + card.id}
                    onClick={() => handleLeftClick(card)}
                    disabled={isMatched || isChecking}
                    className={`flex-1 min-h-0 h-full flex items-center justify-center rounded-2xl sm:rounded-3xl border-4 shadow-sm transition-all duration-300
                      ${isMatched ? 'border-emerald-400 bg-emerald-50' : 
                        isSelected ? 'border-sky-500 bg-sky-100 scale-105' : 
                        'border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-300'}
                    `}
                  >
                    {!isMatched ? (
                      <motion.div 
                        animate={isSelected ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
                        transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0 }}
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-sky-100 text-sky-600`}
                      >
                        <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center px-2 w-full"
                      >
                        <span className="font-kids font-black text-emerald-800 text-base sm:text-xl lg:text-2xl leading-tight">
                          {card.word}
                        </span>
                        <span className="text-xs sm:text-sm text-emerald-600 font-bold mt-0.5 sm:mt-1 truncate max-w-full">
                          {card.meaning_vi}
                        </span>
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Column (Images) */}
            <div className="flex flex-col gap-1.5 sm:gap-2.5 w-full h-full min-h-0">
              {rightImageCards.map((card) => {
                const isMatched = matchedIds.has(card.id);
                const isSelected = selectedRight === card.id;
                const isShaking = shakeId === card.id;
                
                return (
                  <motion.button
                    key={'right-' + card.id}
                    onClick={() => handleRightClick(card)}
                    disabled={isMatched || isChecking}
                    animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`flex-1 min-h-0 h-full flex items-center justify-center rounded-2xl sm:rounded-3xl border-4 shadow-sm transition-all duration-300 overflow-hidden
                      ${isMatched ? 'border-emerald-400 bg-emerald-50/70' : 
                        isSelected ? 'border-sky-500 bg-sky-50 scale-105' : 
                        'border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-300'}
                    `}
                  >
                    <div className="w-full h-full flex items-center justify-center p-1 sm:p-2">
                      <img 
                        src={card.image_url} 
                        alt="Flashcard image" 
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Zone 3: Bottom Controls (shrink-0) */}
      <div className="shrink-0 p-3 sm:p-4 bg-white/80 border-t border-slate-200 flex items-center justify-between">
        <div className="text-slate-600 font-medium text-sm sm:text-base flex items-center gap-2">
           <Ear className="w-5 h-5 text-sky-500" /> Chạm loa để nghe, chạm hình để nối!
        </div>
        <div className="font-kids font-bold text-amber-600 text-lg sm:text-2xl">
          Điểm: {score}
        </div>
      </div>

      {/* Victory Modal */}
      <AnimatePresence>
        {isWon && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border-4 border-amber-300 relative overflow-hidden"
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner border-4 border-white">
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500" />
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-black text-slate-800 font-kids mb-2">Hoàn Hảo!</h2>
              <p className="text-slate-500 font-medium mb-6">Bé đã nghe và nối đúng tất cả!</p>
              
              <div className="flex justify-center gap-2 mb-6 sm:mb-8">
                {[1, 2, 3].map(star => (
                  <motion.div
                    key={star}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: star * 0.15, type: 'spring' }}
                  >
                    <Star className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 fill-amber-400 drop-shadow-md" />
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => initBoard(cardsPool)}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-lg py-3 sm:py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" /> Chơi Vòng Mới
                </button>
                <button
                  onClick={onBack}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 sm:py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  Đổi Trò Chơi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
