import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles, Star, Trophy, RefreshCw, X, ArrowLeft, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';
import { speakWord } from '../services/speech';

export default function BubbleQuiz({ topics = [], initialTopic = null, allCards = [], onBack, onEarnStar }) {
  // Chủ đề đang chọn
  const [selectedTopicId, setSelectedTopicId] = useState(() => {
    if (initialTopic && initialTopic.id) return initialTopic.id;
    return topics[0]?.id || 'colors';
  });

  const [cards, setCards] = useState([]);
  const [targetCard, setTargetCard] = useState(null);
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [shakingBubbleId, setShakingBubbleId] = useState(null);

  const timerRef = useRef(null);

  // Tải danh sách thẻ theo chủ đề
  useEffect(() => {
    async function loadCards() {
      try {
        const res = await fetch(`/api/v1/topics/${selectedTopicId}/cards`);
        if (res.ok) {
          const data = await res.json();
          setCards(data.cards || []);
        }
      } catch (e) {
        console.error('Lỗi khi tải thẻ cho game bong bóng:', e);
      }
    }
    loadCards();
  }, [selectedTopicId]);

  // Bắt đầu màn chơi mới
  const startGame = () => {
    soundEffects.playPop();
    setScore(0);
    setTimeLeft(60);
    setIsGameOver(false);
    setIsPlaying(true);
    pickNextQuestion();
  };

  // Đồng hồ đếm ngược 60 giây
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

  // Kết thúc trò chơi
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

  // Tạo câu hỏi mới và 3-4 quả bóng
  const pickNextQuestion = () => {
    if (!cards || cards.length === 0) return;

    // Chọn ngẫu nhiên 1 thẻ làm mục tiêu
    const randomTarget = cards[Math.floor(Math.random() * cards.length)];
    setTargetCard(randomTarget);

    // Phát âm từ mục tiêu
    speakWord(randomTarget.word, randomTarget.audio_url);

    // Lấy thêm 2-3 lựa chọn sai từ danh sách thẻ
    const otherCards = cards.filter(c => c.id !== randomTarget.id);
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));

    // Ghép bóng và xáo trộn vị trí
    const currentOptions = [randomTarget, ...distractors].sort(() => 0.5 - Math.random());

    const bubbleColors = [
      'from-pink-400 to-rose-400 border-pink-300 shadow-pink-200',
      'from-sky-400 to-blue-500 border-sky-300 shadow-sky-200',
      'from-amber-400 to-yellow-400 border-amber-300 shadow-amber-200',
      'from-emerald-400 to-teal-500 border-emerald-300 shadow-emerald-200'
    ];

    const generatedBubbles = currentOptions.map((card, idx) => {
      // Các tham số chuyển động bay ngẫu nhiên độc lập cho từng quả bóng
      const floatDuration = Number((2.2 + Math.random() * 1.6).toFixed(2)); // 2.2s đến 3.8s
      const floatDelay = Number((Math.random() * 0.8).toFixed(2));          // 0s đến 0.8s
      const floatPeakY = Math.floor(-14 - Math.random() * 10);              // -14px đến -24px
      const floatPeakX = Math.floor(Math.random() * 12 - 6);                // -6px đến +6px
      const floatRotate = Math.floor(Math.random() * 8 - 4);                // -4deg đến +4deg

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

  // Xử lý khi bé bấm vào quả bóng
  const handleBubbleClick = (bubble) => {
    if (!targetCard) return;

    if (bubble.card.id === targetCard.id) {
      // Đúng -> nổ bóng, cộng điểm & thưởng sao
      soundEffects.playPop();
      soundEffects.playCorrect();
      setScore(prev => prev + 10);
      onEarnStar(1);

      // Ẩn bóng đã vỡ
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));

      // Chuyển sang từ tiếp theo sau 0.4s
      setTimeout(() => {
        pickNextQuestion();
      }, 400);
    } else {
      // Sai -> rung lắc nhẹ bóng và phát âm thanh buzzer
      soundEffects.playWrong();
      setShakingBubbleId(bubble.id);
      setTimeout(() => setShakingBubbleId(null), 500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 select-none">
      {/* Thanh Tiêu đề & Điều hướng */}
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

        {/* Bộ chọn chủ đề */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">Chủ đề:</span>
          <select
            value={selectedTopicId}
            disabled={isPlaying}
            onChange={(e) => {
              setSelectedTopicId(e.target.value);
              setIsPlaying(false);
              setIsGameOver(false);
            }}
            className="bg-white border-2 border-amber-300 text-amber-900 font-bold px-3 py-1.5 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
          >
            {topics.map(t => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name_vi} ({t.name_en})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vùng trò chơi */}
      <div className="relative min-h-[520px] bg-gradient-to-b from-sky-100 via-indigo-50 to-white rounded-3xl border-4 border-sky-300 shadow-bouncy overflow-hidden p-6 flex flex-col justify-between">
        {/* Mây trang trí nền */}
        <div className="absolute top-6 left-8 text-4xl opacity-40 animate-pulse pointer-events-none">☁️</div>
        <div className="absolute top-16 right-12 text-5xl opacity-40 animate-pulse pointer-events-none">☁️</div>

        {/* Header Trong Game: Điểm số & Đồng hồ */}
        <div className="relative z-20 flex items-center justify-between">
          {/* Điểm số */}
          <div className="flex items-center gap-2 bg-white/90 border-2 border-amber-300 px-4 py-2 rounded-2xl shadow-sm">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span className="text-sm font-extrabold text-amber-900 font-kids">
              Điểm: {score}
            </span>
          </div>

          {/* Đồng hồ đếm ngược 60s */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shadow-sm font-extrabold text-sm ${
            timeLeft <= 10 
              ? 'bg-rose-100 border-rose-300 text-rose-700 animate-bounce' 
              : 'bg-white/90 border-sky-300 text-sky-900'
          }`}>
            <span>⏱️</span>
            <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
          </div>
        </div>

        {/* Trạng Thái 1: Chưa bắt đầu */}
        {!isPlaying && !isGameOver && (
          <div className="relative z-20 my-auto text-center py-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-5xl shadow-lg border-4 border-white animate-bounce">
              🫧
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-800 font-kids mb-2">
              Bong Bóng Từ Vựng
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base font-medium mb-6">
              Lắng nghe từ tiếng Anh được đọc và bấm vỡ quả bóng chứa hình ảnh đúng trước khi bóng bay mất nhé! 🎈
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-black text-lg px-8 py-3.5 rounded-full shadow-lg border-3 border-amber-300 cursor-pointer"
            >
              BẮT ĐẦU CHƠI NGAY 🚀
            </motion.button>
          </div>
        )}

        {/* Trạng Thái 2: Đang Chơi */}
        {isPlaying && targetCard && (
          <>
            {/* Hộp phát âm từ mục tiêu */}
            <div className="relative z-20 text-center my-2">
              <div className="inline-flex items-center gap-3 bg-white/95 border-3 border-sky-300 px-6 py-3 rounded-full shadow-md">
                <button
                  onClick={() => {
                    soundEffects.playPop();
                    speakWord(targetCard.word, targetCard.audio_url);
                  }}
                  className="w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-500 border-2 border-amber-300 flex items-center justify-center text-amber-950 shadow-sm active:scale-95 transition-transform"
                  title="Nghe lại"
                >
                  <Volume2 className="w-6 h-6 animate-pulse" />
                </button>
                <div className="text-left">
                  <div className="text-xs font-bold text-sky-600 uppercase tracking-wide">
                    Hãy tìm quả bóng:
                  </div>
                  <div className="text-2xl font-black text-slate-800 font-kids tracking-wide">
                    {targetCard.word}
                  </div>
                </div>
              </div>
            </div>

            {/* Vùng bay của các Bong Bóng */}
            <div className="relative flex-1 w-full flex items-center justify-center min-h-[320px]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 items-center justify-center px-6 sm:px-8 py-4">
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
                      className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br ${b.color} border-4 p-3 sm:p-4 flex items-center justify-center shadow-lg cursor-pointer select-none overflow-hidden`}
                    >
                      {/* Đốm sáng phản chiếu của bong bóng */}
                      <div className="absolute top-2.5 left-3.5 w-6 h-3 bg-white/75 rounded-full rotate-[-35deg] pointer-events-none z-10" />

                      {/* Hình ảnh căn giữa tâm quả bóng */}
                      <div className="w-full h-full flex items-center justify-center p-1">
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
          </>
        )}

        {/* Trạng Thái 3: Hết Giờ (Game Over) */}
        {isGameOver && (
          <div className="relative z-20 my-auto text-center py-6 animate-fade-in">
            <div className="text-6xl mb-2 animate-bounce">🏆</div>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-800 font-kids mb-1">
              Tuyệt Vời Bé Ơi!
            </h3>
            <p className="text-slate-600 font-semibold mb-4">
              Bé đã làm vỡ rất nhiều bong bóng từ vựng xuất sắc!
            </p>

            <div className="inline-flex items-center gap-3 bg-amber-100 border-2 border-amber-300 px-6 py-2.5 rounded-2xl shadow-sm mb-6">
              <Star className="w-7 h-7 text-amber-500 fill-amber-400" />
              <span className="text-xl font-black text-amber-950 font-kids">
                Tổng Điểm: {score}
              </span>
            </div>

            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black text-base px-6 py-3 rounded-full shadow-md border-2 border-emerald-300 cursor-pointer"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Chơi Lại Nhé</span>
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
