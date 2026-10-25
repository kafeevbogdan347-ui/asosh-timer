import React, { useState } from 'react';
import { Achievement, ScreenId } from '../types';
import { CheckCircle2, Lock, Sparkles, Trophy, Lightbulb, ChevronRight } from 'lucide-react';

interface AchievementsScreenProps {
  achievements: Achievement[];
  onNavigate: (screen: ScreenId) => void;
}

type Filter = 'all' | 'locked' | 'unlocked';

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ achievements, onNavigate }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercent = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const shown = achievements.filter((a) => (filter === 'all' ? true : filter === 'unlocked' ? a.unlocked : !a.unlocked));

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Школьные Достижения</span>
          </h2>
          <p className="text-xs text-white/70">
            Под каждым закрытым значком написано, как его получить. Жми «Перейти», чтобы сразу открыть нужный экран.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-base font-black text-amber-300 font-mono">
            {unlockedCount} / {totalCount}
          </span>
          <span className="block text-[10px] text-white/50 uppercase">Открыто</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 bg-white/6 rounded-2xl border border-white/12 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Общий прогресс:</span>
          </span>
          <span className="font-mono font-bold text-amber-300">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-950/80 h-3.5 rounded-full overflow-hidden p-0.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Фильтр */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['all', 'Все', totalCount],
            ['locked', 'Закрытые', totalCount - unlockedCount],
            ['unlocked', 'Открытые', unlockedCount],
          ] as [Filter, string, number][]
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`choice !py-2 !px-1 flex flex-col items-center leading-tight ${filter === id ? 'active' : ''}`}
            onClick={() => setFilter(id)}
          >
            <span className="text-xs font-black">{label}</span>
            <span className="text-[10px] opacity-70 font-bold">{count}</span>
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {shown.map((ach) => (
          <div
            key={ach.id}
            className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
              ach.unlocked ? 'bg-amber-500/10 border-amber-400/40 shadow-sm' : 'bg-white/5 border-white/10'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
                ach.unlocked ? 'bg-amber-500/20 border-amber-400/50 shadow-inner' : 'bg-white/5 border-white/10'
              }`}
            >
              {ach.unlocked ? ach.icon : <span className="grayscale opacity-40">{ach.icon}</span>}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <b className={`text-xs ${ach.unlocked ? 'text-amber-300 font-black' : 'text-white/85 font-bold'}`}>
                  {ach.title}
                </b>
                {ach.unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-white/60 mt-0.5">{ach.description}</p>

              {ach.unlocked ? (
                ach.unlockedAt && (
                  <span className="text-[10px] font-mono text-amber-400/80 block mt-1">✓ Открыто {ach.unlockedAt}</span>
                )
              ) : (
                ach.hint && (
                  <div className="mt-1.5 p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/25 text-[11px] text-cyan-100 flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-px" />
                    <span className="flex-1">{ach.hint}</span>
                  </div>
                )
              )}

              {!ach.unlocked && ach.screen && (
                <button
                  type="button"
                  className="mt-1.5 text-[11px] font-black text-cyan-300 hover:text-cyan-200 flex items-center gap-0.5"
                  onClick={() => onNavigate(ach.screen!)}
                >
                  Перейти <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="text-xs text-white/60 text-center py-4 sm:col-span-2">
            {filter === 'locked' ? 'Ты открыл все достижения! 🏆' : 'Пока ничего не открыто — начни с подсказок выше.'}
          </p>
        )}
      </div>
    </div>
  );
};
