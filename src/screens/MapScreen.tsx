import React, { useState } from 'react';
import { Search, MapPin, Building, Navigation } from 'lucide-react';

export const MapScreen: React.FC = () => {
  const [query, setQuery] = useState('');

  let result = 'Введи номер кабинета выше для поиска';
  const val = query.trim().toLowerCase();

  if (val) {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num >= 100 && num < 200) {
        result = `📍 Кабинет ${num} находится на 1 ЭТАЖЕ (Блок начальных классов, гардероб, спортзал)`;
      } else if (num >= 200 && num < 300) {
        result = `📍 Кабинет ${num} находится на 2 ЭТАЖЕ (Учительская, приёмная, кабинеты русского языка и математики)`;
      } else if (num >= 300 && num < 400) {
        result = `📍 Кабинет ${num} находится на 3 ЭТАЖЕ (Кабинеты физики, химии, информатики, биологии)`;
      } else {
        result = `Кабинет ${num} вне стандартной нумерации школы (100–334)`;
      }
    } else {
      if (val.includes('зал') || val.includes('спорт')) {
        result = '📍 1 Этаж / Пристройка — Большой и малый спортивные залы';
      } else if (val.includes('стол') || val.includes('еда')) {
        result = '📍 1 Этаж — Школьная столовая и буфет';
      } else if (val.includes('библ') || val.includes('книг')) {
        result = '📍 2 Этаж — Школьная библиотека и читальный зал';
      } else if (val.includes('мед') || val.includes('врач')) {
        result = '📍 1 Этаж — Медицинский кабинет';
      } else if (val.includes('акт')) {
        result = '📍 2 Этаж — Актовый зал школы';
      } else {
        result = 'Объект не найден. Попробуй: «столовая», «спортзал», «библиотека» или номер кабинета';
      }
    }
  }

  return (
    <div className="card screen-enter space-y-4">
      <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
        <span>🗺</span>
        <span>Поиск кабинета и навигация по школе</span>
      </h2>

      <div className="relative">
        <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: 324, 215, столовая, спортзал..."
          className="!pl-10 text-sm"
        />
      </div>

      <div className="cleanNext text-cyan-200 font-bold text-sm leading-relaxed p-4 bg-white/10">
        {result}
      </div>

      {/* Школьная схема этажей */}
      <div className="p-4 bg-white/8 rounded-2xl border border-white/15 space-y-2 text-xs">
        <b className="text-sm text-white flex items-center gap-1.5 font-bold">
          <Building className="w-4 h-4 text-cyan-300" />
          <span>Быстрый путеводитель АСОШ №2:</span>
        </b>
        <div className="space-y-1.5 text-white/80 leading-relaxed pt-1">
          <div className="p-2 rounded-xl bg-black/20 border border-white/5">
            <b className="text-cyan-300">1 Этаж (101–118):</b> Вход, гардеробы, медицинский кабинет, столовая, спортзалы, мастерские.
          </div>
          <div className="p-2 rounded-xl bg-black/20 border border-white/5">
            <b className="text-cyan-300">2 Этаж (201–220):</b> Кабинет директора, учительская, актовый зал, библиотека, кабинеты гуманитарных наук.
          </div>
          <div className="p-2 rounded-xl bg-black/20 border border-white/5">
            <b className="text-cyan-300">3 Этаж (301–334):</b> Кабинеты точных и естественных наук (физика, химия, биология, информатика).
          </div>
        </div>
      </div>
    </div>
  );
};
