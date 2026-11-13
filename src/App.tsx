import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScreenId,
  AppSettings,
  HomeworkItem,
  LessonUpdate,
  LanguageType,
  DeviceType,
  UserProfile,
} from './types';
import {
  DAYS,
  APP_VERSION,
  DAYS_BA,
  B1,
  B2,
  B2F,
  shortenBells,
  SHORT_LESSON_MIN,
  SPLASHES_RU,
  SPLASHES_BA,
  SPLASHES_TEACHER,
  THEME_SPLASHES,
  MOTIVATORS_RU,
  MOTIVATORS_BA,
  SCHOOL_QUARTERS,
  isVacationDay,
  isHolidayDay,
} from './data/constants';
import { getBaseLessonsForClass, hasOfficialSchedule, roomFloor, SECOND_SHIFT_CLASSES, OFFICIAL_SCHEDULE_2026 } from './data/schoolSchedule';
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
import { AssistantScreen } from './screens/AssistantScreen';
import { WhatsNewModal } from './components/WhatsNewModal';
import { computeLessonStatus, firstLessonStart, toSec, roomLabel, lessonNo, LessonStatus } from './utils/lessonStatus';
import { t, LANGS } from './i18n';
import { AddUpdateScreen } from './screens/AddUpdateScreen';
import { GamesScreen } from './screens/GamesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AboutScreen } from './screens/AboutScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { GpaCalculatorScreen } from './screens/GpaCalculatorScreen';
import { PortfolioScreen } from './screens/PortfolioScreen';
import { FocusAudioScreen } from './screens/FocusAudioScreen';
import { ChatScreen } from './screens/ChatScreen';
import { isClassUnlocked, saveClassUnlocked } from './data/classCodes';
import { Account, getLocalAccount, logoutAccount, moveStudentToClass, verifyAccountSession, subscribeMyChildren } from './services/accounts';
import type { AccountDone } from './components/AccountForms';
import { AccountForms } from './components/AccountForms';
import { DiaryScreen } from './screens/DiaryScreen';
import { UpdateRequired, useAvailableUpdate } from './components/UpdateRequired';
import { HolidayLayer } from './components/HolidayLayer';
import { OnlineScreen } from './screens/OnlineScreen';
import { startPresence } from './services/online';
import { pullProfile, pushPublicProfile, fetchPublicProfile } from './services/profileSync';
import { loadAdmins, onAdminsLoaded } from './services/admins';
import { setErrorScreen } from './services/errorLog';
import { homeworkForTomorrow, reminderText } from './utils/hwReminder';
import { subscribeFriends } from './services/friends';
import { getMyProfile } from './services/userService';
import { subscribeLockdown, subscribeSiteClosed, setGlobalSiteClosed, getLocalSiteClosed } from './services/lockdown';
import { setAutoLanguage, tr as autoTr } from './i18n/auto';
import { subscribeStudentGrades, newGrades } from './services/journal';
import { ProfileScreen, ViewedOnlineStats } from './screens/ProfileScreen';
import { RetroFirstScreen } from './screens/RetroFirstScreen';
import { BellsScreen } from './screens/BellsScreen';
import { MaintenanceScreen } from './screens/MaintenanceScreen';
import { Achievement } from './types';
import { LIGHT_THEME_IDS, HOLIDAY_THEME_EFFECTS } from './data/themes';
import { BoardScreen } from './screens/BoardScreen';
import { HumanCheckHost } from './components/HumanCheck';
import { CalendarScreen } from './screens/CalendarScreen';
import { TeacherScreen } from './screens/TeacherScreen';
import { TeacherInfo, BoardPost, getLocalTeacher, clearLocalTeacher, verifyTeacher, subscribeBoard, postsFor, addBoardPost } from './services/teacher';
import type { AgentHandlers, AgentResult } from './services/assistant';
import { THEMES } from './data/themes';
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
import { isNativeApp, showSystemNotification, scheduleNativeReminders, cancelNativeReminders, notifyNow, requestNotificationPermission } from './services/bellNotifications';

