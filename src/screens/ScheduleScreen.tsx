import React from 'react';
import { LanguageType, SmartDayData } from '../types';
import { DAYS, GET_DAYS_FOR_LANG, DICT } from '../data/constants';
import { Calendar, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface ScheduleScreenProps {
  selectedDay: string;
  currentDayName: string;
  onSelectDay: (day: string) => void;
  lessons: [string, string][];
  bells: [string, string][];
  currentLessonIdx: number;
  lang: LanguageType;
  onGoAddUpdates: () => void;
  smartDayAdvice?: SmartDayData | null;
}

const SHORT_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  selectedDay,
  currentDayName,
  onSelectDay,
  lessons,
  bells,
  currentLessonIdx,
  lang,
  onGoAddUpdates,
  smartDayAdvice,
}) => {
  const d = DICT[lang] || DICT.ru;
  const dayList = GET_DAYS_FOR_LANG(lang);
  const isViewingToday = selectedDay === currentDayName;

  return (
    <div className="card screen-enter space-y-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-cyan-300">{d.schedule}</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              Авто 2026
            </span>
          </div>
          <p className="text-[11px] text-white/60">
            {isViewingToday
              ? `Сегодня: ${currentDayName} (автоопределение активно 🟢)`
              : `Просмотр: ${selectedDay} (сегодня — ${currentDayName})`}
          </p>
        </div>
        <button
          type="button"
          onClick={onGoAddUpdates}
          className="text-xs bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold px-2.5 py-1.5 rounded-xl hover:bg-cyan-500/30 transition-all shrink-0 cursor-pointer shadow-sm"
        >
          + Изменить / Урок
        </button>
      </div>

      {/* Auto-Day Status Bar & Quick Jump to Today */}
      <div className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-blue-950/40 border border-cyan-400/30 flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-200">
        <div className="flex items-center gap-2">
          <span className="text-base shrink-0">📅</span>
          <div>
            <span className="font-bold text-white block">
              Автоопределение дня: <span className="text-cyan-300 font-black">{currentDayName}</span>
            </span>
            <span className="text-[10px] text-white/70">
              {isViewingToday
                ? 'Открыто актуальное расписание на сегодня'
                : 'Вы просматриваете другой день недели'}
            </span>
          </div>
        </div>

        {!isViewingToday && (
          <button
            type="button"
            onClick={() => onSelectDay(currentDayName)}
            className="flex items-center gap-1.5 text-[11px] font-black bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Вернуться на сегодня ({currentDayName})</span>
          </button>
        )}
      </div>

      {/* Day Tabs Chips (Пн..Вс) with "Сегодня" Badge */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        {DAYS.map((dayRu, i) => {
          const isToday = dayRu === currentDayName;
          const isSelected = dayRu === selectedDay;
          return (
            <button
              key={dayRu}
              type="button"
              onClick={() => onSelectDay(dayRu)}
              className={`flex-1 min-w-[44px] py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-md shadow-cyan-500/20 scale-[1.03]'
                  : isToday
                  ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/50 hover:bg-cyan-500/25'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
              }`}
              title={dayList[i]}
            >
              <span className="text-[12px]">{SHORT_DAYS_RU[i]}</span>
              {isToday && (
                <span
                  className={`text-[9px] font-mono uppercase tracking-tighter ${
                    isSelected ? 'text-cyan-100 font-black' : 'text-cyan-400 font-black'
                  }`}
                >
                  сегодня
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Smart Day AI Advice Banner for Today */}
      {isViewingToday && smartDayAdvice && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-cyan-950/60 border border-purple-400/40 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
              <span className="text-xs font-black text-white">Умная подсказка ИИ на сегодня</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30">
              {smartDayAdvice.engine === 'gemini' ? 'Gemini 3.8 Flash' : 'ИИ-Анализ'}
            </span>
          </div>
          <p className="text-xs text-purple-100/90 leading-relaxed mb-2 font-medium">
            {smartDayAdvice.summary}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {smartDayAdvice.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[10px] text-cyan-200 font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Traditional Select Dropdown as secondary accessible selector */}
      <div className="flex items-center gap-2">
        <select
          value={selectedDay}
          onChange={(e) => onSelectDay(e.target.value)}
          className="cursor-pointer font-bold flex-1"
        >
          {DAYS.map((dayRu, i) => (
            <option key={dayRu} value={dayRu}>
              {dayList[i]} {dayRu === currentDayName ? '★ (Сегодня)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Lesson List */}
      <div className="space-y-2 mt-2">
        {lessons.length > 0 ? (
          lessons.map((lesson, idx) => {
            const bell = bells[idx];
            const isCur = currentLessonIdx === idx;
            return (
              <div
                key={idx}
                className={`lesson ${isCur ? 'current' : ''} transition-all relative overflow-hidden`}
              >
                <div className="num font-black">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-base text-white truncate">{lesson[0]}</b>
                    {isCur && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-[10px] font-bold font-mono shrink-0 animate-pulse">
                        Идёт урок 🔔
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/70 mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span className="font-mono text-cyan-300">
                      {bell ? `${bell[0]} – ${bell[1]}` : '—'}
                    </span>
                    <span>•</span>
                    <span className={lesson[1] ? 'text-white/90 font-medium' : 'text-white/50 italic'}>
                      {lesson[1] ? `каб. ${lesson[1]}` : 'кабинет не указан'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="text-3xl mb-2">📅</div>
            <b className="text-cyan-300 block mb-1">Скоро будет расписание!</b>
            <p className="text-xs text-white/70 max-w-sm mx-auto mb-4">
              Для дня «{selectedDay}» ещё не внесены уроки. Вы можете добавить их прямо сейчас через кнопку ниже.
            </p>
            <button
              type="button"
              className="btn green justify-center text-sm py-2.5 mx-auto"
              onClick={onGoAddUpdates}
            >
              <span>🛠</span>
              <span>Добавить уроки на этот день</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
