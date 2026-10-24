export type ThemeType =
  | 'dark'
  | 'light'
  | 'ps'
  | 'neon'
  | 'cyber'
  | 'amoled'
  | 'cyberpunk'
  | 'emerald'
  | 'sunset'
  | 'nordic'
  | 'sakura'
  | 'tokyo'
  | 'gold'
  | 'crimson'
  | 'space'
  | 'synthwave'
  | 'coffee'
  | 'mint'
  | 'magma'
  | 'retro'
  | 'aurora'
  | 'violet'
  | 'dynamic_glass'
  | 'vice_city'
  | 'cyber_sapphire'
  | 'dragon_fire'
  | 'arctic_neon'
  | 'saturn_gold'
  | 'fire_ember'
  | 'ocean_abyss'
  | 'emerald_matrix'
  | 'hyper_gold'
  | 'galaxy_supernova'
  | 'neon_tokyo_drift'
  | 'holographic_ice'
  | 'ruby_obsidian'
  | 'argayash_ural'
  | 'quantum_amethyst'
  | 'solar_flare'
  | 'phantom_glitch'
  | 'deep_void'
  | 'nebula_quartz'
  | 'cyber_emerald_99'
  | 'super_mario_retro'
  | 'frost_diamond'
  | 'blood_samurai'
  | 'yandex_neo_gold'
  | 'ural_malachite'
  | 'atomic_plasma'
  | 'tokyo_cyber_2099'
  | 'spring_sakura_bloom'
  | 'graviton_deep_space'
  | 'yandex_alice_purple'
  | 'ural_uvildy_lake'
  | 'laser_grid_80s'
  | 'golden_autumn_ural'
  | 'dark_matter_pulsar'
  | 'cyber_emerald_core'
  | 'first'
  | 'notebook'
  | 'pixel'
  | 'winter'
  | 'neon_grid'
  | 'chalk'
  | 'minimal'
  | 'deep_sea'
  | 'taiga'
  | 'dawn'
  | 'comic'
  | 'lava'
  | 'northern'
  | 'blueprint'
  | 'candy';

// Качество графики: экономия заряда, обычное или максимальное
export type QualityType = 'eco' | 'normal' | 'ultra';

export type FontSizeType = 'font-sm' | 'font-md' | 'font-lg' | 'font-xl';

export type TimerStyleType = 'circle' | 'digital';

export type SoundProfileType = '0' | '1' | '2' | '3' | '4'; // 0: Mute, 1: Classic, 2: 8-Bit Retro, 3: Soft, 4: Sci-Fi Bell

export type DeviceType = 'android' | 'ios' | 'pc';

export type LanguageType =
  | 'ru' // Русский
  | 'ba' // Башҡорт теле (Башкортостан / Аргаяш)
  | 'tj' // Тоҷикӣ (Таджикский)
  | 'kk' // Қазақша (Казахский)
  | 'uz' // O'zbekcha (Узбекский)
  | 'ky' // Кыргызча (Киргизский)
  | 'be' // Беларуская (Белорусский)
  | 'hy' // Հայերեն (Армянский)
  | 'az'; // Azərbaycan dili (Азербайджанский)

export interface AppSettings {
  soundProfile: SoundProfileType;
  vibro: boolean;
  warn2: boolean;
  anim: boolean;
  splash: boolean;
  mot: boolean;
  fontSize: FontSizeType;
  timerStyle: TimerStyleType;
  theme: ThemeType;
  bellNotifications?: boolean; // системные уведомления о звонках
  themeAuto?: boolean; // тема как в системе: светлая днём, тёмная ночью
  compact: boolean;
  devicePC: boolean;
  perfLow: boolean;
  quality?: QualityType;
  pomodoroWorkMin: number;
  pomodoroBreakMin: number;
  fpsOverlay?: boolean;
  matrixRain?: boolean;
  shortLessonsMode?: boolean; // 35-min shortened lesson schedule
  dynamicIsland?: boolean; // iOS Dynamic Island simulated widget
  hapticTouch?: boolean; // Enhanced iOS & Android haptic feedback
  pinLockEnabled?: boolean; // App 4-digit PIN guard
  privacyBlur?: boolean; // Anti-Spy blur for sensitive data
  privacyBlurOnWindowBlur?: boolean; // Auto blur when window is minimized/hidden
  hideGradesInProfile?: boolean; // Hide GPA and marks from public view
  chatIncognitoDefault?: boolean; // Send chat messages anonymously by default
  maintenanceMode?: boolean; // Temporary maintenance screen ("Что-то сломалось, чиним")
  aiVoiceSpeed?: number; // 0.8 | 1.0 | 1.2 | 1.5
  aiVoicePitch?: number; // 0.8 | 1.0 | 1.2
  aiAutoSpeak?: boolean; // Auto-speak AI replies
  showRoomBadges?: boolean; // Show room numbers on lesson cards
  autoSwitchTomorrow?: boolean; // Auto switch to tomorrow schedule after 15:00
  warnMinutes?: number; // 1 | 2 | 3 | 5 min before bell
  vibrationIntensity?: 'light' | 'medium' | 'heavy';
}

export interface Achievement {
  id: string;
  title: string;
  titleBa?: string;
  description: string;
  descriptionBa?: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string | number;
  hint?: string; // как получить
  screen?: ScreenId; // куда вести по кнопке «Перейти»
}

