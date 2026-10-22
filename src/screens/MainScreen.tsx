import React, { useState } from 'react';
import { ScreenId, LanguageType, SmartDayData } from '../types';
import { DICT } from '../data/constants';
import { ShieldCheck, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { FriendGamePromo } from '../components/FriendGamePromo';
import { SmartDayModal } from '../components/SmartDayModal';

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
  smartDayData?: SmartDayData | null;
  onRefreshSmartDay?: () => void;
  isGeneratingSmartDay?: boolean;
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
  smartDayData,
  onRefreshSmartDay,
  isGeneratingSmartDay,
}) => {
  const d = DICT[lang] || DICT.ru;
  const [isSmartDayModalOpen, setIsSmartDayModalOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'study' | 'tools' | 'fun'>('study');

  return (
    <div className="card screen-enter">
      {/* Smart Day Full Analysis Modal */}
      <SmartDayModal
        isOpen={isSmartDayModalOpen}
        onClose={() => setIsSmartDayModalOpen(false)}
        data={smartDayData || null}
        onRefresh={onRefreshSmartDay || (() => {})}
        isLoading={isGeneratingSmartDay}
      />

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

      {/* Информер погоды и актировок в Аргаяше */}
      <div
        className="my-2 p-2.5 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900/70 to-blue-950/60 border border-sky-400/30 flex items-center justify-between cursor-pointer hover:border-sky-400/60 transition-all text-xs"
        onClick={() => onNavigate('weather')}
        title="Нажми, чтобы открыть полный прогноз и нормы актировок"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">❄️</span>
          <div>
            <div className="font-bold text-sky-200">Погода в Аргаяше & Актировки</div>
            <div className="text-[11px] text-white/70">Статус отмены уроков по морозу • Gemini AI</div>
          </div>
        </div>
        <div className="px-2 py-1 rounded-lg bg-sky-400/20 text-sky-200 text-[11px] font-bold border border-sky-400/40">
          Сводка →
        </div>
      </div>

      {/* Интерактивный виджет ИИ-Помощника АСОШ №2 */}
      <div
        className="my-2 p-2.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/75 to-cyan-950/60 border border-purple-400/40 hover:border-cyan-400/70 flex items-center justify-between cursor-pointer transition-all text-xs shadow-md shadow-purple-950/30 group"
        onClick={() => onNavigate('ai')}
        title="Нажми, чтобы открыть ИИ-помощника АСОШ №2 (Gemini 3.8 Flash)"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            🤖
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-xs truncate">ИИ-Помощник АСОШ №2</span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 text-[9px] font-mono font-bold border border-cyan-400/30">
                Gemini 3.8
              </span>
            </div>
            <div className="text-[11px] text-purple-200/80 truncate">
              Решение задач, формулы, правила & домашка • Без VPN 🇷🇺
            </div>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[11px] font-black shrink-0 shadow-sm ml-2 group-hover:from-cyan-400 group-hover:to-blue-500 transition-all">
          Спросить →
        </div>
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

      {/* Реально умный день на базе ИИ */}
      <div className="my-3 p-3.5 rounded-3xl bg-gradient-to-r from-purple-950/70 via-slate-900/80 to-blue-950/70 border border-purple-400/40 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center text-sm shadow-md shrink-0">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <b className="text-sm text-white font-black">{d.smartday}</b>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  {smartDayData?.engine === 'gemini' ? 'Gemini 3.8 Flash' : 'ИИ-Анализ'}
                </span>
              </div>
              <div className="text-[10px] text-purple-200/70">
                Расписание • Погода • Класс • ДЗ & Статистика
              </div>
            </div>
          </div>

          {onRefreshSmartDay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRefreshSmartDay();
              }}
              disabled={isGeneratingSmartDay}
              title="Обновить подсказку ИИ"
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSmartDay ? 'animate-spin text-cyan-300' : ''}`} />
            </button>
          )}
        </div>

        {/* AI Summary Text */}
        <p className="text-xs text-purple-100/95 leading-relaxed font-medium mb-2.5">
          {smartDayData ? smartDayData.summary : smartText}
        </p>

        {/* Smart Tags / Chips */}
        {smartDayData && smartDayData.tags && smartDayData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {smartDayData.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg bg-white/10 border border-white/15 text-[11px] text-cyan-200 font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Button: Open Detailed Breakdown */}
        {smartDayData && (
          <button
            type="button"
            onClick={() => setIsSmartDayModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Подробный разбор дня (одежда, портфель, учёба)</span>
            </span>
            <ChevronRight className="w-4 h-4 text-purple-300" />
          </button>
        )}
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
            <button type="button" className="btn cyan font-black" onClick={() => onNavigate('weather')}>
              <span>🌐</span>
              <span>Погода Google Live</span>
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
            <button type="button" className="btn purple font-black" onClick={() => onNavigate('ai')}>
              <span>🤖</span>
              <span>ИИ-Помощник</span>
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
