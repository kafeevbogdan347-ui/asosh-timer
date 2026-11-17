import React, { useEffect, useState } from 'react';
import { BELL_SHIFT_SEC } from '../data/constants';
import { roomFloor } from '../data/schoolSchedule';
import { computeLessonStatus, Bell, Lesson, roomLabel } from '../utils/lessonStatus';

// Карточка «Сейчас»: идёт урок или перемена и сколько до звонка — для любого набора уроков
// (класс ребёнка у родителя, уроки учителя). Сама обновляется каждую секунду.
interface LiveLessonCardProps {
  title: string;
  lessons: Lesson[];
  bells: Bell[];
  emptyText?: string;
  onOpen?: () => void; // открыть большой таймер
}

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export const LiveLessonCard: React.FC<LiveLessonCardProps> = ({ title, lessons, bells, emptyText = 'Сейчас уроков нет', onOpen }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const curSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + BELL_SHIFT_SEC;
  const st = computeLessonStatus(lessons, bells, curSec);
  const active = st.type === 'lesson' || st.type === 'break' || st.type === 'before';
  const next = st.nextIdx >= 0 ? lessons[st.nextIdx] : null;
  const floor = next ? roomFloor(next[1]) : null;
  const label = st.type === 'lesson' ? 'До конца урока' : st.type === 'break' ? 'До звонка на урок' : 'До начала уроков';
  const percent = st.totalSec ? Math.min(100, Math.max(0, Math.round(((st.totalSec - st.remainSec) / st.totalSec) * 100))) : 0;

  return (
    <div
      className={`p-3 rounded-2xl border space-y-1.5 ${active ? 'bg-cyan-500/10 border-cyan-400/40' : 'bg-white/5 border-white/10'} ${onOpen ? 'cursor-pointer' : ''}`}
      onClick={onOpen}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-xs text-white/75">{title}</b>
        {active && <span className="text-[10px] text-white/50">{label}</span>}
      </div>
      {active ? (
        <>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-black truncate">{st.type === 'lesson' ? `📖 ${st.nowText.replace('🔄 ', '')}` : `🔔 ${st.nowText}`}</div>
              {next && st.type !== 'lesson' && (
                <div className="text-[11px] text-white/65 truncate">
                  Дальше: {next[0].replace('🔄 ', '')}
                  {next[1] && ` · ${roomLabel(next[1])}`}
                  {floor && ` · ${floor} этаж`}
                </div>
              )}
              {st.type === 'lesson' && <div className="text-[11px] text-white/65 truncate">Потом: {st.nextText.replace('🔄 ', '')}</div>}
            </div>
            <div className="text-2xl font-black tabular-nums text-cyan-200 shrink-0">{fmt(st.remainSec)}</div>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-cyan-400/80" style={{ width: `${percent}%` }} />
          </div>
        </>
      ) : (
        <div className="text-sm text-white/70">{st.nowText === 'Уроков сейчас нет' ? emptyText : st.nowText}</div>
      )}
    </div>
  );
};
