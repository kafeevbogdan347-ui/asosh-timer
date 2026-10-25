import React, { useEffect, useState } from 'react';

// Экран для проектора или школьного телевизора: крупные часы, текущий урок и время до звонка
interface BoardScreenProps {
  cls: string;
  shift: string;
  time: Date;
  status: {
    type: 'lesson' | 'break' | 'before' | 'none';
    currentIdx: number;
    remainSec: number;
    totalSec: number;
    nowText: string;
    nextText: string;
  };
  lessons: [string, string][];
  bells: [string, string][];
  onExit: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const mmss = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

export const BoardScreen: React.FC<BoardScreenProps> = ({ cls, shift, time, status, lessons, bells, onExit }) => {
  const [isFull, setIsFull] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      // Ушли с экрана — выходим из полноэкранного режима
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Не даём экрану проектора/ноутбука погаснуть, пока открыт этот режим
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const label =
    status.type === 'lesson'
      ? 'До звонка с урока'
      : status.type === 'break'
      ? 'Перемена · до урока'
      : status.type === 'before'
      ? 'До начала уроков'
      : '';
  const progress = status.totalSec > 0 ? Math.min(100, Math.max(0, 100 - (status.remainSec / status.totalSec) * 100)) : 0;
  const dateStr = time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="screen-enter min-h-[calc(100vh-40px)] flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm sm:text-lg font-black text-white/80">
          🔔 АСОШ Таймер · {cls} · {shift} смена
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn darkBtn !py-2 !px-3 text-xs" onClick={toggleFull}>
            {isFull ? 'Свернуть' : '⛶ Во весь экран'}
          </button>
          <button type="button" className="btn darkBtn !py-2 !px-3 text-xs" onClick={onExit}>
            Выйти
          </button>
        </div>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-[1.4fr_1fr] items-stretch">
        <div className="card !m-0 flex flex-col items-center justify-center text-center gap-2 py-8">
          <div className="font-black tabular-nums leading-none text-[22vw] lg:text-[11vw]">
            {pad(time.getHours())}:{pad(time.getMinutes())}
          </div>
          <div className="text-lg sm:text-2xl text-white/70 font-bold first-letter:uppercase">{dateStr}</div>

          {label ? (
            <div className="mt-4 w-full max-w-2xl">
              <div className="text-base sm:text-2xl font-bold text-white/80">{label}</div>
              <div className="font-black tabular-nums text-[14vw] lg:text-[7vw] leading-none text-cyan-300">
                {mmss(status.remainSec)}
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 text-lg sm:text-3xl font-black">{status.nowText}</div>
              {status.nextText && status.nextText !== '—' && (
                <div className="text-base sm:text-xl text-white/70 font-bold">Дальше: {status.nextText}</div>
              )}
            </div>
          ) : (
            <div className="mt-4 text-xl sm:text-3xl font-black text-white/80">{status.nowText}</div>
          )}
        </div>

        <div className="card !m-0">
          <h2 className="text-lg sm:text-2xl font-black mb-3">Уроки сегодня</h2>
          {lessons.length > 0 ? (
            <ol className="space-y-2">
              {lessons.map(([sub, room], i) => (
                <li
                  key={i}
                  className={`lesson !m-0 text-base sm:text-xl ${i === status.currentIdx ? 'current' : ''}`}
                >
                  <div className="num">{i + 1}</div>
                  <div className="flex flex-wrap justify-between gap-x-2 min-w-0">
                    <b className="truncate">{sub}</b>
                    <span className="text-white/60 tabular-nums shrink-0">
                      {bells[i] ? `${bells[i][0]}–${bells[i][1]}` : ''} {room ? `· ${room}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-white/60">Сегодня уроков нет</p>
          )}
        </div>
      </div>
    </div>
  );
};
