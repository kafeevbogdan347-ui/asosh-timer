import { LessonRows } from '../components/LessonRows';
import { isWindow } from '../utils/lessonStatus';
import { AskAsoshikButton } from '../components/AskAsoshikButton';
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
  onGoAddUpdates?: () => void;
  smartDayAdvice?: SmartDayData | null;
  onAskAsoshik?: (text: string) => void;
  shift: string;
}

const SHORT_DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  onAskAsoshik,
  shift,
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
          </div>
          <p className="text-[11px] text-white/60">
            {isViewingToday
              ? `Сегодня, ${currentDayName.toLowerCase()}`
              : `${selectedDay} · сегодня ${currentDayName.toLowerCase()}`}
          </p>
        </div>
        {onGoAddUpdates && (
          <button
            type="button"
            onClick={onGoAddUpdates}
            className="text-xs bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold px-2.5 py-1.5 rounded-xl hover:bg-cyan-500/30 transition-all shrink-0 cursor-pointer shadow-sm"
          >
            ✏️ Изменить
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


      {/* Lesson List */}
      <div className="space-y-2 mt-2">
        {lessons.some((l) => !isWindow(l)) ? (
          <LessonRows
            lessons={lessons}
            bells={bells}
            shift={shift}
            currentIdx={currentLessonIdx}
            extra={(lesson, _idx, bell) =>
              onAskAsoshik && (
                <AskAsoshikButton
                  label="Готовлюсь"
                  onClick={() =>
                    onAskAsoshik(`Скоро урок «${lesson[0].replace('🔄 ', '')}»${bell ? ` в ${bell[0]}` : ''}. Подскажи коротко: что повторить перед уроком и что взять с собой.`)
                  }
                />
              )
            }
          />
        ) : (
          <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="text-3xl mb-2">📅</div>
            <b className="text-cyan-300 block mb-1">Скоро будет расписание!</b>
            <p className="text-xs text-white/70 max-w-sm mx-auto mb-4">
              {onGoAddUpdates
                ? `Для дня «${selectedDay}» ещё не внесены уроки. Вы можете добавить их прямо сейчас через кнопку ниже.`
                : `Для дня «${selectedDay}» уроков нет.`}
            </p>
            {onGoAddUpdates && (
              <button
                type="button"
                className="btn green justify-center text-sm py-2.5 mx-auto"
                onClick={onGoAddUpdates}
              >
                <span>🛠</span>
                <span>Добавить уроки на этот день</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
