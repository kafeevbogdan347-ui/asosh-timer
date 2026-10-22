import React, { useState, useEffect, useRef } from 'react';
import {
  ScreenId,
  AppSettings,
  HomeworkItem,
  LessonUpdate,
  LanguageType,
  DeviceType,
  SmartDayData,
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
import { getBaseLessonsForClass } from './data/schoolSchedule';
import { playSound, doVibro } from './utils/audio';
import { fetchSmartDayAdvice } from './services/aiService';

// Components
import { TopBar } from './components/TopBar';
import { NavBar } from './components/NavBar';
import { CalcModal } from './components/CalcModal';
import { PanicModal } from './components/PanicModal';
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
import { ExcuseScreen } from './screens/ExcuseScreen';
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
import { ProfileScreen } from './screens/ProfileScreen';
import { NewsScreen } from './screens/NewsScreen';
import { RetroFirstScreen } from './screens/RetroFirstScreen';
import { WeatherScreen } from './screens/WeatherScreen';
import { BellsScreen } from './screens/BellsScreen';
import { MaintenanceScreen } from './screens/MaintenanceScreen';
import { AiAssistantScreen } from './screens/AiAssistantScreen';
import { Achievement } from './types';

export default function App() {
  // 1. Initial State from unified Account Vault (guarantees account NEVER resets on refresh or update)
  const [accountVault, setAccountVault] = useState<AccountVault>(() => loadAccountVault());
  const [registered, setRegistered] = useState<boolean>(() => accountVault.registered);
  const [cls, setCls] = useState<string>(() => accountVault.cls);
  const [shift, setShift] = useState<string>(() => accountVault.shift);
  const [subGroup, setSubGroup] = useState<number>(() => accountVault.subGroup);
  const [lang, setLang] = useState<LanguageType>(() => accountVault.lang);
  const [studentName, setStudentName] = useState<string>(() => accountVault.studentName);
  const [parentName, setParentName] = useState<string>(() => accountVault.parentName);
  const [authProvider, setAuthProvider] = useState<'guest' | 'local' | 'google' | 'apple'>(() => accountVault.authProvider);
  const [authEmail, setAuthEmail] = useState<string | undefined>(() => accountVault.authEmail);

  // Auto-restore account from Cloud server if local state is missing, guaranteeing account never disappears on update or reload
  useEffect(() => {
    const restoreCloudAccount = async () => {
      try {
        if (!registered || !studentName) {
          const res = await fetch('/api/account/restore');
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.vault) {
              const restored = saveAccountVault(data.vault, false);
              setAccountVault(restored);
              if (restored.registered) setRegistered(true);
              if (restored.studentName) setStudentName(restored.studentName);
              if (restored.cls) setCls(restored.cls);
              if (restored.shift) setShift(restored.shift);
              if (restored.subGroup) setSubGroup(restored.subGroup);
              if (restored.authProvider) setAuthProvider(restored.authProvider);
              if (restored.authEmail) setAuthEmail(restored.authEmail);
            }
          }
        }
      } catch (e) {
        console.warn('Account restore check:', e);
      }
    };
    restoreCloudAccount();
  }, []);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('asosh_settings_v105') || localStorage.getItem('asosh_opts_v104');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          soundProfile: parsed.soundProfile || '1',
          vibro: parsed.vibro !== false,
          warn2: parsed.warn2 !== false,
          anim: parsed.anim !== false,
          splash: parsed.splash !== false,
          mot: parsed.mot !== false,
          fontSize: parsed.fontSize || 'font-md',
          timerStyle: parsed.timerStyle || 'circle',
          theme: parsed.theme || (localStorage.getItem('asosh_theme_v9') as any) || 'dark',
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

  const defaultAchievements: Achievement[] = [
    { id: 'first_launch', title: 'Первый звонок', description: 'Запустили приложение АСОШ №2', icon: '🔔', unlocked: true, unlockedAt: 'Сегодня' },
    { id: 'theme_explorer', title: 'Дизайнер', description: 'Опробовали разные темы оформления', icon: '🎨', unlocked: false },
    { id: 'hw_starter', title: 'Прилежный ученик', description: 'Записали первое домашнее задание', icon: '📘', unlocked: false },
    { id: 'pomodoro_finisher', title: 'Фокус-мастер', description: 'Завершили 25-минутную сессию Помодоро', icon: '⏱️', unlocked: false },
    { id: 'backpack_ready', title: 'Портфель собран', description: 'Собрали все учебники по чек-листу на завтра', icon: '🎒', unlocked: false },
    { id: 'snake_master', title: 'Повелитель питонов', description: 'Набрали 20+ очков в Школьной Змейке', icon: '🐍', unlocked: false },
    { id: 'duel_champ', title: 'Ковбой парты', description: 'Одержали победу в дуэли на парте', icon: '⚔️', unlocked: false },
    { id: 'math_genius', title: 'Калькулятор в голове', description: 'Набрали 15+ очков в математическом спринте', icon: '🧠', unlocked: false },
    { id: 'memory_master', title: 'Эйдетическая память', description: 'Нашли все пары карточек в игре Память', icon: '🎴', unlocked: false },
    { id: 'reflex_god', title: 'Молниеносный', description: 'Показали скорость реакции быстрее 250 мс', icon: '⚡', unlocked: false },
    { id: 'tictactoe_win', title: 'Гроссмейстер', description: 'Обыграли ИИ в Крестики-Нолики', icon: '⭕', unlocked: false },
    { id: 'dev_unlocked', title: 'Хакер Пентагона', description: 'Открыли секретную панель разработчика', icon: '💻', unlocked: false },
    { id: 'top_student', title: 'Отличник четверти', description: 'Рассчитали средний балл ≥ 4.60 в симуляторе', icon: '🎯', unlocked: false },
    { id: 'social_star', title: 'Звезда школы', description: 'Оформили профиль ученика и нашли друзей в АСОШ №2', icon: '🌟', unlocked: true, unlockedAt: 'Сегодня' },
    { id: 'focus_zen', title: 'Дзен учебы', description: 'Включили звуки концентрации или школьный метроном', icon: '🎧', unlocked: false },
  ];

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('asosh_achievements_v106');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return defaultAchievements.map((def) => {
          const match = parsed.find((p: Achievement) => p.id === def.id);
          return match ? { ...def, ...match } : def;
        });
      } catch {
        return defaultAchievements;
      }
    }
    return defaultAchievements;
  });

  const handleUnlockAchievement = (id: string) => {
    setAchievements((prev) => {
      const match = prev.find((a) => a.id === id);
      if (match && !match.unlocked) {
        const next = prev.map((a) =>
          a.id === id
            ? { ...a, unlocked: true, unlockedAt: new Date().toLocaleTimeString().slice(0, 5) }
            : a
        );
        localStorage.setItem('asosh_achievements_v106', JSON.stringify(next));
        playSound('levelup', settings.soundProfile);
        doVibro(settings.vibro, 30);
        showToast(`🏆 Достижение разблокировано: «${match.title}»!`);
        return next;
      }
      return prev;
    });
  };

  const handleUnlockAllAchievements = () => {
    setAchievements((prev) => {
      const next = prev.map((a) => ({
        ...a,
        unlocked: true,
        unlockedAt: 'Прямо сейчас',
      }));
      localStorage.setItem('asosh_achievements_v106', JSON.stringify(next));
      return next;
    });
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
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
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

  useEffect(() => {
    // Keep history state synchronized
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({ screen: currentScreen }, '', `#${currentScreen}`);
    }

    const handleBackAction = () => {
      // If PIN lock is active, do not allow backing out
      if (isPinLocked) return;

      // 1. If any modal is open, close modal first
      if (isCalcOpen) { setIsCalcOpen(false); return; }
      if (isPanicOpen) { setIsPanicOpen(false); return; }
      if (isDevOpen) { setIsDevOpen(false); return; }
      if (isPinSetupOpen) { setIsPinSetupOpen(false); return; }

      // 2. If on sub-screen, return to 'main'
      if (currentScreen !== 'main' && currentScreen !== 'select' && currentScreen !== 'onboarding') {
        setCurrentScreen('main');
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({ screen: 'main' }, '', '#main');
        }
        return;
      }

      // 3. Double-back to exit on root screen
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        showToast('Выход из приложения...');
        const win = window as unknown as { navigator?: { app?: { exitApp?: () => void } } };
        if (win.navigator?.app?.exitApp) {
          win.navigator.app.exitApp();
        }
      } else {
        lastBackPressRef.current = now;
        showToast('Нажмите «Назад» ещё раз для выхода');
        triggerAndroidVibrate(35);
        if (typeof window !== 'undefined' && window.history) {
          window.history.pushState({ screen: currentScreen }, '', `#${currentScreen}`);
        }
      }
    };

    const onPopState = () => {
      handleBackAction();
    };

    const onBackButton = (e: Event) => {
      e.preventDefault();
      handleBackAction();
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('backbutton', onBackButton);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('backbutton', onBackButton);
    };
  }, [currentScreen, isCalcOpen, isPanicOpen, isDevOpen, isPinSetupOpen, isPinLocked]);

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
    body.classList.add(`theme-${settings.theme}`);
    body.classList.add(settings.fontSize);
    if (settings.timerStyle === 'digital') body.classList.add('timer-digital');
    if (settings.compact) body.classList.add('compact');
    if (settings.devicePC) body.classList.add('device-pc');
    if (settings.perfLow) body.classList.add('low');
    if (!settings.anim) body.classList.add('no-anim');
    if (!settings.splash) body.classList.add('hide-splash');
    if (!settings.mot) body.classList.add('hide-mot');
  }, [settings]);

  // Save settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      localStorage.setItem('asosh_settings_v105', JSON.stringify(next));
      return next;
    });
  };

  // 2. Real-time timer and clock calculation
  const [currentTime, setCurrentTime] = useState(new Date());
  const warned2minRef = useRef(false);
  const warned5minRef = useRef(false);
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

    updates.forEach((u) => {
      map[u.num - 1] = [u.sub, parseRoom(u.room)];
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

  if (currentLessons.length > 0) {
    const activeBells = currentBells.slice(0, currentLessons.length);
    const firstStart = activeBells.length ? toSec(activeBells[0][0]) : null;

    if (firstStart !== null && curSec < firstStart) {
      const countdownStart = shift === '2' ? (firstStart <= 13 * 3600 ? 12 * 3600 : 13 * 3600) : 7 * 3600;
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
            nextText: nextL ? `${nextL[0]} ${nextL[1] ? `(каб. ${nextL[1]})` : ''}` : 'Все уроки закончены 🎉',
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

  // Pre-bell alarms and smart reminders
  useEffect(() => {
    // 5-minute pre-bell reminder with room info
    if (lessonStatus.type === 'break' && lessonStatus.remainSec === 300 && !warned5minRef.current) {
      warned5minRef.current = true;
      playSound('warn', settings.soundProfile);
      doVibro(settings.vibro, 30);
      showToast(`🔔 Урок через 5 минут! ${lessonStatus.nextText ? `(${lessonStatus.nextText})` : ''}`);
    }
    if (lessonStatus.remainSec !== 300) {
      warned5minRef.current = false;
    }

    // 2-minute alarm trigger
    if (settings.warn2 && lessonStatus.remainSec === 120 && !warned2minRef.current) {
      warned2minRef.current = true;
      playSound('warn', settings.soundProfile);
      doVibro(settings.vibro, 50);
      showToast('⏳ 2 минуты до звонка!');
    }
    if (lessonStatus.remainSec !== 120) {
      warned2minRef.current = false;
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
  }, [lessonStatus.remainSec, lessonStatus.type, lessonStatus.nextText, currentScreen, settings.warn2, settings.soundProfile, settings.vibro, activeTime]);

  // Bell widget text & icon
  const formatSec = (s: number) => {
    s = Math.max(0, s);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${pad(m)}:${pad(sec)}`;
  };

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
  } else {
    bellTitle = 'Уроков на сегодня нет';
    bellTimeText = '00:00';
    bellIcon = '🥳';
  }

  // Smart day & weekend calculations
  const numLessonsToday = currentLessons.filter((l) => l[0] !== '—').length;
  const smartText = numLessonsToday === 0 ? 'Расписание ещё не добавлено' : `Сегодня ${numLessonsToday} уроков`;

  // 🧠 Умный день на базе ИИ (Gemini 3.8 Flash + локальный синтезатор)
  const [smartDayData, setSmartDayData] = useState<SmartDayData | null>(() => {
    try {
      const saved = localStorage.getItem('asosh_smart_day_cache');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isGeneratingSmartDay, setIsGeneratingSmartDay] = useState(false);
  const weatherRef = useRef<any>(null);

  const handleGenerateSmartDay = async (forceRefresh = false) => {
    if (!cls) return;
    setIsGeneratingSmartDay(true);
    try {
      // 1. Fetch weather in Argayash if not cached or if force refreshed
      if (!weatherRef.current || forceRefresh) {
        try {
          const wRes = await fetch('/api/yandex/weather');
          if (wRes.ok) {
            weatherRef.current = await wRes.json();
          }
        } catch {
          // ignore
        }
      }

      // 2. Prepare pending and done homework stats
      const classHw = homeworkList.filter((h) => h.cls === cls);
      const pendingHw = classHw.filter((h) => !h.done);
      const doneHw = classHw.filter((h) => h.done);
      const pendingSubjects = Array.from(new Set(pendingHw.map((h) => h.sub)));

      const advice = await fetchSmartDayAdvice({
        className: cls,
        shift,
        subGroup,
        studentName,
        dayName: currentDayName,
        lessons: currentLessons,
        tomorrowLessons,
        weather: weatherRef.current,
        accountStats: {
          hwPendingCount: pendingHw.length,
          hwPendingSubjects: pendingSubjects,
          hwDoneCount: doneHw.length,
          achievementsUnlocked: achievements.filter((a) => a.unlocked).length,
          totalAchievements: achievements.length,
        },
      });

      setSmartDayData(advice);
      localStorage.setItem('asosh_smart_day_cache', JSON.stringify(advice));
      if (forceRefresh) {
        showToast('🧠 ИИ обновил подсказку на сегодня!');
      }
    } catch (e) {
      console.warn('Smart day generation error:', e);
    } finally {
      setIsGeneratingSmartDay(false);
    }
  };

  useEffect(() => {
    if (cls && registered) {
      handleGenerateSmartDay();
    }
  }, [cls, currentDayName, shift, subGroup]);

  const dayOfWeek = currentTime.getDay();
  let weekendText = '';
  if (dayOfWeek === 6) weekendText = 'Суббота! Отдых 🥳';
  else if (dayOfWeek === 0) weekendText = 'Воскресенье! Завтра в школу ⚡';
  else {
    const left = 6 - dayOfWeek;
    weekendText = `Осталось учиться: ${left} ${left === 1 ? 'день' : 'дня'}`;
  }

  // Quarter calculation
  const nowMs = currentTime.getTime();
  let activeQuarter = SCHOOL_QUARTERS[0];
  let quarterPercent = 0;
  let quarterDaysLeft = 0;

  for (const q of SCHOOL_QUARTERS) {
    const sTime = new Date(q.start).getTime();
    const eTime = new Date(q.end).getTime();
    if (nowMs >= sTime && nowMs <= eTime) {
      activeQuarter = q;
      const total = Math.max(1, Math.round((eTime - sTime) / (1000 * 60 * 60 * 24)));
      const passed = Math.max(0, Math.min(total, Math.round((nowMs - sTime) / (1000 * 60 * 60 * 24))));
      quarterPercent = Math.round((passed / total) * 100);
      quarterDaysLeft = Math.max(0, Math.round((eTime - nowMs) / (1000 * 60 * 60 * 24)));
      break;
    }
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
  }) => {
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
      showToast('Регистрация успешна! 🚀');
    }

    handleUpdateSettings({ devicePC: data.device === 'pc' });

    if (!cls) setCurrentScreen('select');
    else setCurrentScreen('main');
  };

  const handleSelectClass = (selected: string) => {
    setCls(selected);
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
  const handleAddHomework = (item: Omit<HomeworkItem, 'id' | 'createdAt'>) => {
    const newItem: HomeworkItem = {
      ...item,
      id: Date.now(),
      createdAt: Date.now(),
    };
    const updated = [newItem, ...homeworkList];
    setHomeworkList(updated);
    localStorage.setItem('asosh_hw_v105', JSON.stringify(updated));
    showToast('ДЗ добавлено!');
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
    localStorage.setItem('asosh_hw_v105', JSON.stringify(updated));
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
    localStorage.setItem('asosh_hw_v105', JSON.stringify(updated));
  };

  const handleDeleteHomework = (id: number) => {
    const updated = homeworkList.filter((h) => h.id !== id);
    setHomeworkList(updated);
    localStorage.setItem('asosh_hw_v105', JSON.stringify(updated));
    playSound('settings', settings.soundProfile);
    showToast('Задание удалено');
  };

  // Lesson Update Actions
  const handleAddUpdate = (update: LessonUpdate) => {
    const updated = [update, ...lessonUpdates];
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
      { id: 'd3', cls: cls || 'Понедельник', day: 'Понедельник', num: 3, sub: 'Физика', room: '315' },
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
      if (d.cls) { setCls(d.cls); localStorage.setItem('asosh_class_v105', d.cls); }
      if (d.shift) { setShift(d.shift); localStorage.setItem('asosh_shift_v105', d.shift); }
      if (d.subgroup) { setSubGroup(Number(d.subgroup)); localStorage.setItem('asosh_subgroup_v105', String(d.subgroup)); }
      if (d.studentName) { setStudentName(d.studentName); localStorage.setItem('studentName', d.studentName); }
      if (d.parentName) { setParentName(d.parentName); localStorage.setItem('parentName', d.parentName); }
      if (d.lang) { setLang(d.lang); localStorage.setItem('asosh_lang_v105', d.lang); }
      if (d.settings) { setSettings(d.settings); localStorage.setItem('asosh_settings_v105', JSON.stringify(d.settings)); }
      if (d.homeworkList) { setHomeworkList(d.homeworkList); localStorage.setItem('asosh_hw_v105', JSON.stringify(d.homeworkList)); }
      if (d.lessonUpdates) { setLessonUpdates(d.lessonUpdates); localStorage.setItem('asosh_updates_v105', JSON.stringify(d.lessonUpdates)); }
      if (d.achievements) { setAchievements(d.achievements); localStorage.setItem('asosh_achievements_v106', JSON.stringify(d.achievements)); }

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

      {/* Panic Modal (Anti-palevo) */}
      <PanicModal isOpen={isPanicOpen} onClose={() => setIsPanicOpen(false)} />

      {/* 4-digit PIN Authentication Modal */}
      <PinLockModal
        isOpen={isPinLocked}
        onSuccess={() => setIsPinLocked(false)}
      />

      {/* PIN Code Setup / Change / Remove Modal */}
      <PinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
        onSuccess={() => {
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
      {currentScreen !== 'retroFirst' && currentScreen !== 'maintenance' && (
        <TopBar
          timeStr={timeStr}
          onOpenCalc={() => setIsCalcOpen(true)}
          onDoubleTapPanic={() => setIsPanicOpen(true)}
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
          onOpenAi={() => setCurrentScreen('ai')}
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
            quarterProgress={{
              name: activeQuarter.name,
              percent: quarterPercent,
              daysLeft: quarterDaysLeft,
              breakName: activeQuarter.breakName,
            }}
            smartDayData={smartDayData}
            onRefreshSmartDay={() => handleGenerateSmartDay(true)}
            isGeneratingSmartDay={isGeneratingSmartDay}
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
            smartDayAdvice={smartDayData}
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
            smartDayAdvice={smartDayData}
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
            onOpenAi={() => setCurrentScreen('ai')}
          />
        )}

        {currentScreen === 'excuse' && (
          <ExcuseScreen
            studentName={studentName}
            parentName={parentName}
            lang={lang}
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
            lang={lang}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'gpa' && (
          <GpaCalculatorScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onUnlockAchievement={handleUnlockAchievement}
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

        {currentScreen === 'chat' && (
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
          />
        )}

        {currentScreen === 'news' && (
          <NewsScreen
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onShowToast={showToast}
            onOpenDevModal={() => setIsDevOpen(true)}
          />
        )}

        {currentScreen === 'about' && (
          <AboutScreen onBack={() => setCurrentScreen(cls ? 'main' : 'select')} />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            lang={lang}
            onLangChange={(l) => {
              setLang(l);
              localStorage.setItem('asosh_lang_v105', l);
            }}
            studentName={studentName}
            parentName={parentName}
            onSaveProfile={(s, p) => {
              setStudentName(s);
              setParentName(p);
              localStorage.setItem('studentName', s);
              localStorage.setItem('parentName', p);
              showToast('Профиль сохранен');
            }}
            onChangeClass={() => {
              setCls('');
              localStorage.removeItem('asosh_class_v105');
              setCurrentScreen('select');
              showToast('Выбери свой класс');
            }}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onPanicTest={() => setIsPanicOpen(true)}
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

        {currentScreen === 'weather' && (
          <WeatherScreen
            onBack={() => setCurrentScreen('main')}
            onShowToast={showToast}
            lang={lang}
          />
        )}

        {currentScreen === 'bells' && (
          <BellsScreen
            onBack={() => setCurrentScreen('main')}
            onShowToast={showToast}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
          />
        )}

        {currentScreen === 'ai' && (
          <AiAssistantScreen
            cls={cls}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onBack={() => setCurrentScreen('main')}
            onShowToast={showToast}
            studentName={studentName}
            shift={shift}
            subGroup={subGroup}
            currentLessonText={lessonStatus.nowText}
            nextLessonText={lessonStatus.nextText}
            bellTimeText={bellTimeText}
            remainSec={lessonStatus.remainSec}
            todayLessons={getLessonsForDay(currentDayName)}
            tomorrowLessons={tomorrowLessons}
            homeworkList={homeworkList}
            lessonUpdates={lessonUpdates}
            weatherTemp={smartDayData?.weatherSummary ? parseInt(smartDayData.weatherSummary.match(/-?\d+/)?.[0] || '16', 10) : 16}
            weatherCondition="с. Аргаяш"
            frostStatus={smartDayData?.urgentAlert || 'Уроки идут в обычном режиме'}
            onAddHomeworkTask={(sub, text) => {
              handleAddHomework({
                cls,
                sub,
                text,
                done: false,
                pinned: false,
                date: new Date().toISOString().slice(0, 10),
              });
              showToast('Задание добавлено в список домашних работ 📘');
            }}
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
