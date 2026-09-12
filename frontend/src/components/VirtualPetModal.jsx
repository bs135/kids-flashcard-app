import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Heart, Award, Star, Utensils } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../services/soundEffects';

export default function VirtualPetModal({ isOpen, onClose, stars = 0, onUpdateStars }) {
  // Pet state stored in localStorage
  const [petData, setPetData] = useState(() => {
    try {
      const saved = localStorage.getItem('kids_pet_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      hunger: 40,
      level: 1,
      happiness: 60,
      totalFeeds: 0
    };
  });

  const [dinoAction, setDinoAction] = useState('idle'); // 'idle' | 'eating' | 'celebrating'
  const [speechBubble, setSpeechBubble] = useState('Chào bé! Dino đang đói bụng nè~');

  // Persist petData into localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kids_pet_data', JSON.stringify(petData));
    } catch (e) {}
  }, [petData]);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  // Handle feeding Dino
  const handleFeed = (cost, hungerBoost, foodName) => {
    if (stars < cost) {
      soundEffects.playWrong();
      setSpeechBubble('Bé ơi, chưa đủ sao vàng rồi! Hãy học thêm thẻ nhé! ⭐');
      return;
    }

    // Deduct stars
    onUpdateStars(-cost);
    soundEffects.playNomNom();

    // Update hunger & level
    let newHunger = petData.hunger + hungerBoost;
    let newLevel = petData.level;
    let leveledUp = false;

    if (newHunger >= 100) {
      newHunger = newHunger - 100;
      newLevel += 1;
      leveledUp = true;
    }

    setPetData(prev => ({
      ...prev,
      hunger: newHunger,
      level: newLevel,
      happiness: Math.min(100, prev.happiness + 15),
      totalFeeds: prev.totalFeeds + 1
    }));

    if (leveledUp) {
      setDinoAction('celebrating');
      soundEffects.playWin();
      triggerConfetti();
      setSpeechBubble(`🎉 Oa tuyệt vời! Dino đã lên Cấp ${newLevel}! Cảm ơn bé!`);
      setTimeout(() => setDinoAction('idle'), 3000);
    } else {
      setDinoAction('eating');
      if (cost >= 10) triggerConfetti();
      const cheers = [
        `Măm măm ${foodName}! Ngon tuyệt cú mèo bé ơi! 😋`,
        'Dino no nê rồi, cảm ơn bé nhiều lắm nha! 💖',
        'Yummy yummy! Bé chăm Dino giỏi quá! 🦖'
      ];
      setSpeechBubble(cheers[Math.floor(Math.random() * cheers.length)]);
      setTimeout(() => setDinoAction('idle'), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        className="relative w-full max-w-md bg-gradient-to-b from-emerald-50 via-teal-50 to-white rounded-3xl border-3 sm:border-4 border-emerald-300 shadow-2xl p-4 sm:p-6 overflow-hidden select-none my-auto"
      >
        {/* Close button */}
        <button
          onClick={() => {
            soundEffects.playPop();
            onClose();
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 border-2 border-emerald-200 flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:scale-110 active:scale-95 transition-all shadow-sm z-10"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Modal title */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-1.5 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-emerald-800 font-bold text-xs shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span>NGÔI NHÀ THÚ CƯNG CỦA BÉ</span>
          </div>
          <h3 className="text-2xl font-black text-emerald-950 font-kids mt-1">
            Bạn Dino Đồng Hành 🦖
          </h3>
        </div>

        {/* Dino speech bubble */}
        <div className="relative mx-auto my-3 max-w-xs bg-white border-2 border-emerald-300 rounded-2xl p-3 shadow-md text-center text-emerald-900 font-bold text-sm">
          {speechBubble}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-emerald-300 rotate-45" />
        </div>

        {/* Dino mascot animation */}
        <div className="relative flex flex-col items-center justify-center py-4">
          <div className="absolute w-44 h-44 rounded-full bg-emerald-200/50 filter blur-xl animate-pulse" />
          <motion.div
            animate={
              dinoAction === 'celebrating'
                ? { rotate: [0, 360], scale: [1, 1.25, 1] }
                : dinoAction === 'eating'
                ? { y: [0, -12, 0, -8, 0], scale: [1, 1.1, 1] }
                : { y: [0, -6, 0] }
            }
            transition={{
              duration: dinoAction === 'celebrating' ? 1.2 : dinoAction === 'eating' ? 0.6 : 2,
              repeat: dinoAction === 'idle' ? Infinity : 0,
              ease: 'easeInOut'
            }}
            className="relative z-10 text-8xl drop-shadow-xl cursor-pointer select-none"
            onClick={() => {
              soundEffects.playPop();
              setSpeechBubble('Hihi, nhột quá bé ơi! Cùng học tiếng Anh thôi! 🌟');
            }}
          >
            🦖
          </motion.div>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-sm px-4 py-1 rounded-full shadow-md border-2 border-amber-300">
            <Award className="w-4 h-4 fill-amber-950" />
            <span>CẤP ĐỘ {petData.level}</span>
          </div>
        </div>

        {/* Status bars: Hunger & Happiness */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-emerald-200 p-3.5 space-y-2.5 shadow-sm mb-4">
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                Độ No (Đầy 100% để Thăng Cấp)
              </span>
              <span className="text-emerald-700 font-extrabold">{petData.hunger}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full border border-slate-200 overflow-hidden p-0.5">
              <div
                style={{ width: `${petData.hunger}%` }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-1">
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-400" />
                Chỉ số Hạnh Phúc
              </span>
              <span className="text-rose-600 font-extrabold">{petData.happiness}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full border border-slate-200 overflow-hidden p-0.5">
              <div
                style={{ width: `${petData.happiness}%` }}
                className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Feeding menu */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Cho Dino Ăn:
            </span>
            <span className="text-xs font-bold text-amber-700 flex items-center gap-1 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
              Bé có: <strong className="text-amber-900">{stars}</strong> sao
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleFeed(5, 20, 'Táo Đỏ 🍎')}
              disabled={stars < 5}
              className={`flex items-center gap-3 p-3 rounded-2xl border-3 text-left transition-all ${
                stars >= 5
                  ? 'bg-gradient-to-br from-rose-50 to-white border-rose-200 hover:border-rose-400 shadow-sm cursor-pointer'
                  : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="text-3xl">🍎</span>
              <div>
                <div className="font-bold text-slate-800 text-sm">Táo Đỏ</div>
                <div className="text-xs text-emerald-600 font-semibold">+20% no</div>
                <div className="text-xs font-black text-amber-700 flex items-center gap-0.5 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  5 Sao
                </div>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleFeed(10, 50, 'Bánh Kem 🍰')}
              disabled={stars < 10}
              className={`flex items-center gap-3 p-3 rounded-2xl border-3 text-left transition-all ${
                stars >= 10
                  ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 hover:border-amber-400 shadow-sm cursor-pointer'
                  : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="text-3xl">🍰</span>
              <div>
                <div className="font-bold text-slate-800 text-sm">Bánh Kem</div>
                <div className="text-xs text-emerald-600 font-semibold">+50% no</div>
                <div className="text-xs font-black text-amber-700 flex items-center gap-0.5 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  10 Sao
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
