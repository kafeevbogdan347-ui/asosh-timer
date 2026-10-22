import React from 'react';
import { Achievement, LanguageType } from '../types';
import { Award, CheckCircle2, Lock, Sparkles, Trophy, Star } from 'lucide-react';

interface AchievementsScreenProps {
  achievements: Achievement[];
  lang: LanguageType;
  onShowToast: (msg: string) => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  achievements,
  lang,
  onShowToast,
}) => {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Школьные Достижения</span>
          </h2>
          <p className="text-xs text-white/70">
            Выполняйте задания, учитесь и открывайте уникальные значки АСОШ №2!
          </p>
        </div>
        <div className="text-right">
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
            <span>Общий школьный прогресс:</span>
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

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
              ach.unlocked
                ? 'bg-amber-500/10 border-amber-400/40 shadow-sm'
                : 'bg-white/5 border-white/8 opacity-60'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
                ach.unlocked
                  ? 'bg-amber-500/20 border-amber-400/50 shadow-inner'
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              {ach.unlocked ? ach.icon : <Lock className="w-5 h-5 text-white/40" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <b
                  className={`text-xs font-bold truncate ${
                    ach.unlocked ? 'text-amber-300 font-black' : 'text-white/70'
                  }`}
                >
                  {ach.title}
                </b>
                {ach.unlocked && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">
                {ach.description}
              </p>

              {ach.unlocked && ach.unlockedAt && (
                <span className="text-[9px] font-mono text-amber-400/80 block mt-1">
                  ✓ Открыто {ach.unlockedAt}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
