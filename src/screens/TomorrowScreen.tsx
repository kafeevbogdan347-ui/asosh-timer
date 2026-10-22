import React from 'react';
import { LanguageType, ScreenId } from '../types';
import { DICT } from '../data/constants';

interface TomorrowScreenProps {
  tomorrowDayName: string;
  lessons: [string, string][];
  bells: [string, string][];
  lang: LanguageType;
  onNavigate: (screen: ScreenId) => void;
}

export const TomorrowScreen: React.FC<TomorrowScreenProps> = ({
  tomorrowDayName,
  lessons,
  bells,
  lang,
  onNavigate,
}) => {
  const d = DICT[lang] || DICT.ru;

  return (
    <div className="card screen-enter">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black text-cyan-300">{d.tomorrow}</h2>
        <span className="badge bg-white/10 border-white/20 text-white font-bold">
          {tomorrowDayName}
        </span>
      </div>

      {lessons.length > 0 && (
        <button
          type="button"
          className="btn green text-sm py-2.5 mb-3 justify-center"
          onClick={() => onNavigate('backpack')}
        >
          <span>🎒</span>
          <span>Собрать портфель по этим урокам</span>
        </button>
      )}

      <div className="space-y-2 mt-2">
        {lessons.length > 0 ? (
          lessons.map((lesson, idx) => {
            const bell = bells[idx];
            return (
              <div key={idx} className="lesson">
                <div className="num">{idx + 1}</div>
                <div>
                  <b className="text-base text-white">{lesson[0]}</b>
                  <div className="text-xs text-white/70 mt-0.5">
                    {bell ? `${bell[0]} – ${bell[1]}` : '—'} •{' '}
                    {lesson[1] ? `каб. ${lesson[1]}` : 'кабинет не указан'}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/10 p-4">
            <div className="text-3xl mb-2">🎉</div>
            <b className="text-cyan-300 block mb-1">На завтра уроков нет</b>
            <p className="text-xs text-white/70">Выходной или расписание еще не заполнено.</p>
          </div>
        )}
      </div>
    </div>
  );
};
