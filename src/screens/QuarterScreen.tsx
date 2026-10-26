import React, { useState } from 'react';
import { SCHOOL_QUARTERS } from '../data/constants';
import { LanguageType } from '../types';
import { Calendar, Sparkles, Trophy, BookOpen } from 'lucide-react';

interface QuarterScreenProps {
  lang: LanguageType;
}

export const QuarterScreen: React.FC<QuarterScreenProps> = ({ lang }) => {
  const [activeQuarterIdx, setActiveQuarterIdx] = useState(0);

  // Quarter Target Goal Tracker State
  const [goalGrades, setGoalGrades] = useState('4 4 3 5 4');
  const [targetGoal, setTargetGoal] = useState<'4' | '5'>('5');

  // Compute live progress based on current date
  const now = new Date();
  const nowTime = now.getTime();

  // Find which quarter is active today or default to 0
  const qList = SCHOOL_QUARTERS.map((q, idx) => {
    const sTime = new Date(q.start).getTime();
    const eTime = new Date(q.end).getTime();
    const totalDays = Math.max(1, Math.round((eTime - sTime) / (1000 * 60 * 60 * 24)));
    let passedDays = Math.round((nowTime - sTime) / (1000 * 60 * 60 * 24));
    passedDays = Math.max(0, Math.min(totalDays, passedDays));
    const percent = Math.round((passedDays / totalDays) * 100);
    const daysLeft = Math.max(0, Math.round((eTime - nowTime) / (1000 * 60 * 60 * 24)));
    const isCurrent = nowTime >= sTime && nowTime <= eTime;

    return {
      ...q,
      idx,
      totalDays,
      passedDays,
      percent,
      daysLeft,
      isCurrent,
    };
  });

  const selectedQ = qList[activeQuarterIdx] || qList[0];

  const getQuarterName = (q: any) => {
    switch (lang) {
      case 'ba': return q.nameBa || q.name;
      case 'tj': return q.nameTj || q.name;
      case 'kk': return q.nameKk || q.name;
      case 'uz': return q.nameUz || q.name;
      case 'ky': return q.nameKy || q.name;
      case 'be': return q.nameBe || q.name;
      case 'hy': return q.nameHy || q.name;
      case 'az': return q.nameAz || q.name;
      default: return q.name;
    }
  };

  const getBreakName = (q: any) => {
    switch (lang) {
      case 'ba': return q.breakNameBa || q.breakName;
      case 'tj': return q.breakNameTj || q.breakName;
      case 'kk': return q.breakNameKk || q.breakName;
      case 'uz': return q.breakNameUz || q.breakName;
      case 'ky': return q.breakNameKy || q.breakName;
      case 'be': return q.breakNameBe || q.breakName;
      case 'hy': return q.breakNameHy || q.breakName;
      case 'az': return q.breakNameAz || q.breakName;
      default: return q.breakName;
    }
  };

  return (
    <div className="card screen-enter space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <span>📊</span>
            <span>Счётчик четверти и дней до каникул</span>
          </h2>
          <p className="text-xs text-white/70">
            Интерактивный прогресс учебных периодов и обратный отсчет
          </p>
        </div>
      </div>

      {/* Переключатель четвертей */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {qList.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`choice py-2.5 text-xs font-bold ${
              activeQuarterIdx === i ? 'active' : ''
            }`}
            onClick={() => setActiveQuarterIdx(i)}
          >
            <div>{getQuarterName(q)}</div>
            {q.isCurrent && (
              <span className="text-[10px] text-amber-300 font-extrabold block">● Текущая</span>
            )}
          </button>
        ))}
      </div>

      {/* Главная карточка прогресса */}
      <div className="bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-3xl border border-white/20 shadow-xl space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-2xl font-black text-white">
              {getQuarterName(selectedQ)}
            </div>
            <div className="text-xs text-cyan-300 font-semibold mt-0.5">
              {selectedQ.start} — {selectedQ.end}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-cyan-300 font-mono">
              {selectedQ.percent}%
            </div>
            <div className="text-[11px] text-white/70 uppercase font-bold">пройдено</div>
          </div>
        </div>

        {/* Прогресс бар */}
        <div className="w-full bg-black/40 h-4 rounded-full overflow-hidden border border-white/15 p-0.5">
          <div
            className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${selectedQ.percent}%` }}
          />
        </div>

        {/* Метрики четверти */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-3 bg-black/30 rounded-2xl border border-white/10 text-center">
            <div className="text-2xl font-black text-amber-300 font-mono">
              {selectedQ.daysLeft}
            </div>
            <div className="text-xs text-white/80 font-bold">
              Дней до {getBreakName(selectedQ)} 🏖️
            </div>
          </div>

          <div className="p-3 bg-black/30 rounded-2xl border border-white/10 text-center">
            <div className="text-2xl font-black text-emerald-300 font-mono">
              {selectedQ.passedDays} / {selectedQ.totalDays}
            </div>
            <div className="text-xs text-white/80 font-bold">Учебных дней прошло</div>
          </div>
        </div>
      </div>

      {/* 🎯 Интерактивный трекер «Цель на четверть: Какую оценку получить?» */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <h3 className="text-base font-black text-cyan-300">Цель на четверть</h3>
              <p className="text-[11px] text-white/60">Сколько оценок получить для 4 или 5</p>
            </div>
          </div>
          <div className="flex bg-white/10 p-0.5 rounded-xl border border-white/15">
            <button
              type="button"
              onClick={() => setTargetGoal('4')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                targetGoal === '4' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white/60'
              }`}
            >
              Хочу 4
            </button>
            <button
              type="button"
              onClick={() => setTargetGoal('5')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                targetGoal === '5' ? 'bg-emerald-400 text-slate-950 shadow-sm' : 'text-white/60'
              }`}
            >
              Хочу 5
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-white/70 block mb-1">
            Текущие оценки по спорному предмету (через пробел):
          </label>
          <input
            type="text"
            value={goalGrades}
            onChange={(e) => setGoalGrades(e.target.value)}
            placeholder="Например: 5 4 3 4 5"
            className="text-sm font-mono w-full"
          />
        </div>

        {(() => {
          const numbers = (goalGrades.match(/[1-5]/g) || []).map(Number);
          if (numbers.length === 0) {
            return (
              <div className="p-3 rounded-xl bg-white/5 text-white/60 text-xs text-center">
                Введите хотя бы одну оценку для расчёта цели
              </div>
            );
          }
          const sum = numbers.reduce((a, b) => a + b, 0);
          const count = numbers.length;
          const avg = sum / count;
          const targetNum = targetGoal === '5' ? 5 : 4;
          const threshold = targetGoal === '5' ? 4.60 : 3.60;

          if (avg >= threshold) {
            return (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs space-y-1">
                <div className="font-black text-sm text-white flex items-center gap-1.5">
                  <span>🏆</span>
                  <span>Цель достигнута! Выходит {targetGoal}</span>
                </div>
                <p>
                  Текущий средний балл: <b>{avg.toFixed(2)}</b> (выше порога {threshold}). Главное — не получить случайную двойку до конца четверти!
                </p>
              </div>
            );
          }

          const needed = Math.max(1, Math.ceil((threshold * count - sum) / (targetNum - threshold)));
          return (
            <div className="p-3.5 rounded-2xl bg-cyan-950/50 border border-cyan-400/40 text-cyan-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Текущий средний балл:</span>
                <span className="font-mono font-black text-cyan-300 text-sm">{avg.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
                <span className="font-bold text-white">Нужно ещё оценок «{targetNum}»:</span>
                <span className="font-mono font-black text-emerald-300 text-base">+{needed} шт.</span>
              </div>
              <p className="text-[11px] text-white/70 pt-0.5 leading-snug">
                Если вы ответите у доски или сдадите домашку на «{targetNum}» ещё {needed} раз(а), средний балл поднимется до {threshold} и выйдет заветная {targetGoal}!
              </p>
            </div>
          );
        })()}
      </div>

      {/* Школьные советы к четверти */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="p-3.5 bg-white/8 rounded-2xl border border-white/15 flex items-start gap-3">
          <Trophy className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 leading-relaxed">
            <b className="text-white block mb-0.5 font-bold">Закрытие оценок</b>
            Следите за средним баллом в разделе «ДЗ & Баллы», чтобы вовремя подтянуть спорные четвертные отметки!
          </div>
        </div>

        <div className="p-3.5 bg-white/8 rounded-2xl border border-white/15 flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 leading-relaxed">
            <b className="text-white block mb-0.5 font-bold">Режим и фокус</b>
            Используйте «Помодоро-таймер» для выполнения домашних заданий порциями по 25 минут без усталости.
          </div>
        </div>
      </div>
    </div>
  );
};
