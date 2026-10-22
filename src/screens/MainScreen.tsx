import React, { useState } from 'react';
import { ScreenId, LanguageType } from '../types';
import { DICT } from '../data/constants';
import { ShieldCheck } from 'lucide-react';
import { FriendGamePromo } from '../components/FriendGamePromo';

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
  quarterProgress: {
    name: string;
    percent: number;
    daysLeft: number;
    breakName: string;
  };
}

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
  quarterProgress,
}) => {
  const d = DICT[lang] || DICT.ru;
  const [activeCategoryTab, setActiveCategoryTab] = useState<'study' | 'tools' | 'fun'>('study');

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

      {/* Заголовок класса */}
      <h1
        className="text-2xl font-black cursor-pointer select-none hover:text-cyan-300 transition-colors"
        onClick={onLogoTap}
      >
        {cls} | Классный центр
      </h1>

      <div className="flex flex-wrap items-center gap-1.5 my-2">
        <div className="badge bg-white/10 border-white/20 text-white/90">
          {shift} смена • Подгруппа {subGroup}
        </div>
        <div
          className="badge bg-amber-500/15 border-amber-400/40 text-amber-200 font-mono text-xs flex items-center gap-1 select-none"
          title="Класс подтверждён персональным кодом"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>{cls} класс • Код активен 🔒</span>
        </div>
      </div>

      {/* Сводка дня */}
      <div className="my-3 p-3.5 rounded-3xl bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-blue-950/70 border border-purple-400/40 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-sm shadow-md shrink-0">
            📅
          </div>
          <b className="text-sm text-white font-black">{d.smartday}</b>
        </div>
        <p className="text-xs text-purple-100/95 leading-relaxed font-medium">{smartText}</p>
      </div>

      {/* Блок «До выходных» */}
      <div className="lesson my-2 !m-0">
        <div className="num">🏖️</div>
        <div>
          <b className="text-sm">{d.weekend}</b>
          <div className="text-xs text-white/70">{weekendText}</div>
        </div>
      </div>

      {/* Интерактивный виджет четверти */}
      <div
        className="cleanNext cursor-pointer hover:bg-white/12 transition-colors my-3"
        onClick={() => onNavigate('quarter')}
      >
        <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
          <span className="text-cyan-300">📊 {quarterProgress.name} ({quarterProgress.percent}%)</span>
          <span className="text-white/80">До {quarterProgress.breakName}: {quarterProgress.daysLeft} дн.</span>
        </div>
        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/15">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, quarterProgress.percent))}%` }}
          />
        </div>
      </div>

      {/* Вечерний виджет сбора портфеля */}
      <div
        className="my-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/70 to-teal-950/60 border border-emerald-400/30 flex items-center justify-between cursor-pointer hover:border-emerald-400/60 transition-all text-xs shadow-sm"
        onClick={() => onNavigate('backpack')}
        title="Проверьте, собран ли портфель на завтра"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎒</span>
          <div>
            <div className="font-bold text-emerald-200">Вечерний сбор портфеля на завтра</div>
            <div className="text-[11px] text-white/70">Чек-лист учебников и формы по завтрашнему расписанию</div>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/40 shrink-0">
          Собрать →
        </div>
      </div>

      {/* Разгруженное меню быстрого доступа (3 удобные вкладки вместо простыни кнопок) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-cyan-300 flex items-center gap-1.5">
            <span>⚡</span>
            <span>{d.fast}</span>
          </h2>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveCategoryTab('study')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategoryTab === 'study'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              📚 Учёба
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryTab('tools')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategoryTab === 'tools'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🛠️ Утилиты
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryTab('fun')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCategoryTab === 'fun'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              🎮 Перемена
            </button>
          </div>
        </div>

        {activeCategoryTab === 'study' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
            <button type="button" className="btn cyan font-black" onClick={() => onNavigate('schedule')}>
              <span>📅</span>
              <span>{d.schedule}</span>
            </button>
            <button type="button" className="btn purple font-black" onClick={() => onNavigate('homework')}>
              <span>📘</span>
              <span>{d.hw}</span>
            </button>
            <button type="button" className="btn orange font-black" onClick={() => onNavigate('bells')}>
              <span>🔔</span>
              <span>Звонки</span>
            </button>
            <button type="button" className="btn green font-black" onClick={onOpenCalc}>
              <span>🧮</span>
              <span>Калькулятор</span>
            </button>
            <button type="button" className="btn cyan" onClick={() => onNavigate('quarter')}>
              <span>📊</span>
              <span>Четверть & Цель</span>
            </button>
            <button type="button" className="btn purple" onClick={() => onNavigate('formulas')}>
              <span>📐</span>
              <span>Формулы</span>
            </button>
            <button type="button" className="btn orange" onClick={() => onNavigate('tomorrow')}>
              <span>🔮</span>
              <span>{d.tomorrow}</span>
            </button>
            <button type="button" className="btn darkBtn" onClick={() => onNavigate('updates')}>
              <span>🛠</span>
              <span>+ Уроки</span>
            </button>
          </div>
        )}

        {activeCategoryTab === 'tools' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
            <button type="button" className="btn green font-black" onClick={() => onNavigate('backpack')}>
              <span>🎒</span>
              <span>Портфель</span>
            </button>
            <button type="button" className="btn purple" onClick={() => onNavigate('focus')}>
              <span>🎧</span>
              <span>Фокус-Звуки</span>
            </button>
            <button type="button" className="btn orange" onClick={() => onNavigate('pomodoro')}>
              <span>🍅</span>
              <span>Помодоро</span>
            </button>
            <button type="button" className="btn darkBtn" onClick={() => onNavigate('excuse')}>
              <span>📝</span>
              <span>Записки</span>
            </button>
            <button type="button" className="btn darkBtn" onClick={() => onNavigate('map')}>
              <span>🗺</span>
              <span>Кабинеты</span>
            </button>
            <button type="button" className="btn darkBtn" onClick={() => onNavigate('settings')}>
              <span>⚙️</span>
              <span>{d.settings}</span>
            </button>
          </div>
        )}

        {activeCategoryTab === 'fun' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
            <button type="button" className="btn cyan font-black" onClick={() => onNavigate('chat')}>
              <span>💬</span>
              <span>Школьный Чат</span>
            </button>
            <button type="button" className="btn purple font-black" onClick={() => onNavigate('games')}>
              <span>🎮</span>
              <span>{d.games} (8 игр)</span>
            </button>
            <button type="button" className="btn cyan font-black" onClick={() => onNavigate('profile')}>
              <span>👤</span>
              <span>Мой Профиль</span>
            </button>
            <button type="button" className="btn orange font-black" onClick={() => onNavigate('achievements')}>
              <span>🏆</span>
              <span>Достижения</span>
            </button>
            <button type="button" className="btn orange" onClick={() => onNavigate('news')}>
              <span>📰</span>
              <span>Школьные Новости</span>
            </button>
            <button type="button" className="btn orange" onClick={() => onNavigate('portfolio')}>
              <span>🏅</span>
              <span>Портфолио & ВсОШ</span>
            </button>
            <button type="button" className="btn purple" onClick={() => onNavigate('gpa')}>
              <span>🎯</span>
              <span>Ср. балл & Прогноз</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
