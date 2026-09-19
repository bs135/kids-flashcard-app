import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles, ArrowRight } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

export default function TopicMap({ topics = [], onSelectTopic, onSelectGame }) {
  return (
    <div className="w-full select-none pb-4">
      {/* Welcome Title */}
      <div className="text-center mb-6 sm:mb-8 px-1">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-yellow-100 border-2 border-yellow-300 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-yellow-800 font-bold text-xs sm:text-sm mb-2 sm:mb-3 shadow-sm">
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 animate-spin" />
          <span>BẢN ĐỒ KHÁM PHÁ THẾ GIỚI</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-800 font-kids tracking-tight">
          Hôm nay bé muốn học gì nào? 🚀
        </h2>
        <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base font-medium">
          Chọn một hòn đảo chủ đề bên dưới hoặc thử thách mini-games nhé!
        </p>
      </div>

      {/* Mini-Games Section Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-6 sm:mb-8">
        {/* Game 1: Bubble Pop */}
        <motion.div
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            soundEffects.playPop();
            if (onSelectGame) onSelectGame('bubble');
          }}
          className="bg-gradient-to-r from-sky-400 to-blue-500 rounded-3xl p-4 sm:p-5 text-white shadow-lg border-3 border-sky-300 flex items-center justify-between gap-2 sm:gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
              🫧
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-sky-100">Mini Game 1</div>
              <h4 className="text-base sm:text-lg lg:text-xl font-black font-kids leading-tight">Bong Bóng Từ Vựng</h4>
              <p className="text-xs text-sky-100 font-medium leading-normal">Lắng nghe & nổ bóng</p>
            </div>
          </div>
          <div className="shrink-0 whitespace-nowrap bg-white text-sky-700 font-black text-xs sm:text-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-sm">
            Chơi Ngay ➔
          </div>
        </motion.div>

        {/* Game 2: Memory Flip */}
        <motion.div
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            soundEffects.playPop();
            if (onSelectGame) onSelectGame('memory');
          }}
          className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl p-4 sm:p-5 text-white shadow-lg border-3 border-amber-300 flex items-center justify-between gap-2 sm:gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
              🃏
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-100">Mini Game 2</div>
              <h4 className="text-base sm:text-lg lg:text-xl font-black font-kids leading-tight">Lật Thẻ Trí Nhớ</h4>
              <p className="text-xs text-amber-100 font-medium leading-normal">Ghép đôi ảnh & từ vựng</p>
            </div>
          </div>
          <div className="shrink-0 whitespace-nowrap bg-white text-amber-800 font-black text-xs sm:text-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-sm">
            Chơi Ngay ➔
          </div>
        </motion.div>

        {/* Game 3: Audio Match */}
        <motion.div
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            soundEffects.playPop();
            if (onSelectGame) onSelectGame('audio_match');
          }}
          className="bg-gradient-to-r from-emerald-400 to-green-500 rounded-3xl p-4 sm:p-5 text-white shadow-lg border-3 border-emerald-300 flex items-center justify-between gap-2 sm:gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
              🎧
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-100">Mini Game 3</div>
              <h4 className="text-base sm:text-lg lg:text-xl font-black font-kids leading-tight">Nghe Âm Đoán Hình</h4>
              <p className="text-xs text-emerald-100 font-medium leading-normal">Nghe từ & nối ảnh đúng</p>
            </div>
          </div>
          <div className="shrink-0 whitespace-nowrap bg-white text-emerald-800 font-black text-xs sm:text-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-sm">
            Chơi Ngay ➔
          </div>
        </motion.div>

        {/* Game 4: Eye Spy */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (onSelectGame) onSelectGame('eye_spy');
          }}
          className="bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-3xl p-4 sm:p-5 text-white shadow-lg border-3 border-fuchsia-300 flex items-center justify-between gap-2 sm:gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
              🔍
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-fuchsia-100">Mini Game 4</div>
              <h4 className="text-base sm:text-lg lg:text-xl font-black font-kids leading-tight">Ai Tinh Mắt?</h4>
              <p className="text-xs text-fuchsia-100 font-medium leading-normal">Lắng nghe & tìm đồ vật</p>
            </div>
          </div>
          <div className="shrink-0 whitespace-nowrap bg-white text-fuchsia-800 font-black text-xs sm:text-sm px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-sm">
            Chơi Ngay ➔
          </div>
        </motion.div>
      </div>

      {/* Themed Topic Islands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Special Topic: "All Words" (All Topics) */}
        {(() => {
          const totalAllCards = topics.reduce((sum, t) => sum + (t.total_cards || 0), 0);
          const totalLearnedAllCards = topics.reduce((sum, t) => sum + (t.learned_cards || 0), 0);
          const allProgressPercent = totalAllCards > 0 ? Math.round((totalLearnedAllCards / totalAllCards) * 100) : 0;

          const allTopicObject = {
            id: 'all',
            name_en: 'All Topics',
            name_vi: 'Khám phá tổng hợp',
            icon: '🌟',
            color_theme: 'amber',
            total_cards: totalAllCards
          };

          return (
            <motion.div
              key="special-all-topics"
              whileHover={{ scale: 1.03, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                soundEffects.playPop();
                onSelectTopic(allTopicObject);
              }}
              className="relative overflow-hidden rounded-3xl border-4 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6 shadow-bouncy transition-all cursor-pointer select-none hover:shadow-xl group"
            >
              {/* Highlight badge */}
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-[10px] sm:text-xs font-black px-3 py-1 rounded-bl-2xl shadow-sm uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>Đặc Biệt</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-4xl shadow-md mb-4 text-white">
                  🌟
                </div>
                <span className="bg-white/80 text-amber-900 text-xs font-black px-3 py-1.5 rounded-full border border-amber-300 shadow-sm mt-5 sm:mt-0">
                  {totalAllCards} Từ vựng
                </span>
              </div>

              <h3 className="text-2xl font-bold text-slate-800 font-kids mb-1">
                Ngẫu Nhiên
              </h3>
              <p className="text-lg text-slate-600 font-semibold mb-4">
                Khám phá tổng hợp mọi chủ đề
              </p>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Tiến độ tổng hợp</span>
                  <span>{allProgressPercent}%</span>
                </div>
                <div className="w-full h-3.5 bg-white rounded-full overflow-hidden border border-amber-200 p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${allProgressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end text-sm font-black text-amber-700 gap-1 group-hover:translate-x-1 transition-transform">
                <span>Ôn tập ngẫu nhiên ngay</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          );
        })()}

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
            purple: 'from-purple-400 to-indigo-500 border-purple-300 text-purple-900 bg-purple-50',
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
              className={`relative overflow-hidden rounded-3xl border-4 bg-white p-6 shadow-bouncy transition-all cursor-pointer select-none ${isUnlocked ? 'border-amber-200 hover:border-amber-400' : 'opacity-60 cursor-not-allowed border-slate-200'
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

              {/* Topic learning progress bar */}
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