export default function App() {
  // 1. Initial State from unified Account Vault (guarantees account NEVER resets on refresh or update)
  const [accountVault, setAccountVault] = useState<AccountVault>(() => loadAccountVault());
  const [registered, setRegistered] = useState<boolean>(() => accountVault.registered);
  const [cls, setCls] = useState<string>(() => accountVault.cls);
  // Гость выбирает класс без кода; чат и отправка замен/ДЗ классу — только после ввода кода
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('asosh_guest') === '1');
  const [classVerified, setClassVerified] = useState<boolean>(() => !!accountVault.cls && isClassUnlocked(accountVault.cls));
  // Режим учителя: имя хранится на телефоне, а права на публикации проверяет база
  const [teacher, setTeacher] = useState<TeacherInfo | null>(getLocalTeacher);
  // Аккаунт по логину и паролю (ученик, учитель или родитель); без него приложение работает как раньше
  const [account, setAccount] = useState<Account | null>(getLocalAccount);
  const isTeacher = !!teacher;
  const [shift, setShift] = useState<string>(() => accountVault.shift);
  const [subGroup, setSubGroup] = useState<number>(() => accountVault.subGroup);
  const [lang, setLang] = useState<LanguageType>(() => accountVault.lang);
  // Защитный режим: администратор остановил запись на сервере
  const [lockdown, setLockdown] = useState(false);
  useEffect(() => (registered ? subscribeLockdown(setLockdown) : undefined), [registered]);

  // Список администраторов: от него зависит значок «Разработчик» в чате, рейтинге и профиле
  const [, setAdminsTick] = useState(0);
  useEffect(() => {
    loadAdmins();
    return onAdminsLoaded(() => setAdminsTick((t) => t + 1));
  }, []);

  // Глобальное закрытие доступа к онлайн-функциям приложения и сайту (из Панели разработчика)
  const [siteClosed, setSiteClosed] = useState<boolean>(() => getLocalSiteClosed());
  useEffect(() => subscribeSiteClosed(setSiteClosed), []);

  const LOCKED_ONLINE_SCREENS = useMemo(
    () => new Set<ScreenId>(['assistant', 'chat', 'diary', 'online', 'profile', 'updates', 'homework', 'teacher', 'account']),
    []
  );
  const prevOfflineScreenRef = useRef<ScreenId>('main');

  // Онлайн класса: считаем время в приложении и отмечаемся «в сети» (выключается в Опциях → Приватность).
  // Только с аккаунтом ученика: так один человек — одна строка рейтинга на всех его устройствах
  useEffect(() => {
    if (!cls || isGuest || isTeacher || account?.role !== 'student') return;
    return startPresence(cls);
  }, [cls, isGuest, isTeacher, account?.uid, account?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Только для автотестов (сборка с VITE_E2E=1): переход на любой экран
  useEffect(() => {
    if (import.meta.env.VITE_E2E) (window as unknown as { __asoshGo?: (s: ScreenId) => void }).__asoshGo = setCurrentScreen;
  }, []);
  // Экраны без готового перевода переводятся словарём на лету
  useEffect(() => {
    setAutoLanguage(lang);
  }, [lang]);
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
  const [simulatedUpdateVersion, setSimulatedUpdateVersion] = useState<string | null>(null);
  const {
    availableVersion: availableUpdateVersion,
    isUpdating: isUpdatingApp,
    applyUpdate,
  } = useAvailableUpdate(simulatedUpdateVersion);

  const handleApplyUpdate = () => {
    setSimulatedUpdateVersion(null);
    return applyUpdate();
  };

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

  const handleToggleSiteClosed = async (closed: boolean) => {
    const res = await setGlobalSiteClosed(closed);
    if (res.ok) {
      setSiteClosed(closed);
      showToast(
        closed
          ? '🔴 Доступ к онлайн-функциям приложения и сайту закрыт для всех (включена заглушка)'
          : '🟢 Доступ к приложению и сайту снова открыт для всех!'
      );
      return;
    }
    if (res.reason === 'offline') {
      showToast('Нет связи с сервером — заглушку не переключить');
      return;
    }
    // Не администратор: сервер не дал записать. uid нужен, чтобы добавить себя в asosh_admins
    try {
      await navigator.clipboard?.writeText(res.uid);
    } catch {
      // буфер обмена недоступен
    }
    showToast(`Нет прав. Добавь в Firebase → Realtime Database: asosh_admins/${res.uid} = true (uid скопирован)`);
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

  // «Что нового»: после обновления показываем один раз. Новому пользователю — не показываем.
  const WHATS_NEW_KEY = 'asosh_seen_version';
  const [whatsNewOpen, setWhatsNewOpen] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem(WHATS_NEW_KEY);
      if (!accountVault.registered) {
        localStorage.setItem(WHATS_NEW_KEY, APP_VERSION);
        return false;
      }
      return seen !== APP_VERSION;
    } catch {
      return false;
    }
  });
  const closeWhatsNew = () => {
    setWhatsNewOpen(false);
    try {
      localStorage.setItem(WHATS_NEW_KEY, APP_VERSION);
    } catch {
      // нет места — окно покажется ещё раз, не страшно
    }
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
    setErrorScreen(currentScreen); // в журнале ошибок видно, на каком экране упало
    if (!LOCKED_ONLINE_SCREENS.has(currentScreen)) {
      prevOfflineScreenRef.current = currentScreen;
    }
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
      if (whatsNewOpen) { closeWhatsNew(); stay(); return; }
      if (isDevPasswordPromptOpen) { setIsDevPasswordPromptOpen(false); stay(); return; }
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
  }, [currentScreen, isCalcOpen, isDevOpen, isPinSetupOpen, isPinLocked, whatsNewOpen, isDevPasswordPromptOpen]);

  // Вопрос Асошику из другого раздела: открываем его экран, и вопрос уходит сразу
  const [assistantPrompt, setAssistantPrompt] = useState<{ text: string; photo?: string } | null>(null);
  const askAsoshik = (text: string, photo?: string) => {
    setAssistantPrompt({ text, photo });
    setCurrentScreen('assistant');
  };

  // Просмотр полноценного профиля одноклассника (из чата или рейтинга «Онлайн класса»)
  const [viewedStudentProfile, setViewedStudentProfile] = useState<UserProfile | null>(null);
  const [viewedOnlineStats, setViewedOnlineStats] = useState<ViewedOnlineStats | null>(null);
  const [profileReturnScreen, setProfileReturnScreen] = useState<ScreenId | null>(null);
  const [loadingViewedProfile, setLoadingViewedProfile] = useState(false);

  const openStudentProfile = (fallbackProfile: UserProfile, stats?: ViewedOnlineStats) => {
    const returnTo: ScreenId = currentScreen === 'online' || currentScreen === 'chat' ? currentScreen : 'main';
    setProfileReturnScreen(returnTo);
    setViewedStudentProfile(fallbackProfile);
    setViewedOnlineStats(stats || null);
    setCurrentScreen('profile');

    const myId = getMyProfile().id;
    if (fallbackProfile.id && fallbackProfile.id !== myId) {
      setLoadingViewedProfile(true);
      fetchPublicProfile(fallbackProfile.id, 15_000)
        .then((remote) => {
          if (remote) {
            setViewedStudentProfile((cur) => {
              if (!cur || cur.id !== fallbackProfile.id) return cur;
              return {
                ...fallbackProfile,
                ...remote,
                className: remote.className || fallbackProfile.className,
                avatar: remote.avatar || fallbackProfile.avatar,
              };
            });
          }
        })
        .finally(() => setLoadingViewedProfile(false));
    }
  };

  useEffect(() => {
    if (currentScreen !== 'profile' && (viewedStudentProfile || viewedOnlineStats)) {
      setViewedStudentProfile(null);
      setViewedOnlineStats(null);
      setLoadingViewedProfile(false);
    }
  }, [currentScreen, viewedStudentProfile, viewedOnlineStats]);

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

  // Splashes and Motivators
  const [currentSplash, setCurrentSplash] = useState('');
  const [currentMotivator, setCurrentMotivator] = useState('');

  const refreshSplash = () => {
    if (teacher) {
      setCurrentSplash(SPLASHES_TEACHER[Math.floor(Math.random() * SPLASHES_TEACHER.length)]);
      return;
    }
    if (lang === 'ba') {
      setCurrentSplash(SPLASHES_BA[Math.floor(Math.random() * SPLASHES_BA.length)]);
      return;
    }
    const themePool = THEME_SPLASHES[effectiveTheme];
    if (themePool && themePool.length > 0 && Math.random() < 0.65) {
      setCurrentSplash(themePool[Math.floor(Math.random() * themePool.length)]);
      return;
    }
    setCurrentSplash(SPLASHES_RU[Math.floor(Math.random() * SPLASHES_RU.length)]);
  };

  const refreshMotivator = () => {
    const pool = lang === 'ba' ? MOTIVATORS_BA : MOTIVATORS_RU;
    setCurrentMotivator(pool[Math.floor(Math.random() * pool.length)]);
  };

  useEffect(() => {
    refreshSplash();
    refreshMotivator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, currentScreen, effectiveTheme, teacher]);

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

  const getDayBells = (dayName: string) => {
    const base = shift === '1' ? B1 : dayName === 'Пятница' ? B2F : B2;
    return isShortDay(dayName) ? shortenBells(base, settings.shortLessonMin ?? SHORT_LESSON_MIN) : base;
  };
  // Сокращённые уроки включаются на конкретную дату (сегодня / завтра) и сами выключаются потом
  const calendarShortDates = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('asosh_calendar_events') || '[]') as { date: string; kind: string }[];
      return list.filter((e) => e.kind === 'short').map((e) => e.date);
    } catch {
      return [];
    }
    // Календарь меняется на своём экране и через Асошика — перечитываем при смене экрана
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);
  const isShortDay = (dayName: string) => {
    const key = dateKeyForDay(dayName);
    return (settings.shortLessonDates || []).includes(key) || calendarShortDates.includes(key);
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

  // Объявления и события учителей (учитель видит ещё и записи «только учителям»)
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([]);
  useEffect(() => {
    if (!registered) return;
    return subscribeBoard(isTeacher, setBoardPosts);
  }, [registered, isTeacher]);
  const visiblePosts = postsFor(boardPosts, isTeacher, cls);

  // Новое объявление учителя для своего класса или школы — уведомление (у учителя — нет)
  const annIdsKey = visiblePosts.filter((p) => p.kind === 'ann').map((p) => p.id).join(',');
  useEffect(() => {
    if (isTeacher || !annIdsKey) return;
    const ids = annIdsKey.split(',');
    let known: string[] | null = null;
    try {
      known = JSON.parse(localStorage.getItem('asosh_ann_notified') || 'null');
    } catch {
      known = null;
    }
    // Первый запуск: всё, что уже было, считаем известным
    if (known) {
      const fresh = visiblePosts.filter((p) => p.kind === 'ann' && !known!.includes(p.id) && Date.now() - p.created_at < 3 * 24 * 3600 * 1000);
      fresh.slice(0, 2).forEach((p) => {
        showToast(`📢 ${p.title}`);
        notifyNow(`📢 Объявление: ${p.title}`, p.text || p.author, `asosh-ann-${p.id}`);
      });
    }
    try {
      localStorage.setItem('asosh_ann_notified', JSON.stringify([...new Set([...(known || []), ...ids])].slice(-300)));
    } catch {
      // нет места
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annIdsKey, isTeacher]);

  // Учитель остаётся учителем, только пока его запись есть в базе
  useEffect(() => {
    if (!teacher) return;
    verifyTeacher().then((res) => {
      if (res !== null) return;
      clearLocalTeacher();
      setTeacher(null);
      showToast('Режим учителя выключен: код больше не действует');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      map[u.num - 1] = u.sub === 'Урока не будет' ? ['—', ''] : [u.sub, parseRoom(u.room)];
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

  // На каникулах и в праздники уроков нет, хотя расписание по дням недели остаётся
  const isDayOff = (dateKey: string) => isVacationDay(dateKey) || isHolidayDay(dateKey);
  const todayDateKey = toDateKey(activeTime);
  const vacationToday = isVacationDay(todayDateKey);
  const todayOff = isDayOff(todayDateKey);
  const tomorrowOff = isDayOff(dateKeyForDay(tomorrowDayName));
  const currentLessons = todayOff ? [] : getLessonsForDay(currentDayName);
  const currentBells = getDayBells(currentDayName);
  const tomorrowLessons = tomorrowOff ? [] : getLessonsForDay(tomorrowDayName);
  const tomorrowBells = getDayBells(tomorrowDayName);

  // Что сейчас идёт: урок, перемена или ожидание первого урока (окна уроками не считаются)
  const curSec = activeTime.getHours() * 3600 + activeTime.getMinutes() * 60 + activeTime.getSeconds();
  let lessonStatus: LessonStatus = computeLessonStatus(currentLessons, currentBells, curSec);
  const firstStartTime = firstLessonStart(currentLessons, currentBells);
  const firstStart = firstStartTime ? toSec(firstStartTime) : null;
  if (todayOff) lessonStatus = { ...lessonStatus, nowText: vacationToday ? 'Сейчас каникулы 🏖️' : 'Сегодня праздник 🎉' };

  // «Куда идти дальше»: ближайший урок (пропуская окна), его кабинет, этаж и время начала
  const nextLessonInfo = (() => {
    if (!['lesson', 'break', 'before'].includes(lessonStatus.type)) return null;
    for (let i = lessonStatus.nextIdx; i >= 0 && i < currentLessons.length && i < currentBells.length; i++) {
      const [sub, room] = currentLessons[i];
      if (sub === '—') continue;
      return { sub: sub.replace('🔄 ', ''), replaced: sub.startsWith('🔄'), room, floor: roomFloor(room), time: currentBells[i][0] };
    }
    return lessonStatus.type === 'lesson' ? { sub: '', replaced: false, room: '', floor: null, time: '' } : null;
  })();

  // Что знает Асошик: класс, время, уроки на сегодня и завтра, домашка. Имя ученика не передаём.
  // Действия Асошика в приложении. Права те же, что и без Асошика:
  // классу — только с кодом класса или учителю, объявления — только учителю, и всегда после подтверждения
  const makeAgentHandlers = (confirm: (text: string) => Promise<boolean>): AgentHandlers => {
    const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
    const canShareClass = classVerified || isTeacher;
    const author = (teacher?.name || studentName || 'Ученик').slice(0, 60);
    const say = (ok: boolean, summary: string): AgentResult => ({ ok, summary });
    const SCREENS: ScreenId[] = ['main', 'schedule', 'homework', 'diary', 'gpa', 'calendar', 'bells', 'map', 'updates', 'backpack', 'pomodoro', 'formulas', 'quarter', 'games', 'settings'];
    const dayFrom = (raw: string) => {
      const d = raw.toLowerCase();
      if (d.startsWith('сегодня')) return currentDayName;
      if (d.startsWith('завтра')) return tomorrowDayName;
      return DAYS.find((x) => x.toLowerCase().startsWith(d.slice(0, 3))) || '';
    };
    return {
      add_homework: async (a) => {
        const sub = str(a.subject, 60);
        const text = str(a.text, 1000);
        const due = str(a.due_date, 10);
        if (!sub || !text) return say(false, 'Не понял предмет или задание');
        if (a.scope === 'class') {
          if (!cls) return say(false, 'Сначала выбери класс');
          if (!canShareClass) return say(false, 'Публиковать ДЗ классу можно только с кодом класса');
          if (!(await confirm(`📘 Опубликовать ДЗ для ${cls}?\n${sub}: ${text}${isDate(due) ? ` (к ${due})` : ''}`))) return say(false, 'Публикацию отменили');
          const ok = await addClassHomework(cls, { sub, text, forDate: isDate(due) ? due : '', author, ...(isTeacher ? { teacher: true } : {}) });
          return say(ok, ok ? `ДЗ по предмету «${sub}» опубликовано для ${cls}` : 'Не получилось опубликовать — нет интернета?');
        }
        handleAddHomework({ cls, sub, text, done: false, pinned: false, ...(isDate(due) ? { dueDate: due } : {}) });
        return say(true, `ДЗ по предмету «${sub}» записано в твой дневник`);
      },
      finish_homework: async (a) => {
        const sub = str(a.subject, 60).toLowerCase();
        const part = str(a.text_contains, 100).toLowerCase();
        const item = hwRef.current.find((h) => h.cls === cls && h.sub.toLowerCase().includes(sub) && (!part || h.text.toLowerCase().includes(part)) && (a.action === 'delete' || !h.done));
        if (!item) return say(false, 'Такого ДЗ в твоём дневнике нет');
        if (a.action === 'delete') {
          handleDeleteHomework(item.id);
          return say(true, `Удалено ДЗ: ${item.sub}`);
        }
        handleToggleHomework(item.id);
        return say(true, `Отмечено выполненным: ${item.sub}`);
      },
      add_calendar_event: async (a) => {
        const date = str(a.date, 10);
        const title = str(a.title, 80);
        if (!isDate(date) || !title) return say(false, 'Нужны дата и название');
        const kind = a.kind === 'test' || a.kind === 'short' ? a.kind : 'other';
        try {
          const list = JSON.parse(localStorage.getItem('asosh_calendar_events') || '[]');
          localStorage.setItem('asosh_calendar_events', JSON.stringify([...list, { id: `ev-${Date.now()}`, date, title, kind }]));
        } catch {
          return say(false, 'Не получилось сохранить в календарь');
        }
        return say(true, `В календарь на ${date}: «${title}»`);
      },
      add_my_grades: async (a) => {
        const name = str(a.subject, 40);
        const grades = (Array.isArray(a.grades) ? a.grades : []).map(Number).filter((g) => [2, 3, 4, 5].includes(g));
        if (!name || !grades.length) return say(false, 'Нужны предмет и оценки от 2 до 5');
        try {
          const list = JSON.parse(localStorage.getItem('asosh_gpa_subjects') || '[]') as { id: string; name: string; grades: number[]; target: number }[];
          const found = list.find((x) => x.name.toLowerCase() === name.toLowerCase());
          if (found) found.grades = [...found.grades, ...grades];
          else list.push({ id: String(Date.now()), name, grades, target: 5 });
          localStorage.setItem('asosh_gpa_subjects', JSON.stringify(list));
        } catch {
          return say(false, 'Не получилось сохранить оценки');
        }
        return say(true, `В калькулятор оценок: ${name} — ${grades.join(', ')}`);
      },
      add_replacement: async (a) => {
        const day = dayFrom(str(a.day, 20));
        // Пользователь называет номер как на стенде; в базе — позиция в дне с единицы
        const shown = Math.round(Number(a.lesson_number));
        const num = shift === '2' ? shown + 1 : shown;
        const sub = str(a.subject, 60);
        const room = str(a.room, 20);
        if (!day || !(num >= 1 && num <= 8) || !sub) return say(false, 'Не понял день, номер урока или предмет');
        if (!cls) return say(false, 'Сначала выбери класс');
        if (a.scope === 'class') {
          if (!canShareClass) return say(false, 'Замены для класса — только с кодом класса');
          const date = dateKeyForDay(day);
          if (!(await confirm(`🔄 Замена для всего ${cls} на ${date}: ${shown}-й урок — ${sub}${room ? `, ${roomLabel(room)}` : ''}?`))) return say(false, 'Замену отменили');
          const ok = await addClassReplacement(cls, { date, num, sub, room, author });
          return say(ok, ok ? `Замена для ${cls}: ${shown}-й урок — ${sub}` : 'Не получилось отправить замену');
        }
        handleAddUpdate({ id: `${cls}-${day}-${num}-${Date.now()}`, cls, day, num, sub, room });
        return say(true, `Замена себе: ${day}, ${shown}-й урок — ${sub}`);
      },
      publish_announcement: async (a) => {
        if (!isTeacher || !teacher) return say(false, 'Объявления публикуют только учителя');
        const kind = a.kind === 'event' ? 'event' : 'ann';
        const title = str(a.title, 120);
        const text = str(a.text, 1000);
        const date = str(a.date, 10);
        const target = str(a.target_class, 4);
        if (!title || (kind === 'event' && !isDate(date))) return say(false, 'Нужен заголовок, а для события — дата');
        if (!(await confirm(`${kind === 'ann' ? '📢 Объявление' : '🗓 Событие'} для ${target || 'всей школы'}:\n«${title}»${text ? `\n${text}` : ''}${kind === 'event' ? `\n${date}` : ''}`))) return say(false, 'Публикацию отменили');
        const ok = await addBoardPost({ kind, title, text: kind === 'ann' ? text : undefined, date: kind === 'event' ? date : undefined, aud: 'all', cls: target, author: teacher.name.slice(0, 60) });
        return say(ok, ok ? `Опубликовано: «${title}»` : 'Не получилось опубликовать');
      },
      open_screen: async (a) => {
        const scr = str(a.screen, 20) as ScreenId;
        if (!SCREENS.includes(scr)) return say(false, 'Такого раздела нет');
        setTimeout(() => setCurrentScreen(scr), 1200);
        return say(true, `Открываю раздел`);
      },
      set_theme: async (a) => {
        const th = THEMES.find((x) => x.id === str(a.theme, 40) || x.name.toLowerCase() === str(a.theme, 40).toLowerCase());
        if (!th) return say(false, 'Такой темы нет');
        handleUpdateSettings({ theme: th.id });
        return say(true, `Тема «${th.name}» включена`);
      },
    };
  };

  const buildAssistantContext = () => {
    const fmtDay = (day: string, off: boolean) => {
      if (off) return 'выходной / каникулы — уроков нет';
      const bells = getDayBells(day);
      const list = getLessonsForDay(day)
        .map(([sub, room], i) => (sub === '—' ? '' : `${lessonNo(shift, i)}-й урок ${bells[i]?.[0] || '?'}–${bells[i]?.[1] || '?'} ${sub.replace('🔄 ', '(замена) ')}${room ? `, ${roomLabel(room)}` : ''}`))
        .filter(Boolean);
      return list.length ? list.join('; ') : 'уроков нет';
    };
    const hw = [
      ...homeworkList.filter((h) => !h.done).map((h) => `${h.sub}: ${h.text}${h.dueDate ? ` (к ${h.dueDate})` : ''}`),
      ...classHomework.filter((h) => !h.forDate || h.forDate >= todayDateKey).map((h) => `${h.sub}: ${h.text}${h.forDate ? ` (к ${h.forDate})` : ''}`),
    ]
      .slice(0, 12)
      .map((t) => t.slice(0, 200));
    return [
      `Роль: ${isTeacher ? `учитель (${teacher?.name})` : account?.role === 'parent' ? 'родитель' : 'ученик'}. Класс: ${cls || 'не выбран'}, ${shift} смена, подгруппа ${subGroup}. Может публиковать для класса: ${classVerified || isTeacher ? 'да' : 'нет'}.`,
      lang !== 'ru' ? `Язык интерфейса: ${LANGS.find((l) => l.id === lang)?.ru || lang}. Отвечай на этом языке (термины и формулы можно по-русски).` : '',
      `Сегодня: ${todayDateKey}. Темы оформления: ${THEMES.map((t) => `${t.id} («${t.name}»)`).join(', ')}.`,
      `Сейчас: ${currentDayName}, ${activeTime.toLocaleDateString('ru-RU')} ${activeTime.toTimeString().slice(0, 5)}.`,
      isShortDay(currentDayName) ? 'Сегодня сокращённые уроки.' : '',
      `Сейчас идёт: ${lessonStatus.nowText}. Дальше: ${lessonStatus.nextText}.`,
      `Уроки сегодня (${currentDayName}): ${fmtDay(currentDayName, todayOff)}.`,
      `Уроки завтра (${tomorrowDayName}): ${fmtDay(tomorrowDayName, tomorrowOff)}.`,
      `Домашка: ${hw.length ? hw.join(' | ') : 'не записана'}.`,
      'Этаж кабинета — первая цифра номера (332 — 3 этаж). Актовый зал — 2 этаж, спортзал и мастерские — 1 этаж.',
    ]
      .filter(Boolean)
      .join('\n');
  };

  // Вечернее напоминание о домашке: что из невыполненного задано на завтра
  const hwReminderOn = settings.hwReminder !== false && Boolean(cls) && !isTeacher;
  const hwReminderTime = settings.hwReminderTime || '19:00';
  const hwTomorrow = hwReminderOn && !tomorrowOff
    ? homeworkForTomorrow(homeworkList, classHomework, cls, dateKeyForDay(tomorrowDayName), tomorrowLessons.map((l) => l[0]))
    : [];
  const hwTomorrowKey = hwTomorrow.join('|');
  // Приложение открыто в это время (браузер, компьютер): тост и системное уведомление, раз в день
  const nowHm = activeTime.toTimeString().slice(0, 5);
  useEffect(() => {
    if (!hwTomorrow.length || nowHm < hwReminderTime || isNativeApp()) return;
    try {
      if (localStorage.getItem('asosh_hw_reminded') === todayDateKey) return;
      localStorage.setItem('asosh_hw_reminded', todayDateKey);
    } catch {
      return;
    }
    const { title, body } = reminderText(hwTomorrow);
    showToast(`${title}: ${body}`);
    notifyNow(title, body, 'asosh-hw');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowHm >= hwReminderTime, hwTomorrowKey, todayDateKey]);

  // APK: заранее ставим напоминания за 5 минут до каждого урока на 7 дней вперёд
  // и вечернее напоминание о домашке на сегодня (уведомление придёт, даже если приложение закрыто)
  const nativeReminders = (() => {
    const list: { at: Date; title: string; body: string }[] = [];
    if (hwTomorrow.length) {
      const [h, m] = hwReminderTime.split(':').map(Number);
      const at = new Date(activeTime.getFullYear(), activeTime.getMonth(), activeTime.getDate(), h || 19, m || 0);
      list.push({ at, ...reminderText(hwTomorrow) });
    }
    if (!settings.bellNotifications || !cls) return list;
    for (let d = 0; d < 7; d++) {
      const date = new Date(activeTime.getFullYear(), activeTime.getMonth(), activeTime.getDate() + d);
      if (isDayOff(toDateKey(date))) continue;
      const dayName = DAYS[(dayIndex + d) % 7];
      const bells = getDayBells(dayName);
      getLessonsForDay(dayName).forEach(([sub, room], i) => {
        if (!bells[i] || sub === '—') return;
        const [h, m] = bells[i][0].split(':').map(Number);
        const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m - 5);
        list.push({ at, title: `Через 5 минут: ${sub.replace('🔄 ', '')}`, body: `${lessonNo(shift, i)}-й урок в ${bells[i][0]}${room ? ` · ${roomLabel(room)}` : ''}` });
      });
    }
    return list;
  })();
  const nativeRemindersKey = JSON.stringify(nativeReminders.map((r) => [r.at.getTime(), r.title, r.body]));
  useEffect(() => {
    if (!isNativeApp()) return;
    if (!nativeReminders.length) {
      cancelNativeReminders();
      return;
    }
    scheduleNativeReminders(nativeReminders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeRemindersKey]);

  // Ключ текущего урока/перемены: предупреждение срабатывает один раз за период
  const periodKey = `${currentDayName}-${lessonStatus.type}-${lessonStatus.currentIdx}-${lessonStatus.nextIdx}`;

  // Pre-bell alarms and smart reminders
  useEffect(() => {
    // Окно в 60 с вместо точной секунды: в фоне браузер замедляет таймер и секунды пропускаются
    const remain = lessonStatus.remainSec;

    // 5-minute pre-bell reminder with room info
    if ((lessonStatus.type === 'break' || lessonStatus.type === 'before') && remain <= 300 && remain > 240 && warned5minRef.current !== periodKey) {
      warned5minRef.current = periodKey;
      playSound('warn', settings.soundProfile);
      doVibro(settings.vibro, 30);
      showToast(`🔔 Урок через ${Math.ceil(remain / 60)} мин! ${lessonStatus.nextText ? `(${lessonStatus.nextText})` : ''}`);
      if (settings.bellNotifications) {
        showSystemNotification(autoTr(`🔔 Урок через ${Math.ceil(remain / 60)} мин`), autoTr(lessonStatus.nextText || ''));
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
      if (settings.bellNotifications) showSystemNotification(autoTr('⏳ 2 минуты до звонка'), autoTr(lessonStatus.nowText || ''));
    }

    // 20:00 evening backpack reminder
    const hours = activeTime.getHours();
    const minutes = activeTime.getMinutes();
    if (hours === 20 && minutes === 0 && !eveningBackpackRemindedRef.current) {
      eveningBackpackRemindedRef.current = true;
      if (tomorrowLessons.some((l) => l[0] !== '—')) showToast('🎒 20:00 — Не забудь собрать портфель на завтра!');
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

  let bellTitle = t('bNewSch', lang);
  let bellTimeText = '--:--';
  let bellIcon = '📅';
  let bellUrgent = false;

  const dayWord = (n: number) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'день';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня';
    return 'дней';
  };
  const nextStudyStart = SCHOOL_QUARTERS.find((q) => q.start > todayDateKey)?.start;
  const vacationDaysLeft = nextStudyStart
    ? Math.max(1, Math.ceil((new Date(`${nextStudyStart}T00:00:00`).getTime() - activeTime.getTime()) / (24 * 3600 * 1000)))
    : 0;

  if (vacationToday) {
    bellTitle = nextStudyStart ? t('bVacTo', lang) : t('bVac', lang);
    bellTimeText = nextStudyStart ? `${vacationDaysLeft} ${dayWord(vacationDaysLeft)}` : '—';
    bellIcon = '🏖️';
  } else if (todayOff) {
    bellTitle = t('bHoliday', lang);
    bellTimeText = '—';
    bellIcon = '🎉';
  } else if (lessonStatus.type === 'lesson') {
    bellTitle = t('bLessonLeft', lang);
    bellTimeText = formatSec(lessonStatus.remainSec);
    bellIcon = lessonStatus.remainSec <= 120 ? '🚨' : '⏳';
    bellUrgent = lessonStatus.remainSec <= 120;
  } else if (lessonStatus.type === 'break') {
    bellTitle = t('bToBell', lang);
    bellTimeText = formatSec(lessonStatus.remainSec);
    bellIcon = lessonStatus.remainSec <= 120 ? '🚨' : '🔔';
    bellUrgent = lessonStatus.remainSec <= 120;
  } else if (lessonStatus.type === 'before') {
    bellTitle = t('bToStart', lang);
    bellTimeText = formatSec(lessonStatus.remainSec);
    bellIcon = '🎒';
  } else if (numLessonsToday > 0 && firstStart !== null && curSec < firstStart) {
    bellTitle = t('bStartsAt', lang);
    bellTimeText = firstStartTime || '—';
    bellIcon = '🌙';
  } else if (numLessonsToday > 0) {
    bellTitle = t('bDone', lang);
    bellTimeText = '—';
    bellIcon = '🎉';
  } else if (cls && !hasOfficialSchedule(cls)) {
    bellTitle = t('bNoClassSch', lang);
    bellTimeText = '—';
    bellIcon = '📝';
  } else {
    bellTitle = t('bNoLessons', lang);
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
  if (vacationToday) weekendText = nextStudyStart ? `Каникулы: ещё ${vacationDaysLeft} ${dayWord(vacationDaysLeft)}` : 'Лето! 🌞';
  else if (dayOfWeek === 6) weekendText = 'Суббота! Отдых 🥳';
  else if (dayOfWeek === 0) weekendText = tomorrowOff ? 'Воскресенье! Отдых 🥳' : 'Воскресенье! Завтра в школу ⚡';
  else {
    const left = 6 - dayOfWeek;
    weekendText = `Осталось учиться: ${left} ${dayWord(left)}`;
  }

  // Quarter calculation
  const DAY_MS = 1000 * 60 * 60 * 24;
  const nowMs = activeTime.getTime();
  // Даты без времени парсятся как UTC, поэтому явно задаём локальную полночь
  const quarterStartMs = (q: (typeof SCHOOL_QUARTERS)[number]) => new Date(`${q.start}T00:00:00`).getTime();
  const quarterEndMs = (q: (typeof SCHOOL_QUARTERS)[number]) => new Date(`${q.end}T23:59:59`).getTime();

  let activeQuarter: { name: string; breakName: string } = { name: 'Каникулы', breakName: 'Учёба' };
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
    if (prevQuarter) activeQuarter = { name: prevQuarter.breakName, breakName: 'Учёба' };
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
    account?: AccountDone;
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

    if (data.account) {
      applyAccount(data.account);
      return;
    }
    if (!cls) setCurrentScreen('select');
    else setCurrentScreen('main');
  };

  // Вошли или зарегистрировались по логину: класс, режим учителя и стартовый экран по роли
  const applyAccount = (res: AccountDone) => {
    const acc = res.account;
    setAccount(acc);
    // Ник, аватар и статус берём из аккаунта — одинаковые на всех устройствах
    pullProfile(acc);
    setIsGuest(false);
    localStorage.removeItem('asosh_guest');
    const accCls = res.child?.cls || acc.cls || '';
    if (acc.role === 'teacher') {
      setTeacher({ name: acc.name });
      showToast(`Здравствуйте, ${acc.name}! 👩‍🏫`);
      setCurrentScreen('teacher');
      return;
    }
    if (accCls) {
      setCls(accCls);
      setAccountVault(saveAccountVault({ cls: accCls, studentName: res.fullName || acc.name, registered: true }));
      localStorage.setItem('asosh_class_v105', accCls);
      localStorage.setItem('class', accCls);
      if (acc.role === 'student') {
        saveClassUnlocked(accCls);
        setClassVerified(true);
      }
    }
    if (acc.role === 'parent') {
      showToast(`Здравствуйте, ${acc.name}!`);
      setCurrentScreen('diary');
    } else {
      showToast(`Привет, ${acc.name}! 👋`);
      setCurrentScreen(accCls ? 'main' : 'select');
    }
  };

  // Аккаунт есть на телефоне, а вход в базе потерян (например, после переноса по QR) — просим войти заново
  useEffect(() => {
    if (!account) return;
    verifyAccountSession(account).then((ok) => {
      // Вход живой — подтягиваем профиль аккаунта (его могли поменять на другом устройстве)
      if (ok) {
        pullProfile(account);
        return;
      }
      setAccount(null);
      if (account.role === 'teacher') setTeacher(null);
      showToast('Войди в аккаунт заново: Опции → Аккаунт');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Новые оценки ученика: значок на плитке «Дневник» и сообщение, когда учитель поставил оценку
  const [newGradeCount, setNewGradeCount] = useState(0);
  useEffect(() => {
    if (account?.role !== 'student' || !account.cls) {
      if (account?.role !== 'parent') setNewGradeCount(0);
      return;
    }
    const sid = account.uid;
    let known = -1; // -1 — первых данных из базы ещё не было
    return subscribeStudentGrades(account.cls, sid, (list, fromServer) => {
      if (!fromServer) return;
      const fresh = newGrades(sid, list);
      if (fresh.length > Math.max(known, 0)) {
        const last = fresh.reduce((a, b) => (b.t > a.t ? b : a));
        const text = known < 0 && fresh.length > 1 ? `📒 Новых оценок: ${fresh.length}` : `📒 Новая оценка: ${last.v} · ${last.sub}`;
        showToast(text);
        notifyNow('Новая оценка', text.replace('📒 ', ''), 'asosh-grade');
        playSound('coin', settings.soundProfile);
      }
      known = fresh.length;
      setNewGradeCount(fresh.length);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.uid, account?.cls, account?.role]);

  // Новая заявка в друзья — тост и уведомление (сами заявки — в Профиле)
  useEffect(() => {
    if (!account || account.role === 'teacher') return;
    let known: Set<string> | null = null;
    return subscribeFriends(account, (st) => {
      const ids = st.incoming.map((f) => f.uid);
      if (known) {
        st.incoming.filter((f) => !known!.has(f.uid)).forEach((f) => {
          showToast(`📨 ${f.name} хочет дружить — открой Профиль`);
          notifyNow('Заявка в друзья', `${f.name} (${f.cls}) хочет добавить тебя в друзья`, `asosh-friend-${f.uid}`);
        });
      }
      known = new Set(ids);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.uid]);

  // Родитель: уведомление о каждой новой оценке и «Н» у каждого ребёнка (пока приложение запущено)
  useEffect(() => {
    if (account?.role !== 'parent') return;
    // В APK спрашиваем разрешение на уведомления сразу (в браузере — только по нажатию, в Опциях)
    if (isNativeApp()) requestNotificationPermission().catch(() => {});
    const perChild = new Map<string, () => void>();
    const counts = new Map<string, number>();
    const notifiedKey = (sid: string) => `asosh_parent_notified_${sid}`;
    const stopKids = subscribeMyChildren(account.uid, (kids) => {
      // Отписываемся от детей, которых отключили
      [...perChild.keys()].filter((sid) => !kids.some((k) => k.sid === sid)).forEach((sid) => {
        perChild.get(sid)?.();
        perChild.delete(sid);
        counts.delete(sid);
      });
      kids.forEach((kid) => {
        if (perChild.has(kid.sid) || !kid.cls) return;
        const first = kid.name.split(' ')[0];
        perChild.set(
          kid.sid,
          subscribeStudentGrades(kid.cls, kid.sid, (list, fromServer) => {
            if (!fromServer) return;
            counts.set(kid.sid, newGrades(kid.sid, list).length);
            setNewGradeCount([...counts.values()].reduce((a, b) => a + b, 0));
            // Уведомляем только о том, что появилось после прошлого уведомления; в первый раз — ни о чём
            let notified = -1;
            try {
              notified = Number(localStorage.getItem(notifiedKey(kid.sid)) ?? '-1');
            } catch {
              // ничего
            }
            const maxT = Math.max(0, ...list.map((g) => g.t));
            if (notified >= 0) {
              const fresh = list.filter((g) => g.t > notified).sort((a, b) => a.t - b.t);
              fresh.slice(-3).forEach((g) => {
                const text = g.v === 'Н' ? `${first}: пропуск (Н) · ${g.sub}` : `${first}: ${g.v} · ${g.sub}`;
                showToast(`📒 ${text}`);
                notifyNow(g.v === 'Н' ? 'Пропуск урока' : 'Новая оценка', text, `asosh-grade-${kid.sid}`);
              });
              if (fresh.length) playSound('coin', settings.soundProfile);
            }
            try {
              localStorage.setItem(notifiedKey(kid.sid), String(Math.max(notified, maxT)));
            } catch {
              // ничего
            }
          })
        );
      });
    });
    return () => {
      stopKids();
      perChild.forEach((stop) => stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.uid, account?.role]);
  useEffect(() => {
    if (currentScreen === 'diary') setNewGradeCount(0);
  }, [currentScreen]);

  // У учителя вместо дневника — журнал
  useEffect(() => {
    if (currentScreen === 'diary' && account?.role === 'teacher') setCurrentScreen('teacher');
  }, [currentScreen, account]);

  const handleLogoutAccount = async () => {
    const wasTeacher = account?.role === 'teacher';
    await logoutAccount();
    setAccount(null);
    if (wasTeacher) setTeacher(null);
    showToast('Вы вышли из аккаунта');
  };

  // Смена по официальному расписанию: 6–8 классы — вторая, остальные — первая
  const shiftForClass = (c: string) => (hasOfficialSchedule(c) ? (SECOND_SHIFT_CLASSES.includes(c) ? '2' : '1') : null);

  const handleSelectClass = (selected: string) => {
    if (account?.role === 'student' && account.cls !== selected) {
      moveStudentToClass(account, selected).then((ok) => ok && setAccount({ ...account, cls: selected }));
    }
    setCls(selected);
    setClassVerified(isClassUnlocked(selected));
    const autoShift = shiftForClass(selected);
    if (autoShift) {
      setShift(autoShift);
      localStorage.setItem('asosh_shift_v105', autoShift);
      localStorage.setItem('shift', autoShift);
    }
    const updated = saveAccountVault({ cls: selected, ...(autoShift ? { shift: autoShift } : {}) });
    setAccountVault(updated);
    localStorage.setItem('asosh_class_v105', selected);
    localStorage.setItem('class', selected);
    playSound('coin', settings.soundProfile);
    doVibro(settings.vibro, 20);
    setCurrentScreen('main');
  };

  useEffect(() => {
    const autoShift = shiftForClass(cls);
    if (!autoShift || autoShift === shift) return;
    setShift(autoShift);
    setAccountVault(saveAccountVault({ shift: autoShift }));
    localStorage.setItem('asosh_shift_v105', autoShift);
    localStorage.setItem('shift', autoShift);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls]);

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

  // Свежий список лежит в ref: два действия подряд (например, от Асошика) не затирают друг друга
  const hwRef = useRef(homeworkList);
  hwRef.current = homeworkList;
  const setHomework = (next: HomeworkItem[]) => {
    hwRef.current = next;
    setHomeworkList(next);
    saveHomeworks(next);
  };
  const lastHwIdRef = useRef(0);

  const handleAddHomework = (item: Omit<HomeworkItem, 'id' | 'createdAt'>) => {
    const id = Math.max(Date.now(), lastHwIdRef.current + 1);
    lastHwIdRef.current = id;
    setHomework([{ ...item, id, createdAt: Date.now() }, ...hwRef.current]);
    showToast('ДЗ добавлено!');
    handleUnlockAchievement('hw_starter');
  };

  const handleToggleHomework = (id: number) => {
    const item = hwRef.current.find((h) => h.id === id);
    if (!item) return;
    playSound(item.done ? 'click' : 'coin', settings.soundProfile);
    doVibro(settings.vibro, 15);
    setHomework(hwRef.current.map((h) => (h.id === id ? { ...h, done: !h.done } : h)));
  };

  const handleTogglePin = (id: number) => {
    const item = hwRef.current.find((h) => h.id === id);
    if (!item) return;
    playSound('star', settings.soundProfile);
    doVibro(settings.vibro, 20);
    showToast(item.pinned ? 'ДЗ откреплено' : 'ДЗ закреплено сверху ⭐');
    setHomework(hwRef.current.map((h) => (h.id === id ? { ...h, pinned: !h.pinned } : h)));
  };

  const handleDeleteHomework = (id: number) => {
    setHomework(hwRef.current.filter((h) => h.id !== id));
    playSound('settings', settings.soundProfile);
    showToast('Задание удалено');
  };

  // Lesson Update Actions
  const updatesRef = useRef(lessonUpdates);
  updatesRef.current = lessonUpdates;
  const setUpdates = (next: LessonUpdate[]) => {
    updatesRef.current = next;
    setLessonUpdates(next);
    localStorage.setItem('asosh_updates_v105', JSON.stringify(next));
  };

  const handleAddUpdate = (update: LessonUpdate) => {
    // Новое изменение того же урока заменяет старое
    setUpdates([update, ...updatesRef.current.filter((u) => !(u.cls === update.cls && u.day === update.day && u.num === update.num))]);
  };

  const handleDeleteUpdate = (id: string) => {
    setUpdates(updatesRef.current.filter((u) => u.id !== id));
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
    if (!window.confirm('Демо-расписание заменит все твои правки расписания. Продолжить?')) return;
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
    if (!window.confirm('Демо-ДЗ заменят все твои домашние задания. Продолжить?')) return;
    const samples: HomeworkItem[] = [
      { id: Date.now() + 1, cls: cls || '8А', sub: 'Алгебра', text: '№ 342, 345 (а, б), подготовиться к К/Р', date: 'Завтра', done: false, pinned: true },
      { id: Date.now() + 2, cls: cls || '8А', sub: 'Физика', text: '§ 18 читать, выучить формулу давления', date: 'Четверг', done: false, pinned: true },
      { id: Date.now() + 3, cls: cls || '8А', sub: 'Русский язык', text: 'Упр. 215 (разобрать по составу)', date: 'Завтра', done: false },
      { id: Date.now() + 4, cls: cls || '8А', sub: 'Литература', text: 'Прочитать главы 4-6 («Капитанская дочка»)', date: 'Пятница', done: false },
      { id: Date.now() + 5, cls: cls || '8А', sub: 'История', text: 'Составить таблицу реформ Петра I', date: 'Среда', done: true },
    ];
    setHomework(samples);
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
      // Выходим и из аккаунта, иначе вход в базе остался бы без записи на телефоне
      logoutAccount().finally(() => {
        const epoch = localStorage.getItem('asosh_data_epoch');
        localStorage.clear();
        // Метку общего сброса оставляем, чтобы он не сработал повторно
        if (epoch) localStorage.setItem('asosh_data_epoch', epoch);
        location.reload();
      });
    }
  };

  // Active homework badge counter
  const activeHwCount = homeworkList.filter((h) => h.cls === cls && !h.done).length;

  return (
    <div className={`app-container ${currentScreen === 'board' ? 'board-mode' : ''}`}>
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
      {/* Проверка «Я не робот» перед публикацией для класса */}
      <HumanCheckHost />

      {lockdown && (
        <div className="lockdown-banner" role="alert">
          🛡 Защитный режим: отправка сообщений, домашки и оценок временно остановлена. Расписание и таймер работают.
        </div>
      )}

      {/* Праздничные темы: снег, салют, лепестки — поверх приложения, не мешают нажатиям */}
      <HolidayLayer
        mode="effects"
        themeHoliday={HOLIDAY_THEME_EFFECTS[effectiveTheme] ?? null}
        quality={settings.quality ?? (settings.perfLow ? 'eco' : 'normal')}
        name={(account?.name || studentName || '').split(' ')[0]}
      />

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
      {whatsNewOpen && registered && !isPinLocked && <WhatsNewModal onClose={closeWhatsNew} />}
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
        siteClosed={siteClosed}
        onToggleSiteClosed={handleToggleSiteClosed}
        simulatedUpdateActive={Boolean(simulatedUpdateVersion)}
        onToggleSimulatedUpdate={() => {
          setSimulatedUpdateVersion((prev) => (prev ? null : 'v99.0'));
          showToast(simulatedUpdateVersion ? 'Тестовая плашка обновления скрыта' : 'Показана тестовая плашка обновления');
        }}
      />

      {/* Dev Suite Master Password Authentication Modal */}
      <DevPasswordModal
        isOpen={isDevPasswordPromptOpen}
        onClose={() => setIsDevPasswordPromptOpen(false)}
        onSuccess={() => {
          localStorage.setItem('asosh_dev_unlocked', 'true');
          pushPublicProfile(getMyProfile(), true).catch(() => {});
          setIsDevPasswordPromptOpen(false);
          setIsDevOpen(true);
        }}
        soundProfile={settings.soundProfile}
        vibro={settings.vibro}
        onShowToast={showToast}
      />

      {/* Красная плашка сверху о выходе новой версии */}
      <UpdateRequired
        availableVersion={availableUpdateVersion}
        currentScreen={currentScreen}
        onGoToMain={() => setCurrentScreen('main')}
      />

      {/* Top Header Bar */}
      {currentScreen !== 'retroFirst' && currentScreen !== 'maintenance' && currentScreen !== 'board' && (
        <TopBar
          timeStr={timeStr}
          minimal={currentScreen === 'onboarding' || currentScreen === 'select' || (currentScreen === 'teacher' && !cls)}
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
        {siteClosed && LOCKED_ONLINE_SCREENS.has(currentScreen) ? (
          <div className="card screen-enter max-w-lg mx-auto text-center space-y-4 py-8 px-5 border border-rose-500/40 bg-slate-900/90">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-3xl shadow-lg relative">
              <span>🛠️</span>
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow">
                ✕
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
              АСОШ Таймер временно недоступен. Попробуйте позже.
            </h2>
            <p className="text-xs sm:text-sm text-white/65 leading-relaxed max-w-md mx-auto">
              Серверы сейчас остановлены на технические работы, поэтому эта функция временно отключена. Расписание, таймер звонков и игры работают оффлайн.
            </p>
            <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => {
                  const target =
                    prevOfflineScreenRef.current && !LOCKED_ONLINE_SCREENS.has(prevOfflineScreenRef.current)
                      ? prevOfflineScreenRef.current
                      : cls
                      ? 'main'
                      : 'select';
                  setCurrentScreen(target);
                }}
                className="btn cyan w-full justify-center py-3 font-black text-xs cursor-pointer"
              >
                ← Вернуться обратно
              </button>
            </div>
          </div>
        ) : (
          <>
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
            isGuest={isGuest || isTeacher}
            onEnterAsGuest={() => {
              setIsGuest(true);
              localStorage.setItem('asosh_guest', '1');
              showToast('Выбери класс — код не нужен 👀');
            }}
            teacherName={teacher?.name ?? null}
            onTeacher={() => setCurrentScreen('teacher')}
          />
        )}

        {currentScreen === 'main' && (
          <HolidayLayer
            mode="banner"
            quality={settings.quality ?? (settings.perfLow ? 'eco' : 'normal')}
            name={(account?.name || studentName || '').split(' ')[0]}
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
            onOpenWhatsNew={() => setWhatsNewOpen(true)}
            onAskAsoshik={askAsoshik}
            diaryBadge={newGradeCount}
            onLogoTap={handleLogoTap}
            lang={lang}
            showBackpackHint={activeTime.getHours() >= 15 && tomorrowLessons.some((l) => l[0] !== '—')}
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
            announcements={visiblePosts}
            account={account}
            onShowToast={showToast}
            isTeacher={isTeacher}
            nextLesson={nextLessonInfo}
            shortLessonsToday={!todayOff && isShortDay(currentDayName) ? settings.shortLessonMin ?? SHORT_LESSON_MIN : 0}
            siteClosed={siteClosed}
            availableUpdateVersion={availableUpdateVersion}
            isUpdatingApp={isUpdatingApp}
            onApplyUpdate={handleApplyUpdate}
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
            shift={shift}
            onAskAsoshik={askAsoshik}
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
            shift={shift}
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
            forDate={dateKeyForDay(tomorrowDayName)}
            lang={lang}
            soundProfile={settings.soundProfile}
            vibro={settings.vibro}
            onUnlockAchievement={handleUnlockAchievement}
          />
        )}

        {currentScreen === 'quarter' && <QuarterScreen lang={lang} />}

        {currentScreen === 'formulas' && <FormulasScreen lang={lang} onAskAsoshik={askAsoshik} />}

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
            onAskAsoshik={askAsoshik}
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
            canShare={classVerified || isTeacher}
            isTeacher={isTeacher}
            onShareHomework={(h) =>
              teacher
                ? addClassHomework(cls, { sub: h.sub, text: h.text, forDate: h.forDate || '', author: teacher.name.slice(0, 60), teacher: true })
                : addClassHomework(cls, { sub: h.sub, text: h.text, forDate: h.forDate || '', author: (studentName || 'Ученик').slice(0, 60) })
            }
            onDeleteClassHomework={(id) => {
              deleteClassHomework(cls, id).then((ok) => showToast(ok ? 'Удалено у класса' : 'Не получилось удалить. Проверь интернет.'));
            }}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'diary' && account && (
          <DiaryScreen
            account={account}
            posts={boardPosts}
            today={activeTime}
            onShowToast={showToast}
            onChildClass={(c) => {
              if (c && c !== cls) {
                setCls(c);
                setAccountVault(saveAccountVault({ cls: c }));
              }
            }}
          />
        )}

        {(currentScreen === 'account' || (currentScreen === 'diary' && !account)) && (
          <div className="card screen-enter max-w-lg mx-auto space-y-3">
            <h2 className="text-xl font-black text-cyan-300">🔑 Аккаунт</h2>
            <p className="text-xs text-white/65">С логином и паролем дневник, оценки и режим учителя работают на любом телефоне.</p>
            <AccountForms onDone={applyAccount} />
          </div>
        )}

        {currentScreen === 'online' && (
          <OnlineScreen
            cls={cls}
            isGuest={isGuest || isTeacher}
            onShowToast={showToast}
            onOpenStudentProfile={(prof, stats) => openStudentProfile(prof, stats)}
          />
        )}

        {currentScreen === 'assistant' && (
          <AssistantScreen
            context={buildAssistantContext()}
            vibro={settings.vibro}
            appLang={lang}
            autoPrompt={assistantPrompt}
            onAutoPromptUsed={() => setAssistantPrompt(null)}
            agent={account?.role === 'parent' ? undefined : makeAgentHandlers}
          />
        )}

        {currentScreen === 'map' && (
          <MapScreen
            cls={cls}
            currentDayName={currentDayName}
            weekLessons={DAYS.slice(0, 6).flatMap((day) => {
              const bells = getDayBells(day);
              return getLessonsForDay(day)
                .map(([sub, room], i) => ({ day, time: bells[i]?.[0] || '', sub: sub.replace('🔄 ', ''), room }))
                .filter((l) => l.sub !== '—');
            })}
          />
        )}

        {currentScreen === 'updates' && (
          <AddUpdateScreen
            shift={shift}
            cls={cls}
            updates={lessonUpdates}
            onAddUpdate={handleAddUpdate}
            onDeleteUpdate={handleDeleteUpdate}
            classReplacements={classReplacements}
            myUid={myUid()}
            canShare={classVerified || isTeacher}
            onAddClassReplacement={(r) => addClassReplacement(cls, { ...r, author: (teacher?.name || studentName || 'Ученик').slice(0, 60) })}
            onDeleteClassReplacement={(id) => {
              deleteClassReplacement(cls, id).then((ok) => showToast(ok ? 'Замена удалена' : 'Не получилось удалить. Проверь интернет.'));
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
              {isGuest ? 'Ты вошёл как гость. ' : ''}Чтобы писать в чат {cls}, введи код класса — его даёт классный руководитель.
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
            onOpenProfile={() => {
              setViewedStudentProfile(null);
              setViewedOnlineStats(null);
              setCurrentScreen('profile');
            }}
            onOpenStudentProfile={(prof) => openStudentProfile(prof)}
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
            viewedProfile={viewedStudentProfile}
            viewedOnlineStats={viewedOnlineStats}
            isLoadingExternalProfile={loadingViewedProfile}
            onBackFromViewedProfile={() => {
              const target = profileReturnScreen || 'main';
              setViewedStudentProfile(null);
              setViewedOnlineStats(null);
              setProfileReturnScreen(null);
              setCurrentScreen(target);
            }}
          />
        )}

        {currentScreen === 'about' && (
          <AboutScreen onBack={() => setCurrentScreen(cls ? 'main' : 'select')} />
        )}

        {currentScreen === 'calendar' && (
          <CalendarScreen
            today={activeTime}
            onShowToast={showToast}
            boardEvents={visiblePosts}
            teacherName={teacher?.name ?? null}
            cls={cls}
            myUid={myUid()}
          />
        )}

        {currentScreen === 'teacher' && (
          <TeacherScreen
            teacherName={teacher?.name ?? null}
            cls={cls}
            posts={boardPosts}
            myUid={myUid()}
            onLoggedIn={(name) => {
              setTeacher({ name });
              playSound('coin', settings.soundProfile);
              showToast(`Здравствуйте, ${name}! Режим учителя включён 👩‍🏫`);
            }}
            onLogout={() => {
              clearLocalTeacher();
              setTeacher(null);
              showToast('Режим учителя выключен');
              setCurrentScreen(cls ? 'main' : 'select');
            }}
            onPickClass={() => setCurrentScreen('select')}
            onBack={() => setCurrentScreen(cls ? 'main' : 'select')}
            onShowToast={showToast}
            account={account}
            onOpenAccount={() => setCurrentScreen('account')}
          />
        )}

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
            account={account}
            onOpenAccount={() => setCurrentScreen('account')}
            onLogoutAccount={handleLogoutAccount}
            cls={cls}
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
            shortLessonMin={settings.shortLessonMin ?? SHORT_LESSON_MIN}
            shortToday={isShortDay(currentDayName)}
          />
        )}
        </>
        )}

      </main>

      {/* Bottom Navigation Bar */}
      {currentScreen !== 'retroFirst' && currentScreen !== 'maintenance' && !(currentScreen === 'teacher' && !cls) && (
        <NavBar
          currentScreen={currentScreen}
          onNavigate={(s) => setCurrentScreen(s)}
          lang={lang}
          soundProfile={settings.soundProfile}
          vibro={settings.vibro}
          activeHwCount={activeHwCount}
          siteClosed={siteClosed}
        />
      )}
    </div>
  );
}
