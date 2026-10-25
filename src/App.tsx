import React, { useState, useEffect, useRef } from 'react';
import {
  ScreenId,
  AppSettings,
  HomeworkItem,
  LessonUpdate,
  LanguageType,
  DeviceType,
} from './types';
import {
  DAYS,
  DAYS_BA,
  B1,
  B2,
  B2F,
  SPLASHES_RU,
  SPLASHES_BA,
  MOTIVATORS_RU,
  MOTIVATORS_BA,
  SCHOOL_QUARTERS,
} from './data/constants';
import { getBaseLessonsForClass, hasOfficialSchedule } from './data/schoolSchedule';
import { migrateTheme } from './data/themes';
import { reportVisit } from './services/stats';
import { playSound, doVibro } from './utils/audio';

// Components
import { TopBar } from './components/TopBar';
import { NavBar } from './components/NavBar';
import { CalcModal } from './components/CalcModal';
import { DeveloperModal } from './components/DeveloperModal';
import { DevPasswordModal } from './components/DevPasswordModal';
import { PinLockModal } from './components/PinLockModal';
import { PinSetupModal } from './components/PinSetupModal';
import { loadAccountVault, saveAccountVault } from './utils/accountVault';
import { AccountVault } from './types';
import {
  isPinEnabled,
  isPrivacyBlurActive,
  setPrivacyBlurActive,
  isAutoBlurOnWindowBlur,
} from './utils/privacy';
import { triggerAndroidVibrate } from './utils/apkSupport';

// Screens
import { OnboardingScreen } from './screens/OnboardingScreen';
import { SelectClassScreen } from './screens/SelectClassScreen';
import { MainScreen } from './screens/MainScreen';
import { TodayScreen } from './screens/TodayScreen';
import { ScheduleScreen } from './screens/ScheduleScreen';
import { TomorrowScreen } from './screens/TomorrowScreen';
import { BackpackScreen } from './screens/BackpackScreen';
import { QuarterScreen } from './screens/QuarterScreen';
import { FormulasScreen } from './screens/FormulasScreen';
import { PomodoroScreen } from './screens/PomodoroScreen';
import { HomeworkScreen } from './screens/HomeworkScreen';
import { MapScreen } from './screens/MapScreen';
import { AddUpdateScreen } from './screens/AddUpdateScreen';
import { GamesScreen } from './screens/GamesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { GpaCalculatorScreen } from './screens/GpaCalculatorScreen';
import { PortfolioScreen } from './screens/PortfolioScreen';
import { FocusAudioScreen } from './screens/FocusAudioScreen';
import { ChatScreen } from './screens/ChatScreen';
import { isClassUnlocked } from './data/classCodes';
import { ProfileScreen } from './screens/ProfileScreen';
import { RetroFirstScreen } from './screens/RetroFirstScreen';
import { BellsScreen } from './screens/BellsScreen';
import { MaintenanceScreen } from './screens/MaintenanceScreen';
import { Achievement } from './types';
import { LIGHT_THEME_IDS } from './data/themes';
import { BoardScreen } from './screens/BoardScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import {
  ClassReplacement,
  ClassHomework,
  subscribeClassReplacements,
  subscribeClassHomework,
  addClassReplacement,
  deleteClassReplacement,
  addClassHomework,
  deleteClassHomework,
  myUid,
  toDateKey,
} from './services/classShared';
import { isNativeApp, showSystemNotification, scheduleNativeReminders, cancelNativeReminders } from './services/bellNotifications';

