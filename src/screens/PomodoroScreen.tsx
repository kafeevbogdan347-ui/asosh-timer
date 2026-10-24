import React, { useState, useEffect, useRef } from 'react';
import { LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import { Play, Pause, RotateCcw, Flame, CheckCircle, Coffee } from 'lucide-react';

interface PomodoroScreenProps {
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  onUnlockAchievement?: (id: string) => void;
}

export const PomodoroScreen: React.FC<PomodoroScreenProps> = ({
  lang,
  soundProfile,
  vibro,
  onShowToast,
  onUnlockAchievement,
}) => {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [durationMin, setDurationMin] = useState(25);
  const [timeLeftSec, setTimeLeftSec] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [tomatoes, setTomatoes] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedTomatoes = localStorage.getItem('asosh_tomatoes_v11') || localStorage.getItem('asosh_tomatoes_v105');
    if (savedTomatoes) setTomatoes(Number(savedTomatoes) || 0);
  }, []);

  const saveTomatoes = (count: number) => {
    setTomatoes(count);
    localStorage.setItem('asosh_tomatoes_v11', String(count));
  };

  // Считаем от момента окончания, а не тиками: в фоне браузер замедляет setInterval
  useEffect(() => {
    if (!isRunning) return;
    const endAt = Date.now() + timeLeftSec * 1000;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setTimeLeftSec(left);
      if (left === 0) {
        clearInterval(timerRef.current!);
        handleFinishInterval();
      }
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, mode, durationMin]);

  const handleFinishInterval = () => {
    setIsRunning(false);
    playSound('pomodoro', soundProfile);
    doVibro(vibro, 80);

    if (mode === 'work') {
      const nextTomatoes = tomatoes + 1;
      saveTomatoes(nextTomatoes);
      onShowToast('🍅 Помодорка завершена! Время отдохнуть 5 минут.');
      if (durationMin >= 25) onUnlockAchievement?.('pomodoro_finisher');
      setMode('break');
      setDurationMin(5);
      setTimeLeftSec(5 * 60);
    } else {
      onShowToast('⚡ Перерыв окончен! Возвращаемся к урокам.');
      setMode('work');
      setDurationMin(25);
      setTimeLeftSec(25 * 60);
    }
  };

  const toggleStartPause = () => {
    playSound('click', soundProfile);
    doVibro(vibro, 15);
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeftSec(durationMin * 60);
    playSound('settings', soundProfile);
  };

  const changePreset = (newMode: 'work' | 'break', mins: number) => {
    setIsRunning(false);
    setMode(newMode);
    setDurationMin(mins);
    setTimeLeftSec(mins * 60);
    playSound('click', soundProfile);
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const m = Math.floor(timeLeftSec / 60);
  const s = timeLeftSec % 60;
  const timeFormatted = `${pad(m)}:${pad(s)}`;

  const totalSec = durationMin * 60;
  const percent = totalSec > 0 ? Math.round(((totalSec - timeLeftSec) / totalSec) * 100) : 0;

  return (
    <div className="card text-center screen-enter space-y-4">
      <div>
        <h2 className="text-xl font-black text-cyan-300 flex items-center justify-center gap-2">
          <span>🍅</span>
          <span>Помодоро-таймер для ДЗ</span>
        </h2>
        <p className="text-xs text-white/70">
          Фокусируйся на уроках 25 минут без залипания в телефон
        </p>
      </div>

      {/* Селектор режимов */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          className={`choice py-2 text-xs font-bold ${
            mode === 'work' && durationMin === 25 ? 'active !bg-cyan-400 !text-slate-950' : ''
          }`}
          onClick={() => changePreset('work', 25)}
        >
          25 мин (Фокус)
        </button>
        <button
          type="button"
          className={`choice py-2 text-xs font-bold ${
            mode === 'work' && durationMin === 15 ? 'active !bg-cyan-400 !text-slate-950' : ''
          }`}
          onClick={() => changePreset('work', 15)}
        >
          15 мин (Спринт)
        </button>
        <button
          type="button"
          className={`choice py-2 text-xs font-bold ${
            mode === 'work' && durationMin === 45 ? 'active !bg-cyan-400 !text-slate-950' : ''
          }`}
          onClick={() => changePreset('work', 45)}
        >
          45 мин (Урок)
        </button>
        <button
          type="button"
          className={`choice py-2 text-xs font-bold ${
            mode === 'break' ? 'active !bg-emerald-400 !text-slate-950' : ''
          }`}
          onClick={() => changePreset('break', 5)}
        >
          5 мин (Отдых) ☕
        </button>
      </div>

      {/* Таймер отображение */}
      <div
        className="w-48 h-48 rounded-full mx-auto my-3 grid place-items-center shadow-2xl relative transition-all duration-300"
        style={{
          background: `conic-gradient(${
            mode === 'work' ? '#00f0ff' : '#38ef7d'
          } ${(percent / 100) * 360}deg, rgba(255, 255, 255, 0.15) 0deg)`,
          boxShadow: 'inset 0 0 0 6px rgba(255, 255, 255, 0.18), var(--sh)',
        }}
      >
        <div className="w-36 h-36 rounded-full bg-slate-950/90 border border-white/20 text-white flex flex-col items-center justify-center">
          <div className="text-4xl font-black font-mono tracking-tight text-cyan-300">
            {timeFormatted}
          </div>
          <div className="text-xs font-bold text-white/70 mt-1 uppercase">
            {mode === 'work' ? 'Учим уроки 📚' : 'Отдых ☕'}
          </div>
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="flex gap-3 max-w-xs mx-auto">
        <button
          type="button"
          className={`btn flex-1 justify-center text-base py-3 shadow-lg ${
            isRunning ? 'orange' : 'green'
          }`}
          onClick={toggleStartPause}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              <span>Пауза</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Старт</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="btn darkBtn justify-center !w-16 py-3"
          onClick={resetTimer}
          title="Сброс"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Счетчик помидорок */}
      <div className="p-3.5 bg-white/8 rounded-2xl border border-white/15 max-w-sm mx-auto flex items-center justify-between">
        <div className="text-left">
          <div className="text-xs text-white/60 font-semibold">Выполнено сессий сегодня:</div>
          <div className="text-lg font-black text-amber-300 flex items-center gap-1 mt-0.5">
            <span>🍅</span>
            <span>{tomatoes} помидорок</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => saveTomatoes(0)}
          className="text-xs text-white/50 hover:text-white/80 underline cursor-pointer"
        >
          Сбросить счет
        </button>
      </div>
    </div>
  );
};
