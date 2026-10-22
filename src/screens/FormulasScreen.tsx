import React, { useState } from 'react';
import { FORMULA_CARDS, CHEMICAL_ELEMENTS } from '../data/constants';
import { FormulaCard, ChemicalElement, LanguageType } from '../types';
import { Search, Sparkles, BookOpen, Layers, Atom } from 'lucide-react';

interface FormulasScreenProps {
  lang: LanguageType;
}

export const FormulasScreen: React.FC<FormulasScreenProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'math' | 'geometry' | 'physics' | 'chemistry' | 'russian' | 'english'>('all');
  const [search, setSearch] = useState('');
  const [selectedElement, setSelectedElement] = useState<ChemicalElement | null>(null);
  const [showMendeleev, setShowMendeleev] = useState(false);

  const filteredFormulas = FORMULA_CARDS.filter((f) => {
    const matchTab = activeTab === 'all' || f.subject === activeTab;
    const matchSearch =
      !search.trim() ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.formula.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const categories = [
    { id: 'all', label: '🌟 Все' },
    { id: 'math', label: '📐 Алгебра' },
    { id: 'geometry', label: '📏 Геометрия' },
    { id: 'physics', label: '⚡ Физика' },
    { id: 'chemistry', label: '🧪 Химия' },
    { id: 'russian', label: '📖 Русский язык' },
    { id: 'english', label: '🇬🇧 English' },
  ];

  return (
    <div className="card screen-enter space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <span>📐</span>
            <span>Школьные формулы & Справочник</span>
          </h2>
          <p className="text-xs text-white/70">
            Базовые формулы для ОГЭ/ЕГЭ и таблица Менделеева в один клик
          </p>
        </div>
      </div>

      {/* Кнопка таблицы Менделеева */}
      <button
        type="button"
        className="btn purple justify-center text-sm py-2.5 shadow-md"
        onClick={() => setShowMendeleev(!showMendeleev)}
      >
        <Atom className="w-4 h-4" />
        <span>
          {showMendeleev ? 'Закрыть таблицу Менделеева' : '🧪 Открыть таблицу Менделеева'}
        </span>
      </button>

      {/* Модуль таблицы Менделеева */}
      {showMendeleev && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-purple-400/40 space-y-3">
          <div className="flex justify-between items-center">
            <b className="text-sm text-purple-300 flex items-center gap-1.5">
              <span>⚛️</span>
              <span>Периодическая таблица элементов</span>
            </b>
            <span className="text-[11px] text-white/60">Нажми на элемент</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {CHEMICAL_ELEMENTS.map((el) => (
              <button
                key={el.number}
                type="button"
                className={`p-2 rounded-xl border text-center transition-all ${
                  selectedElement?.number === el.number
                    ? 'bg-cyan-400 text-slate-950 border-cyan-400 font-black scale-105'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                }`}
                onClick={() => setSelectedElement(el)}
              >
                <div className="text-[10px] text-white/60 font-mono">{el.number}</div>
                <div className="text-base font-black">{el.symbol}</div>
                <div className="text-[9px] truncate font-medium">{el.nameRu}</div>
              </button>
            ))}
          </div>

          {selectedElement && (
            <div className="p-3 bg-black/40 rounded-2xl border border-cyan-400/30 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-base font-black text-cyan-300">
                  {selectedElement.number}. {selectedElement.nameRu} ({selectedElement.symbol})
                </span>
                <span className="badge bg-purple-500/20 text-purple-300 border-purple-400/40 text-[10px]">
                  {selectedElement.category}
                </span>
              </div>
              <div className="text-white/80">
                Башҡортса: <b>{selectedElement.nameBa}</b>
              </div>
              <div className="text-white/80 font-mono">
                Атомная масса: <b>{selectedElement.mass} а.е.м.</b> • Период: <b>{selectedElement.period}</b> • Группа: <b>{selectedElement.group}</b>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Поиск и категории формул */}
      <div className="relative">
        <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск формулы (дискриминант, Пифагор, Ньютон)..."
          className="!pl-10 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`choice !py-1.5 !px-3 text-xs font-bold ${
              activeTab === cat.id ? 'active !bg-cyan-400 !text-slate-950 border-cyan-400' : ''
            }`}
            onClick={() => setActiveTab(cat.id as typeof activeTab)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Карточки формул */}
      <div className="space-y-3">
        {filteredFormulas.map((f) => (
          <div
            key={f.id}
            className="p-4 bg-white/8 rounded-2xl border border-white/15 hover:bg-white/12 transition-colors space-y-2"
          >
            <div className="flex justify-between items-start">
              <h3 className="text-base font-black text-white">{f.title}</h3>
              <span className="badge bg-cyan-500/15 border-cyan-400/30 text-cyan-300 text-[10px] uppercase font-mono">
                {f.subject}
              </span>
            </div>

            {/* Блок самой формулы */}
            <div className="p-3 bg-black/40 rounded-xl border border-white/10 font-mono text-cyan-300 text-sm font-bold whitespace-pre-line tracking-wide">
              {f.formula}
            </div>

            <p className="text-xs text-white/80 leading-relaxed">{f.description}</p>

            {f.note && (
              <div className="text-[11px] text-amber-300/90 font-medium bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
                💡 <b>Совет:</b> {f.note}
              </div>
            )}
          </div>
        ))}

        {filteredFormulas.length === 0 && (
          <div className="text-center py-8 text-white/50 text-sm">
            Формулы по запросу «{search}» не найдены
          </div>
        )}
      </div>
    </div>
  );
};
