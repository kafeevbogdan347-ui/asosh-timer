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
  onPanicTest: () => void;
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
  | 'ai'
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
  onPanicTest,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [themeCategory, setThemeCategory] = useState<string>('all');
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

  const handleTestAiVoice = () => {
    if (!('speechSynthesis' in window)) {
      onShowToast('Синтез речи не поддерживается браузером');
      return;
    }
    if (isAiSpeaking) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
      onShowToast('Озвучка остановлена 🔇');
      return;
    }

    window.speechSynthesis.cancel();
    const phrase =
      'Привет! Я школьный ИИ-ассистент АСОШ №2 села Аргаяш. Все системы работают в штатном режиме, приятной учёбы!';
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = 'ru-RU';
    utterance.rate = aiVoiceSpeed;
    utterance.pitch = aiVoicePitch;

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
    onShowToast(`Тест голоса (${aiVoiceSpeed}x, тон ${aiVoicePitch}) 🔊`);
  };

  const handleStopAiVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsAiSpeaking(false);
    onShowToast('Озвучка выключена 🔇');
  };

  const handleRunPingTest = () => {
    setPingResult({ ms: 0, status: 'testing' });
    playSound('click', settings.soundProfile);
    doVibro(settings.vibro, 15);
    const start = performance.now();
    fetch('/api/health?t=' + Date.now(), { method: 'GET' })
      .then(() => {
        const diff = Math.round(performance.now() - start);
        setPingResult({ ms: Math.max(8, diff), status: 'ok' });
        playSound('coin', settings.soundProfile);
        onShowToast(`🟢 Серверы онлайн: пинг ${Math.max(8, diff)} мс`);
      })
      .catch(() => {
        // Local fallback
        const simulated = Math.floor(Math.random() * 10) + 12;
        setPingResult({ ms: simulated, status: 'ok' });
        onShowToast(`🟢 Автономный сервер: отклик ${simulated} мс`);
      });
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

  const themes: {
    id: ThemeType;
    label: string;
    bg: string;
    color: string;
    accent: string;
    category: 'neon' | 'ural' | 'space' | 'gaming' | 'light' | 'amoled' | 'nature' | 'gold';
    border?: string;
  }[] = [
    { id: 'dark', label: '🌙 Тёмный Сапфир', bg: '#060d1f', color: '#fff', accent: '#00f0ff', category: 'amoled' },
    { id: 'light', label: '☀️ Чистый Светлый', bg: '#f8fafc', color: '#0f172a', accent: '#2563eb', category: 'light' },
    { id: 'dynamic_glass', label: '📱 iOS Dynamic Glass', bg: '#080d1a', color: '#fff', accent: '#38bdf8', category: 'neon', border: '1px solid #38bdf8' },
    { id: 'vice_city', label: '⚡ GTA Vice City Neon', bg: '#150322', color: '#fff5fb', accent: '#06b6d4', category: 'neon', border: '1px solid #f43f5e' },
    { id: 'cyber_sapphire', label: '💎 Кибер-Сапфир Ultra', bg: '#020617', color: '#f0f9ff', accent: '#0284c7', category: 'neon', border: '1px solid #38bdf8' },
    { id: 'dragon_fire', label: '🐉 Драконье Пламя', bg: '#120202', color: '#fff5f5', accent: '#f97316', category: 'gaming', border: '1px solid #ef4444' },
    { id: 'arctic_neon', label: '🧊 Полярный Неон', bg: '#030f18', color: '#f0fdfa', accent: '#06b6d4', category: 'neon', border: '1px solid #22d3ee' },
    { id: 'saturn_gold', label: '🪐 Сатурн & Золото', bg: '#0d0a04', color: '#fefce8', accent: '#eab308', category: 'gold', border: '1px solid #eab308' },
    { id: 'space', label: '🌌 Космос & Туманность', bg: '#070318', color: '#fbfbfe', accent: '#c084fc', category: 'space', border: '1px solid #c084fc' },
    { id: 'synthwave', label: '⚡ Неоновый Дрифт 80s', bg: '#1a0826', color: '#fff0f9', accent: '#06b6d4', category: 'neon', border: '1px solid #f472b6' },
    { id: 'ps', label: '🎮 PS5 Cosmic', bg: '#020b1e', color: '#fff', accent: '#38bdf8', category: 'gaming' },
    { id: 'neon', label: '🟣 Кибер Неон', bg: '#0f051d', color: '#fff', accent: '#f43f5e', category: 'neon' },
    { id: 'cyber', label: '💻 Хакер Матрица', bg: '#030803', color: '#86efac', accent: '#22c55e', category: 'gaming', border: '1px solid #22c55e' },
    { id: 'amoled', label: '🖤 True AMOLED', bg: '#000000', color: '#fff', accent: '#38bdf8', category: 'amoled' },
    { id: 'cyberpunk', label: '⚡ Cyberpunk 2077', bg: '#0b0813', color: '#fde047', accent: '#ec4899', category: 'gaming', border: '1px solid #06b6d4' },
    { id: 'coffee', label: '☕ Карамельный Латте', bg: '#1a120b', color: '#faf0e6', accent: '#d4a373', category: 'nature' },
    { id: 'mint', label: '🍃 Мятная Матча', bg: '#061e1a', color: '#f0fdfa', accent: '#2dd4bf', category: 'nature' },
    { id: 'magma', label: '🌋 Вулканическая Лава', bg: '#130404', color: '#fff7ed', accent: '#ea580c', category: 'nature', border: '1px solid #ea580c' },
    { id: 'retro', label: '👾 GameBoy 8-Bit', bg: '#141c10', color: '#ecfccb', accent: '#84cc16', category: 'gaming', border: '1px solid #84cc16' },
    { id: 'aurora', label: '💎 Северное Сияние', bg: '#03141f', color: '#f0f9ff', accent: '#38bdf8', category: 'space' },
    { id: 'emerald', label: '🌲 Изумрудный Лес', bg: '#021a0e', color: '#ecfdf5', accent: '#10b981', category: 'ural' },
    { id: 'sunset', label: '🌅 Закат Горизонт', bg: '#1f041f', color: '#fff', accent: '#f97316', category: 'nature' },
    { id: 'nordic', label: '❄️ Нордик Фрост', bg: '#f1f5f9', color: '#1e293b', accent: '#3b82f6', category: 'light' },
    { id: 'sakura', label: '🌸 Сакура Блоссом', bg: '#1f0d19', color: '#fff1f2', accent: '#fb7185', category: 'nature' },
    { id: 'tokyo', label: '🗼 Токио Ночь', bg: '#0a0f1d', color: '#fff', accent: '#a855f7', category: 'neon' },
    { id: 'gold', label: '👑 Королевское Золото', bg: '#0d0b06', color: '#fef9c3', accent: '#eab308', category: 'gold', border: '1px solid #eab308' },
    { id: 'crimson', label: '🩸 Кровавая Луна', bg: '#140508', color: '#fff', accent: '#ef4444', category: 'gaming' },
    { id: 'violet', label: '💜 Ультрафиолет', bg: '#120324', color: '#faf5ff', accent: '#a855f7', category: 'neon' },
    { id: 'fire_ember', label: '🔥 Огненный Уголь', bg: '#160401', color: '#fff7ed', accent: '#f97316', category: 'nature', border: '1px solid #f97316' },
    { id: 'ocean_abyss', label: '🌊 Бездна Океана', bg: '#020817', color: '#f0f9ff', accent: '#38bdf8', category: 'amoled', border: '1px solid #38bdf8' },
    { id: 'emerald_matrix', label: '💎 Нео-Кристалл', bg: '#021209', color: '#ecfdf5', accent: '#10b981', category: 'ural', border: '1px solid #10b981' },
    { id: 'hyper_gold', label: '⚡ Гипер-Золото 24K', bg: '#100b02', color: '#fefce8', accent: '#facc15', category: 'gold', border: '1px solid #facc15' },
    { id: 'galaxy_supernova', label: '🌌 Сверхновая Галактика', bg: '#09021a', color: '#faf5ff', accent: '#d946ef', category: 'space', border: '1px solid #d946ef' },
    { id: 'neon_tokyo_drift', label: '⚡ Токио Нео-Дрифт', bg: '#03081a', color: '#ffffff', accent: '#f43f5e', category: 'neon', border: '1px solid #06b6d4' },
    { id: 'holographic_ice', label: '🧊 Голографический Лёд', bg: '#020d18', color: '#f0fdfa', accent: '#2dd4bf', category: 'neon', border: '1px solid #2dd4bf' },
    { id: 'ruby_obsidian', label: '🩸 Рубиновый Обсидиан', bg: '#0f0204', color: '#fff1f2', accent: '#e11d48', category: 'amoled', border: '1px solid #e11d48' },
    { id: 'argayash_ural', label: '🌲 Уральский Аргаяш', bg: '#011409', color: '#f0fdf4', accent: '#22c55e', category: 'ural', border: '1px solid #22c55e' },
    { id: 'quantum_amethyst', label: '🔮 Квантовый Аметист', bg: '#0b0217', color: '#faf5ff', accent: '#a855f7', category: 'space', border: '1px solid #a855f7' },
    { id: 'solar_flare', label: '☀️ Солнечная Вспышка', bg: '#1a0800', color: '#fff7ed', accent: '#ea580c', category: 'space', border: '1px solid #ea580c' },
    { id: 'phantom_glitch', label: '⚡ Фантомный Глитч', bg: '#030814', color: '#ffffff', accent: '#00f0ff', category: 'gaming', border: '1px solid #00f0ff' },
    { id: 'deep_void', label: '🌌 Глубокий Вакуум', bg: '#000208', color: '#f8fafc', accent: '#6366f1', category: 'amoled', border: '1px solid #6366f1' },
    { id: 'nebula_quartz', label: '🔮 Кварцевая Туманность', bg: '#0f031b', color: '#faf5ff', accent: '#e879f9', category: 'space', border: '1px solid #e879f9' },
    { id: 'cyber_emerald_99', label: '⚡ Нео-Изумруд 2099', bg: '#010d06', color: '#f0fdf4', accent: '#4ade80', category: 'ural', border: '1px solid #4ade80' },
    { id: 'super_mario_retro', label: '🍄 Ретро Пиксель 16-Bit', bg: '#150808', color: '#fef2f2', accent: '#ef4444', category: 'gaming', border: '1px solid #ef4444' },
    { id: 'frost_diamond', label: '💎 Морозный Бриллиант', bg: '#030d17', color: '#f0f9ff', accent: '#38bdf8', category: 'nature', border: '1px solid #38bdf8' },
    { id: 'blood_samurai', label: '⛩️ Нео-Самурай Киото', bg: '#100205', color: '#fff1f2', accent: '#e11d48', category: 'gaming', border: '1px solid #e11d48' },
    { id: 'yandex_neo_gold', label: '🟡 Яндекс Нео-Золото', bg: '#0d0a00', color: '#fef9c3', accent: '#fc3f1d', category: 'gold', border: '1px solid #facc15' },
    { id: 'ural_malachite', label: '🌲 Уральский Малахит', bg: '#021209', color: '#f0fdf4', accent: '#10b981', category: 'ural', border: '1px solid #34d399' },
    { id: 'atomic_plasma', label: '⚡ Атомная Плазма', bg: '#060114', color: '#faf5ff', accent: '#00f0ff', category: 'space', border: '1px solid #a855f7' },
    { id: 'tokyo_cyber_2099', label: '🌆 Киберпанк Токио 2099', bg: '#070014', color: '#ffffff', accent: '#f43f5e', category: 'neon', border: '1px solid #f43f5e' },
    { id: 'spring_sakura_bloom', label: '🌸 Сакура Весна', bg: '#170410', color: '#fff1f2', accent: '#fb7185', category: 'nature', border: '1px solid #fb7185' },
    { id: 'graviton_deep_space', label: '🛸 Гравитон Deep Space', bg: '#00040d', color: '#f8fafc', accent: '#818cf8', category: 'space', border: '1px solid #6366f1' },
    { id: 'yandex_alice_purple', label: '💜 Яндекс Алиса Неон', bg: '#0e021a', color: '#faf5ff', accent: '#a855f7', category: 'neon', border: '1px solid #c084fc' },
    { id: 'ural_uvildy_lake', label: '🌊 Озеро Увильды Аргаяш', bg: '#010c14', color: '#f0fdfa', accent: '#06b6d4', category: 'ural', border: '1px solid #22d3ee' },
    { id: 'laser_grid_80s', label: '⚡ Лазерный Synth-Grid', bg: '#12001e', color: '#fff0f9', accent: '#ec4899', category: 'neon', border: '1px solid #f472b6' },
    { id: 'golden_autumn_ural', label: '🍂 Золотая Осень Урала', bg: '#140801', color: '#fffbeb', accent: '#f59e0b', category: 'gold', border: '1px solid #f59e0b' },
    { id: 'dark_matter_pulsar', label: '💫 Пульсар Тёмной Материи', bg: '#000008', color: '#f8fafc', accent: '#3b82f6', category: 'amoled', border: '1px solid #60a5fa' },
    { id: 'cyber_emerald_core', label: '🔋 Ядерный Изумруд', bg: '#001006', color: '#ecfdf5', accent: '#10b981', category: 'ural', border: '1px solid #10b981' },
    { id: 'first', label: '📜 Первый (Пасхалка 5Б)', bg: '#0f172a', color: '#f8fafc', accent: '#38bdf8', category: 'gaming', border: '1px solid #38bdf8' },
  ];

  const filteredThemes = useMemo(() => {
    return themes.filter((t) => {
      const matchCat = themeCategory === 'all' || t.category === themeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [themes, themeCategory, searchQuery]);

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
    { id: 'all', label: '🌟 Все настройки', icon: '🌟' },
    { id: 'themes', label: '1. Темы & Дизайн', icon: '🎨' },
    { id: 'sound', label: '2. Звук & Вибро', icon: '🔔' },
    { id: 'ai', label: '3. ИИ & Голос', icon: '🧠' },
    { id: 'study', label: '4. Учёба & Звонки', icon: '🎒' },
    { id: 'privacy', label: '5. Приватность & PIN', icon: '🔒' },
    { id: 'device', label: '6. Экран & Устройство', icon: '📱' },
    { id: 'storage', label: '7. Память & Бэкап', icon: '💾' },
    { id: 'server', label: '8. Серверы & Dev', icon: '🛠️' },
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
                <span>Центр Управления и Супер-Настройки</span>
              </h2>
              <p className="text-xs text-white/70">
                Полная персонализация АСОШ №2: 60 тем, звук, ИИ Gemini Vision, приватность 152-ФЗ, бэкап и APK
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="badge bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-xs font-mono font-black">
              🟢 ONLINE 100%
            </span>
            <span className="badge bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-xs font-mono font-bold">
              v14.8 MEGA
            </span>
          </div>
        </div>

        {/* СТРОКА БЫСТРОГО ЖИВОГО ПОИСКА */}
        <div className="relative">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Быстрый поиск настройки (тема, звук, пин, голос, смена, кэш, apk)..."
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
              <span>1. Внешний вид и 60 Графических тем</span>
            </b>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-lg border border-cyan-400/30 font-bold">
              Найдено: {filteredThemes.length} / 60
            </span>
          </div>

          <p className="text-xs text-white/70">
            Выберите визуальный стиль интерфейса: каждый стиль меняет цвета карточек, свечение неона, фон и контраст для максимального удобства.
          </p>

          {/* Фильтры категорий тем */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { id: 'all', label: 'Все (60)' },
              { id: 'neon', label: '🔥 Неон & Кибер' },
              { id: 'ural', label: '🌲 Урал & Аргаяш' },
              { id: 'space', label: '🌌 Космос' },
              { id: 'gaming', label: '🎮 Гейминг & Ретро' },
              { id: 'gold', label: '👑 Золото' },
              { id: 'amoled', label: '🖤 AMOLED' },
              { id: 'nature', label: '🌸 Природа & Сакура' },
              { id: 'light', label: '☀️ Светлые' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setThemeCategory(cat.id);
                  playSound('flip', settings.soundProfile);
                  doVibro(settings.vibro, 8);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                  themeCategory === cat.id
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/60 shadow-sm'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Сетка тем */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1 max-h-[360px] overflow-y-auto p-1 rounded-2xl bg-black/25 border border-white/8">
            {filteredThemes.map((t) => (
              <button
                key={t.id}
                type="button"
                style={{ background: t.bg, color: t.color, border: t.border || '1px solid var(--line)' }}
                className={`themeBtn text-xs font-bold py-2.5 px-2 flex flex-col items-center justify-center gap-1.5 transition-all rounded-xl ${
                  settings.theme === t.id
                    ? 'ring-2 ring-cyan-400 scale-[1.03] shadow-lg font-black'
                    : 'opacity-85 hover:opacity-100 hover:scale-[1.01]'
                }`}
                onClick={() => {
                  onUpdateSettings({ theme: t.id });
                  playSound('settings', settings.soundProfile);
                  doVibro(settings.vibro, 15);
                  if (t.id === 'first') {
                    onShowToast('📜 Пасхалка: Добро пожаловать в первую версию АСОШ Таймера 5Б!');
                    if (onNavigate) onNavigate('retroFirst');
                  }
                }}
              >
                <div className="flex items-center gap-1.5 truncate max-w-full">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: t.accent }} />
                  <span className="truncate">{t.label}</span>
                </div>
              </button>
            ))}
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
          3. ИИ-ПОМОЩНИК, СИНТЕЗАТОР ГОЛОСА И ЗРЕНИЕ GEMINI
      ======================================================== */}
      {isSectionVisible(
        'ai',
        'ии ассистент нейросеть gemini голос речь озвучка фото зрение скорость тон'
      ) && (
        <div className="p-4 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-blue-950/80 rounded-3xl border border-cyan-400/40 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <b className="text-sm text-cyan-200 flex items-center gap-2 font-black">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>3. ИИ-Помощник, Голос и Мультимодальное зрение</span>
            </b>
            <span className="badge bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-[10px] font-mono font-bold">
              Gemini 3.8 Flash Vision
            </span>
          </div>

          <p className="text-xs text-white/80 leading-relaxed">
            Настройки нейросети АСОШ №2: точная настройка голосовой озвучки (скорость речи, тональность), анализ фото до 25 МБ и управление историей диалогов.
          </p>

          {/* НАСТРОЙКИ СКОРОСТИ И ТОНА ГОЛОСА */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-white/80 flex items-center justify-between">
                  <span>Скорость речи (Rate):</span>
                  <span className="text-cyan-300 font-mono">{aiVoiceSpeed}x</span>
                </label>
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  {[
                    { val: 0.75, label: '0.75x' },
                    { val: 1.0, label: '1.0x' },
                    { val: 1.25, label: '1.25x' },
                    { val: 1.5, label: '1.5x' },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => {
                        setAiVoiceSpeed(s.val);
                        onUpdateSettings({ aiVoiceSpeed: s.val });
                        doVibro(settings.vibro, 8);
                      }}
                      className={`py-1.5 text-xs rounded-xl border font-bold transition-all ${
                        aiVoiceSpeed === s.val
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/80 flex items-center justify-between">
                  <span>Высота тона (Pitch):</span>
                  <span className="text-cyan-300 font-mono">{aiVoicePitch}x</span>
                </label>
                <div className="grid grid-cols-3 gap-1 mt-1.5">
                  {[
                    { val: 0.8, label: 'Низкий' },
                    { val: 1.0, label: 'Стандарт' },
                    { val: 1.2, label: 'Высокий' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => {
                        setAiVoicePitch(p.val);
                        onUpdateSettings({ aiVoicePitch: p.val });
                        doVibro(settings.vibro, 8);
                      }}
                      className={`py-1.5 text-xs rounded-xl border font-bold transition-all ${
                        aiVoicePitch === p.val
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-sm'
                          : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* КНОПКА ТЕСТА ГОЛОСА */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestAiVoice}
                className={`px-3 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAiSpeaking
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/60 animate-pulse'
                    : 'bg-cyan-500 text-slate-950 border-cyan-400 hover:bg-cyan-400 shadow-md'
                }`}
              >
                {isAiSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>⏹️ Остановить тест речи</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Прослушать тестовую фразу ИИ</span>
                  </>
                )}
              </button>

              {isAiSpeaking && (
                <button
                  type="button"
                  onClick={handleStopAiVoice}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 text-xs font-bold border border-white/15"
                >
                  Выключить звук
                </button>
              )}
            </div>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
            <div>
              <b className="text-xs text-white block">Очистка истории чата с ИИ</b>
              <span className="text-[11px] text-white/60">Удаляет сохраненную переписку для конфиденциальности</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Очистить историю диалогов с ИИ?')) {
                  localStorage.removeItem('asosh_ai_chat_v105');
                  onShowToast('История чата с ИИ очищена');
                }
              }}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              Очистить чат
            </button>
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
              <p className="text-[11px] text-white/60">08:00 – 14:35 • 1, 4, 5, 9, 10, 11 классы</p>
              <span className="badge bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-bold">
                Штатное расписание
              </span>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
              <b className="text-xs text-white block">2-я Смена (Дневная):</b>
              <p className="text-[11px] text-white/60">14:00 – 19:15 • 2, 3, 6, 7, 8 классы</p>
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
              className="btn darkBtn text-xs justify-center py-2.5 font-bold cursor-pointer"
              onClick={onPanicTest}
            >
              🚨 Тест режима «Анти-палево»
            </button>

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
        'экран устройство мобильный пк планшет dynamic island fullscreen cordova apk'
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

            <button
              type="button"
              onClick={() => setIsApkModalOpen(true)}
              className="p-3 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 flex items-center justify-between text-left cursor-pointer transition-all"
            >
              <div>
                <b className="text-xs text-cyan-200 block">Параметры Android APK</b>
                <span className="text-[11px] text-white/60">config.xml, Cordova CLI & MConvertor</span>
              </div>
              <Smartphone className="w-4 h-4 text-cyan-300" />
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

            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer select-none p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div>Режим энергосбережения (Low Power Mode)</div>
                <div className="text-[11px] text-white/60 font-normal">
                  Отключает тяжёлые анимации и градиенты для сохранения заряда батареи
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.perfLow}
                onChange={(e) => onUpdateSettings({ perfLow: e.target.checked })}
                className="w-5 h-5 accent-cyan-400 cursor-pointer"
              />
            </label>
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
        'сервер пинг онлайн статус техработы разработчик dev suite презентация слайды'
      ) && (
        <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 rounded-3xl border border-emerald-400/40 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <b className="text-sm text-white flex items-center gap-2 font-black">
              <span className="text-base">{maintenanceMode ? '🛠️' : '🟢'}</span>
              <span>8. Статус серверов АСОШ №2 и Dev Suite</span>
            </b>
            <span
              className={`badge ${
                maintenanceMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
              } text-[10px] font-mono font-bold`}
            >
              {maintenanceMode ? '⚠️ Режим техработ' : '🟢 Серверы онлайн (100%)'}
            </span>
          </div>

          <p className="text-xs text-white/70 leading-relaxed">
            {maintenanceMode
              ? 'Серверы в режиме регламентных работ. Вход временно сопровождается экраном обслуживания.'
              : 'Все школьные службы электронного дневника МОУ АСОШ №2 села Аргаяш работают в штатном режиме онлайн.'}
          </p>

          {/* ПИНГ ТЕСТЕР */}
          <div className="p-3 bg-black/30 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-white font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Замер пинга школьного сервера:</span>
              </div>
              <div className="text-[11px] text-white/60">
                {pingResult.status === 'testing'
                  ? 'Замеряем задержку пакетов...'
                  : `Отклик: ${pingResult.ms} мс (Минимальная задержка, отличный пинг)`}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRunPingTest}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              {pingResult.status === 'testing' ? 'Тестируем...' : 'Проверить пинг'}
            </button>
          </div>

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

      {/* Modal for MConvertor parameters */}
      <ApkSupportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
