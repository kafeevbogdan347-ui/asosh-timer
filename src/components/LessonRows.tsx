import React from 'react';
import { isWindow, lessonNo, roomLabel } from '../utils/lessonStatus';

interface Props {
  lessons: [string, string][];
  bells: [string, string][];
  shift: string;
  currentIdx?: number;
  // Кнопки справа от названия урока (например «Готовлюсь»)
  extra?: (lesson: [string, string], idx: number, bell?: [string, string]) => React.ReactNode;
}

// Список уроков дня. Номера — как на стенде (во 2-й смене первый — нулевой).
// Пустые позиции до первого и после последнего урока не показываем, окно внутри дня — тонкой строкой.
export const LessonRows: React.FC<Props> = ({ lessons, bells, shift, currentIdx = -1, extra }) => {
  const real = lessons.map((l, i) => i).filter((i) => !isWindow(lessons[i]));
  if (!real.length) return null;
  const first = real[0];
  const last = real[real.length - 1];
  return (
    <>
      {lessons.map((lesson, idx) => {
        if (idx < first || idx > last) return null;
        const bell = bells[idx];
        if (isWindow(lesson)) {
          return (
            <div key={idx} className="lesson-window">
              <span>🕳 Окно</span>
              {bell && <span className="font-mono">{bell[0]} – {bell[1]}</span>}
            </div>
          );
        }
        const isCur = currentIdx === idx;
        const room = roomLabel(lesson[1]);
        return (
          <div key={idx} className={`lesson ${isCur ? 'current' : ''} transition-all relative overflow-hidden`}>
            <div className="num font-black">{lessonNo(shift, idx)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <b className="text-base text-white truncate">{lesson[0]}</b>
                {!isCur && extra?.(lesson, idx, bell)}
                {isCur && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-[10px] font-bold font-mono shrink-0 animate-pulse">
                    Идёт урок 🔔
                  </span>
                )}
              </div>
              <div className="text-xs text-white/70 mt-0.5 flex flex-wrap items-center gap-x-2">
                <span className="font-mono text-cyan-300">{bell ? `${bell[0]} – ${bell[1]}` : '—'}</span>
                <span>•</span>
                <span className={room ? 'text-white/90 font-medium' : 'text-white/50 italic'}>{room || 'кабинет не указан'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
