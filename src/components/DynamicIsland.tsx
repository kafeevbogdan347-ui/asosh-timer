import React, { useState } from 'react';
import { ScreenId } from '../types';
import { Sparkles, Clock, Bell, BookOpen, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface DynamicIslandProps {
  nowLessonText: string;
  nextLessonText: string;
  remainSec: number;
  totalSec: number;
  statusType: 'lesson' | 'break' | 'none';
  onNavigate: (screen: ScreenId) => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  nowLessonText,
  nextLessonText,
  remainSec,
  totalSec,
  statusType,
  onNavigate,
}) => {
  const [expanded, setExpanded] = useState(false);

  const formatRemain = (sec: number) => {
    if (sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalSec > 0 ? Math.min(100, Math.max(0, ((totalSec - remainSec) / totalSec) * 100)) : 0;

  return (
    <div className="dynamic-island-banner px-2 py-1">
      <div
        className={`mx-auto bg-slate-950/95 text-white rounded-full border border-cyan-400/40 shadow-2xl backdrop-blur-xl transition-all duration-300 cursor-pointer select-none overflow-hidden ${
          expanded ? 'max-w-md rounded-3xl p-3.5 border-cyan-400 ring-2 ring-cyan-400/20' : 'max-w-[310px] py-1.5 px-3 hover:scale-[1.02]'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {!expanded ? (
          /* Compact Dynamic Island Pill */
          <div className="flex items-center justify-between text-xs font-bold gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="truncate text-cyan-200 text-[11px]">
                {statusType === 'lesson' ? nowLessonText || 'Идёт урок' : statusType === 'break' ? '🏖️ Перемена' : 'АСОШ №2'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-amber-300 text-[11px] bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                {remainSec > 0 ? formatRemain(remainSec) : '0:00'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </div>
          </div>
        ) : (
          /* Expanded Dynamic Island Card */
          <div className="space-y-2.5 text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Bell className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-400 block">
                    {statusType === 'lesson' ? 'Текущий урок' : statusType === 'break' ? 'Перемена' : 'АСОШ №2'}
                  </span>
                  <b className="text-xs text-white block">
                    {nowLessonText || 'Нет активного урока'}
                  </b>
                </div>
              </div>

              <button
                type="button"
                className="p-1 text-white/60 hover:text-white"
                onClick={() => setExpanded(false)}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            {totalSec > 0 && (
              <div className="space-y-1">
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/60 font-bold">
                  <span>Осталось: <b className="text-amber-300">{formatRemain(remainSec)}</b></span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
              </div>
            )}

            {/* Next Lesson Preview */}
            <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-xs flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-white/50 block font-bold">СЛЕДУЮЩИЙ УРОК:</span>
                <span className="text-white font-bold truncate block">{nextLessonText || 'Конец учебного дня'}</span>
              </div>
              <button
                type="button"
                className="btn cyan text-[10px] py-1 px-2.5 shrink-0 flex items-center gap-1"
                onClick={() => {
                  setExpanded(false);
                  onNavigate('today');
                }}
              >
                <span>Таймер</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
