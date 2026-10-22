import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Volume2, Clock, Sparkles, Coffee, AlertCircle, Play, ShieldCheck, Sun, Moon, Zap } from 'lucide-react';
import { LanguageType, SoundProfileType } from '../types';
import { B1, B2, B2F } from '../data/constants';
import { playBellSimulatorSound, doVibro, playSound } from '../utils/audio';

interface BellsScreenProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
  lang?: LanguageType;
  soundProfile?: SoundProfileType;
  vibro?: boolean;
}

// 35-min shortened schedule for holidays/events
const B_SHORT_1: [string, string][] = [
  ['08:00', '08:35'],
  ['08:45', '09:20'],
  ['09:30', '10:05'],
  ['10:20', '10:55'],
  ['11:10', '11:45'],
  ['11:55', '12:30'],
  ['12:40', '13:15'],
];

const B_SHORT_2: [string, string][] = [
  ['13:30', '14:05'],
  ['14:15', '14:50'],
  ['15:00', '15:35'],
  ['15:45', '16:20'],
  ['16:30', '17:05'],
  ['17:15', '17:50'],
];

export const BellsScreen: React.FC<BellsScreenProps> = ({
  onBack,
  onShowToast,
  lang = 'ru',
  soundProfile = '1' as SoundProfileType,
  vibro = true,
}) => {
  const [selectedShift, setSelectedShift] = useState<'1' | '2' | 'short1' | 'short2'>('1');
  const [activePlayingBell, setActivePlayingBell] = useState<string | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [activeLessonInfo, setActiveLessonInfo] = useState<{
    status: 'lesson' | 'break' | 'before' | 'after';
    lessonNum: number;
    title: string;
    remainSec: number;
    progress: number;
  }>({
    status: 'before',
    lessonNum: 0,
    title: 'Ожидание начала смены',
    remainSec: 0,
    progress: 0,
  });

  // Get active schedule array
  const getCurrentSchedule = (): [string, string][] => {
    switch (selectedShift) {
      case '1': return B1;
      case '2': return B2;
      case 'short1': return B_SHORT_1;
      case 'short2': return B_SHORT_2;
      default: return B1;
    }
  };

  const schedule = getCurrentSchedule();

  // Update live clock and active lesson countdown
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const curTotalSec = h * 3600 + m * 60 + s;
      setCurrentTimeStr(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );

      const schedule = getCurrentSchedule();
      if (schedule.length === 0) return;

      const firstStart = parseTimeToSec(schedule[0][0]);
      const lastEnd = parseTimeToSec(schedule[schedule.length - 1][1]);

      if (curTotalSec < firstStart) {
        const diff = firstStart - curTotalSec;
        setActiveLessonInfo({
          status: 'before',
          lessonNum: 1,
          title: `До 1-го урока (${schedule[0][0]})`,
          remainSec: diff,
          progress: 0,
        });
        return;
      }

      if (curTotalSec >= lastEnd) {
        setActiveLessonInfo({
          status: 'after',
          lessonNum: schedule.length,
          title: 'Учебные занятия на сегодня окончены 🎉',
          remainSec: 0,
          progress: 100,
        });
        return;
      }

      // Check current lessons and breaks
      for (let i = 0; i < schedule.length; i++) {
        const [startStr, endStr] = schedule[i];
        const startSec = parseTimeToSec(startStr);
        const endSec = parseTimeToSec(endStr);

        if (curTotalSec >= startSec && curTotalSec < endSec) {
          const total = endSec - startSec;
          const elapsed = curTotalSec - startSec;
          const remain = endSec - curTotalSec;
          setActiveLessonInfo({
            status: 'lesson',
            lessonNum: i + 1,
            title: `Идет ${i + 1}-й урок (${startStr} – ${endStr})`,
            remainSec: remain,
            progress: Math.min(100, Math.round((elapsed / total) * 100)),
          });
          return;
        }

        // Check break before next lesson
        if (i < schedule.length - 1) {
          const nextStartSec = parseTimeToSec(schedule[i + 1][0]);
          if (curTotalSec >= endSec && curTotalSec < nextStartSec) {
            const breakTotal = nextStartSec - endSec;
            const breakElapsed = curTotalSec - endSec;
            const breakRemain = nextStartSec - curTotalSec;
            const isBreakfast = breakTotal >= 15 * 60;
            setActiveLessonInfo({
              status: 'break',
              lessonNum: i + 1,
              title: `Перемена перед ${i + 2}-м уроком ${isBreakfast ? '🥪 (Завтрак/Обед)' : '🔔'}`,
              remainSec: breakRemain,
              progress: Math.min(100, Math.round((breakElapsed / breakTotal) * 100)),
            });
            return;
          }
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedShift]);

  const parseTimeToSec = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 3600 + m * 60;
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handlePlayBell = (kind: 'classic' | 'melodic' | 'digital' | 'bigben' | 'whistle', label: string) => {
    doVibro(vibro, 30);
    setActivePlayingBell(kind);
    playBellSimulatorSound(kind, soundProfile);
    onShowToast(`Звучит: ${label} 🔔`);
    setTimeout(() => {
      setActivePlayingBell(null);
    }, 2000);
  };

  return (
    <div className="card screen-enter space-y-4">
      {/* Шапка экрана */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="text-center">
          <h2 className="text-lg font-black text-amber-300 flex items-center justify-center gap-1.5">
            <Bell className="w-5 h-5 text-amber-400" />
            <span>Звонки & Симулятор</span>
          </h2>
          <div className="text-[11px] text-white/60 font-semibold">
            АСОШ №2 • с. Аргаяш • Точное время
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-xl bg-white/10 font-mono text-xs font-bold text-amber-300 border border-amber-400/30">
          {currentTimeStr || '12:00:00'}
        </div>
      </div>

      {/* Интерактивный виджет текущего урока */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900/80 to-stone-900/80 border border-amber-500/30 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {activeLessonInfo.status === 'lesson'
                  ? 'ИДЁТ УРОК'
                  : activeLessonInfo.status === 'break'
                  ? 'ПЕРЕМЕНА'
                  : 'СТАТУС СМЕНЫ'}
              </span>
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-1">
              {activeLessonInfo.title}
            </h3>
          </div>

          {activeLessonInfo.remainSec > 0 && (
            <div className="text-right">
              <div className="text-[10px] text-white/60 font-bold uppercase">Осталось</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                {formatSec(activeLessonInfo.remainSec)}
              </div>
            </div>
          )}
        </div>

        {/* Прогресс-бар урока/перемены */}
        {activeLessonInfo.remainSec > 0 && (
          <div className="mt-3">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-1000"
                style={{ width: `${activeLessonInfo.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/50 font-mono mt-1">
              <span>Прошло {activeLessonInfo.progress}%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      {/* Переключатель смен */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-white/70 uppercase tracking-wider">
          Выбор смены и режима:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedShift('1')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              selectedShift === '1'
                ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>1-я Смена (8:00)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedShift('2')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              selectedShift === '2'
                ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>2-я Смена (13:45)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedShift('short1')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              selectedShift === 'short1'
                ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1-я Сокращ. (35м)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedShift('short2')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              selectedShift === 'short2'
                ? 'bg-amber-500 text-stone-950 border-amber-400 font-black shadow-md'
                : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2-я Сокращ. (35м)</span>
          </button>
        </div>
      </div>

      {/* Пульт школьного звонка (Soundboard) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900/90 to-amber-950/40 border border-amber-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
              Интерактивный Пульт Школьных Звонков
            </span>
          </div>
          <span className="text-[10px] text-white/50">Нажми, чтобы подать звонок</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handlePlayBell('classic', 'Классический школьный звонок')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
              activePlayingBell === 'classic'
                ? 'bg-amber-500 text-stone-950 border-amber-300 scale-95 ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            }`}
          >
            <span className="text-2xl">🔔</span>
            <div>
              <div className="text-xs font-black">Классический</div>
              <div className="text-[10px] opacity-75">Электрический звонок</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePlayBell('melodic', 'Мелодичный гонг школы')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
              activePlayingBell === 'melodic'
                ? 'bg-amber-500 text-stone-950 border-amber-300 scale-95 ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            }`}
          >
            <span className="text-2xl">🎶</span>
            <div>
              <div className="text-xs font-black">Мелодичный</div>
              <div className="text-[10px] opacity-75">3-тоновый перелив</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePlayBell('digital', 'Hi-Tech колокольчик')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
              activePlayingBell === 'digital'
                ? 'bg-amber-500 text-stone-950 border-amber-300 scale-95 ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            }`}
          >
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-xs font-black">Hi-Tech Звонок</div>
              <div className="text-[10px] opacity-75">Электронный тон</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePlayBell('bigben', 'Куранты Биг-Бен')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
              activePlayingBell === 'bigben'
                ? 'bg-amber-500 text-stone-950 border-amber-300 scale-95 ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            }`}
          >
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="text-xs font-black">Куранты</div>
              <div className="text-[10px] opacity-75">Вестминстерский бой</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePlayBell('whistle', 'Свисток учителя физкультуры')}
            className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
              activePlayingBell === 'whistle'
                ? 'bg-amber-500 text-stone-950 border-amber-300 scale-95 ring-2 ring-amber-400'
                : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
            }`}
          >
            <span className="text-2xl">📢</span>
            <div>
              <div className="text-xs font-black">Свисток</div>
              <div className="text-[10px] opacity-75">Урок физкультуры</div>
            </div>
          </button>
        </div>
      </div>

      {/* Таблица звонков выбранной смены */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">
            Сетка уроков и перемен:
          </span>
          <span className="text-[11px] text-amber-300 font-semibold">
            {selectedShift.includes('short') ? 'Уроки по 35 минут' : 'Уроки по 40 минут'}
          </span>
        </div>

        <div className="space-y-2">
          {schedule.map(([start, end], idx) => {
            const isCurrentLesson =
              activeLessonInfo.status === 'lesson' && activeLessonInfo.lessonNum === idx + 1;
            const nextStart = idx < schedule.length - 1 ? schedule[idx + 1][0] : null;

            // Calculate break duration
            let breakDurationMin = 0;
            if (nextStart) {
              const [h1, m1] = end.split(':').map(Number);
              const [h2, m2] = nextStart.split(':').map(Number);
              breakDurationMin = h2 * 60 + m2 - (h1 * 60 + m1);
            }

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrentLesson
                    ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400 shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                        isCurrentLesson
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div>
                      <div className="text-sm font-black text-white font-mono flex items-center gap-2">
                        <span>{start} — {end}</span>
                        {isCurrentLesson && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-stone-950 text-[10px] font-bold uppercase animate-pulse">
                            СЕЙЧАС
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50">
                        {idx + 1}-й академический урок
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white/80">
                      {selectedShift.includes('short') ? '35 мин' : '40 мин'}
                    </span>
                  </div>
                </div>

                {/* Перемена между уроками */}
                {breakDurationMin > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/60">
                    <div className="flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        {breakDurationMin >= 15 ? (
                          <b className="text-amber-200 font-bold">
                            Большая перемена (Завтрак / Обед)
                          </b>
                        ) : (
                          'Перемена между уроками'
                        )}
                      </span>
                    </div>
                    <span className="font-bold text-amber-300 font-mono">
                      {breakDurationMin} минут
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Памятка звонков АСОШ №2 */}
      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/80 space-y-1">
        <div className="font-bold text-amber-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Правила расписания звонков МБОУ «АСОШ №2»:</span>
        </div>
        <p className="text-[11px] leading-relaxed text-white/70">
          • В 1-й смене учатся 1-е, 4-е, 5-е, 9-е, 10-е и 11-е классы.<br />
          • Во 2-й смене учатся 2-е, 3-е, 6-е, 7-е и 8-е классы.<br />
          • Первый звонок подаётся за 2 минуты до начала 1-го урока (в 07:58 / 13:43).
        </p>
      </div>
    </div>
  );
};