export interface HomeworkItem {
  id: number;
  cls: string;
  sub: string;
  text: string;
  done: boolean;
  pinned?: boolean;
  dueDate?: string;
  date?: string;
  createdAt?: number;
  photoUrl?: string; // photo of board or notebook
}

export interface LessonUpdate {
  id: string;
  cls: string;
  day: string;
  num: number;
  sub: string;
  room: string;
}

export interface BackpackItem {
  id: string;
  name: string;
  category: 'auto' | 'manual';
  checked: boolean;
  isCustom?: boolean;
}

export interface FormulaCard {
  id: string;
  subject: 'math' | 'geometry' | 'physics' | 'chemistry' | 'russian' | 'english';
  title: string;
  formula: string;
  description: string;
  note?: string;
  category?: string;
}

export interface ChemicalElement {
  number: number;
  symbol: string;
  nameRu: string;
  nameBa: string;
  mass: string;
  group: number;
  period: number;
  category: string;
}

export interface StudentProfile {
  fullName: string;
  className: string;
  studentNumber: string;
  birthDate: string;
  mealPlanStatus: 'active' | 'inactive';
  libraryCardNumber: string;
  emergencyContact: string;
  avatarIcon: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  level: 'school' | 'district' | 'regional' | 'all-russian';
  category: 'olympiad' | 'sport' | 'science' | 'art' | 'gto';
  year: string;
  place: '1' | '2' | '3' | 'participant' | 'gold' | 'silver';
  subject?: string;
  extraScoreBonus?: number;
}

export interface SchoolCertificateRequest {
  id: string;
  type: 'school_study' | 'military' | 'tax_deduction' | 'grades_transcript' | 'free_meal' | 'olympiad_excuse' | 'section_enrollment';
  title: string;
  studentName: string;
  className: string;
  purpose: string;
  status: 'ready' | 'pending';
  docNumber: string;
  issuedDate: string;
  qrCodeValue: string;
}

export interface CertificateItem {
  id: string;
  title: string;
  category: 'olympiad' | 'sport' | 'science' | 'art' | 'gto' | 'school';
  level: 'school' | 'district' | 'regional' | 'all-russian';
  year: string;
  place: '1' | '2' | '3' | 'participant' | 'gold' | 'silver' | 'laureate';
  issuer?: string;
  subject?: string;
  dateAdded?: string;
}

export interface SmartDayData {
  greeting: string;
  headline: string;
  summary: string;
  outfitTip: string;
  backpackTip: string;
  studyTip: string;
  urgentAlert?: string | null;
  tags: string[];
  focusSubject?: string;
  weatherSummary?: string;
  engine?: 'gemini' | 'rule_engine';
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  className: string;
  avatar: string;
  avatarType?: 'emoji' | 'image';
  status: string; // motto / quote
  bio?: string;
  gpa: number;
  hwDoneCount: number;
  gamesScore: number;
  certificates: CertificateItem[];
  friends: string[]; // IDs of friends
  registeredDate: string;
  badge?: string;
  authProvider?: 'guest' | 'local' | 'google' | 'apple';
  authEmail?: string;
  authPhotoUrl?: string;
  authUid?: string;
}

export interface AccountVault {
  registered: boolean;
  studentName: string;
  parentName: string;
  cls: string;
  shift: string;
  subGroup: number;
  lang: LanguageType;
  authProvider: 'guest' | 'local' | 'google' | 'apple';
  authEmail?: string;
  authPhotoUrl?: string;
  authUid?: string;
  authVerified?: boolean;
  updatedAt: number;
}

export interface ChatMessage {
  id?: number | string;
  created_at?: string;
  username: string;
  userId?: string;
  avatar?: string;
  content: string;
  room?: string;
  isIncognito?: boolean;
  isSelfDestruct?: boolean;
}

export interface WeatherAktivkaData {
  city: string;
  temp: number;
  feelsLike: number;
  condition: string;
  windSpeed: number;
  humidity: number;
  pressure: number;
  source?: string;
  searchQueries?: string[];
  groundingSources?: Array<{ title: string; url: string }>;
  frostStatus: {
    status: 'normal' | 'partial' | 'full';
    title: string;
    description: string;
    gradesAffected: string;
  };
  forecast: Array<{
    day: string;
    tempDay: number;
    tempNight: number;
    icon: string;
    condition: string;
  }>;
  aiNote: string;
  updatedAt: string;
}

export type ScreenId =
  | 'onboarding'
  | 'select'
  | 'letters'
  | 'main'
  | 'today'
  | 'schedule'
  | 'tomorrow'
  | 'backpack'
  | 'quarter'
  | 'formulas'
  | 'pomodoro'
  | 'homework'
  | 'map'
  | 'updates'
  | 'games'
  | 'achievements'
  | 'services'
  | 'pass'
  | 'portfolio'
  | 'studentId'
  | 'diaryAnalytics'
  | 'examCountdown'
  | 'gpa'
  | 'focus'
  | 'chat'
  | 'profile'
  | 'about'
  | 'settings'
  | 'dev'
  | 'retroFirst'
  | 'bells'
  | 'maintenance'
  | 'calendar'
  | 'board'