export default function App() {
  // 1. Initial State from unified Account Vault (guarantees account NEVER resets on refresh or update)
  const [accountVault, setAccountVault] = useState<AccountVault>(() => loadAccountVault());
  const [registered, setRegistered] = useState<boolean>(() => accountVault.registered);
  const [cls, setCls] = useState<string>(() => accountVault.cls);
  // Гость выбирает класс без кода; чат и отправка замен/ДЗ классу — только после ввода кода
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('asosh_guest') === '1');
  const [classVerified, setClassVerified] = useState<boolean>(() => !!accountVault.cls && isClassUnlocked(accountVault.cls));
  const [shift, setShift] = useState<string>(() => accountVault.shift);
  const [subGroup, setSubGroup] = useState<number>(() => accountVault.subGroup);
  const [lang, setLang] = useState<LanguageType>(() => accountVault.lang);
  const [studentName, setStudentName] = useState<string>(() => accountVault.studentName);
  const [parentName, setParentName] = useState<string>(() => accountVault.parentName);
  const [authProvider, setAuthProvider] = useState<'guest' | 'local' | 'google' | 'apple'>(() => accountVault.authProvider);
  const [authEmail, setAuthEmail] = useState<string | undefined>(() => accountVault.authEmail);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('asosh_settings_v105') || localStorage.getItem('asosh_opts_v104');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed, // остальные настройки (тема как в системе, PIN, качество графики…) сохраняются как есть
          soundProfile: parsed.soundProfile || '1',
          vibro: parsed.vibro !== false,
          warn2: parsed.warn2 !== false,
          anim: parsed.anim !== false,
          splash: parsed.splash !== false,
          mot: parsed.mot !== false,
          fontSize: parsed.fontSize || 'font-md',
          timerStyle: parsed.timerStyle || 'circle',
          theme: migrateTheme(parsed.theme || localStorage.getItem('asosh_theme_v9') || 'dark'),
          compact: parsed.compact || localStorage.getItem('asosh_compact') === '1',
          devicePC: parsed.devicePC || localStorage.getItem('device_type') === 'pc',
          perfLow: parsed.perfLow || localStorage.getItem('asosh_perf') === 'low',
          dynamicIsland: parsed.dynamicIsland !== false,
          hapticTouch: parsed.hapticTouch !== false,
          pomodoroWorkMin: parsed.pomodoroWorkMin || 25,
          pomodoroBreakMin: parsed.pomodoroBreakMin || 5,
        };
      } catch {
        // fallback
      }
    }
    return {
      soundProfile: '1',
      vibro: true,
      warn2: true,
      anim: true,
      splash: true,
      mot: true,
      fontSize: 'font-md',
      timerStyle: 'circle',
      theme: 'dark',
      compact: false,
      devicePC: false,
      perfLow: false,
      dynamicIsland: true,
      hapticTouch: true,
      pomodoroWorkMin: 25,
      pomodoroBreakMin: 5,
    };
  });

  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(() => {
    const saved = localStorage.getItem('asosh_hw_v105') || localStorage.getItem('hw_v9');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [lessonUpdates, setLessonUpdates] = useState<LessonUpdate[]>(() => {
    const saved = localStorage.getItem('asosh_updates_v105') || localStorage.getItem('updates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const todayStr = () => new Date().toLocaleDateString('ru-RU');
  const defaultAchievements: Achievement[] = [
    { id: 'first_launch', title: 'Первый звонок', description: 'Запустили приложение АСОШ №2', icon: '🔔', unlocked: true, unlockedAt: todayStr(), hint: 'Даётся за первый запуск' },
    { id: 'theme_explorer', title: 'Дизайнер', description: 'Сменили тему оформления', icon: '🎨', unlocked: false, hint: 'Опции → Тема: выбери любую другую тему', screen: 'settings' },
    { id: 'hw_starter', title: 'Прилежный ученик', description: 'Записали первое домашнее задание', icon: '📘', unlocked: false, hint: 'ДЗ → впиши предмет и задание → Добавить', screen: 'homework' },
    { id: 'pomodoro_finisher', title: 'Фокус-мастер', description: 'Завершили сессию Помодоро на 25 минут или дольше', icon: '⏱️', unlocked: false, hint: 'Помодоро → выбери 25 или 45 минут → Старт и дождись конца', screen: 'pomodoro' },
    { id: 'backpack_ready', title: 'Портфель собран', description: 'Отметили все вещи в портфеле на завтра', icon: '🎒', unlocked: false, hint: 'Портфель → поставь галочку у каждой вещи', screen: 'backpack' },
    { id: 'snake_master', title: 'Повелитель питонов', description: 'Набрали 20+ очков в Школьной Змейке', icon: '🐍', unlocked: false, hint: 'Игры → Змейка: набери 20 очков за одну игру (золотое яблоко = 5)', screen: 'games' },
    { id: 'duel_champ', title: 'Ковбой парты', description: 'Выиграли матч в дуэли на парте', icon: '⚔️', unlocked: false, hint: 'Игры → Дуэль: игра на двоих, первым возьми 3 раунда', screen: 'games' },
    { id: 'math_genius', title: 'Калькулятор в голове', description: 'Набрали 15+ очков в математическом спринте', icon: '🧠', unlocked: false, hint: 'Игры → Математика: отвечай без ошибок подряд, серия даёт бонус', screen: 'games' },
    { id: 'memory_master', title: 'Эйдетическая память', description: 'Нашли все пары карточек в игре Память', icon: '🎴', unlocked: false, hint: 'Игры → Память: открой все пары до конца', screen: 'games' },
    { id: 'reflex_god', title: 'Молниеносный', description: 'Показали скорость реакции быстрее 250 мс', icon: '⚡', unlocked: false, hint: 'Игры → Реакция: нажми быстрее 250 мс после смены цвета (не раньше!)', screen: 'games' },
    { id: 'tictactoe_win', title: 'Гроссмейстер', description: 'Победили крестиками в крестики-нолики', icon: '⭕', unlocked: false, hint: 'Игры → Крестики-нолики: выиграй за крестики (X)', screen: 'games' },
    { id: 'portfolio_first', title: 'Копилка побед', description: 'Добавили первую запись в портфолио', icon: '📂', unlocked: false, hint: 'Портфолио → заполни олимпиаду или конкурс → Добавить', screen: 'portfolio' },
    { id: 'top_student', title: 'Отличник четверти', description: 'Средний балл ≥ 4.60 по предмету в калькуляторе', icon: '🎯', unlocked: false, hint: 'Калькулятор → Оценки → добавь по одному предмету 5+ оценок со средним от 4.60', screen: 'gpa' },
    { id: 'social_star', title: 'Звезда школы', description: 'Оформили профиль ученика', icon: '🌟', unlocked: false, hint: 'Профиль → Редактировать → впиши никнейм и имя → Сохранить', screen: 'profile' },
    { id: 'focus_zen', title: 'Дзен учебы', description: 'Включили звуки концентрации', icon: '🎧', unlocked: false, hint: 'Фокус-звуки → включи дождь, библиотеку или альфа-ритм', screen: 'focus' },
    { id: 'dev_unlocked', title: 'Хакер Пентагона', description: 'Открыли секретную панель разработчика', icon: '💻', unlocked: false, hint: 'Секрет 🤫 Только для тех, кто знает пароль разработчика' },
  ];

  const ACH_KEY = 'asosh_achievements_v106';
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const parsed: Achievement[] = JSON.parse(localStorage.getItem(ACH_KEY) || '[]');
      // Из сохранённого берём только факт и дату открытия: названия и подсказки всегда свежие из кода
      return defaultAchievements.map((def) => {
        const match = parsed.find((p) => p.id === def.id);
        // Раньше «Звезда школы» выдавалась сразу при установке — такие отметки снимаем
        if (!match || (match.id === 'social_star' && match.unlockedAt === 'Сегодня')) return def;
        return { ...def, unlocked: match.unlocked, unlockedAt: match.unlockedAt === 'Сегодня' ? def.unlockedAt : match.unlockedAt };
      });
    } catch {
      return defaultAchievements;
    }
  });
  const achievementsRef = useRef(achievements);
  achievementsRef.current = achievements;

  const saveAchievements = (next: Achievement[]) => {
    achievementsRef.current = next;
    setAchievements(next);
    localStorage.setItem(ACH_KEY, JSON.stringify(next.map(({ id, unlocked, unlockedAt }) => ({ id, unlocked, unlockedAt }))));
  };

  // Звук и тост — снаружи setState, чтобы не срабатывали дважды и не вызывались во время рендера
  const handleUnlockAchievement = (id: string) => {
    const match = achievementsRef.current.find((a) => a.id === id);
    if (!match || match.unlocked) return;
    saveAchievements(
      achievementsRef.current.map((a) => (a.id === id ? { ...a, unlocked: true, unlockedAt: todayStr() } : a))
    );
    playSound('levelup', settings.soundProfile);
    doVibro(settings.vibro, 30);
    showToast(`🏆 Достижение открыто: «${match.title}»!`);
  };

  const handleUnlockAllAchievements = () => {
    saveAchievements(achievementsRef.current.map((a) => ({ ...a, unlocked: true, unlockedAt: a.unlockedAt || todayStr() })));
  };

  // Simulated Time Machine for Developer Tools
  const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);

  // FPS Overlay State
  const [fpsOverlayActive, setFpsOverlayActive] = useState(false);
  const [fpsVal, setFpsVal] = useState(60);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      frameCount++;
      if (now - lastTime >= 500) {
        setFpsVal(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    if (fpsOverlayActive) {
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [fpsOverlayActive]);

  // Maintenance Mode ("Что-то сломалось, мы уже чиним") - servers turned back ON (100% operational)
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('asosh_maintenance_mode');
    if (saved === null) return false; // Default: FALSE (servers running!)
    return saved === 'true';
  });

  // Navigation and Modals
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    const isBypassed = sessionStorage.getItem('asosh_maintenance_bypassed') === '1';
    const savedMode = localStorage.getItem('asosh_maintenance_mode');
    const isMaint = savedMode === 'true';

    // Show maintenance screen only if explicitly active and not bypassed
    if (isMaint && !isBypassed) {
      return 'maintenance';
    }
    if (!registered) return 'onboarding';
    if (!cls) return 'select';
    return 'main';
  });

  const handleBypassMaintenance = () => {
    sessionStorage.setItem('asosh_maintenance_bypassed', '1');
    if (!registered) {
      setCurrentScreen('onboarding');
    } else if (!cls) {
      setCurrentScreen('select');
    } else {
      setCurrentScreen('main');
    }
  };

  const handleToggleMaintenanceMode = (active: boolean) => {
    setMaintenanceMode(active);
    localStorage.setItem('asosh_maintenance_mode', String(active));
    if (active) {
      sessionStorage.removeItem('asosh_maintenance_bypassed');
      showToast('⚠️ Режим техработ включён: при входе пишется «Что-то сломалось, чиним»');
    } else {
      showToast('🟢 Серверы включены! Все службы работают в штатном режиме (100% ONLINE)');
    }
  };

  // Auto-determination of current day of week (Monday..Sunday)
  const getTodayDayName = () => {
    const d = new Date();
    const idx = (d.getDay() + 6) % 7;
    return DAYS[idx];
  };

  const [selectedDaySchedule, setSelectedDaySchedule] = useState<string>(() => getTodayDayName());
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
  // Достижение за открытие секретной панели
  useEffect(() => {
    if (isDevOpen) handleUnlockAchievement('dev_unlocked');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDevOpen]);

  const [isDevPasswordPromptOpen, setIsDevPasswordPromptOpen] = useState(false);

  // Secure Dev Suite Entry: STRICTLY FORBID entering without dev master password!
  const handleRequestOpenDev = () => {
    setIsDevPasswordPromptOpen(true);
  };

  // Privacy & PIN Lock States
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => isPinEnabled());
  const [isPinSetupOpen, setIsPinSetupOpen] = useState<boolean>(false);
  const [privacyBlur, setPrivacyBlur] = useState<boolean>(() => isPrivacyBlurActive());

  // Handle Privacy Blur Class on HTML
  useEffect(() => {
    if (privacyBlur) {
      document.documentElement.classList.add('privacy-blur-active');
    } else {
      document.documentElement.classList.remove('privacy-blur-active');
    }
  }, [privacyBlur]);

  // Auto-blur when window is minimized or unfocused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isAutoBlurOnWindowBlur()) {
        if (document.hidden) {
          document.documentElement.classList.add('privacy-blur-active');
        } else if (!isPrivacyBlurActive()) {
          document.documentElement.classList.remove('privacy-blur-active');
        }
      }
    };

    const handleWindowBlur = () => {
      if (isAutoBlurOnWindowBlur()) {
        document.documentElement.classList.add('privacy-blur-active');
      }
    };

    const handleWindowFocus = () => {
      if (isAutoBlurOnWindowBlur() && !isPrivacyBlurActive()) {
        document.documentElement.classList.remove('privacy-blur-active');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(null), 2500);
  };

  // Android APK (MConvertor) & Browser Hardware Back Button Handler
  const lastBackPressRef = useRef<number>(0);

  // История браузера: [guard] → [корневой экран] → [вложенный экран].
  // Без отдельной записи для вложенного экрана «Назад» на Android закрывал PWA вместо возврата на главную.
  const isRootScreen = (s: ScreenId) => s === 'main' || s === 'select' || s === 'onboarding' || s === 'maintenance';

  useEffect(() => {
    if (!window.history.state?.screen) {
      window.history.replaceState({ guard: true }, '', `#${currentScreen}`);
      window.history.pushState({ screen: currentScreen }, '', `#${currentScreen}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state = window.history.state;
    if (state?.screen === currentScreen) return;
    if (!isRootScreen(currentScreen) && (!state?.screen || isRootScreen(state.screen))) {
      window.history.pushState({ screen: currentScreen }, '', `#${currentScreen}`);
    } else {
      window.history.replaceState({ screen: currentScreen }, '', `#${currentScreen}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  useEffect(() => {
    // fromHistory: браузер уже снял запись из истории, и её нужно вернуть, если мы остаёмся на экране
    const handleBackAction = (fromHistory: boolean) => {
      const stay = () => {
        if (fromHistory) window.history.pushState({ screen: currentScreen }, '', `#${currentScreen}`);
      };

      // If PIN lock is active, do not allow backing out
      if (isPinLocked) { stay(); return; }

      // 1. If any modal is open, close modal first
      if (isCalcOpen) { setIsCalcOpen(false); stay(); return; }
      if (isDevOpen) { setIsDevOpen(false); stay(); return; }
      if (isPinSetupOpen) { setIsPinSetupOpen(false); stay(); return; }

      // 2. If on sub-screen, return to 'main'
      if (!isRootScreen(currentScreen)) {
        const target: ScreenId | undefined = fromHistory ? window.history.state?.screen : undefined;
        if (target && isRootScreen(target)) {
          setCurrentScreen(target);
          return;
        }
        if (fromHistory) window.history.pushState({ screen: 'main' }, '', '#main');
        setCurrentScreen('main');
        return;
      }

      // 3. Double-back to exit on root screen
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        showToast('Выход из приложения...');
        const win = window as unknown as { navigator?: { app?: { exitApp?: () => void } } };
        if (win.navigator?.app?.exitApp) {
          win.navigator.app.exitApp();
        } else if (fromHistory) {
          window.history.back();
        }
      } else {
        lastBackPressRef.current = now;
        showToast('Нажмите «Назад» ещё раз для выхода');
        triggerAndroidVibrate(35);
        stay();
      }
    };

    const onPopState = () => {
      handleBackAction(true);
    };

    const onBackButton = (e: Event) => {
      e.preventDefault();
      handleBackAction(false);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('backbutton', onBackButton);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('backbutton', onBackButton);
    };
  }, [currentScreen, isCalcOpen, isDevOpen, isPinSetupOpen, isPinLocked]);

  // Splashes and Motivators
  const [currentSplash, setCurrentSplash] = useState('');
  const [currentMotivator, setCurrentMotivator] = useState('');

  const refreshSplash = () => {
    const pool = lang === 'ba' ? SPLASHES_BA : SPLASHES_RU;
    setCurrentSplash(pool[Math.floor(Math.random() * pool.length)]);
  };

  const refreshMotivator = () => {
    const pool = lang === 'ba' ? MOTIVATORS_BA : MOTIVATORS_RU;
    setCurrentMotivator(pool[Math.floor(Math.random() * pool.length)]);
  };

  useEffect(() => {
    refreshSplash();
    refreshMotivator();
  }, [lang, currentScreen]);

  // Тема «как в системе»: следим за светлым/тёмным режимом устройства
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const effectiveTheme = settings.themeAuto ? (systemDark ? 'dark' : 'minimal') : settings.theme;

  // Анонимная статистика устройств: раз в день, через несколько секунд после запуска
  useEffect(() => {
    const timer = setTimeout(() => {
      reportVisit(settings.quality ?? (settings.perfLow ? 'eco' : 'normal'));
    }, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync body classes & font size
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const root = document.getElementById('root');

    html.classList.remove('font-sm', 'font-md', 'font-lg', 'font-xl');
    html.classList.add(settings.fontSize);

    if (root) {
      root.classList.remove('font-sm', 'font-md', 'font-lg', 'font-xl');
      root.classList.add(settings.fontSize);
    }

    body.className = '';
    body.classList.add(`theme-${effectiveTheme}`);
    if (LIGHT_THEME_IDS.includes(effectiveTheme)) body.classList.add('ui-light');
    body.classList.add(settings.fontSize);
    if (settings.timerStyle === 'digital') body.classList.add('timer-digital');
    if (settings.compact) body.classList.add('compact');
    if (settings.devicePC) body.classList.add('device-pc');
    const quality = settings.quality ?? (settings.perfLow ? 'eco' : 'normal');
    if (quality === 'eco') body.classList.add('low', 'q-eco');
    if (quality === 'ultra') body.classList.add('q-ultra');
    if (!settings.anim) body.classList.add('no-anim');
    if (!settings.splash) body.classList.add('hide-splash');
    if (!settings.mot) body.classList.add('hide-mot');
  }, [settings, effectiveTheme]);

  // Save settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    if (newSettings.theme && newSettings.theme !== settings.theme) handleUnlockAchievement('theme_explorer');
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      localStorage.setItem('asosh_settings_v105', JSON.stringify(next));
      return next;
    });
  };

  // 2. Real-time timer and clock calculation
  const [currentTime, setCurrentTime] = useState(new Date());
  const warned2minRef = useRef('');
  const warned5minRef = useRef('');
  const eveningBackpackRemindedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeTime = simulatedTime || currentTime;
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(activeTime.getHours())}:${pad(activeTime.getMinutes())}`;
  const dayIndex = (activeTime.getDay() + 6) % 7;
  const currentDayName = DAYS[dayIndex];
  const tomorrowDayIndex = (dayIndex + 1) % 7;
  const tomorrowDayName = DAYS[tomorrowDayIndex];

  // Auto-synchronize schedule view to current day
  useEffect(() => {
    setSelectedDaySchedule(currentDayName);
  }, [currentDayName]);

  const toSec = (t: string) => {
    const p = t.split(':').map(Number);
    return p[0] * 3600 + p[1] * 60;
  };

  const getDayBells = (dayName: string) => {
    return shift === '1' ? B1 : dayName === 'Пятница' ? B2F : B2;
  };

  // Parse room based on subgroup (e.g. "301 / 302")
  const parseRoom = (roomStr: string) => {
    if (!roomStr) return '';
    if (roomStr.includes('/')) {
      const parts = roomStr.split('/').map((s) => s.trim());
      return subGroup === 2 && parts[1] ? parts[1] : parts[0];
    }
    return roomStr;
  };

  // Общие замены и домашка класса из Firebase
  const [classReplacements, setClassReplacements] = useState<ClassReplacement[]>([]);
  const [classHomework, setClassHomework] = useState<ClassHomework[]>([]);
  useEffect(() => {
    // Сменили класс — замены и ДЗ прошлого класса не должны мелькать в расписании
    setClassReplacements([]);
    setClassHomework([]);
    if (!registered || !cls) return;
    const unsubR = subscribeClassReplacements(cls, setClassReplacements);
    const unsubH = subscribeClassHomework(cls, setClassHomework);
    return () => {
      unsubR();
      unsubH();
    };
  }, [cls, registered]);

  // Дата дня недели: сегодня, завтра или день текущей недели (Пн–Вс)
  const dateKeyForDay = (dayName: string): string => {
    const base = new Date(activeTime.getFullYear(), activeTime.getMonth(), activeTime.getDate());
    if (dayName === tomorrowDayName) base.setDate(base.getDate() + 1);
    else {
      // Прошедшие дни недели — это уже следующая неделя (в субботу «Пн» = ближайший понедельник)
      const diff = DAYS.indexOf(dayName as (typeof DAYS)[number]) - dayIndex;
      base.setDate(base.getDate() + (diff < 0 ? diff + 7 : diff));
    }
    return toDateKey(base);
  };

  // Get active lessons for day (official base schedule + custom updates)
  const getLessonsForDay = (dayName: string): [string, string][] => {
    // 1. Get official base lessons for selected class & day
    const baseLessons = getBaseLessonsForClass(cls, dayName);
    
    // 2. Build indexed map starting with base lessons
    const map: Record<number, [string, string]> = {};
    baseLessons.forEach((lesson, idx) => {
      map[idx] = [lesson[0], parseRoom(lesson[1])];
    });

    // 3. Apply custom user updates / overrides
    const updates = lessonUpdates
      .filter((u) => u.cls === cls && u.day === dayName)
      .sort((a, b) => a.num - b.num);

    // Список идёт от новых к старым: у старых сохранённых дублей побеждает новое
    const applied = new Set<number>();
    updates.forEach((u) => {
      if (applied.has(u.num)) return;
      applied.add(u.num);
      map[u.num - 1] = [u.sub, parseRoom(u.room)];
    });

    // 4. Замены класса на эту дату важнее всего; при нескольких побеждает самая новая
    const dateKey = dateKeyForDay(dayName);
    classReplacements
      .filter((r) => r.date === dateKey && r.num >= 1 && r.num <= 12)
      .sort((a, b) => a.created_at - b.created_at)
      .forEach((r) => {
        map[r.num - 1] = r.sub === 'Урока не будет' ? ['—', ''] : [`🔄 ${r.sub}`, parseRoom(r.room)];
      });

    const result: [string, string][] = [];
    const keys = Object.keys(map).map(Number);
    if (keys.length > 0) {
      const maxIdx = Math.max(0, ...keys);
      for (let i = 0; i <= maxIdx; i++) {
        result.push(map[i] || ['—', '']);
      }
    }
    return result;
  };

  const currentLessons = getLessonsForDay(currentDayName);
  const currentBells = getDayBells(currentDayName);
  const tomorrowLessons = getLessonsForDay(tomorrowDayName);
  const tomorrowBells = getDayBells(tomorrowDayName);

  // Compute current lesson / break state
  const curSec = activeTime.getHours() * 3600 + activeTime.getMinutes() * 60 + activeTime.getSeconds();
  let lessonStatus: {
    type: 'lesson' | 'break' | 'before' | 'none';
    currentIdx: number;
    nextIdx: number;
    remainSec: number;
    totalSec: number;
    nowText: string;
    nextText: string;
  } = {
    type: 'none',
    currentIdx: -1,
    nextIdx: -1,
    remainSec: 0,
    totalSec: 0,
    nowText: 'Уроков сейчас нет',
    nextText: '—',
  };

  const activeBells = currentBells.slice(0, currentLessons.length);
  const firstStart = activeBells.length ? toSec(activeBells[0][0]) : null;

  if (currentLessons.length > 0) {
    if (firstStart !== null && curSec < firstStart) {
      const countdownStart = firstStart - 3600;
      if (curSec >= countdownStart) {
        lessonStatus = {
          type: 'before',
          currentIdx: -1,
          nextIdx: 0,
          remainSec: firstStart - curSec,
          totalSec: firstStart - countdownStart,
          nowText: 'Ожидание начала занятий',
          nextText: `${currentLessons[0][0]} ${currentLessons[0][1] ? `(каб. ${currentLessons[0][1]})` : ''}`,
        };
      }
    } else {
      for (let i = 0; i < activeBells.length; i++) {
        const s = toSec(activeBells[i][0]);
        const e = toSec(activeBells[i][1]);

        if (curSec >= s && curSec < e) {
          const nextL = currentLessons[i + 1];
          lessonStatus = {
            type: 'lesson',
            currentIdx: i,
            nextIdx: i + 1,
            remainSec: e - curSec,
            totalSec: e - s,
            nowText: `${currentLessons[i][0]} ${currentLessons[i][1] ? `(каб. ${currentLessons[i][1]})` : ''}`,
            nextText: nextL ? `${nextL[0]} ${nextL[1] ? `(каб. ${nextL[1]})` : ''}` : 'Это последний урок 🎉',
          };
          break;
        }

        if (i < activeBells.length - 1) {
          const nextStart = toSec(activeBells[i + 1][0]);
          if (curSec >= e && curSec < nextStart) {
            const nextL = currentLessons[i + 1];
            lessonStatus = {
              type: 'break',
              currentIdx: -1,
              nextIdx: i + 1,
              remainSec: nextStart - curSec,
              totalSec: nextStart - e,
              nowText: 'Перемена',
              nextText: nextL ? `${nextL[0]} ${nextL[1] ? `(каб. ${nextL[1]})` : ''}` : '—',
            };
            break;
          }
        }
      }
    }
  }

  if (lessonStatus.type === 'none' && firstStart !== null && currentLessons.some((l) => l[0] !== '—')) {
    lessonStatus = curSec < firstStart
      ? {
          ...lessonStatus,
          nowText: 'Занятия ещё не начались',
          nextText: `${currentLessons[0][0]} ${currentLessons[0][1] ? `(каб. ${currentLessons[0][1]})` : ''}`,
        }
      : { ...lessonStatus, nowText: 'Уроки на сегодня закончены 🎉' };
  }

  // APK: заранее ставим напоминания за 5 минут до каждого урока на 7 дней вперёд
  const nativeReminders = (() => {
    if (!settings.bellNotifications || !cls) return [];
    const list: { at: Date; title: string; body: string }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(activeTime.getFullYear(), activeTime.getMonth(), activeTime.getDate() + d);
      const dayName = DAYS[(dayIndex + d) % 7];
      const bells = getDayBells(dayName);
      getLessonsForDay(dayName).forEach(([sub, room], i) => {
        if (!bells[i] || sub === '—') return;
        const [h, m] = bells[i][0].split(':').map(Number);
        const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m - 5);
        list.push({ at, title: `Через 5 минут: ${sub.replace('🔄 ', '')}`, body: `${i + 1} урок в ${bells[i][0]}${room ? ` · каб. ${room}` : ''}` });
      });
    }
    return list;
  })();
  const nativeRemindersKey = JSON.stringify(nativeReminders.map((r) => [r.at.getTime(), r.title, r.body]));
  useEffect(() => {
    if (!isNativeApp()) return;
    if (!settings.bellNotifications) {
      cancelNativeReminders();
      return;
    }
    scheduleNativeReminders(nativeReminders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeRemindersKey, settings.bellNotifications]);

  // Ключ текущего урока/перемены: предупреждение срабатывает один раз за период
  const periodKey = `${currentDayName}-${lessonStatus.type}-${lessonStatus.currentIdx}-${lessonStatus.nextIdx}`;

  // Pre-bell alarms and smart reminders
  useEffect(() => {
    // Окно в 60 с вместо точной секунды: в фоне браузер замедляет таймер и секунды пропускаются
    const remain = lessonStatus.remainSec;

    // 5-minute pre-bell reminder with room info
    if (lessonStatus.type === 'break' && remain <= 300 && remain > 240 && warned5minRef.current !== periodKey) {
      warned5minRef.current = periodKey;
      playSound('warn', settings.soundProfile);
      doVibro(settings.vibro, 30);
      showToast(`🔔 Урок через ${Math.ceil(remain / 60)} мин! ${lessonStatus.nextText ? `(${lessonStatus.nextText})` : ''}`);
      if (settings.bellNotifications) {
        showSystemNotification(`🔔 Урок через ${Math.ceil(remain / 60)} мин`, lessonStatus.nextText || '');
      }
    }

    // 2-minute alarm trigger
    if (
      settings.warn2 &&
      lessonStatus.type !== 'none' &&
      remain <= 120 &&
      remain > 60 &&
      warned2minRef.current !== periodKey
    ) {
      warned2minRef.current = periodKey;
      playSound('warn', settings.soundProfile);
      doVibro(settings.vibro, 50);
      showToast('⏳ 2 минуты до звонка!');
      if (settings.bellNotifications) showSystemNotification('⏳ 2 минуты до звонка', lessonStatus.nowText || '');
    }

    // 20:00 evening backpack reminder
    const hours = activeTime.getHours();
    const minutes = activeTime.getMinutes();
    if (hours === 20 && minutes === 0 && !eveningBackpackRemindedRef.current) {
      eveningBackpackRemindedRef.current = true;
      showToast('🎒 20:00 — Не забудь собрать портфель на завтра!');
    }
    if (hours !== 20) {
      eveningBackpackRemindedRef.current = false;
    }

    // Auto-collapse games if lesson started
    if (lessonStatus.type === 'lesson' && currentScreen === 'games') {
      setCurrentScreen('today');
      showToast('Начался урок! Игры свернуты.');
    }
  }, [lessonStatus.remainSec, lessonStatus.type, lessonStatus.nextText, periodKey, currentScreen, settings.warn2, settings.soundProfile, settings.vibro, activeTime]);

  // Bell widget text & icon
  const formatSec = (s: number) => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${pad(m)}:${pad(sec)}`;
  };

  const numLessonsToday = currentLessons.filter((l) => l[0] !== '—').length;

  let bellTitle = 'Скоро будет новое расписание';
  let bellTimeText = '--:--';
  let bellIcon = '📅';
  let bellUrgent = false;

  if (currentLessons.length === 0) {
    bellTitle = 'Расписание обновляется';
    bellTimeText = '--:--';
    bellIcon = '📅';
  } else if (lessonStatus.type === 'lesson') {
    bellTitle = 'До конца урока осталось:';
    bellTimeText = formatSec(lessonStatus.remainSec);
    bellIcon = lessonStatus.remainSec <= 120 ? '🚨' : '⏳';
    bellUrgent = lessonStatus.remainSec <= 120;
  } else if (lessonStatus.type === 'break') {
    bellTitle = 'До звонка на урок:';
    bellTimeText = formatSec(lessonStatus.remainSec);
    bellIcon = lessonStatus.remainSec <= 120 ? '🚨' : '🔔';
    bellUrgent = lessonStatus.remainSec <= 120;
  } else if (lessonStatus.type === 'before') {
    bellTitle = 'До начала занятий:';
    bellTimeText = formatSec(lessonStatus.remainSec);
    bellIcon = '🎒';
  } else if (numLessonsToday > 0 && firstStart !== null && curSec < firstStart) {
    bellTitle = 'Занятия начнутся в';
    bellTimeText = activeBells[0][0];
    bellIcon = '🌙';
  } else if (numLessonsToday > 0) {
    bellTitle = 'Уроки на сегодня закончены';
    bellTimeText = '—';
    bellIcon = '🎉';
  } else if (cls && !hasOfficialSchedule(cls)) {
    bellTitle = 'Расписание класса пока не добавлено';
    bellTimeText = '—';
    bellIcon = '📝';
  } else {
    bellTitle = 'Уроков на сегодня нет';
    bellTimeText = '—';
    bellIcon = '🥳';
  }

  // Smart day & weekend calculations
  const lessonsWord = (n: number) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'урок';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'урока';
    return 'уроков';
  };
  const smartText = numLessonsToday === 0 ? 'Уроков нет' : `${numLessonsToday} ${lessonsWord(numLessonsToday)}`;

  const dayOfWeek = activeTime.getDay();
  let weekendText = '';
  if (dayOfWeek === 6) weekendText = 'Суббота! Отдых 🥳';
  else if (dayOfWeek === 0) weekendText = 'Воскресенье! Завтра в школу ⚡';
  else {
    const left = 6 - dayOfWeek;
    weekendText = `Осталось учиться: ${left} ${left === 1 ? 'день' : 'дня'}`;
  }

  // Quarter calculation
  const DAY_MS = 1000 * 60 * 60 * 24;
  const nowMs = activeTime.getTime();
  // Даты без времени парсятся как UTC, поэтому явно задаём локальную полночь
  const quarterStartMs = (q: (typeof SCHOOL_QUARTERS)[number]) => new Date(`${q.start}T00:00:00`).getTime();
  const quarterEndMs = (q: (typeof SCHOOL_QUARTERS)[number]) => new Date(`${q.end}T23:59:59`).getTime();

  let activeQuarter: { name: string; breakName: string } = { name: 'Каникулы', breakName: 'учёбы' };
  let quarterPercent = 100;
  let quarterDaysLeft = 0;

  const currentQuarter = SCHOOL_QUARTERS.find((q) => nowMs >= quarterStartMs(q) && nowMs <= quarterEndMs(q));
  if (currentQuarter) {
    const sTime = quarterStartMs(currentQuarter);
    const eTime = quarterEndMs(currentQuarter);
    activeQuarter = currentQuarter;
    const total = Math.max(1, Math.round((eTime - sTime) / DAY_MS));
    const passed = Math.max(0, Math.min(total, Math.round((nowMs - sTime) / DAY_MS)));
    quarterPercent = Math.round((passed / total) * 100);
    quarterDaysLeft = Math.max(0, Math.round((eTime - nowMs) / DAY_MS));
  } else {
    const prevQuarter = [...SCHOOL_QUARTERS].reverse().find((q) => nowMs > quarterEndMs(q));
    const nextQuarter = SCHOOL_QUARTERS.find((q) => nowMs < quarterStartMs(q));
    if (prevQuarter) activeQuarter = { name: prevQuarter.breakName, breakName: 'учёбы' };
    if (nextQuarter) quarterDaysLeft = Math.max(0, Math.ceil((quarterStartMs(nextQuarter) - nowMs) / DAY_MS));
  }

  // 3. User Actions & Handlers
  const handleOnboardingComplete = (data: {
    studentName: string;
    parentName: string;
    device: DeviceType;
    lang: LanguageType;
    isDeveloperMode?: boolean;
    authProvider?: 'guest' | 'local' | 'google' | 'apple';
    authEmail?: string;
    guest?: boolean;
  }) => {
    setIsGuest(!!data.guest);
    if (data.guest) localStorage.setItem('asosh_guest', '1');
    else localStorage.removeItem('asosh_guest');
    const updated = saveAccountVault({
      registered: true,
      studentName: data.studentName,
      parentName: data.parentName,
      lang: data.lang,
      authProvider: data.authProvider || 'local',
      authEmail: data.authEmail,
    });

    setAccountVault(updated);
    setStudentName(data.studentName);
    setParentName(data.parentName);
    setLang(data.lang);
    setRegistered(true);
    if (data.authProvider) setAuthProvider(data.authProvider);
    if (data.authEmail) setAuthEmail(data.authEmail);

    localStorage.setItem('studentName', data.studentName);
    localStorage.setItem('parentName', data.parentName);
    localStorage.setItem('device_type', data.device);
    localStorage.setItem('asosh_lang_v105', data.lang);
    localStorage.setItem('asosh_registered_v105', 'true');

    if (data.isDeveloperMode) {
      localStorage.setItem('asosh_dev_unlocked', 'true');
      setIsDevOpen(true);
      showToast('🛠️ Режим разработчика активирован!');
    } else {
      localStorage.removeItem('asosh_dev_unlocked');
      showToast(data.guest ? 'Вход как гость 👀' : 'Регистрация успешна! 🚀');
    }

    handleUpdateSettings({ devicePC: data.device === 'pc' });

    if (!cls) setCurrentScreen('select');
    else setCurrentScreen('main');
  };

  const handleSelectClass = (selected: string) => {
    setCls(selected);
    setClassVerified(isClassUnlocked(selected));
    const updated = saveAccountVault({ cls: selected });
    setAccountVault(updated);
    localStorage.setItem('asosh_class_v105', selected);
    localStorage.setItem('class', selected);
    playSound('coin', settings.soundProfile);
    doVibro(settings.vibro, 20);
    setCurrentScreen('main');
  };

  const handleSelectShift = (s: string) => {
    setShift(s);
    const updated = saveAccountVault({ shift: s });
    setAccountVault(updated);
    localStorage.setItem('asosh_shift_v105', s);
    localStorage.setItem('shift', s);
    playSound('click', settings.soundProfile);
  };

  const handleSelectSubGroup = (g: number) => {
    setSubGroup(g);
    const updated = saveAccountVault({ subGroup: g });
    setAccountVault(updated);
    localStorage.setItem('asosh_subgroup_v105', String(g));
    localStorage.setItem('subgroup', String(g));
    playSound('click', settings.soundProfile);
  };

  // Homework actions
  const saveHomeworks = (list: HomeworkItem[]) => {
    try {
      localStorage.setItem('asosh_hw_v105', JSON.stringify(list));
    } catch {
      showToast('⚠️ Память заполнена: удалите старые ДЗ с фото');
    }
  };

  const handleAddHomework = (item: Omit<HomeworkItem, 'id' | 'createdAt'>) => {
    const newItem: HomeworkItem = {
      ...item,
      id: Date.now(),
      createdAt: Date.now(),
    };
    const updated = [newItem, ...homeworkList];
    setHomeworkList(updated);
    saveHomeworks(updated);
    showToast('ДЗ добавлено!');
    handleUnlockAchievement('hw_starter');
  };

  const handleToggleHomework = (id: number) => {
    const updated = homeworkList.map((h) => {
      if (h.id === id) {
        const next = !h.done;
        playSound(next ? 'coin' : 'click', settings.soundProfile);
        doVibro(settings.vibro, 15);
        return { ...h, done: next };
      }
      return h;
    });
    setHomeworkList(updated);
    saveHomeworks(updated);
  };

  const handleTogglePin = (id: number) => {
    const updated = homeworkList.map((h) => {
      if (h.id === id) {
        const nextPin = !h.pinned;
        playSound('star', settings.soundProfile);
        doVibro(settings.vibro, 20);
        showToast(nextPin ? 'ДЗ закреплено сверху ⭐' : 'ДЗ откреплено');
        return { ...h, pinned: nextPin };
      }
      return h;
    });
    setHomeworkList(updated);
    saveHomeworks(updated);
  };

  const handleDeleteHomework = (id: number) => {
    const updated = homeworkList.filter((h) => h.id !== id);
    setHomeworkList(updated);
    saveHomeworks(updated);
    playSound('settings', settings.soundProfile);
    showToast('Задание удалено');
  };

  // Lesson Update Actions
  const handleAddUpdate = (update: LessonUpdate) => {
    // Новое изменение того же урока заменяет старое
    const updated = [
      update,
      ...lessonUpdates.filter((u) => !(u.cls === update.cls && u.day === update.day && u.num === update.num)),
    ];
    setLessonUpdates(updated);
    localStorage.setItem('asosh_updates_v105', JSON.stringify(updated));
  };

  const handleDeleteUpdate = (id: string) => {
    const updated = lessonUpdates.filter((u) => u.id !== id);
    setLessonUpdates(updated);
    localStorage.setItem('asosh_updates_v105', JSON.stringify(updated));
    showToast('Урок удален');
  };

  // Secret Developer Logo Taps
  const logoTapCountRef = useRef(0);
  const handleLogoTap = () => {
    logoTapCountRef.current += 1;
    doVibro(settings.vibro, 10);
    if (logoTapCountRef.current >= 8) {
      logoTapCountRef.current = 0;
      handleRequestOpenDev();
    }
  };

  // Seed Mock Data
  const seedMockData = () => {
    const daysArr = DAYS;
    const demoUpdates: LessonUpdate[] = [
      { id: 'd1', cls: cls || '8А', day: 'Понедельник', num: 1, sub: 'Алгебра', room: '324' },
      { id: 'd2', cls: cls || '8А', day: 'Понедельник', num: 2, sub: 'Русский язык', room: '208' },
      { id: 'd3', cls: cls || '8А', day: 'Понедельник', num: 3, sub: 'Физика', room: '315' },
      { id: 'd4', cls: cls || '8А', day: 'Понедельник', num: 4, sub: 'История', room: '214' },
      { id: 'd5', cls: cls || '8А', day: 'Понедельник', num: 5, sub: 'Английский язык', room: '301/302' },
      { id: 'd6', cls: cls || '8А', day: 'Вторник', num: 1, sub: 'Геометрия', room: '324' },
      { id: 'd7', cls: cls || '8А', day: 'Вторник', num: 2, sub: 'Химия', room: '318' },
      { id: 'd8', cls: cls || '8А', day: 'Вторник', num: 3, sub: 'Физкультура', room: 'Спортзал' },
      { id: 'd9', cls: cls || '8А', day: 'Вторник', num: 4, sub: 'Литература', room: '208' },
      { id: 'd10', cls: cls || '8А', day: 'Вторник', num: 5, sub: 'Информатика', room: '330/331' },
      { id: 'd11', cls: cls || '8А', day: 'Среда', num: 1, sub: 'Биология', room: '312' },
      { id: 'd12', cls: cls || '8А', day: 'Среда', num: 2, sub: 'Алгебра', room: '324' },
      { id: 'd13', cls: cls || '8А', day: 'Среда', num: 3, sub: 'География', room: '210' },
      { id: 'd14', cls: cls || '8А', day: 'Среда', num: 4, sub: 'Обществознание', room: '214' },
      { id: 'd15', cls: cls || '8А', day: 'Четверг', num: 1, sub: 'Физика', room: '315' },
      { id: 'd16', cls: cls || '8А', day: 'Четверг', num: 2, sub: 'Русский язык', room: '208' },
      { id: 'd17', cls: cls || '8А', day: 'Четверг', num: 3, sub: 'Геометрия', room: '324' },
      { id: 'd18', cls: cls || '8А', day: 'Четверг', num: 4, sub: 'Физкультура', room: 'Спортзал' },
      { id: 'd19', cls: cls || '8А', day: 'Пятница', num: 1, sub: 'Химия', room: '318' },
      { id: 'd20', cls: cls || '8А', day: 'Пятница', num: 2, sub: 'Английский язык', room: '301/302' },
      { id: 'd21', cls: cls || '8А', day: 'Пятница', num: 3, sub: 'Алгебра', room: '324' },
      { id: 'd22', cls: cls || '8А', day: 'Пятница', num: 4, sub: 'ОБЖ', room: '114' },
    ];
    setLessonUpdates(demoUpdates);
    localStorage.setItem('asosh_updates_v105', JSON.stringify(demoUpdates));
  };

  // Seed Sample Homeworks
  const seedSampleHomeworks = () => {
    const samples: HomeworkItem[] = [
      { id: Date.now() + 1, cls: cls || '8А', sub: 'Алгебра', text: '№ 342, 345 (а, б), подготовиться к К/Р', date: 'Завтра', done: false, pinned: true },
      { id: Date.now() + 2, cls: cls || '8А', sub: 'Физика', text: '§ 18 читать, выучить формулу давления', date: 'Четверг', done: false, pinned: true },
      { id: Date.now() + 3, cls: cls || '8А', sub: 'Русский язык', text: 'Упр. 215 (разобрать по составу)', date: 'Завтра', done: false },
      { id: Date.now() + 4, cls: cls || '8А', sub: 'Литература', text: 'Прочитать главы 4-6 («Капитанская дочка»)', date: 'Пятница', done: false },
      { id: Date.now() + 5, cls: cls || '8А', sub: 'История', text: 'Составить таблицу реформ Петра I', date: 'Среда', done: true },
    ];
    setHomeworkList(samples);
    localStorage.setItem('asosh_hw_v105', JSON.stringify(samples));
  };

  // Full Backup Export
  const handleExportData = () => {
    const data = {
      version: '10.6',
      cls,
      shift,
      subgroup: subGroup,
      studentName,
      parentName,
      lang,
      settings,
      homeworkList,
      lessonUpdates,
      achievements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `asosh_v11_backup_${cls || 'data'}.json`;
    a.click();
    showToast('Резервная копия скачана! 💾');
  };

  // Full Backup Import
  const handleImportData = (rawJson: string) => {
    try {
      const d = JSON.parse(rawJson);
      const vaultPatch: Partial<AccountVault> = {};
      if (d.cls) { setCls(d.cls); vaultPatch.cls = d.cls; }
      if (d.shift) { setShift(d.shift); vaultPatch.shift = d.shift; }
      if (d.subgroup) { setSubGroup(Number(d.subgroup)); vaultPatch.subGroup = Number(d.subgroup); }
      if (d.studentName) { setStudentName(d.studentName); vaultPatch.studentName = d.studentName; }
      if (d.parentName) { setParentName(d.parentName); vaultPatch.parentName = d.parentName; }
      if (d.lang) { setLang(d.lang); vaultPatch.lang = d.lang; }
      setAccountVault(saveAccountVault(vaultPatch));
      if (d.settings) handleUpdateSettings(d.settings);
      if (d.homeworkList) { setHomeworkList(d.homeworkList); localStorage.setItem('asosh_hw_v105', JSON.stringify(d.homeworkList)); }
      if (d.lessonUpdates) { setLessonUpdates(d.lessonUpdates); localStorage.setItem('asosh_updates_v105', JSON.stringify(d.lessonUpdates)); }
      if (Array.isArray(d.achievements)) {
        const saved = d.achievements as Achievement[];
        saveAchievements(achievementsRef.current.map((a) => {
          const m = saved.find((x) => x.id === a.id);
          return m?.unlocked ? { ...a, unlocked: true, unlockedAt: m.unlockedAt } : a;
        }));
      }

      showToast('Данные успешно импортированы! ✅');
      setCurrentScreen('main');
    } catch {
      showToast('Ошибка импорта! Поврежденный файл.');
    }
  };

  const handleResetAll = () => {
    if (confirm('Сбросить ВСЕ сохранённые данные, настройки и домашние задания?')) {
      localStorage.clear();
      location.reload();
    }
  };

  // Active homework badge counter
  const activeHwCount = homeworkList.filter((h) => h.cls === cls && !h.done).length;

  return (
    <div className="app-container">
      {/* FPS Overlay Counter */}
      {fpsOverlayActive && (
        <div className="fixed top-2 right-2 z-[9999] bg-slate-950/90 border border-emerald-400 text-emerald-400 font-mono text-[11px] font-black px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none shadow-lg">
          FPS: {fpsVal}
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900/95 border border-cyan-400 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* 4-digit PIN Authentication Modal */}
      <PinLockModal
        isOpen={isPinLocked}
        onSuccess={() => setIsPinLocked(false)}
      />

      {/* PIN Code Setup / Change / Remove Modal */}
      <PinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
        onUpdated={() => {
          setIsPinSetupOpen(false);
          setIsPinLocked(false);
          showToast('Настройки PIN-кода успешно обновлены');
        }}
      />

      {/* School Calculator Modal */}
      <CalcModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        soundProfile={settings.soundProfile}
        vibro={settings.vibro}
        onOpenGrades={() => {
          setIsCalcOpen(false);
          setCurrentScreen('gpa');
        }}
      />

      {/* Secret Developer Modal */}
      <DeveloperModal
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        soundProfile={settings.soundProfile}
        onResetUpdates={() => {
          setLessonUpdates([]);
          localStorage.removeItem('asosh_updates_v105');
        }}
        onSeedMockData={seedMockData}
        onShowToast={showToast}
        onSetSimulatedTime={(t) => setSimulatedTime(t)}
        onUnlockAllAchievements={handleUnlockAllAchievements}
        onSeedHomeworks={seedSampleHomeworks}
        fpsOverlayActive={fpsOverlayActive}
        onToggleFpsOverlay={() => setFpsOverlayActive((v) => !v)}
      />

      {/* Dev Suite Master Password Authentication Modal */}
      <DevPasswordModal
        isOpen={isDevPasswordPromptOpen}
        onClose={() => setIsDevPasswordPromptOpen(false)}
        onSuccess={() => {
          setIsDevPasswordPromptOpen(false);
          setIsDevOpen(true);
        }}
        soundProfile={settings.soundProfile}
        vibro={settings.vibro}
        onShowToast={showToast}
      />

      {/* Top Header Bar */}
      {currentScreen !== 'retroFirst' && currentScreen !== 'maintenance' && currentScreen !== 'board' && (
        <TopBar
          timeStr={timeStr}
          minimal={currentScreen === 'onboarding' || currentScreen === 'select'}
          onOpenCalc={() => setIsCalcOpen(true)}
          onOpenAchievements={() => setCurrentScreen('achievements')}
          unlockedCount={achievements.filter((a) => a.unlocked).length}
          onOpenDev={handleRequestOpenDev}
          isPinActive={isPinEnabled()}
          onLockApp={() => setIsPinLocked(true)}
          isPrivacyBlur={privacyBlur}
          onTogglePrivacyBlur={() => {
            const next = !privacyBlur;
            setPrivacyBlur(next);
            setPrivacyBlurActive(next);
            showToast(next ? 'Режим «Анти-Шпион» включён' : 'Режим «Анти-Шпион» выключен');
          }}
        />
      )}

      {/* Maintenance Mode notice banner when inside the app */}
      {maintenanceMode && currentScreen !== 'maintenance' && currentScreen !== 'retroFirst' && (
        <div className="mx-2 my-1.5 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 border border-amber-400/40 flex items-center justify-between text-xs text-amber-200 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0 animate-pulse">🛠️</span>
            <div className="min-w-0">
              <span className="font-bold text-white block text-[11px] truncate">
                Что-то сломалось, и мы уже чиним!
              </span>
              <span className="text-[10px] text-amber-300/90 truncate block">
                Поддержка временно приостановлена. Дневник работает в автономном режиме.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentScreen('maintenance')}
            className="shrink-0 text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-xl ml-2 cursor-pointer transition-colors shadow-sm"
          >
            Статус сбоя
          </button>
        </div>
      )}

      {/* Main Screen Router */}
      <main className="mt-1">
        {currentScreen === 'maintenance' && (
          <MaintenanceScreen
            onBypass={handleBypassMaintenance}
            onOpenDev={handleRequestOpenDev}
            onShowToast={showToast}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
          />
        )}

        {currentScreen === 'onboarding' && (
          <OnboardingScreen
            onComplete={handleOnboardingComplete}
            lang={lang}
            onLangChange={(l) => setLang(l)}
            onOpenDevModalDirectly={handleRequestOpenDev}
          />
        )}

        {currentScreen === 'select' && (
          <SelectClassScreen
            shift={shift}
            subGroup={subGroup}
            onSelectShift={handleSelectShift}
            onSelectSubGroup={handleSelectSubGroup}
            onSelectClass={handleSelectClass}
            onLogoTap={handleLogoTap}
            onGoAbout={() => setCurrentScreen('about')}
            lang={lang}
            timeStr={timeStr}
            dayName={currentDayName}
            isGuest={isGuest}
            onEnterAsGuest={() => {
              setIsGuest(true);
              localStorage.setItem('asosh_guest', '1');
              showToast('Выбери класс — код не нужен 👀');
            }}
          />
        )}

        {currentScreen === 'main' && (
          <MainScreen
            cls={cls}
            shift={shift}
            subGroup={subGroup}
            bellInfo={{
              title: bellTitle,
              timeText: bellTimeText,
              icon: bellIcon,
              urgent: bellUrgent,
            }}
            smartText={smartText}
            weekendText={weekendText}
            splash={currentSplash}
            motivator={currentMotivator}
            onNavigate={(s) => setCurrentScreen(s)}
            onOpenCalc={() => setIsCalcOpen(true)}
            onLogoTap={handleLogoTap}
            lang={lang}
            showBackpackHint={activeTime.getHours() >= 15 && dayOfWeek <= 4}
            quarterProgress={{
              name: activeQuarter.name,
              percent: quarterPercent,
              daysLeft: quarterDaysLeft,
              breakName: activeQuarter.breakName,
              isBreak: !currentQuarter,
              daysToSummer: Math.max(
                0,
                Math.ceil((quarterEndMs(SCHOOL_QUARTERS[SCHOOL_QUARTERS.length - 1]) - nowMs) / DAY_MS)
              ),
            }}
          />
        )}

        {currentScreen === 'today' && (
          <TodayScreen
            timerStyle={settings.timerStyle}
            nowLessonText={lessonStatus.nowText}
            nextLessonText={lessonStatus.nextText}
            remainSec={lessonStatus.remainSec}
            totalSec={lessonStatus.totalSec}
            statusType={lessonStatus.type}
            lang={lang}
          />
        )}

        {currentScreen === 'schedule' && (
          <ScheduleScreen
            selectedDay={selectedDaySchedule}
            currentDayName={currentDayName}
            onSelectDay={(d) => setSelectedDaySchedule(d)}
            lessons={getLessonsForDay(selectedDaySchedule)}
            bells={getDayBells(selectedDaySchedule)}
            currentLessonIdx={selectedDaySchedule === currentDayName ? lessonStatus.currentIdx : -1}
            lang={lang}
            onGoAddUpdates={() => setCurrentScreen('updates')}
          />
        )}

        {currentScreen === 'tomorrow' && (
          <TomorrowScreen
            tomorrowDayName={tomorrowDayName}
            lessons={tomorrowLessons}
            bells={tomorrowBells}
            lang={lang}
            onNavigate={(s) => setCurrentScreen(s)}
          />
        )}

        {currentScreen === 'backpack' && (
          <BackpackScreen
            tomorrowLessons={tomorrowLessons}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onUnlockAchievement={handleUnlockAchievement}
          />
        )}

        {currentScreen === 'quarter' && <QuarterScreen lang={lang} />}

        {currentScreen === 'formulas' && <FormulasScreen lang={lang} />}

        {currentScreen === 'pomodoro' && (
          <PomodoroScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onUnlockAchievement={handleUnlockAchievement}
          />
        )}

        {currentScreen === 'homework' && (
          <HomeworkScreen
            cls={cls}
            homeworkList={homeworkList}
            onAddHomework={handleAddHomework}
            onToggleHomework={handleToggleHomework}
            onTogglePin={handleTogglePin}
            onDeleteHomework={handleDeleteHomework}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            classHomework={classHomework}
            myUid={myUid()}
            canShare={classVerified}
            onShareHomework={(h) => addClassHomework(cls, { ...h, forDate: '', author: studentName || 'Ученик' })}
            onDeleteClassHomework={(id) => {
              deleteClassHomework(cls, id);
              showToast('Удалено у класса');
            }}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'map' && <MapScreen />}

        {currentScreen === 'updates' && (
          <AddUpdateScreen
            cls={cls}
            updates={lessonUpdates}
            onAddUpdate={handleAddUpdate}
            onDeleteUpdate={handleDeleteUpdate}
            classReplacements={classReplacements}
            myUid={myUid()}
            canShare={classVerified}
            onAddClassReplacement={(r) => addClassReplacement(cls, { ...r, author: studentName || 'Ученик' })}
            onDeleteClassReplacement={(id) => {
              deleteClassReplacement(cls, id);
              showToast('Замена удалена');
            }}
            today={activeTime}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'games' && (
          <GamesScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onUnlockAchievement={handleUnlockAchievement}
          />
        )}

        {currentScreen === 'achievements' && (
          <AchievementsScreen
            achievements={achievements}
            onNavigate={(s) => setCurrentScreen(s)}
          />
        )}

        {currentScreen === 'gpa' && (
          <GpaCalculatorScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onUnlockAchievement={handleUnlockAchievement}
            onOpenCalc={() => setIsCalcOpen(true)}
          />
        )}

        {currentScreen === 'portfolio' && (
          <PortfolioScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onUnlockAchievement={handleUnlockAchievement}
          />
        )}

        {currentScreen === 'focus' && (
          <FocusAudioScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onUnlockAchievement={handleUnlockAchievement}
          />
        )}

        {currentScreen === 'chat' && !classVerified && (
          <div className="card screen-enter max-w-lg mx-auto text-center space-y-3 py-8">
            <div className="text-5xl">🔒</div>
            <h2 className="text-xl font-black text-cyan-300">Чат класса — только по коду</h2>
            <p className="text-sm text-white/70">
              Ты вошёл как гость. Чтобы писать в чат {cls}, введи код класса — его даёт классный руководитель.
            </p>
            <button type="button" className="btn green w-full justify-center" onClick={() => setCurrentScreen('select')}>
              Ввести код класса
            </button>
            <button type="button" className="btn darkBtn w-full justify-center" onClick={() => setCurrentScreen('main')}>
              На главную
            </button>
          </div>
        )}

        {currentScreen === 'chat' && classVerified && (
          <ChatScreen
            cls={cls}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onBack={() => setCurrentScreen('main')}
            onOpenDevModal={() => setIsDevOpen(true)}
            onOpenProfile={() => setCurrentScreen('profile')}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onNavigateToChat={() => setCurrentScreen('chat')}
            onUnlockAchievement={handleUnlockAchievement}
          />
        )}

        {currentScreen === 'about' && (
          <AboutScreen onBack={() => setCurrentScreen(cls ? 'main' : 'select')} />
        )}

        {currentScreen === 'calendar' && <CalendarScreen today={activeTime} onShowToast={showToast} />}

        {currentScreen === 'board' && (
          <BoardScreen
            cls={cls}
            shift={shift}
            time={activeTime}
            status={lessonStatus}
            lessons={currentLessons}
            bells={currentBells}
            onExit={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              setCurrentScreen('main');
            }}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            lang={lang}
            onLangChange={(l) => {
              setLang(l);
              setAccountVault(saveAccountVault({ lang: l }));
            }}
            studentName={studentName}
            parentName={parentName}
            onSaveProfile={(s, p) => {
              setStudentName(s);
              setParentName(p);
              setAccountVault(saveAccountVault({ studentName: s, parentName: p }));
              showToast('Профиль сохранен');
            }}
            onChangeClass={() => {
              setCls('');
              setAccountVault(saveAccountVault({ cls: '' }));
              // loadAccountVault подхватывает класс из старых ключей, поэтому чистим и их
              ['asosh_class_v105', 'asosh_class_v11', 'class'].forEach((k) => localStorage.removeItem(k));
              setCurrentScreen('select');
              showToast('Выбери свой класс');
            }}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetAll={handleResetAll}
            onShowToast={showToast}
            onNavigate={(s) => setCurrentScreen(s)}
            onOpenDev={handleRequestOpenDev}
            onOpenPinSetup={() => setIsPinSetupOpen(true)}
            onTogglePrivacyBlur={(enabled) => setPrivacyBlur(enabled)}
            maintenanceMode={maintenanceMode}
            onToggleMaintenanceMode={handleToggleMaintenanceMode}
            onOpenMaintenanceScreen={() => setCurrentScreen('maintenance')}
          />
        )}

        {currentScreen === 'retroFirst' && (
          <RetroFirstScreen
            onBackToModern={() => setCurrentScreen('settings')}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'bells' && (
          <BellsScreen
            onBack={() => setCurrentScreen('main')}
            onShowToast={showToast}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            shift={shift}
          />
        )}

      </main>

      {/* Bottom Navigation Bar */}
      {currentScreen !== 'retroFirst' && currentScreen !== 'maintenance' && (
        <NavBar
          currentScreen={currentScreen}
          onNavigate={(s) => setCurrentScreen(s)}
          lang={lang}
          soundProfile={settings.soundProfile}
          vibro={settings.vibro}
          activeHwCount={activeHwCount}
        />
      )}
    </div>
  );
}
