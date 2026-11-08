import React, { useState } from 'react';
import { Search, Building } from 'lucide-react';
import { roomFloor } from '../data/schoolSchedule';

export interface WeekLesson {
  day: string; // «Понедельник»
  time: string; // начало урока, «08:45»
  sub: string;
  room: string; // как в расписании, может быть «112/107»
}

interface MapScreenProps {
  cls: string;
  weekLessons: WeekLesson[]; // уроки класса на неделю (с заменами и своими правками)
  currentDayName: string;
}

const SHORT_DAY: Record<string, string> = {
  'Понедельник': 'Пн',
  'Вторник': 'Вт',
  'Среда': 'Ср',
  'Четверг': 'Чт',
  'Пятница': 'Пт',
  'Суббота': 'Сб',
};

// Места без номера кабинета
const PLACES: { keys: string[]; text: string }[] = [
  { keys: ['акт'], text: 'Актовый зал — 2 этаж' },
  { keys: ['спорт', 'физкульт'], text: 'Спортзал — 1 этаж' },
  { keys: ['мастер', 'технолог'], text: 'Мастерские — 1 этаж' },
  { keys: ['стол', 'буфет', 'еда'], text: 'Столовая — 1 этаж' },
  { keys: ['мед', 'врач'], text: 'Медицинский кабинет — 1 этаж' },
  { keys: ['библ', 'книг'], text: 'Библиотека — 2 этаж' },
];

const roomParts = (room: string) => room.split('/').map((r) => r.trim().toLowerCase()).filter(Boolean);
const roomLabel = (room: string) => (/^\d/.test(room) ? `каб. ${room}` : room);

export const MapScreen: React.FC<MapScreenProps> = ({ cls, weekLessons, currentDayName }) => {
  const [query, setQuery] = useState('');
  const val = query.trim().toLowerCase();

  // Совпадение по кабинету: «332», «акт», «спортзал»; или по предмету: «химия»
  const byRoom = val ? weekLessons.filter((l) => roomParts(l.room).some((r) => r === val || (!/^\d/.test(val) && r.startsWith(val.slice(0, 3))))) : [];
  const bySubject = val && !/^\d/.test(val) ? weekLessons.filter((l) => l.sub.toLowerCase().includes(val)) : [];
  const found = byRoom.length ? byRoom : bySubject;

  let header = '';
  if (val) {
    if (/^\d+$/.test(val)) {
      const floor = roomFloor(val);
      header = floor && val.length === 3 ? `📍 Кабинет ${val} — ${floor} этаж` : `Кабинета ${val} нет. Номер кабинета — три цифры, первая — этаж.`;
    } else {
      const place = PLACES.find((p) => p.keys.some((k) => val.includes(k) || k.includes(val.slice(0, 4))));
      if (place) header = `📍 ${place.text}`;
      else if (!bySubject.length) header = 'Ничего не найдено. Попробуй номер кабинета (324), предмет (химия) или место (столовая).';
    }
  }

  // Сегодняшние уроки — первыми
  const sorted = [...found].sort((a, b) => Number(b.day === currentDayName) - Number(a.day === currentDayName));

  return (
    <div className="card screen-enter space-y-4">
      <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
        <span>🗺</span>
        <span>Поиск кабинета</span>
      </h2>

      <div className="relative">
        <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: 324, химия, актовый зал..."
          className="!pl-10 text-sm"
        />
      </div>

      {!val && <div className="cleanNext text-white/70 text-sm p-4 bg-white/10">Введи номер кабинета, предмет или место — покажу этаж и твои уроки там.</div>}

      {val && (
        <div className="cleanNext p-4 bg-white/10 space-y-2">
          {header && <div className="text-cyan-200 font-bold text-sm leading-relaxed">{header}</div>}
          {sorted.length > 0 ? (
            <div className="space-y-1">
              <div className="text-[11px] text-white/60 font-bold">Уроки {cls} {byRoom.length ? 'здесь' : 'по этому предмету'}:</div>
              {sorted.map((l, i) => {
                const floor = roomFloor(l.room);
                return (
                  <div
                    key={i}
                    className={`flex justify-between gap-2 text-xs p-2 rounded-xl border ${
                      l.day === currentDayName ? 'bg-cyan-500/15 border-cyan-400/30' : 'bg-black/20 border-white/5'
                    }`}
                  >
                    <span className="text-white/90 font-bold">
                      {SHORT_DAY[l.day] || l.day} {l.time} · {l.sub}
                    </span>
                    {!byRoom.length && (
                      <span className="text-cyan-300 font-bold whitespace-nowrap">
                        {l.room ? roomLabel(l.room) : '—'}
                        {floor && ` · ${floor} эт.`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            header && /^\d{3}$/.test(val) && <div className="text-xs text-white/60">У {cls} уроков в этом кабинете нет.</div>
          )}
        </div>
      )}

      <div className="p-4 bg-white/8 rounded-2xl border border-white/15 space-y-2 text-xs">
        <b className="text-sm text-white flex items-center gap-1.5 font-bold">
          <Building className="w-4 h-4 text-cyan-300" />
          <span>Как найти кабинет</span>
        </b>
        <div className="space-y-1.5 text-white/80 leading-relaxed pt-1">
          <div className="p-2 rounded-xl bg-black/20 border border-white/5">
            Первая цифра номера — этаж: <b className="text-cyan-300">1xx</b> — 1 этаж, <b className="text-cyan-300">2xx</b> — 2 этаж, <b className="text-cyan-300">3xx</b> — 3 этаж.
          </div>
          <div className="p-2 rounded-xl bg-black/20 border border-white/5">
            <b className="text-cyan-300">1 этаж:</b> вход, гардероб, столовая, медкабинет, спортзал, мастерские.
          </div>
          <div className="p-2 rounded-xl bg-black/20 border border-white/5">
            <b className="text-cyan-300">2 этаж:</b> актовый зал, библиотека, учительская.
          </div>
        </div>
      </div>
    </div>
  );
};
