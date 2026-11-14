import React, { useState } from 'react';
import { isApkUpdate } from '../components/UpdateRequired';
import { Account } from '../services/accounts';
import { markAnnouncementRead, readLocally } from '../services/boardRead';
import { ScreenId, LanguageType } from '../types';
import { DICT } from '../data/constants';
import { BoardPost, AUDIENCE_LABEL } from '../services/teacher';
import { AsoshikAvatar } from './AssistantScreen';
import { t, UIKey } from '../i18n';
import { AskAsoshikButton } from '../components/AskAsoshikButton';

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
  onOpenWhatsNew: () => void;
  onAskAsoshik: (text: string) => void;
  diaryBadge?: number; // новые оценки в дневнике
  onLogoTap: () => void;
  lang: LanguageType;
  showBackpackHint: boolean;
  quarterProgress: {
    name: string;
    percent: number;
    daysLeft: number;
    breakName: string;
    isBreak: boolean;
    daysToSummer: number;
  };
  announcements: BoardPost[]; // объявления учителей для этого класса и всей школы
  account?: Account | null; // для отметки «прочитано» у объявлений
  onShowToast?: (msg: string) => void;
  isTeacher: boolean;
  // Следующий урок: sub пустой — это был последний урок
  shortLessonsToday: number; // длина сокращённого урока сегодня, 0 — обычный день
  nextLesson: { sub: string; replaced: boolean; room: string; floor: number | null; time: string } | null;
  siteClosed?: boolean;
  availableUpdateVersion?: string | null;
  isUpdatingApp?: boolean;
  onApplyUpdate?: () => void;
}

const ONLINE_TILE_SCREENS = new Set<string>(['diary', 'chat', 'online', 'profile', 'updates', 'teacher']);

// Разделы, которых нет в нижнем меню (Уроки, ДЗ, Игры и Опции открываются оттуда)
const QUICK_GROUPS: { title: UIKey; items: { icon: string; label: UIKey; screen: ScreenId | 'calc' | 'whatsnew' }[] }[] = [
  {
    title: 'gStudy',
    items: [
      { icon: '🔔', label: 'bells', screen: 'bells' },
      { icon: '🔮', label: 'tomorrowT', screen: 'tomorrow' },
      { icon: '📊', label: 'quarterT', screen: 'quarter' },
      { icon: '🗓️', label: 'calendar', screen: 'calendar' },
      { icon: '📐', label: 'formulasT', screen: 'formulas' },
      { icon: '🧮', label: 'calcT', screen: 'calc' },
    ],
  },
  {
    title: 'gClass',
    items: [
      { icon: '📒', label: 'diary', screen: 'diary' },
      { icon: '💬', label: 'chat', screen: 'chat' },
      { icon: '🏆', label: 'online', screen: 'online' },
      { icon: '👤', label: 'profile', screen: 'profile' },
      { icon: '🏅', label: 'portfolio', screen: 'portfolio' },
      { icon: '🏆', label: 'achievements', screen: 'achievements' },
    ],
  },
  {
    title: 'gTools',
    items: [
      { icon: '🎒', label: 'backpackT', screen: 'backpack' },
      { icon: '🍅', label: 'pomodoroT', screen: 'pomodoro' },
      { icon: '🎧', label: 'focus', screen: 'focus' },
      { icon: '🗺', label: 'rooms', screen: 'map' },
      { icon: '✏️', label: 'replacements', screen: 'updates' },
      { icon: '📺', label: 'tv', screen: 'board' },
      { icon: '🎁', label: 'whatsnew', screen: 'whatsnew' },
    ],
  },
];

