import React from 'react';
import { TimerStyleType, LanguageType, SmartDayData } from '../types';
import { DICT } from '../data/constants';
import { Sparkles } from 'lucide-react';

interface TodayScreenProps {
  timerStyle: TimerStyleType;
  nowLessonText: string;
  nextLessonText: string;
  remainSec: number;
  totalSec: number;
  statusType: 'lesson' | 'break' | 'before' | 'none';
  lang: LanguageType;
  smartDayAdvice?: SmartDayData | null;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  timerStyle,
  nowLessonText,
  nextLessonText,
  remainSec,
  totalSec,
  statusType,
  lang,
  smartDayAdvice,
}) => {
  const d = DICT[lang] || DICT.ru;

  const pad = (n: number) => String(n).padStart(2, '0');
  const secText = (s: number) => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${pad(m)}:${pad(sec)}`;
  };

  const timeDisplay = secText(remainSec);

  let labelText = 'осталось';
  if (statusType === 'lesson') labelText = 'идёт урок';
  else if (statusType === 'break') labelText = 'перемена';
  else if (statusType === 'before') labelText = 'до уроков';
  else labelText = 'свободно';

  const progressAngle = totalSec > 0 ? ((totalSec - remainSec) / totalSec) * 360 : 0;

  return (
    <div className="card text-center screen-enter">
      <h2 className="text-xl font-black mb-3 text-cyan-300">{d.now}</h2>

      {timerStyle === 'circle' ? (
        <div
          className="w-44 h-44 rounded-full mx-auto my-4 grid place-items-center shadow-2xl relative transition-all duration-300"
          style={{
            background: `conic-gradient(var(--accent) ${progressAngle}deg, rgba(255, 255, 255, 0.15) 0deg)`,
            boxShadow: 'inset 0 0 0 6px rgba(255, 255, 255, 0.18), var(--sh)',
          }}
        >
          <div className="w-32 h-32 rounded-full bg-slate-950/90 border border-white/20 text-white flex flex-col items-center justify-center">
            <div className="text-3xl font-black font-mono tracking-tight text-cyan-300">
              {remainSec > 0 ? timeDisplay : '00:00'}
            </div>
            <div className="text-[11px] text-white/70 mt-1 uppercase tracking-wider font-bold">
              {labelText}
            </div>
          </div>
        </div>
      ) : (
        <div className="my-6">
          <div className="text-5xl font-black font-mono text-cyan-300 tracking-wider drop-shadow-md">
            {remainSec > 0 ? timeDisplay : '00:00'}
          </div>
          <div className="text-sm font-bold text-white/70 mt-1 uppercase">{labelText}</div>
        </div>
      )}

      <div className="p-3 bg-white/10 rounded-2xl border border-white/15 my-3">
        <div className="text-xs text-white/60 font-bold uppercase mb-1">Текущее событие</div>
        <div className="text-xl font-black text-white">{nowLessonText}</div>
      </div>

      <div className="cleanNext">
        <div className="text-xs text-white/60 font-semibold mb-0.5">Следующий урок:</div>
        <div className="text-sm font-black text-cyan-200">{nextLessonText}</div>
      </div>

    </div>
  );
};
