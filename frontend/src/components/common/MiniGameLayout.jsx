import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function MiniGameLayout({
  title,
  icon,
  onBack,
  scoreBadge,
  topics = [],
  selectedTopicId,
  onSelectTopic,
  disabledTopic = false,
  isPlaying = false,
  isGameOver = false,
  onStartGame,
  canStartGame = true,
  startUnavailableContent = null,
  startIcon = '🎮',
  startTitle,
  startDescription,
  onRestartGame,
  gameOverTitle,
  gameOverSubtitle,
  gameOverContent,
  hintText,
  timerBadge,
  children
}) {
  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border-4 border-amber-200 overflow-hidden">
      {/* Zone 1: Top Bar (Header + Topic Selector) */}
      <div className="shrink-0 bg-white/80 border-b border-slate-100 p-2 sm:p-3">
        {/* Line 1: Back Button, Title, Score/Badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={onBack}
            className="p-1.5 sm:p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm cursor-pointer shrink-0"
            title="Quay về"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6"/>
          </button>

          <div className="flex items-center gap-2 font-black text-slate-800 text-base sm:text-xl font-kids truncate">
            <span>{icon}</span>
            <span className="truncate">{title}</span>
          </div>

          <div className="shrink-0">
            {scoreBadge}
          </div>
        </div>

        {/* Line 2: Topic Selector Bar */}
        {topics.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs sm:text-sm font-bold text-slate-500 shrink-0 mr-1">Chủ đề:</span>
            {topics.map((t) => {
              const isSelected = t.id === selectedTopicId;
              return (
                <button
                  key={t.id}
                  disabled={disabledTopic}
                  onClick={() => onSelectTopic && onSelectTopic(t.id)}
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all border shadow-xs cursor-pointer ${
                    isSelected
                      ? 'bg-amber-100 text-amber-900 border-amber-300 scale-105'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  } ${disabledTopic ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t.icon} {t.name_vi}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Zone 2: Center Workspace (Start Screen / Game Body / Game Over) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 relative">
        {!isPlaying && !isGameOver ? (
          canStartGame ? (
            /* Màn hình chào chuẩn hóa */
            <div className="relative z-20 my-auto text-center py-4 sm:py-8 animate-fade-in flex flex-col items-center justify-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-4 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-400 flex items-center justify-center text-3xl sm:text-5xl shadow-lg border-4 border-white animate-bounce">
                {startIcon}
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-800 font-kids mb-1.5 sm:mb-2">
                {startTitle || title}
              </h3>
              <p className="text-slate-600 max-w-md mx-auto text-xs sm:text-base font-medium mb-4 sm:mb-6 px-2">
                {startDescription}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => canStartGame && onStartGame && onStartGame()}
                disabled={!canStartGame}
                className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-black text-sm sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full shadow-lg border-2 sm:border-3 border-amber-300 cursor-pointer"
              >
                BẮT ĐẦU CHƠI NGAY 🚀
              </motion.button>
            </div>
          ) : (
            startUnavailableContent
          )
        ) : isGameOver ? (
          /* Màn hình kết thúc chuẩn hóa */
          <div className="relative z-20 my-auto text-center py-4 sm:py-8 animate-fade-in flex flex-col items-center justify-center">
            <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">🎉</div>
            <h3 className="text-2xl sm:text-4xl font-black text-slate-800 font-kids mb-1.5 sm:mb-2">
              {gameOverTitle || "Tuyệt Vời Quá Bé Ơi!"}
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-xs sm:text-base font-medium mb-4 sm:mb-6 px-2">
              {gameOverSubtitle}
            </p>
            {gameOverContent}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRestartGame}
              className="bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-black text-sm sm:text-base px-6 py-2.5 rounded-full shadow-md border-2 border-amber-300 cursor-pointer mt-2"
            >
              CHƠI LẠI VÁN MỚI 🔄
            </motion.button>
          </div>
        ) : (
          /* Nội dung Gameplay độc lập của từng game */
          children
        )}
      </div>

      {/* Zone 3: Bottom Bar (Hướng dẫn góc trái + Đồng hồ/Lượt góc phải) */}
      <div className="shrink-0 p-2.5 sm:p-3 bg-white/80 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-slate-600 font-medium text-xs sm:text-sm flex items-center gap-1.5 truncate">
          <span>💡</span>
          <span className="truncate">{hintText}</span>
        </div>
        <div className="shrink-0">
          {timerBadge}
        </div>
      </div>
    </div>
  );
}