const HIDDEN_ANN_KEY = 'asosh_hidden_announcements';
const loadHiddenAnn = (): string[] => {
  try {
    const list = JSON.parse(localStorage.getItem(HIDDEN_ANN_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

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
  onOpenWhatsNew,
  onAskAsoshik,
  diaryBadge = 0,
  onLogoTap,
  lang,
  showBackpackHint,
  quarterProgress,
  announcements,
  account = null,
  onShowToast,
  isTeacher,
  nextLesson,
  shortLessonsToday,
  siteClosed = false,
  availableUpdateVersion = null,
  isUpdatingApp = false,
  onApplyUpdate,
}) => {
  const d = DICT[lang] || DICT.ru;
  // Учителю — плитка кабинета в группе «Класс»
  const groups = isTeacher
    ? QUICK_GROUPS.map((g) => (g.title === 'gClass' ? { ...g, items: [{ icon: '👩‍🏫', label: 'teacherCab' as UIKey, screen: 'teacher' as ScreenId }, ...g.items] } : g))
    : QUICK_GROUPS;
  const [hiddenAnn, setHiddenAnn] = useState<string[]>(loadHiddenAnn);
  const hideAnn = (id: string) => {
    const next = [...hiddenAnn, id];
    setHiddenAnn(next);
    try {
      localStorage.setItem(HIDDEN_ANN_KEY, JSON.stringify(next.slice(-100)));
    } catch {
      // нет места — скроется только до перезапуска
    }
  };
  // Отметка «прочитано»: учитель видит, кто из класса ознакомился
  const [readAnn, setReadAnn] = useState<string[]>(() => readLocally());
  const canMarkRead = account?.role === 'student' || account?.role === 'parent';
  const markRead = async (id: string) => {
    if (!account) return;
    const ok = await markAnnouncementRead(id, account);
    if (ok) setReadAnn((prev) => (prev.includes(id) ? prev : [...prev, id]));
    else onShowToast?.('Не получилось отметить — нужен интернет');
  };
  const freshAnn = announcements
    .filter((a) => a.kind === 'ann' && Date.now() - a.created_at < 30 * 24 * 3600 * 1000 && !hiddenAnn.includes(a.id))
    .slice(0, 3);

  return (
    <div className="card screen-enter">
      <div className="mc-splash">{splash}</div>

      {/* Уведомление о доступном ручном обновлении */}
      {availableUpdateVersion && (
        <div
          role="alert"
          className="mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-rose-600/25 via-red-600/20 to-rose-700/25 border-2 border-rose-500/70 shadow-lg space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base shrink-0">🚀</span>
                <span className="text-sm font-black text-white leading-snug">
                  Вышла новая версия АСОШ Таймер.
                </span>
                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-lg bg-rose-500/30 text-rose-100 border border-rose-400/50">
                  {availableUpdateVersion}
                </span>
              </div>
              <p className="text-xs font-semibold text-rose-100/90 leading-relaxed mt-1">
                Если не обновляться, некоторые новые функции будут вам недоступны и приложение может работать нестабильно.
              </p>
            </div>
          </div>
          {onApplyUpdate && (
            <button
              type="button"
              disabled={isUpdatingApp}
              onClick={onApplyUpdate}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-60 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isUpdatingApp ? '⏳' : isApkUpdate() ? '⬇️' : '🔄'}</span>
              <span>{isUpdatingApp ? 'Обновляем приложение...' : isApkUpdate() ? 'Скачать новую версию' : 'Обновиться'}</span>
            </button>
          )}
          {onApplyUpdate && isApkUpdate() && (
            <p className="text-[11px] text-rose-100/80 leading-snug">
              Скачай файл и открой его — новая версия установится поверх, все данные сохранятся.
            </p>
          )}
        </div>
      )}

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

      {shortLessonsToday > 0 && (
        <div
          className="mt-2 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-400/35 text-xs font-bold text-amber-200 cursor-pointer"
          onClick={() => onNavigate('bells')}
        >
          ⏱ {t('shortToday', lang, { n: shortLessonsToday })}
        </div>
      )}

      {/* Куда идти дальше */}
      {nextLesson && (
        <div
          className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => onNavigate('schedule')}
        >
          {nextLesson.sub ? (
            <>
              <div className="text-[11px] text-white/60 font-bold">
                👉 {t('next', lang)}{nextLesson.time && ` · ${nextLesson.time}`}
                {nextLesson.replaced && ` · ${t('replaced', lang)}`}
                <AskAsoshikButton
                  className="ml-2 !py-0.5"
                  label={t('askPrep', lang)}
                  onClick={() => onAskAsoshik(`Скоро урок «${nextLesson.sub}» в ${nextLesson.time}. Подскажи коротко: что повторить перед уроком и что взять с собой.`)}
                />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span className="text-sm font-black text-white truncate">{nextLesson.sub}</span>
                <span className="text-sm font-black text-cyan-300 whitespace-nowrap">
                  {nextLesson.room ? (/^\d/.test(nextLesson.room) ? `${t('roomShort', lang)} ${nextLesson.room}` : nextLesson.room) : t('noRoom', lang)}
                  {nextLesson.floor && <span className="text-white/60 font-bold"> · {nextLesson.floor} {t('floor', lang)}</span>}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm font-black text-white">🎉 {t('lastLesson', lang)}</div>
          )}
        </div>
      )}

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
          {shift} {t('shiftW', lang)} · {t('subgroupW', lang)} {subGroup}
        </span>
      </div>

      {/* Сегодня и до выходных */}
      <div className="grid grid-cols-2 gap-2 my-3">
        <button
          type="button"
          onClick={() => onNavigate('schedule')}
          className="text-left p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <div className="text-[11px] text-white/60 font-bold">📅 {t('today', lang)}</div>
          <div className="text-sm font-black text-white mt-0.5">{smartText}</div>
        </button>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[11px] text-white/60 font-bold">🏖️ {d.weekend}</div>
          <div className="text-sm font-black text-white mt-0.5">{weekendText}</div>
        </div>
      </div>

      {/* Асошик */}
      <button
        type="button"
        onClick={() => onNavigate('assistant')}
        className={`asoshik-header w-full text-left cursor-pointer !mb-3 relative ${
          siteClosed ? 'opacity-80 !border-rose-500/40' : ''
        }`}
      >
        <div className={siteClosed ? 'grayscale-[40%] opacity-70' : ''}>
          <AsoshikAvatar size={42} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-black ${
              siteClosed ? 'line-through decoration-rose-400 decoration-2 text-rose-200' : 'text-white'
            }`}
          >
            {t('askA', lang)}
          </div>
          <div className="text-[11px] font-bold text-white/70">
            {siteClosed ? 'Временно недоступно • технические работы' : t('askASub', lang)}
          </div>
        </div>
        {siteClosed ? (
          <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow shrink-0">
            ✕
          </span>
        ) : (
          <span className="text-lg text-white/70">›</span>
        )}
      </button>

      {/* Четверть */}
      <div
        className="cleanNext cursor-pointer hover:bg-white/12 transition-colors my-3"
        onClick={() => onNavigate('quarter')}
      >
        <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-0.5 text-xs mb-1.5 font-bold">
          <span className="text-cyan-300 whitespace-nowrap">
            📊 {quarterProgress.name}
            {!quarterProgress.isBreak && ` (${quarterProgress.percent}%)`}
          </span>
          {quarterProgress.daysLeft > 0 && <span className="text-white/80 whitespace-nowrap">{quarterProgress.breakName}: {t('inDays', lang, { n: quarterProgress.daysLeft })}</span>}
        </div>
        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/15">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, quarterProgress.percent))}%` }}
          />
        </div>
        <div className="text-[11px] text-white/60 font-bold mt-1.5">
          {quarterProgress.daysToSummer > 0
            ? `☀️ ${t('toYearEnd', lang, { n: quarterProgress.daysToSummer })}`
            : `☀️ ${t('yearOver', lang)}`}
        </div>
      </div>

      {/* Объявления учителей */}
      {freshAnn.length > 0 && (
        <div className="my-3 space-y-2">
          {freshAnn.map((a) => (
            <div key={a.id} className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/35">
              <div className="flex items-start justify-between gap-2">
                <b className="text-sm text-amber-200">📢 {a.title}</b>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-white/50">
                    {new Date(a.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    type="button"
                    className="w-6 h-6 grid place-items-center rounded-lg text-white/60 hover:bg-white/10 cursor-pointer"
                    aria-label="Скрыть объявление"
                    title="Скрыть"
                    onClick={() => hideAnn(a.id)}
                  >
                    ✕
                  </button>
                </span>
              </div>
              {a.text && <div className="text-xs text-white/85 whitespace-pre-line break-words mt-0.5">{a.text}</div>}
              <div className="text-[10px] text-white/55 mt-1 flex items-center justify-between gap-2 flex-wrap">
                <span>
                  👩‍🏫 {a.author} · {a.cls || t('wholeSchool', lang)}
                  {isTeacher && ` · ${AUDIENCE_LABEL[a.aud]}`}
                </span>
                {canMarkRead &&
                  (readAnn.includes(a.id) ? (
                    <span className="text-emerald-300 font-bold">✅ Прочитано</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(a.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
                    >
                      👍 Прочитал(а)
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
              <span className="block font-bold text-emerald-200">{t('backpackHint', lang)}</span>
              <span className="block text-[11px] text-white/70">{t('backpackHintSub', lang)}</span>
            </span>
          </span>
          <span className="text-emerald-300 font-bold shrink-0">→</span>
        </button>
      )}

      {/* Все разделы: одинаковые плитки, сгруппированные по смыслу */}
      {groups.map((group) => (
        <div key={group.title} className="mt-4">
          <h2 className="text-xs font-black text-white/60 uppercase tracking-wide mb-2">{t(group.title, lang)}</h2>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
            {group.items.map((item) => {
              const isLockedOnline = siteClosed && ONLINE_TILE_SCREENS.has(item.screen);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => (item.screen === 'calc' ? onOpenCalc() : item.screen === 'whatsnew' ? onOpenWhatsNew() : onNavigate(item.screen))}
                  className={`relative flex flex-col items-center justify-center gap-1 p-3 min-h-[72px] lg:min-h-[96px] rounded-2xl border active:scale-95 transition-all cursor-pointer ${
                    isLockedOnline
                      ? 'bg-rose-950/15 border-rose-500/35 hover:bg-rose-950/25'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/40'
                  }`}
                >
                  {isLockedOnline ? (
                    <span
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow"
                      title="Временно недоступно"
                    >
                      ✕
                    </span>
                  ) : (
                    item.screen === 'diary' && diaryBadge > 0 && <span className="tile-badge">{diaryBadge}</span>
                  )}
                  <span className={`text-xl lg:text-3xl ${isLockedOnline ? 'opacity-55 grayscale-[35%]' : ''}`}>{item.icon}</span>
                  <span
                    className={`text-[11px] lg:text-[13px] font-bold text-center leading-tight ${
                      isLockedOnline ? 'line-through decoration-rose-400 decoration-2 text-rose-200/80' : 'text-white/90'
                    }`}
                  >
                    {t(item.label, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
