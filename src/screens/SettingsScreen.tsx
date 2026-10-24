import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  AppSettings,
  ThemeType,
  FontSizeType,
  TimerStyleType,
  SoundProfileType,
  LanguageType,
  ScreenId,
} from '../types';
import { DICT } from '../data/constants';
import { playSound, doVibro } from '../utils/audio';
import {
  Palette,
  Volume2,
  VolumeX,
  User,
  Shield,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
  Presentation,
  FileText,
  Wrench,
  Lock,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Search,
  Sliders,
  Zap,
  Clock,
  Bot,
  GraduationCap,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Maximize,
  Minimize,
  Radio,
  HardDrive,
  Play,
  Square,
  Vibrate,
  Layers,
  Activity,
  Flame,
  Bug,
  Info,
} from 'lucide-react';
import { downloadPresentationHtml, downloadPresentationMarkdown } from '../data/presentationData';
import { ApkSupportModal } from '../components/ApkSupportModal';
import { getApkDiagnostics } from '../utils/apkSupport';
import {
  isPinEnabled,
  isPrivacyBlurActive,
  setPrivacyBlurActive,
  isAutoBlurOnWindowBlur,
  setAutoBlurOnWindowBlur,
  isHideGradesInProfile,
  setHideGradesInProfile,
  wipeConfidentialData,
} from '../utils/privacy';
import { THEMES } from '../data/themes';
import QRCode from 'qrcode';
import { createTransfer } from '../services/transfer';
import { isNativeApp, requestNotificationPermission } from '../services/bellNotifications';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  lang: LanguageType;
  onLangChange: (lang: LanguageType) => void;
  studentName: string;
  parentName: string;
  onSaveProfile: (s: string, p: string) => void;
  onChangeClass: () => void;
  onExportData: () => void;
  onImportData: (data: string) => void;
  onResetAll: () => void;
  onShowToast: (msg: string) => void;
  onNavigate?: (screen: ScreenId) => void;
  onOpenDev?: () => void;
  onOpenPinSetup?: () => void;
  onTogglePrivacyBlur?: (enabled: boolean) => void;
  maintenanceMode?: boolean;
  onToggleMaintenanceMode?: (active: boolean) => void;
  onOpenMaintenanceScreen?: () => void;
}

