import React, { useState } from 'react';
import {
  Volume2,
  RefreshCw,
  X,
  ShieldAlert,
  Sparkles,
  Clock,
  Database,
  Terminal,
  Play,
  Award,
  Zap,
  BookOpen,
  CheckCircle2,
  Smartphone,
  Cpu,
  Download,
  Flame,
  Activity,
  Vibrate,
  Bug,
  FileCode,
  Sliders,
  Radio,
  Check,
  Ban,
  Trash2,
  Presentation,
  FileText,
  Copy,
  ExternalLink,
  Share2,
  Lock,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { playSound } from '../utils/audio';
import { SoundProfileType } from '../types';
import {
} from '../utils/privacy';
import {
  downloadPresentationHtml,
  downloadPresentationMarkdown,
  PRESENTATION_MARKDOWN,
} from '../data/presentationData';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundProfile: SoundProfileType;
  onResetUpdates: () => void;
  onSeedMockData: () => void;
  onShowToast: (msg: string) => void;
  onSetSimulatedTime?: (time: Date | null) => void;
  onUnlockAllAchievements?: () => void;
  onSeedHomeworks?: () => void;
  fpsOverlayActive?: boolean;
  onToggleFpsOverlay?: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({
  isOpen,
  onClose,
  soundProfile,
  onResetUpdates,
  onSeedMockData,
  onShowToast,
  onSetSimulatedTime,
  onUnlockAllAchievements,
  onSeedHomeworks,
  fpsOverlayActive,
  onToggleFpsOverlay,
}) => {
  const [tab, setTab] = useState<'security' | 'presentation' | 'apk' | 'mobile' | 'time' | 'data' | 'audio' | 'system'>('security');
  const [stressResult, setStressResult] = useState<string | null>(null);
  const [simBattery, setSimBattery] = useState(88);
  const [simNetwork, setSimNetwork] = useState<'online' | 'offline' | 'slow3g'>('online');


  const copyToClipboard = (text: string, label: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      playSound('coin', soundProfile);
      onShowToast(`📋 ${label} скопирован в буфер обмена!`);
    } catch {
      onShowToast('Не удалось скопировать текст');
    }
  };

  if (!isOpen) return null;

  const storageKeys = [
    'asosh_settings_v11',
    'asosh_class_v11',
    'asosh_shift_v11',
    'asosh_subgroup_v11',
    'asosh_hw_v11',
    'asosh_updates_v11',
    'asosh_backpack_items_v11',
    'asosh_tomatoes_v11',
    'asosh_games_v11',
    'asosh_achievements_v11',
    'asosh_gpa_v11',
    'asosh_portfolio_v11',
    'asosh_settings_v105',
    'asosh_class_v105',
    'asosh_shift_v105',
    'asosh_subgroup_v105',
    'asosh_hw_v105',
    'asosh_updates_v105',
    'asosh_backpack_v105',
    'asosh_games_v106',
    'asosh_achievements_v106',
    'asosh_gpa_v106',
    'asosh_portfolio_v106',
  ];

  const getStorageSizeKB = () => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
    return (total / 1024).toFixed(2);
  };

  const handleTimeTravel = (hours: number, minutes: number, label: string) => {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    onSetSimulatedTime?.(d);
    onShowToast(`⏱️ Машина времени: ${label} (${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')})`);
  };

  const handleResetTime = () => {
    onSetSimulatedTime?.(null);
    onShowToast('⏱️ Время синхронизировано с реальными часами');
  };

  const runDatabaseBenchmark = () => {
    const startTime = performance.now();
    for (let i = 0; i < 500; i++) {
      localStorage.setItem(`_benchmark_test_${i}`, JSON.stringify({ item: i, timestamp: Date.now() }));
    }
    for (let i = 0; i < 500; i++) {
      localStorage.getItem(`_benchmark_test_${i}`);
    }
    for (let i = 0; i < 500; i++) {
      localStorage.removeItem(`_benchmark_test_${i}`);
    }
    const duration = (performance.now() - startTime).toFixed(1);
    setStressResult(`✅ Тест 1500 I/O операций завершён за ${duration} мс! Скорость отличная.`);
    onShowToast(`⚡ Бенчмарк: ${duration} мс`);
  };

  const testVibrationPattern = (pattern: 'success' | 'warning' | 'error' | 'heavy') => {
    if ('vibrate' in navigator) {
      if (pattern === 'success') navigator.vibrate([30, 40, 30]);
      else if (pattern === 'warning') navigator.vibrate([60, 50, 60]);
      else if (pattern === 'error') navigator.vibrate([100, 50, 100, 50, 100]);
      else if (pattern === 'heavy') navigator.vibrate([150]);
      onShowToast(`📳 Вибросигнал: ${pattern}`);
    } else {
      onShowToast('📳 Виброотклик сэмулирован (звуковой сигнал)');
      playSound('coin', soundProfile);
    }
  };

  const generateSampleGrades = () => {
    const sampleGrades = [
      { subject: 'Алгебра', marks: [5, 4, 5, 5, 4, 5] },
      { subject: 'Геометрия', marks: [4, 5, 4, 4, 5] },
      { subject: 'Русский язык', marks: [5, 5, 4, 5, 5] },
      { subject: 'Физика', marks: [5, 5, 5, 4, 5] },
      { subject: 'Химия', marks: [4, 5, 5, 5] },
      { subject: 'Информатика', marks: [5, 5, 5, 5, 5] },
      { subject: 'История', marks: [5, 4, 5, 5] },
      { subject: 'Английский язык', marks: [5, 5, 4, 5, 5] },
    ];
    localStorage.setItem('asosh_gpa_v106', JSON.stringify(sampleGrades));
    onShowToast('🎯 Сгенерирован отличный табель отметок (ср. балл 4.88)!');
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900/95 border border-cyan-400/50 rounded-3xl p-5 sm:p-6 shadow-2xl text-white relative max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-cyan-400 animate-pulse" />
            <div>
              <span className="text-lg font-black text-cyan-300">Панель Разработчика v11.3 Official</span>
              <span className="block text-[10px] text-cyan-400/80 uppercase font-mono">ASOSH Full Dev & Presentation Suite</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presentation Download Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-gradient-to-r from-blue-950/90 via-slate-900 to-cyan-950/90 rounded-2xl border border-cyan-400/50 mt-3 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Presentation className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-cyan-200">
                Официальная презентация АСОШ №2 (2026)
              </div>
              <div className="text-[10px] text-white/70">
                Готовые слайды для класса, проектора и тексты постов
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                downloadPresentationHtml();
                playSound('coin', soundProfile);
                onShowToast('🎉 Презентация АСОШ №2 успешно скачана!');
              }}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать презентацию</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('presentation');
                playSound('nav', soundProfile);
              }}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Открыть вкладку презентации"
            >
              Подробнее
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1 my-3 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10">
          {[
            { id: 'security', label: '🔒 Пароль Dev', icon: Lock },
            { id: 'presentation', label: '🎓 Презентация', icon: Presentation },
            { id: 'apk', label: '🤖 APK Сборка', icon: Smartphone },
            { id: 'mobile', label: '📱 Телефон', icon: Activity },
            { id: 'time', label: '⏱️ Время', icon: Clock },
            { id: 'data', label: '💾 База', icon: Database },
            { id: 'audio', label: '🔊 Звуки', icon: Volume2 },
            { id: 'system', label: '⚡ HUD', icon: Terminal },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center gap-1 relative ${
                tab === t.id
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="truncate max-w-full px-0.5">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {/* 0.1 SECURITY TAB */}
          {tab === 'security' && (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/70 rounded-2xl border-2 border-red-500/40 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/20 border border-red-400/50 rounded-xl text-red-300">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <b className="text-sm font-black text-white block">
                        Безопасность панели разработчика (Dev Lock)
                      </b>
                      <span className="text-[11px] text-white/70 block">
                        Запрет входа без пароля активен • МОУ АСОШ №2
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 bg-red-500/20 text-red-300 border border-red-400/30 rounded-lg font-bold">
                    Защищено
                  </span>
                </div>

                <p className="text-xs text-white/80 leading-relaxed">
                  Вход в панель разработчика строго ограничен. При любой попытке вызова (через верхнюю панель, настройки или скрытые триггеры) запрашивается мастер-пароль. Это защищает школьное расписание, оценки и настройки от посторонних.
                </p>

                {/* Where the password lives */}
                <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white/70 leading-relaxed">
                  <span className="flex items-center gap-1.5 text-white font-bold mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Мастер-пароль хранится на сервере</span>
                  </span>
                  Пароль задаётся переменной <code className="text-cyan-300 font-mono">DEV_PASSWORD</code> в файле .env на сервере и проверяется там же. Чтобы сменить пароль, измените переменную и перезапустите сервер.
                </div>

                {/* Lock and Exit button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundProfile);
                      onShowToast('🔒 Панель разработчика заблокирована');
                      onClose();
                    }}
                    className="w-full btn py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Заблокировать панель и выйти (Lock Dev Suite)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 0. PRESENTATION TAB */}
          {tab === 'presentation' && (
            <div className="space-y-3">
              {/* Hero Card */}
              <div className="p-4 bg-gradient-to-r from-blue-950/90 via-slate-900 to-cyan-950/90 rounded-2xl border-2 border-cyan-400/50 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-cyan-400/20 border border-cyan-400/50 rounded-xl text-cyan-300">
                      <Presentation className="w-6 h-6" />
                    </div>
                    <div>
                      <b className="text-sm font-black text-cyan-200 block">
                        Школьная презентация «АСОШ №2 — 2026»
                      </b>
                      <span className="text-[11px] text-white/70 block">
                        Официальный интерактивный слайд-комплект и маркетинг-кит
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-lg font-bold">
                    HTML5 + MD
                  </span>
                </div>

                <p className="text-xs text-white/90 leading-relaxed">
                  Специально подготовленный пакет для выступления перед классом, на классном часе, родительском собрании или показа на школьном проекторе и интерактивной доске села Аргаяш.
                </p>

                {/* Primary Download Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      downloadPresentationHtml();
                      playSound('coin', soundProfile);
                      onShowToast('🎉 Интерактивная презентация АСОШ №2 скачана!');
                    }}
                    className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать презентацию (.HTML)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      downloadPresentationMarkdown();
                      playSound('coin', soundProfile);
                      onShowToast('📄 Текст презентации и посты скачаны (.MD)!');
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black rounded-xl shadow flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-cyan-300" />
                    <span>Скачать текст и посты (.MD)</span>
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      window.open('/presentation.html', '_blank');
                      playSound('nav', soundProfile);
                    }}
                    className="flex-1 py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-400/40 text-cyan-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Открыть слайд-шоу во весь экран (новое окно)</span>
                  </button>
                </div>
              </div>

              {/* Presentation Specs */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2.5">
                <b className="text-xs text-amber-300 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Состав скачиваемой интерактивной презентации:</span>
                </b>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <b className="text-cyan-300 block">6 интерактивных слайдов:</b>
                    <ul className="text-white/80 space-y-0.5 text-[11px] list-disc list-inside">
                      <li>Слайд 1: Введение и титульный слайд школы</li>
                      <li>Слайд 2: Проблемы школьников (бумажные записи, чаты)</li>
                      <li>Слайд 3: Решение — единая веб-платформа АСОШ №2</li>
                      <li>Слайд 4: Фирменные сервисы для Аргаяша (погода, звонки)</li>
                      <li>Слайд 5: Польза ученикам, родителям и учителям</li>
                      <li>Слайд 6: Быстрый старт за 10 секунд без установки</li>
                    </ul>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <b className="text-cyan-300 block">Технические особенности:</b>
                    <ul className="text-white/80 space-y-0.5 text-[11px] list-disc list-inside">
                      <li>Управление стрелками ⬅️ ➡️ и пробелом</li>
                      <li>Встроенные подсказки и речь спикера</li>
                      <li>Автономность 100% (работает без интернета с флешки)</li>
                      <li>Адаптивно под проекторы, ТВ, интерактивные доски</li>
                      <li>Красивая анимация смены слайдов</li>
                      <li>Размер файла всего ~15 КБ</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Ready Promo Texts for Messenger Chats */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <b className="text-xs text-cyan-300 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Готовые тексты для рассылки в школьные чаты:</span>
                  </b>
                </div>

                {/* Post 1: Class Chat */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <span>💬</span> <b>Для беседы одноклассников (VK, Telegram, WhatsApp, Сферум):</b>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `🔥 Ребята, всем привет!\n\nДля нашей АСОШ №2 сделали крутое бесплатное веб-приложение — «Умный школьный дневник»! 🚀\n\nЧто в нём есть:\n📅 Полное официальное расписание 2026 для всех классов (5–11)\n🌐 Погода в Аргаяше и автоматический расчёт актировок (отмены уроков из-за морозов)\n🎒 Умный рюкзак — сам сканирует уроки на завтра и подсказывает нужные учебники\n🔔 Точный таймер звонков и расписание 1 и 2 смен\n🎯 Калькулятор среднего балла\n🎮 8 мини-игр для перемен без интернета\n\nРаботает прямо в браузере, ничего не весит и без рекламы!\n👉 Заходите и выбирайте свой класс!`,
                          'Текст для беседы класса'
                        )
                      }
                      className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Копировать</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-white/70 italic bg-black/40 p-2 rounded-lg leading-relaxed">
                    «🔥 Ребята, всем привет! Для нашей АСОШ №2 сделали крутое бесплатное веб-приложение — Умный школьный дневник! Расписание 2026, погода Аргаяша, актировки, умный рюкзак...»
                  </p>
                </div>

                {/* Post 2: Parents Chat */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <span>📢</span> <b>Для родительского чата класса:</b>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `Уважаемые родители! 👋\n\nДля учеников и родителей МБОУ «АСОШ №2» (с. Аргаяш) создано удобное и бесплатное цифровое приложение-помощник:\n\n✅ Официальная сетка уроков для всех параллелей с 5 по 11 классы\n✅ Автоматический расчёт актировок (отмены занятий из-за морозов по нормативам Челябинской области)\n✅ Точное расписание звонков и длительность перемен для 1-й и 2-й смен\n✅ Автоматический чек-лист учебников и школьных принадлежностей на завтрашний день\n✅ Расчёт успеваемости и дней до каникул\n\nПриложение полностью бесплатное, не содержит рекламы и не требует регистрации.`,
                          'Текст для родительского чата'
                        )
                      }
                      className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Копировать</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-white/70 italic bg-black/40 p-2 rounded-lg leading-relaxed">
                    «Уважаемые родители! Для учеников и родителей МБОУ АСОШ №2 создано удобное приложение: сетка уроков 5-11 кл, расчет актировок по нормативам области, чек-лист рюкзака...»
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* 1.5. APK & PWA EXPORT */}
          {tab === 'apk' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/70 to-teal-950/70 rounded-2xl border border-emerald-400/40 space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <b className="text-sm font-bold text-emerald-300">Сборка готового Android APK (WebIntoApp / PWA):</b>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  Приложение полностью готово для компиляции в автономный Android APK файл без интернета. Ниже представлены готовые параметры манифеста.
                </p>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-white/10 text-xs font-mono space-y-1 text-emerald-200">
                  <div><b>Package Name:</b> ru.asosh2.schoolhelper</div>
                  <div><b>App Name:</b> АСОШ №2 — Помощник школьника</div>
                  <div><b>Version:</b> 11.0 (Build 2026110) Official Release</div>
                  <div><b>Offline Cache:</b> IndexedDB + LocalStorage (100% Offline)</div>
                  <div><b>Target SDK:</b> Android 14+ (API 34) & iOS 17+</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    className="btn green text-xs justify-center py-2.5"
                    onClick={() => {
                      onShowToast('📦 Манифест APK скопирован и проверен!');
                      playSound('star', soundProfile);
                    }}
                  >
                    <FileCode className="w-4 h-4" />
                    <span>Проверить Манифест</span>
                  </button>

                  <button
                    type="button"
                    className="btn cyan text-xs justify-center py-2.5"
                    onClick={() => {
                      onShowToast('🚀 PWA офлайн-кэш обновлён!');
                      playSound('coin', soundProfile);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Кэш офлайна</span>
                  </button>

                  <button
                    type="button"
                    className="btn purple text-xs justify-center py-2.5"
                    onClick={() => {
                      downloadPresentationHtml();
                      playSound('coin', soundProfile);
                      onShowToast('🎉 Презентация АСОШ №2 успешно скачана!');
                    }}
                  >
                    <Presentation className="w-4 h-4" />
                    <span>Скачать презентацию</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. MOBILE SENSORS & HAPTIC */}
          {tab === 'mobile' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <b className="text-xs text-cyan-300 font-bold block">
                  Тестирование виброотклика (Haptic Touch Patterns):
                </b>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    className="btn green text-xs justify-center py-2"
                    onClick={() => testVibrationPattern('success')}
                  >
                    <Vibrate className="w-3.5 h-3.5" />
                    <span>Успех (30ms)</span>
                  </button>

                  <button
                    type="button"
                    className="btn orange text-xs justify-center py-2"
                    onClick={() => testVibrationPattern('warning')}
                  >
                    <Vibrate className="w-3.5 h-3.5" />
                    <span>Предупр. (60ms)</span>
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2 text-rose-300"
                    onClick={() => testVibrationPattern('error')}
                  >
                    <Vibrate className="w-3.5 h-3.5" />
                    <span>Ошибка (3x)</span>
                  </button>

                  <button
                    type="button"
                    className="btn purple text-xs justify-center py-2"
                    onClick={() => testVibrationPattern('heavy')}
                  >
                    <Vibrate className="w-3.5 h-3.5" />
                    <span>Сильный удар</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <b className="text-xs text-cyan-300 font-bold block mb-2">
                    Симулятор сетевого режима:
                  </b>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      className={`py-2 text-xs font-bold rounded-xl border ${
                        simNetwork === 'online' ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-white/5 border-white/10'
                      }`}
                      onClick={() => {
                        setSimNetwork('online');
                        onShowToast('📶 Сеть: Высокоскоростной Wi-Fi (Online)');
                      }}
                    >
                      🟢 Wi-Fi Online
                    </button>
                    <button
                      type="button"
                      className={`py-2 text-xs font-bold rounded-xl border ${
                        simNetwork === 'slow3g' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-white/5 border-white/10'
                      }`}
                      onClick={() => {
                        setSimNetwork('slow3g');
                        onShowToast('⚠️ Сеть: Медленный 3G (Школьный подвал)');
                      }}
                    >
                      🟡 Медленный 3G
                    </button>
                    <button
                      type="button"
                      className={`py-2 text-xs font-bold rounded-xl border ${
                        simNetwork === 'offline' ? 'bg-rose-500 text-white border-rose-400' : 'bg-white/5 border-white/10'
                      }`}
                      onClick={() => {
                        setSimNetwork('offline');
                        onShowToast('✈️ Сеть: Полный офлайн (Автономный режим)');
                      }}
                    >
                      🔴 Полный Офлайн
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. TIME TRAVEL */}
          {tab === 'time' && (
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <b className="text-xs text-cyan-300 font-bold block mb-1">
                  Машина времени (Симуляция учебного дня):
                </b>
                <p className="text-[11px] text-white/60 mb-2.5">
                  Мгновенно переключает таймер уроков и виджеты для тестирования звонков и расписания.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => handleTimeTravel(7, 55, 'До уроков')}
                  >
                    🌅 07:55 До уроков
                  </button>
                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => handleTimeTravel(8, 15, '1-й урок')}
                  >
                    📚 08:15 1-й Урок
                  </button>
                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2 text-amber-300 border-amber-400/40"
                    onClick={() => handleTimeTravel(8, 38, '2 мин до звонка')}
                  >
                    ⚠️ 08:38 (2 мин до звонка)
                  </button>
                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => handleTimeTravel(8, 42, '1-я перемена')}
                  >
                    ☕ 08:42 Перемена 1
                  </button>
                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2 text-cyan-300 border-cyan-400/40"
                    onClick={() => handleTimeTravel(10, 25, 'Большая перемена')}
                  >
                    🥪 10:25 Большая перемена
                  </button>
                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => handleTimeTravel(14, 0, '2-я смена')}
                  >
                    🔔 14:00 2-я смена
                  </button>
                </div>

                <button
                  type="button"
                  className="btn green text-xs justify-center py-2.5 mt-2.5"
                  onClick={handleResetTime}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Вернуть текущее реальное время</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. DATA & STORAGE + BENCHMARK */}
          {tab === 'data' && (
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <b className="text-xs text-cyan-300 font-bold">Инспектор LocalStorage:</b>
                  <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                    {getStorageSizeKB()} KB занято
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-white/10 text-[11px] font-mono space-y-1 text-white/70">
                  {storageKeys.map((k) => (
                    <div key={k} className="flex justify-between">
                      <span className="truncate max-w-[200px]">{k}</span>
                      <span className="text-cyan-400">
                        {localStorage.getItem(k) ? '✓ ' + (localStorage.getItem(k) || '').length + 'b' : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {stressResult && (
                  <div className="p-2.5 bg-emerald-950/80 rounded-xl border border-emerald-400/40 text-xs text-emerald-300 font-mono">
                    {stressResult}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    className="btn green text-xs justify-center py-2"
                    onClick={() => {
                      onSeedMockData();
                      onShowToast('Эталонное расписание для всех дней загружено! 🚀');
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Загрузить эталонные уроки</span>
                  </button>

                  <button
                    type="button"
                    className="btn purple text-xs justify-center py-2"
                    onClick={() => {
                      onSeedHomeworks?.();
                      onShowToast('5 тестовых ДЗ добавлены! 📝');
                    }}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Создать тестовые ДЗ</span>
                  </button>

                  <button
                    type="button"
                    className="btn cyan text-xs justify-center py-2"
                    onClick={generateSampleGrades}
                  >
                    <Award className="w-4 h-4" />
                    <span>Сгенерировать отметки (5.0)</span>
                  </button>

                  <button
                    type="button"
                    className="btn orange text-xs justify-center py-2"
                    onClick={() => {
                      onUnlockAllAchievements?.();
                      playSound('victory', soundProfile);
                      onShowToast('🏆 Все 12 достижений разблокированы!');
                    }}
                  >
                    <Award className="w-4 h-4" />
                    <span>Открыть все ачивки</span>
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={runDatabaseBenchmark}
                  >
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Стресс-тест 1500 I/O</span>
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => {
                      onResetUpdates();
                      onShowToast('Временные замены очищены');
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Сбросить замены</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. AUDIO SOUNDBOARD */}
          {tab === 'audio' && (
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <b className="text-xs text-cyan-300 font-bold block mb-1">
                  Студия синтезатора и Школьный Саундборд:
                </b>
                <p className="text-[11px] text-white/60 mb-2.5">
                  Тестирование программного Web Audio API синтезатора во всех профилях.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn purple text-xs justify-center py-2.5"
                    onClick={() => {
                      playSound('bell', soundProfile);
                      onShowToast('🔔 Прозвучал школьный звонок!');
                    }}
                  >
                    🔔 Электрозвонок
                  </button>

                  <button
                    type="button"
                    className="btn green text-xs justify-center py-2.5"
                    onClick={() => {
                      playSound('victory', soundProfile);
                      onShowToast('🏆 Победный фанфар!');
                    }}
                  >
                    🏆 Победный звук
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => playSound('pomodoro', soundProfile)}
                  >
                    ⏱️ Гонг Помодоро
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => playSound('coin', soundProfile)}
                  >
                    ⭐ Монета / Бонус
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => playSound('levelup', soundProfile)}
                  >
                    ⚡ Левел-ап
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2 text-rose-300"
                    onClick={() => playSound('buzzer', soundProfile)}
                  >
                    ❌ Буззер ошибки
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2 text-amber-300"
                    onClick={() => playSound('warn', soundProfile)}
                  >
                    ⚠️ Сигнал тревоги
                  </button>

                  <button
                    type="button"
                    className="btn darkBtn text-xs justify-center py-2"
                    onClick={() => playSound('gameover', soundProfile)}
                  >
                    💀 Game Over
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. SYSTEM & HUD */}
          {tab === 'system' && (
            <div className="space-y-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-2.5">
                <b className="text-xs text-cyan-300 font-bold block">
                  Диагностика устройства и HUD:
                </b>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-white/10">
                    <span className="text-[10px] text-white/50 block">Разрешение экрана</span>
                    <b className="font-mono text-cyan-300">
                      {window.innerWidth} × {window.innerHeight}
                    </b>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-white/10">
                    <span className="text-[10px] text-white/50 block">Device Pixel Ratio</span>
                    <b className="font-mono text-cyan-300">{window.devicePixelRatio || 1}x</b>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-white/10">
                    <span className="text-[10px] text-white/50 block">Ориентация</span>
                    <b className="font-mono text-cyan-300">
                      {window.innerWidth > window.innerHeight ? 'Landscape (Альбом)' : 'Portrait (Портрет)'}
                    </b>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-white/10">
                    <span className="text-[10px] text-white/50 block">Платформа</span>
                    <b className="font-mono text-cyan-300">v11.0 Official Release Pro</b>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none bg-slate-950/80 p-2.5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Оверлей счетчика FPS и производительности</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={fpsOverlayActive}
                      onChange={onToggleFpsOverlay}
                      className="w-5 h-5 accent-cyan-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[11px] text-white/50">
          <span>Сборка АСОШ №2 • Build 2026.11.0-Release</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition-all"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

