import React from 'react';
import { Star } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import appLogo from '../assets/logo.svg';

export default function Header({ 
  stars = 0, 
  onBackToMap, 
  currentTopic = null, 
  onOpenAdmin,
  onOpenPet,
  onOpenGames
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b-4 border-amber-200 px-2 sm:px-4 shadow-sm select-none w-full h-14 sm:h-16 shrink-0 flex items-center">
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4 min-w-0">
        {/* Left Section: Logo & Branding (icon-only on mobile < sm) */}
        <div 
          onClick={() => {
            soundEffects.playPop();
            if (onBackToMap) onBackToMap();
          }}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group select-none shrink-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-pink-100 to-amber-100 border-2 border-pink-200/80 rounded-2xl flex items-center justify-center shadow-sm p-0.5 sm:p-1 transform group-hover:scale-105 group-hover:rotate-3 transition-transform overflow-hidden">
            <img 
              src={appLogo} 
              alt="Kids Flashcards Diplodocus Logo" 
              className="w-full h-full object-contain filter drop-shadow-sm pointer-events-none select-none" 
            />
          </div>
          {/* App title is hidden on small mobile screens (< 640px) to prevent pushing right-side action buttons */}
          <div className="hidden sm:block min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 bg-clip-text text-transparent font-kids leading-tight truncate">
              Kids Flashcards
            </h1>
            <p className="text-xs text-slate-500 font-semibold hidden md:block">
              Học tiếng Anh thật vui mỗi ngày!
            </p>
          </div>
        </div>

        {/* Right Section: Pet, Games, Stars counter, and Parental Gate (shrink-0 ensures lock is never pushed off-screen) */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Virtual Pet button (Dino) */}
          <button
            onClick={() => {
              soundEffects.playPop();
              if (onOpenPet) onOpenPet();
            }}
            className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 border-2 border-emerald-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl shadow-sm text-emerald-800 font-bold text-xs sm:text-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
            title="Chăm sóc bạn Dino"
          >
            <span className="text-base sm:text-xl animate-bounce">🦖</span>
            <span className="hidden md:inline">Thú Cưng</span>
          </button>

          {/* Mini-Games button (Game Hub) */}
          <button
            onClick={() => {
              soundEffects.playPop();
              if (onOpenGames) onOpenGames();
            }}
            className="flex items-center gap-1 bg-sky-100 hover:bg-sky-200 border-2 border-sky-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl shadow-sm text-sky-800 font-bold text-xs sm:text-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
            title="Khu trò chơi mini"
          >
            <span className="text-base sm:text-xl">🎮</span>
            <span className="hidden md:inline">Trò Chơi</span>
          </button>

          {/* Star points widget */}
          <div 
            onClick={() => {
              soundEffects.playStar();
            }}
            className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-amber-100 to-yellow-200 border-2 border-amber-300 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl shadow-sm cursor-pointer"
            title="Tổng số sao vàng của bé"
          >
            <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-500 fill-amber-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-base font-bold text-amber-900 tracking-wide font-kids">
              {stars}
            </span>
          </div>

          {/* Parental Gate / Admin button (Lock icon - always clearly visible) */}
          <button
            onClick={() => {
              soundEffects.playPop();
              if (onOpenAdmin) onOpenAdmin();
            }}
            className="p-1.5 sm:p-2 rounded-2xl bg-slate-100 hover:bg-amber-100 border-2 border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-700 transition-colors shadow-sm cursor-pointer shrink-0 flex items-center justify-center"
            title="Khu vực phụ huynh"
          >
            <span className="text-sm sm:text-lg leading-none">🔒</span>
          </button>
        </div>
      </div>
    </header>
  );
}