type SettingsSectionId =
  | 'all'
  | 'themes'
  | 'sound'
  | 'study'
  | 'privacy'
  | 'device'
  | 'storage'
  | 'server';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  lang,
  onLangChange,
  studentName,
  parentName,
  onSaveProfile,
  onChangeClass,
  onExportData,
  onImportData,
  onResetAll,
  onShowToast,
  onNavigate,
  onOpenDev,
  onOpenPinSetup,
  onTogglePrivacyBlur,
  maintenanceMode = false,
  onToggleMaintenanceMode,
  onOpenMaintenanceScreen,
}) => {
  const [transferQr, setTransferQr] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const quality = settings.quality ?? (settings.perfLow ? 'eco' : 'normal');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sound Lab state
  const [playingTestSound, setPlayingTestSound] = useState<string | null>(null);

  // AI Voice test state
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiVoiceSpeed, setAiVoiceSpeed] = useState<number>(settings.aiVoiceSpeed || 1.0);
  const [aiVoicePitch, setAiVoicePitch] = useState<number>(settings.aiVoicePitch || 1.0);

  // Server ping state
  const [pingResult, setPingResult] = useState<{ ms: number; status: 'ok' | 'testing' | 'idle' }>({
    ms: 14,
    status: 'idle',
  });

  // Storage stats calculation
  const [storageStats, setStorageStats] = useState({
    bytes: 0,
    kb: '0',
    keysCount: 0,
    hwCount: 0,
    gradesCount: 0,
  });

  useEffect(() => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          const v = localStorage.getItem(k) || '';
          totalBytes += k.length + v.length;
        }
      }
      let hwCount = 0;
      const hwSaved = localStorage.getItem('asosh_hw_v105');
      if (hwSaved) {
        try {
          const parsed = JSON.parse(hwSaved);
          if (Array.isArray(parsed)) hwCount = parsed.length;
        } catch {}
      }
      let gradesCount = 0;
      const gradesSaved = localStorage.getItem('asosh_marks_v105') || localStorage.getItem('asosh_grades');
      if (gradesSaved) {
        try {
          const parsed = JSON.parse(gradesSaved);
          if (typeof parsed === 'object') gradesCount = Object.keys(parsed).length;
        } catch {}
      }

      setStorageStats({
        bytes: totalBytes * 2, // UTF-16 bytes approx
        kb: ((totalBytes * 2) / 1024).toFixed(1),
        keysCount: localStorage.length,
        hwCount,
        gradesCount,
      });
    } catch {}
  }, []);

  // Monitor fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          onShowToast('Полноэкранный режим не поддерживается');
        });
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  const handleTestSound = (type: any, label: string) => {
    setPlayingTestSound(label);
    playSound(type, settings.soundProfile);
    doVibro(settings.vibro, 20);
    setTimeout(() => setPlayingTestSound(null), 1200);
    onShowToast(`Тест звука: ${label}`);
  };

  const handleTestVibro = (pattern: 'light' | 'medium' | 'heavy') => {
    if (pattern === 'light') doVibro(true, 15);
    else if (pattern === 'medium') doVibro(true, 40);
    else {
      doVibro(true, 30);
      setTimeout(() => doVibro(true, 50), 100);
    }
    onShowToast(`Тест вибрации: ${pattern}`);
  };

  const handleClearCacheOnly = () => {
    if (window.confirm('Очистить временный кэш (историю поиска, временные логи)? Ваши оценки, класс и ДЗ останутся на месте.')) {
      try {
        localStorage.removeItem('asosh_ai_chat_v105');
        localStorage.removeItem('asosh_search_cache');
        localStorage.removeItem('asosh_temp_logs');
        onShowToast('Временный кэш успешно очищен! Оценки и ДЗ сохранены.');
      } catch {
        onShowToast('Кэш очищен');
      }
    }
  };



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        onImportData(text);
      } catch {
        onShowToast('Ошибка чтения файла!');
      }
    };
    reader.readAsText(file);
  };

  const sectionsList: { id: SettingsSectionId; label: string; icon: string }[] = [
    { id: 'all', label: 'Все', icon: '🌟' },
    { id: 'themes', label: 'Оформление', icon: '🎨' },
    { id: 'sound', label: 'Звук', icon: '🔔' },
    { id: 'study', label: 'Учёба и звонки', icon: '🎒' },
    { id: 'privacy', label: 'Приватность', icon: '🔒' },
    { id: 'device', label: 'Экран', icon: '📱' },
    { id: 'storage', label: 'Память и резервная копия', icon: '💾' },
    { id: 'server', label: 'Для разработчиков', icon: '🛠️' },
  ];

  // Helper to determine if section matches search
  const isSectionVisible = (sectionId: SettingsSectionId, sectionKeywords: string) => {
    if (activeSection !== 'all' && activeSection !== sectionId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return sectionKeywords.toLowerCase().includes(q);
  };

  return (
    <div className="card screen-enter space-y-4 max-w-4xl mx-auto pb-12">
      {/* 🌟 МЕГА-ШАПКА НАСТРОЕК */}
      <div className="p-4 bg-gradient-to-r from-cyan-950/90 via-slate-900 to-indigo-950/90 rounded-3xl border border-cyan-400/40 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-md">
              ⚙️
            </span>
            <div>
              <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2 tracking-tight">
                <span>Настройки</span>
              </h2>
              <p className="text-xs text-white/70">
                Оформление, звук, звонки, приватность и резервная копия
              </p>
            </div>
          </div>
        </div>

        {/* СТРОКА БЫСТРОГО ЖИВОГО ПОИСКА */}
        <div className="relative">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск настройки: тема, звук, PIN, смена, бэкап…"
            className="w-full pl-10 pr-9 py-2.5 bg-black/40 border border-white/15 rounded-2xl text-xs text-white placeholder-white/40 focus:border-cyan-400 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* НАВИГАЦИОННЫЕ ВКЛАДКИ РАЗДЕЛОВ */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth">
          {sectionsList.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveSection(sec.id);
                playSound('click', settings.soundProfile);
                doVibro(settings.vibro, 10);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeSection === sec.id
                  ? 'bg-cyan-500 text-slate-950 font-black border-cyan-300 shadow-md scale-[1.02]'
                  : 'bg-white/6 text-white/80 border-white/10 hover:bg-white/12 hover:text-white'
              }`}
            >
              <span>{sec.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          1. ВНЕШНИЙ ВИД И 60 ГРАФИЧЕСКИХ ТЕМ
      ======================================================== */}
      {isSectionVisible(
        'themes',
        'темы дизайн оформление цвет шрифты масштаб таймер помодоро цитата сплеши'
      ) && (
        <div className="p-4 bg-white/6 rounded-3xl border border-white/12 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <b className="text-sm text-cyan-200 flex items-center gap-2 font-black">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Оформление</span>
            </b>
          </div>

          <p className="text-xs text-white/70">
            Каждая тема меняет не только цвета, но и фон, форму карточек, шрифт и анимации.
          </p>


          {/* Тема как в системе */}
          <label className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer !m-0">
            <span>
              <span className="block text-xs font-black text-white">🌗 Как в системе</span>
              <span className="block text-[11px] text-white/60">Днём «Минимализм», ночью «Тёмная» — вслед за телефоном или компьютером</span>
            </span>
            <input
              type="checkbox"
              className="w-5 h-5 shrink-0"
              checked={Boolean(settings.themeAuto)}
              onChange={(e) => onUpdateSettings({ themeAuto: e.target.checked })}
            />
          </label>

          {/* Сетка тем с мини-превью */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {THEMES.filter(
              (t) => !searchQuery.trim() || `${t.name} ${t.desc}`.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((t) => {
              const active = !settings.themeAuto && settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  className={`text-left rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    active ? 'border-cyan-400 scale-[1.02] shadow-lg' : 'border-transparent hover:scale-[1.01]'
                  }`}
                  onClick={() => {
                    onUpdateSettings({ theme: t.id, themeAuto: false });
                    playSound('settings', settings.soundProfile);
                    doVibro(settings.vibro, 15);
                    if (t.id === 'first') {
                      onShowToast('📜 Пасхалка: добро пожаловать в первую версию приложения 5Б!');
                      if (onNavigate) onNavigate('retroFirst');
                    }
                  }}
                >
                  {/* Мини-экран темы */}
                  <div className="h-24 p-2.5 flex flex-col gap-1.5" style={{ background: t.preview.background }}>
                    <div
                      className="flex-1 p-2 flex flex-col justify-between"
                      style={{
                        background: t.preview.card,
                        border: `1.5px solid ${t.preview.border}`,
                        borderRadius: t.preview.radius,
                        color: t.preview.text,
                        fontFamily: t.preview.font,
                      }}
                    >
                      <span className="text-[13px] font-bold leading-none">Аа 7А</span>
                      <span
                        className="self-start text-[9px] font-bold px-1.5 py-0.5"
                        style={{ background: t.preview.accent, color: t.light ? '#fff' : '#000', borderRadius: t.preview.radius / 2 }}
                      >
                        10:45
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-black/30">
                    <div className="text-xs font-black text-white flex items-center gap-1">
                      {active && <span>✓</span>}
                      <span className="truncate">{t.name}</span>
                    </div>
                    <div className="text-[10px] text-white/60 leading-tight line-clamp-2">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* МАСШТАБ ТЕКСТА И UI */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2 mt-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-white/90">Размер текста и масштаб UI:</label>
              <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                {settings.fontSize === 'font-sm' && 'Мелкий (85%)'}
                {settings.fontSize === 'font-md' && 'Стандартный (100%)'}
                {settings.fontSize === 'font-lg' && 'Крупный (115%)'}
                {settings.fontSize === 'font-xl' && 'Очень крупный (130%)'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'font-sm', label: 'Аа Мелкий' },
                { id: 'font-md', label: 'Аа Обычный' },
                { id: 'font-lg', label: 'Аа Крупный' },
                { id: 'font-xl', label: 'Аа Макс' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`py-2 px-1 text-xs font-black rounded-xl border transition-all text-center ${
                    settings.fontSize === f.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-md'
                      : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => {
                    onUpdateSettings({ fontSize: f.id as FontSizeType });
                    playSound('click', settings.soundProfile);
                    doVibro(settings.vibro, 10);
                    onShowToast(`Масштаб изменен: ${f.label}`);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ТАЙМЕР И ПОМОДОРО */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
              <label className="text-xs font-bold text-white/80">Стиль таймера уроков:</label>
              <select
                value={settings.timerStyle}
                onChange={(e) => onUpdateSettings({ timerStyle: e.target.value as TimerStyleType })}
                className="text-xs w-full"
              >
                <option value="circle">Круговой индикатор (Classic Circle)</option>
                <option value="digital">Цифровое табло (Digital Minimal)</option>
              </select>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
              <label className="text-xs font-bold text-white/80">Помодоро (фокус / отдых мин):</label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={settings.pomodoroWorkMin || 25}
                  onChange={(e) => onUpdateSettings({ pomodoroWorkMin: Number(e.target.value) })}
                  className="text-xs"
                >
                  <option value={15}>15 мин</option>
                  <option value={20}>20 мин</option>
                  <option value={25}>25 мин (стандарт)</option>
                  <option value={30}>30 мин</option>
                  <option value={45}>45 мин (урок)</option>
                </select>
                <select
                  value={settings.pomodoroBreakMin || 5}
                  onChange={(e) => onUpdateSettings({ pomodoroBreakMin: Number(e.target.value) })}
                  className="text-xs"
                >
                  <option value={3}>3 мин</option>
                  <option value={5}>5 мин (перемена)</option>
                  <option value={10}>10 мин</option>
                  <option value={15}>15 мин (большая)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Minecraft-сплеши у логотипа</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Случайные весёлые фразы под логотипом школы
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.splash}
                onChange={(e) => onUpdateSettings({ splash: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Мотиватор дня под таймером</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Ежедневные ободряющие цитаты великих учёных и писателей
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.mot}
                onChange={(e) => onUpdateSettings({ mot: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* ========================================================
          2. ЗВУКОВОЙ ДВИЖОК, ЗВОНКИ И ИНТЕРАКТИВНАЯ ЗВУКОВАЯ ЛАБОРАТОРИЯ
      ======================================================== */}
      {isSectionVisible(
        'sound',
        'звук звонок аудио синтезатор колокольчик вибро отклик предупреждение'
      ) && (
        <div className="p-4 bg-white/6 rounded-3xl border border-white/12 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <b className="text-sm text-cyan-200 flex items-center gap-2 font-black">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>2. Звуковой Движок и Звуковая Лаборатория</span>
            </b>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-400/30 font-bold">
              WebAudio API
            </span>
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            Встроенный генератор звуковых волн синтезирует мелодии без сторонних файлов. Проверьте любой школьный звук прямо сейчас:
          </p>

          <div>
            <label className="text-xs font-bold text-white/80">Звуковой профиль синтезатора:</label>
            <select
              value={settings.soundProfile}
              onChange={(e) => {
                const prof = e.target.value as SoundProfileType;
                onUpdateSettings({ soundProfile: prof });
                playSound('coin', prof);
              }}
              className="text-xs w-full mt-1"
            >
              <option value="1">Классический щелчок (Classic Triangle Wave)</option>
              <option value="2">8-bit Синтезатор (Retro Gaming Square Wave)</option>
              <option value="3">Мягкий клик (Soft Sine Wave)</option>
              <option value="4">Футуристический Sci-Fi колокольчик (Sawtooth)</option>
              <option value="0">Без звука (Тихий режим для уроков)</option>
            </select>
          </div>

          {/* ИНТЕРАКТИВНЫЙ ТЕСТОВЫЙ СТЕНД ЗВУКОВ */}
          <div className="p-3 bg-black/30 rounded-2xl border border-white/10 space-y-2">
            <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              <span>Интерактивный тест звуков школы (Sound Test Bench):</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {[
                { type: 'bell', label: '🔔 Звонок на урок', desc: '12-импульсная трель' },
                { type: 'warn', label: '⏳ Скоро звонок', desc: 'Трёхтональный сигнал' },
                { type: 'pomodoro', label: '🍅 Сигнал Помодоро', desc: 'Аккорд C-E-G-C' },
                { type: 'victory', label: '🏆 Победа / Рекорд', desc: 'Фанфары победы' },
                { type: 'coin', label: '🪙 Монета / Успех', desc: 'Двойной щелчок' },
                { type: 'star', label: '⭐ Звезда опыта', desc: 'Восходящий тон' },
                { type: 'click', label: '🎚️ Клик меню', desc: 'Короткий импульс' },
                { type: 'levelup', label: '🚀 Новый уровень', desc: 'Арпеджио опыта' },
                { type: 'buzzer', label: '❌ Ошибка / Буззер', desc: 'Басовый сигнал' },
              ].map((s) => (
                <button
                  key={s.type}
                  type="button"
                  onClick={() => handleTestSound(s.type, s.label)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    playingTestSound === s.label
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black scale-[1.02] shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-white/90 border-white/10'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{s.label}</div>
                  <div className="text-[10px] text-white/60 truncate">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ВИБРООТКЛИК И ТЕСТ ХАПТИКИ */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <b className="text-xs text-white block">Виброотклик кнопок (Haptic Touch)</b>
                <span className="text-[11px] text-white/60">Тактильная отдача при нажатиях на смартфоне</span>
              </div>
              <input
                type="checkbox"
                checked={settings.vibro}
                onChange={(e) => onUpdateSettings({ vibro: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer shrink-0"
              />
            </div>

            {settings.vibro && (
              <div className="pt-1 border-t border-white/10 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-white/70">Проверить виброотклик:</span>
                <button
                  type="button"
                  onClick={() => handleTestVibro('light')}
                  className="px-2.5 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold border border-white/15"
                >
                  Лёгкий (15мс)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVibro('medium')}
                  className="px-2.5 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold border border-white/15"
                >
                  Средний (40мс)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVibro('heavy')}
                  className="px-2.5 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold border border-white/15"
                >
                  Двойной пульс
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Уведомления о звонках 📲</div>
                <div className="text-[11px] text-white/60 font-normal">
                  {isNativeApp()
                    ? 'Напоминание за 5 минут до каждого урока, даже когда приложение закрыто'
                    : 'Системное уведомление, когда приложение свёрнуто. При полностью закрытом — только в APK для Android'}
                </div>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 shrink-0"
                checked={Boolean(settings.bellNotifications)}
                onChange={async (e) => {
                  if (!e.target.checked) {
                    onUpdateSettings({ bellNotifications: false });
                    return;
                  }
                  const ok = await requestNotificationPermission();
                  if (!ok) {
                    onShowToast('Разреши уведомления в настройках браузера или телефона');
                    return;
                  }
                  onUpdateSettings({ bellNotifications: true });
                  onShowToast('Уведомления о звонках включены 🔔');
                }}
              />
            </label>
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Предупреждать за 2 минуты до звонка 🔔</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Звуковой сигнал перед началом урока, чтобы не опоздать в кабинет
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.warn2}
                onChange={(e) => onUpdateSettings({ warn2: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {/* ========================================================
          4. УЧЁБА, ЗВОНКИ И УЧЕБНЫЙ ПРОЦЕСС
      ======================================================== */}
      {isSectionVisible(
        'study',
        'учёба смена расписание класс подгруппа звонки сокращенные уроки кабинеты'
      ) && (
        <div className="p-4 bg-white/6 rounded-3xl border border-white/12 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <b className="text-sm text-cyan-200 flex items-center gap-2 font-black">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>4. Учёба, Звонки и Учебный процесс</span>
            </b>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-400/30 font-bold">
              МОУ АСОШ №2
            </span>
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            Расписание звонков синхронизировано со школьными стандартами села Аргаяш. Выберите смену и настройте отображение уроков:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
              <b className="text-xs text-white block">1-я Смена (Утренняя):</b>
              <p className="text-[11px] text-white/60">08:00 – 14:40 • 5, 7, 8, 9, 10, 11 классы</p>
              <span className="badge bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-bold">
                Штатное расписание
              </span>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
              <b className="text-xs text-white block">2-я Смена (Дневная):</b>
              <p className="text-[11px] text-white/60">13:45 – 19:15 • 6 классы</p>
              <span className="badge bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] font-bold">
                Вторая смена
              </span>
            </div>
          </div>

          {/* Быстрая смена класса */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
            <div>
              <b className="text-xs text-white block">Текущий класс и подгруппа</b>
              <span className="text-[11px] text-white/60">Смена класса мгновенно обновляет всё расписание уроков</span>
            </div>
            <button
              type="button"
              onClick={onChangeClass}
              className="btn darkBtn text-xs py-1.5 px-3 font-bold border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer shrink-0"
            >
              🎓 Сменить класс
            </button>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Режим сокращённых уроков (по 35 минут) ❄️</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Для праздничных дней, педагогических советов или холодных дней
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shortLessonsMode ?? false}
                onChange={(e) => onUpdateSettings({ shortLessonsMode: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Показывать номера кабинетов на карточках уроков</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Отображает номер кабинета и этаж прямо в списке уроков дня
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showRoomBadges ?? true}
                onChange={(e) => onUpdateSettings({ showRoomBadges: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Авто-переключение на расписание завтра после 15:00</div>
                <div className="text-[11px] text-white/60 font-normal">
                  После окончания основных уроков автоматически открывает завтрашний день
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSwitchTomorrow ?? true}
                onChange={(e) => onUpdateSettings({ autoSwitchTomorrow: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer shrink-0"
              />
            </label>
          </div>
        </div>
      )}

      {/* ========================================================
          5. КОНФИДЕНЦИАЛЬНОСТЬ, PIN-КОД И 152-ФЗ РФ
      ======================================================== */}
      {isSectionVisible(
        'privacy',
        'приватность безопасность пин пароль 152 фз анти палево шпион скрыть оценки'
      ) && (
        <div className="p-4 bg-gradient-to-br from-slate-900/90 via-indigo-950/40 to-slate-900/90 rounded-3xl border border-indigo-400/35 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <b className="text-sm text-indigo-200 flex items-center gap-2 font-black">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>5. Конфиденциальность и Безопасность (152-ФЗ РФ)</span>
            </b>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              LOCAL-FIRST
            </span>
          </div>

          <p className="text-xs text-white/80 leading-relaxed">
            Все ваши оценки, ФИО и заметки хранятся локально на вашем устройстве. Защитите экран от посторонних глаз и одноклассников:
          </p>

          {/* PIN-код приложения */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-white flex items-center gap-1.5 font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Защита PIN-кодом (4 цифры)</span>
              </div>
              <div className="text-[11px] text-white/60">
                {isPinEnabled() ? '🟢 4-значный пароль активен' : '⚪ Вход свободный (без пароля)'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('click', settings.soundProfile);
                doVibro(settings.vibro, 20);
                if (onOpenPinSetup) onOpenPinSetup();
              }}
              className={`text-xs py-1.5 px-3 font-bold rounded-xl cursor-pointer transition-all ${
                isPinEnabled()
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
              }`}
            >
              {isPinEnabled() ? 'Изменить PIN' : 'Установить PIN'}
            </button>
          </div>

          {/* Режим Анти-Шпион */}
          <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="pr-2">
              <div className="flex items-center gap-1.5 text-cyan-200">
                <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                <span>Режим «Анти-Шпион»</span>
              </div>
              <div className="text-[11px] text-white/60 font-normal">
                Размывает ФИО, оценки и сообщения в чате от подглядывания
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPrivacyBlurActive()}
              onChange={(e) => {
                setPrivacyBlurActive(e.target.checked);
                onUpdateSettings({ privacyBlur: e.target.checked });
                if (onTogglePrivacyBlur) onTogglePrivacyBlur(e.target.checked);
                onShowToast(e.target.checked ? 'Режим «Анти-Шпион» включён' : 'Режим «Анти-Шпион» выключен');
              }}
              className="w-5 h-5 accent-cyan-400 cursor-pointer shrink-0"
            />
          </label>

          {/* Скрывать при сворачивании */}
          <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="pr-2">
              <div className="text-white">Скрывать экран при сворачивании</div>
              <div className="text-[11px] text-white/60 font-normal">
                Защита от подглядывания в меню переключения приложений телефона
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAutoBlurOnWindowBlur()}
              onChange={(e) => {
                setAutoBlurOnWindowBlur(e.target.checked);
                onUpdateSettings({ privacyBlurOnWindowBlur: e.target.checked });
              }}
              className="w-5 h-5 accent-cyan-400 cursor-pointer shrink-0"
            />
          </label>

          {/* Скрывать оценки в общем профиле */}
          <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="pr-2">
              <div className="text-white">Скрывать оценки в общем профиле</div>
              <div className="text-[11px] text-white/60 font-normal">
                Показывает «[Скрыто]» вместо среднего балла для чужих глаз
              </div>
            </div>
            <input
              type="checkbox"
              checked={isHideGradesInProfile()}
              onChange={(e) => {
                setHideGradesInProfile(e.target.checked);
                onUpdateSettings({ hideGradesInProfile: e.target.checked });
              }}
              className="w-5 h-5 accent-cyan-400 cursor-pointer shrink-0"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Очистить личные заметки, историю переписки и восстановить приватность по умолчанию?')) {
                  wipeConfidentialData();
                  onShowToast('Конфиденциальные данные успешно очищены');
                }
              }}
              className="py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-400/30 rounded-xl text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Очистить личные заметки</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          6. ЭКРАН, УСТРОЙСТВО И СБОРКА ANDROID APK
      ======================================================== */}
      {isSectionVisible(
        'device',
        'экран устройство мобильный пк планшет dynamic island fullscreen cordova apk язык language качество графики оптимизация экономия батарея максимум'
      ) && (
        <div className="p-4 bg-white/6 rounded-3xl border border-white/12 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <b className="text-sm text-cyan-200 flex items-center gap-2 font-black">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>6. Экран, Устройство и Сборка APK (Cordova)</span>
            </b>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-400/30 font-bold">
              Multi-Device
            </span>
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            Настройки отображения для смартфонов, планшетов и ПК, а также встроенная поддержка компиляции нативного Android APK:
          </p>

          <div>
            <label className="text-xs font-bold text-white/80">Язык интерфейса:</label>
            <select
              value={lang}
              onChange={(e) => onLangChange(e.target.value as LanguageType)}
              className="text-xs w-full mt-1"
            >
              <option value="ru">Русский</option>
              <option value="ba">Башҡорт теле</option>
              <option value="tj">Тоҷикӣ</option>
              <option value="kk">Қазақша</option>
              <option value="uz">O'zbekcha</option>
              <option value="ky">Кыргызча</option>
              <option value="be">Беларуская</option>
              <option value="hy">Հայերեն</option>
              <option value="az">Azərbaycan dili</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left cursor-pointer transition-all"
            >
              <div>
                <b className="text-xs text-white block">Полноэкранный режим (Full Screen)</b>
                <span className="text-[11px] text-white/60">Убирает рамки и адресную строку браузера</span>
              </div>
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-cyan-400" />
              ) : (
                <Maximize className="w-4 h-4 text-white/70" />
              )}
            </button>

          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>📱 iOS Dynamic Island (Виджет урока вверху)</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Интерактивная плавающая «капсула» с текущим уроком и минутами до звонка
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.dynamicIsland ?? true}
                onChange={(e) => onUpdateSettings({ dynamicIsland: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Широкий экран (режим ПК и планшета)</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Отображение расписания и виджетов в 2-3 колонки на больших экранах
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.devicePC}
                onChange={(e) => onUpdateSettings({ devicePC: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </label>

            {/* Качество графики */}
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-xs font-bold text-white">🎨 Качество графики</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['eco', '🔋', 'Экономия'],
                    ['normal', '⚖️', 'Обычное'],
                    ['ultra', '✨', 'Максимум'],
                  ] as const
                ).map(([id, icon, label]) => {
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={quality === id}
                      className={`choice !py-2 !px-1 flex flex-col items-center leading-tight ${quality === id ? 'active' : ''}`}
                      onClick={() => {
                        onUpdateSettings({ quality: id, perfLow: id === 'eco' });
                        playSound('settings', settings.soundProfile);
                        doVibro(settings.vibro, 15);
                      }}
                    >
                      <span className="text-base">{icon}</span>
                      <span className="text-xs font-black">{label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-white/60">
                {quality === 'eco' &&
                  'Без размытия, теней и фоновых анимаций — быстрее на слабых телефонах и бережёт батарею.'}
                {quality === 'normal' &&
                  'Баланс красоты и скорости — подходит для большинства телефонов.'}
                {quality === 'ultra' &&
                  'Толстое стекло, мягкое свечение и плавные переходы. Лучше для мощных телефонов и ПК.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          7. ПАМЯТЬ, ХРАНИЛИЩЕ И БЭКАП ДАННЫХ
      ======================================================== */}
      {isSectionVisible(
        'storage',
        'память хранилище бэкап экспорт импорт кэш сброс json localstorage'
      ) && (
        <div className="p-4 bg-white/6 rounded-3xl border border-white/12 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <b className="text-sm text-cyan-200 flex items-center gap-2 font-black">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>7. Память, Хранилище и Резервное копирование</span>
            </b>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-400/30 font-bold">
              LocalStorage
            </span>
          </div>

          {/* ИНСПЕКТОР ПАМЯТИ LOCALSTORAGE */}
          <div className="p-3 bg-black/30 rounded-2xl border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-white/5 rounded-xl border border-white/8">
              <span className="text-[10px] text-white/60 block">Занято памяти:</span>
              <b className="text-sm font-mono text-cyan-300">{storageStats.kb} КБ</b>
            </div>
            <div className="p-2 bg-white/5 rounded-xl border border-white/8">
              <span className="text-[10px] text-white/60 block">Записей ключей:</span>
              <b className="text-sm font-mono text-emerald-300">{storageStats.keysCount}</b>
            </div>
            <div className="p-2 bg-white/5 rounded-xl border border-white/8">
              <span className="text-[10px] text-white/60 block">Домашних заданий:</span>
              <b className="text-sm font-mono text-amber-300">{storageStats.hwCount}</b>
            </div>
            <div className="p-2 bg-white/5 rounded-xl border border-white/8">
              <span className="text-[10px] text-white/60 block">Предметов с оценками:</span>
              <b className="text-sm font-mono text-purple-300">{storageStats.gradesCount}</b>
            </div>
          </div>

          {/* Перенос на новый телефон по QR-коду */}
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 space-y-2">
            <div className="text-xs font-black text-white">📲 Перенести на новый телефон</div>
            <p className="text-[11px] text-white/70">
              Покажи QR-код новому телефону и наведи на него камеру. Данные шифруются, код действует 30 минут и срабатывает один раз.
            </p>
            {transferQr ? (
              <div className="flex flex-col items-center gap-2">
                <img src={transferQr} alt="QR-код для переноса" className="w-56 h-56 rounded-xl bg-white p-2" />
                <button type="button" className="text-[11px] text-cyan-300 underline cursor-pointer" onClick={() => setTransferQr('')}>
                  Скрыть код
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={transferBusy}
                className="btn cyan w-full text-xs justify-center py-2.5 font-bold cursor-pointer disabled:opacity-60"
                onClick={async () => {
                  setTransferBusy(true);
                  const res = await createTransfer();
                  setTransferBusy(false);
                  if ('error' in res) {
                    onShowToast(res.error);
                    return;
                  }
                  setTransferQr(await QRCode.toDataURL(res.link, { margin: 1, width: 448, errorCorrectionLevel: 'M' }));
                }}
              >
                {transferBusy ? 'Готовлю…' : 'Показать QR-код'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              className="btn purple text-xs justify-center py-2.5 font-bold flex items-center gap-1.5 cursor-pointer"
              onClick={onExportData}
            >
              <Download className="w-4 h-4" />
              <span>Экспорт бэкапа JSON</span>
            </button>

            <button
              type="button"
              className="btn darkBtn text-xs justify-center py-2.5 font-bold flex items-center gap-1.5 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 text-cyan-300" />
              <span>Импорт бэкапа JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              type="button"
              className="btn text-xs justify-center py-2.5 font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 cursor-pointer"
              onClick={handleClearCacheOnly}
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-300" />
              <span>Очистить только кэш</span>
            </button>
          </div>

          {/* ПОЛНЫЙ СБРОС ДАННЫХ */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              className="btn orange w-full text-xs justify-center py-2.5 font-bold flex items-center gap-1.5 cursor-pointer"
              onClick={onResetAll}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Сбросить все данные приложения (Полный сброс)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          8. СТАТУС СЕРВЕРОВ АСОШ №2, ПИНГ И DEV-ПАШЕЛЬ
      ======================================================== */}
      {isSectionVisible(
        'server',
        'разработчик dev презентация слайды'
      ) && (
        <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 rounded-3xl border border-emerald-400/40 space-y-3.5 shadow-md">
          <b className="text-sm text-white flex items-center gap-2 font-black">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span>Для разработчиков</span>
          </b>

          {/* ПРЕЗЕНТАЦИЯ ШКОЛЫ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              className="btn cyan text-xs justify-center py-2.5 font-black flex items-center gap-1.5 cursor-pointer"
              onClick={() => {
                downloadPresentationHtml();
                onShowToast('🎉 Презентация АСОШ №2 скачана (.HTML)!');
              }}
            >
              <Download className="w-4 h-4" />
              <span>Скачать презентацию (.HTML)</span>
            </button>

            <button
              type="button"
              className="btn text-xs justify-center py-2.5 font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 cursor-pointer"
              onClick={() => {
                downloadPresentationMarkdown();
                onShowToast('📄 Текст презентации и посты скачаны (.MD)!');
              }}
            >
              <FileText className="w-4 h-4 text-cyan-300" />
              <span>Скачать тексты (.MD)</span>
            </button>
          </div>

          {/* ВХОД В ПАНЕЛЬ РАЗРАБОТЧИКА */}
          {onOpenDev && (
            <button
              type="button"
              className="btn darkBtn w-full text-xs justify-center py-2.5 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center justify-between px-3.5 cursor-pointer mt-1 rounded-2xl"
              onClick={onOpenDev}
            >
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span className="font-bold">Панель разработчика (Dev Suite)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-400/30 rounded-md font-bold flex items-center gap-1">
                🔒 Строго по паролю
              </span>
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn darkBtn w-full text-xs justify-center py-2.5 rounded-2xl cursor-pointer"
        onClick={() => onNavigate('about')}
      >
        ℹ️ О приложении
      </button>

      {/* Modal for MConvertor parameters */}
      <ApkSupportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
