import React from 'react';
import { ScreenId, LanguageType } from '../types';
import { DICT } from '../data/constants';

interface MainScreenProps {
  cls: string;
  shift: string;
  subGroup: number;
  bellInfo: {
    title: string;
    timeText: string;
    icon: string;
    urgent: boolean;
  };
  smartText: string;
  weekendText: string;
  splash: string;
  motivator: string;
  onNavigate: (screen: ScreenId) => void;
  onOpenCalc: () => void;
  onLogoTap: () => void;
  lang: LanguageType;
  showBackpackHint: boolean;
  quarterProgress: {
    name: string;
    percent: number;
    daysLeft: number;
    breakName: string;
    isBreak: boolean;
  };
}

// Разделы, которых нет в нижнем меню (Уроки, ДЗ, Игры и Опции открываются оттуда)
const QUICK_GROUPS: { title: string; items: { icon: string; label: string; screen: ScreenId | 'calc' }[] }[] = [
  {
    title: 'Учёба',
    items: [
      { icon: '🔔', label: 'Звонки', screen: 'bells' },
      { icon: '🔮', label: 'Завтра', screen: 'tomorrow' },
      { icon: '🎯', label: 'Средний балл', screen: 'gpa' },
      { icon: '📊', label: 'Четверть', screen: 'quarter' },
      { icon: '📐', label: 'Формулы', screen: 'formulas' },
      { icon: '🧮', label: 'Калькулятор', screen: 'calc' },
    ],
  },
  {
    title: 'Класс',
    items: [
      { icon: '💬', label: 'Чат класса', screen: 'chat' },
      { icon: '👤', label: 'Профиль', screen: 'profile' },
      { icon: '🏅', label: 'Портфолио', screen: 'portfolio' },
      { icon: '🏆', label: 'Достижения', screen: 'achievements' },
    ],
  },
  {
    title: 'Инструменты',
    items: [
      { icon: '🎒', label: 'Портфель', screen: 'backpack' },
      { icon: '🍅', label: 'Помодоро', screen: 'pomodoro' },
      { icon: '🎧', label: 'Фокус-звуки', screen: 'focus' },
      { icon: '🗺', label: 'Кабинеты', screen: 'map' },
      { icon: '✏️', label: 'Своё расписание', screen: 'updates' },
    ],
  },
];

export const MainScreen: React.FC<MainScreenProps> = ({
  cls,
  shift,
  subGroup,
  bellInfo,
  smartText,
  weekendText,
  splash,
  motivator,
  onNavigate,
  onOpenCalc,
  onLogoTap,
  lang,
  showBackpackHint,
  quarterProgress,
}) => {
  const d = DICT[lang] || DICT.ru;

  return (
    <div className="card screen-enter">
      <div className="mc-splash">{splash}</div>

      {/* Интерактивный виджет звонка */}
      <div
        className={`bellWidget cursor-pointer ${bellInfo.urgent ? 'urgent' : ''}`}
        onClick={() => onNavigate('today')}
        title="Нажми для подробного экрана таймера"
      >
        <div>
          <div className="text-xs font-bold text-white/80">{bellInfo.title}</div>
          <div className="text-2xl font-black text-cyan-300 font-mono tracking-wider">
            {bellInfo.timeText}
          </div>
        </div>
        <div className="text-3xl">{bellInfo.icon}</div>
      </div>

      {/* Мотиватор */}
      <div className="motivator">{motivator}</div>

      {/* Класс */}
      <div className="flex items-baseline justify-between gap-2 mt-1">
        <h1
          className="text-2xl font-black cursor-pointer select-none hover:text-cyan-300 transition-colors"
          onClick={onLogoTap}
        >
          {cls}
        </h1>
        <span className="text-xs text-white/60 font-bold">
          {shift} смена · подгруппа {subGroup}
        </span>
      </div>

      {/* Сегодня и до выходных */}
      <div className="grid grid-cols-2 gap-2 my-3">
        <button
          type="button"
          onClick={() => onNavigate('schedule')}
          className="text-left p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <div className="text-[11px] text-white/60 font-bold">📅 Сегодня</div>
          <div className="text-sm font-black text-white mt-0.5">{smartText}</div>
        </button>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[11px] text-white/60 font-bold">🏖️ {d.weekend}</div>
          <div className="text-sm font-black text-white mt-0.5">{weekendText}</div>
        </div>
      </div>

      {/* Четверть */}
      <div
        className="cleanNext cursor-pointer hover:bg-white/12 transition-colors my-3"
        onClick={() => onNavigate('quarter')}
      >
        <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
          <span className="text-cyan-300">
            📊 {quarterProgress.name}
            {!quarterProgress.isBreak && ` (${quarterProgress.percent}%)`}
          </span>
          <span className="text-white/80">До {quarterProgress.breakName}: {quarterProgress.daysLeft} дн.</span>
        </div>
        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/15">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, quarterProgress.percent))}%` }}
          />
        </div>
      </div>

      {/* Портфель на завтра — только вечером, когда он нужен */}
      {showBackpackHint && (
        <button
          type="button"
          className="w-full my-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-between hover:border-emerald-400/60 transition-all text-xs cursor-pointer"
          onClick={() => onNavigate('backpack')}
        >
          <span className="flex items-center gap-2.5 text-left">
            <span className="text-xl">🎒</span>
            <span>
              <span className="block font-bold text-emerald-200">Собери портфель на завтра</span>
              <span className="block text-[11px] text-white/70">Учебники и форма по завтрашнему расписанию</span>
            </span>
          </span>
          <span className="text-emerald-300 font-bold shrink-0">→</span>
        </button>
      )}

      {/* Все разделы: одинаковые плитки, сгруппированные по смыслу */}
      {QUICK_GROUPS.map((group) => (
        <div key={group.title} className="mt-4">
          <h2 className="text-xs font-black text-white/60 uppercase tracking-wide mb-2">{group.title}</h2>
          <div className="grid grid-cols-3 gap-2">
            {group.items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => (item.screen === 'calc' ? onOpenCalc() : onNavigate(item.screen))}
                className="flex flex-col items-center justify-center gap-1 p-3 min-h-[72px] rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-400/40 active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[11px] font-bold text-white/90 text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
