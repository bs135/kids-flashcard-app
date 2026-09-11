import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

export default function TopicMap({ topics = [], onSelectTopic, onSelectGame }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Tiêu đề Chào Mừng */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-100 border-2 border-yellow-300 px-4 py-1.5 rounded-full text-yellow-800 font-bold text-sm mb-3 shadow-sm">
          <Compass className="w-4 h-4 text-amber-600 animate-spin" />
          <span>BẢN ĐỒ KHÁM PHÁ THẾ GIỚI</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 font-kids tracking-tight">
          Hôm nay bé muốn học gì nào? 🚀
        </h2>
        <p className="text-slate-500 mt-2 text-base font-medium">
          Chọn một hòn đảo chủ đề bên dưới hoặc thử thách mini-games nhé!
        </p>
      </div>

      {/* Banner Khu Vực Mini-Games Vui Nhộn */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Game 1: Bong Bóng Từ Vựng */}
        <motion.div
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            soundEffects.playPop();
            if (onSelectGame) onSelectGame('bubble');
          }}
          className="bg-gradient-to-r from-sky-400 to-blue-500 rounded-3xl p-4 text-white shadow-lg border-3 border-sky-300 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-inner">
              🫧
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-sky-100">Mini Game 1</div>
              <h4 className="text-xl font-black font-kids">Bong Bóng Từ Vựng</h4>
              <p className="text-xs text-sky-100 font-medium">Lắng nghe & nổ bóng đúng từ</p>
            </div>
          </div>
          <div className="bg-white text-sky-700 font-black text-xs px-3 py-1.5 rounded-full shadow-sm">
            Chơi Ngay ➔
          </div>
        </motion.div>

        {/* Game 2: Lật Thẻ Trí Nhớ */}
        <motion.div
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            soundEffects.playPop();
            if (onSelectGame) onSelectGame('memory');
          }}
          className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-4 text-white shadow-lg border-3 border-amber-300 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-inner">
              🃏
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-100">Mini Game 2</div>
              <h4 className="text-xl font-black font-kids">Lật Thẻ Trí Nhớ</h4>
              <p className="text-xs text-amber-100 font-medium">Ghép đôi ảnh & từ vựng</p>
            </div>
          </div>
          <div className="bg-white text-amber-800 font-black text-xs px-3 py-1.5 rounded-full shadow-sm">
            Chơi Ngay ➔
          </div>
        </motion.div>
      </div>

      {/* Lưới các Hòn Đảo Chủ Đề */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {topics.map((topic, index) => {
          const isUnlocked = topic.is_unlocked !== false;
          const totalCards = topic.total_cards || 0;
          const learnedCards = topic.learned_cards || 0;
          const progressPercent = totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0;

          const themeColors = {
            amber: 'from-amber-400 to-orange-400 border-amber-300 text-amber-900 bg-amber-50',
            sky: 'from-sky-400 to-blue-500 border-sky-300 text-sky-900 bg-sky-50',
            emerald: 'from-emerald-400 to-green-500 border-emerald-300 text-emerald-900 bg-emerald-50',
            rose: 'from-rose-400 to-pink-500 border-rose-300 text-rose-900 bg-rose-50',
          };

          const cardTheme = themeColors[topic.color_theme] || themeColors.amber;

          return (
            <motion.div
              key={topic.id}
              whileHover={{ scale: 1.03, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (isUnlocked) {
                  soundEffects.playPop();
                  onSelectTopic(topic);
                }
              }}
              className={`relative overflow-hidden rounded-3xl border-4 bg-white p-6 shadow-bouncy transition-all cursor-pointer select-none ${
                isUnlocked ? 'border-amber-200 hover:border-amber-400' : 'opacity-60 cursor-not-allowed border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl shadow-inner mb-4">
                  {topic.icon}
                </div>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
                  {totalCards} Từ vựng
                </span>
              </div>

              <h3 className="text-2xl font-bold text-slate-800 font-kids mb-1">
                {topic.name_en}
              </h3>
              <p className="text-lg text-slate-500 font-semibold mb-4">
                {topic.name_vi}
              </p>

              {/* Thanh tiến độ học tập */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Tiến độ học</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end text-sm font-bold text-amber-600 gap-1">
                <span>Khám phá ngay</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
