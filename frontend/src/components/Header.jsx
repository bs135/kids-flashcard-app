import React from 'react';
import { Sparkles, Star, Award, Volume2 } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

export default function Header({ stars = 0, onBackToMap, currentTopic = null }) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b-4 border-amber-200 px-4 py-3 shadow-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Logo & Tên ứng dụng */}
        <div 
          onClick={() => {
            soundEffects.playPop();
            if (onBackToMap) onBackToMap();
          }}
          className="flex items-center gap-2 cursor-pointer group select-none"
        >
          <div className="w-11 h-11 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-2xl flex items-center justify-center shadow-md transform group-hover:scale-105 transition-transform">
            <span className="text-2xl">🌟</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 bg-clip-text text-transparent font-kids">
              Kids Flashcards
            </h1>
            <p className="text-xs text-slate-500 font-semibold hidden sm:block">
              Học tiếng Anh thật vui mỗi ngày!
            </p>
          </div>
        </div>

        {/* Thông tin Chủ đề hiện tại & Điểm sao ⭐ */}
        <div className="flex items-center gap-3">
          {/* Widget Bạn Thú Cưng Mini */}
          <div className="flex items-center gap-1.5 bg-emerald-100 border-2 border-emerald-300 px-3 py-1.5 rounded-2xl shadow-sm text-emerald-800 font-bold text-sm">
            <span className="text-xl animate-bounce">🦖</span>
            <span className="hidden sm:inline">Dino Bạn Nhỏ</span>
          </div>

          {/* Widget Điểm Sao Vàng */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-yellow-200 border-2 border-amber-300 px-3.5 py-1.5 rounded-2xl shadow-sm">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400 animate-pulse" />
            <span className="text-base sm:text-lg font-bold text-amber-900 tracking-wide font-kids">
              {stars}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
