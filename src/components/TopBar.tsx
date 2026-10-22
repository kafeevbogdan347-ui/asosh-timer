import React from 'react';
import { Calculator, Trophy, Lock, EyeOff, Eye } from 'lucide-react';

interface TopBarProps {
  timeStr: string;
  onOpenCalc: () => void;
  onDoubleTapPanic: () => void;
  onOpenAchievements?: () => void;
  unlockedCount?: number;
  onOpenDev?: () => void;
  isPinActive?: boolean;
  onLockApp?: () => void;
  isPrivacyBlur?: boolean;
  onTogglePrivacyBlur?: () => void;
  onOpenAi?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  timeStr,
  onOpenCalc,
  onDoubleTapPanic,
  onOpenAchievements,
  unlockedCount = 0,
  onOpenDev,
  isPinActive = false,
  onLockApp,
  isPrivacyBlur = false,
  onTogglePrivacyBlur,
  onOpenAi,
}) => {
  return (
    <header
      className="flex justify-between items-center py-2 px-1 select-none cursor-pointer"
      onDoubleClick={onDoubleTapPanic}
      title="Двойной клик — Режим «Анти-палево»"
    >
      <div className="text-2xl font-black tabular-nums tracking-wide">{timeStr || '--:--'}</div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Anti-Spy Privacy Blur button */}
        {onTogglePrivacyBlur && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePrivacyBlur();
            }}
            className={`flex items-center gap-1 rounded-xl text-xs font-bold px-2 py-1.5 transition-colors cursor-pointer shadow-sm ${
              isPrivacyBlur
                ? 'bg-cyan-500 text-slate-950 font-black shadow-cyan-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white/80 border border-white/15'
            }`}
            title={isPrivacyBlur ? 'Анти-Шпион включён (данные скрыты). Нажмите для показа.' : 'Включить режим «Анти-Шпион»'}
          >
            {isPrivacyBlur ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Lock Screen button if PIN enabled */}
        {isPinActive && onLockApp && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLockApp();
            }}
            className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-xl text-xs font-bold px-2 py-1.5 text-amber-300 transition-colors cursor-pointer shadow-sm"
            title="Заблокировать приложение PIN-кодом"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenAchievements && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAchievements();
            }}
            className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-xl text-xs font-bold px-2.5 py-1.5 text-amber-300 transition-colors cursor-pointer shadow-sm"
            title="Школьные достижения"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-mono">{unlockedCount}</span>
          </button>
        )}

        {onOpenAi && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAi();
            }}
            className="flex items-center gap-1 bg-gradient-to-r from-cyan-500/25 to-blue-500/25 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-400/40 rounded-xl text-xs font-bold px-2.5 py-1.5 text-cyan-200 transition-colors cursor-pointer shadow-sm"
            title="ИИ-Помощник АСОШ №2"
          >
            <span>🤖</span>
            <span className="hidden sm:inline">ИИ</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCalc();
          }}
          className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-xs font-bold px-3 py-1.5 text-white transition-colors cursor-pointer shadow-sm"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Калькулятор</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenDev) onOpenDev();
          }}
          className="text-[11px] font-black px-2 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/35 border border-amber-400/40 text-amber-200 transition-colors cursor-pointer"
          title="Режим разработчика & Презентация школы"
        >
          ⚡ v13.3
        </button>
      </div>
    </header>
  );
};
