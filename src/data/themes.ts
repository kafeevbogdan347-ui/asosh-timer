import { ThemeType } from '../types';

// Особые темы: каждая меняет не только цвета, но и фон, форму карточек, шрифты и анимации.
// Сами стили — в src/themes.css (body.theme-<id>).
export interface ThemeInfo {
  id: ThemeType;
  name: string;
  desc: string;
  light: boolean;
  // Мини-превью для выбора темы в настройках
  preview: {
    background: string;
    card: string;
    border: string;
    text: string;
    accent: string;
    radius: number;
    font: string;
  };
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'dark',
    name: 'Тёмная',
    desc: 'Классика приложения: сапфировый фон и стекло',
    light: false,
    preview: { background: 'linear-gradient(160deg,#040916,#0a1b40)', card: 'rgba(14,28,64,.8)', border: 'rgba(56,189,248,.4)', text: '#fff', accent: '#00f0ff', radius: 10, font: 'system-ui' },
  },
  {
    id: 'notebook',
    name: 'Тетрадь в клетку',
    desc: 'Бумага в клетку, поля и рукописные заголовки',
    light: true,
    preview: { background: '#fbf8ef linear-gradient(#cfe0f5 1px,transparent 1px) 0 0/8px 8px', card: '#fffdf7', border: '#9db8dd', text: '#1e3a8a', accent: '#dc2626', radius: 4, font: '"Segoe Print","Bradley Hand","Comic Sans MS",cursive' },
  },
  {
    id: 'pixel',
    name: 'Пиксели',
    desc: 'Как старая игровая приставка: квадраты и моноширинный шрифт',
    light: false,
    preview: { background: '#0b1020', card: '#16213e', border: '#7cf27c', text: '#e6ffe6', accent: '#7cf27c', radius: 0, font: '"Courier New",monospace' },
  },
  {
    id: 'space',
    name: 'Космос',
    desc: 'Летящие звёзды и светящееся стекло',
    light: false,
    preview: { background: 'radial-gradient(circle at 30% 30%,#fff 0 1px,transparent 1.5px) 0 0/14px 14px, radial-gradient(circle at 70% 20%,#3b1d6e,#05010f)', card: 'rgba(40,20,80,.55)', border: 'rgba(196,181,253,.5)', text: '#f5f3ff', accent: '#c084fc', radius: 16, font: 'system-ui' },
  },
  {
    id: 'winter',
    name: 'Уральская зима',
    desc: 'Падающий снег и морозное стекло',
    light: false,
    preview: { background: 'radial-gradient(circle at 25% 35%,#fff 0 1.5px,transparent 2px) 0 0/12px 12px, linear-gradient(180deg,#0b2545,#13315c 60%,#1b4965)', card: 'rgba(255,255,255,.14)', border: 'rgba(255,255,255,.55)', text: '#fff', accent: '#bde0fe', radius: 18, font: 'system-ui' },
  },
  {
    id: 'neon_grid',
    name: 'Неон 80-х',
    desc: 'Сетка-горизонт, закат и свечение',
    light: false,
    preview: { background: 'linear-gradient(180deg,#14002b 55%,#2b0045 55%), repeating-linear-gradient(90deg,#ff2bd6 0 1px,transparent 1px 10px)', card: 'rgba(25,0,45,.85)', border: '#ff2bd6', text: '#fff', accent: '#22f3ff', radius: 6, font: '"Arial Black",system-ui' },
  },
  {
    id: 'chalk',
    name: 'Школьная доска',
    desc: 'Зелёная доска, мел и пунктир',
    light: false,
    preview: { background: 'radial-gradient(circle at 30% 20%,#3d6b4f,#1f3a2a)', card: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.6)', text: '#f4f1e8', accent: '#fde68a', radius: 8, font: '"Chalkboard SE","Segoe Print","Comic Sans MS",cursive' },
  },
  {
    id: 'minimal',
    name: 'Минимализм',
    desc: 'Белый, строгий, заголовки с засечками',
    light: true,
    preview: { background: '#f6f6f4', card: '#ffffff', border: '#e2e2de', text: '#111', accent: '#111', radius: 12, font: 'Georgia,serif' },
  },
  {
    id: 'amoled',
    name: 'AMOLED',
    desc: 'Чистый чёрный без эффектов — бережёт батарею',
    light: false,
    preview: { background: '#000', card: '#000', border: '#2a2a2a', text: '#fff', accent: '#fff', radius: 12, font: 'system-ui' },
  },
  {
    id: 'first',
    name: 'Первый',
    desc: 'Пасхалка: самая первая версия приложения 5Б',
    light: false,
    preview: { background: 'linear-gradient(160deg,#0f172a,#1e293b)', card: 'rgba(255,255,255,.08)', border: 'rgba(255,255,255,.2)', text: '#f8fafc', accent: '#38bdf8', radius: 10, font: 'system-ui' },
  },
];

// Светлые темы: для них включается общий светлый режим (тёмный текст на светлых панелях)
export const LIGHT_THEME_IDS: ThemeType[] = ['light', 'nordic', ...THEMES.filter((t) => t.light).map((t) => t.id)];

// Старые темы убрали из выбора: переводим сохранённую тему на ближайшую из нового списка
export const migrateTheme = (id: string): ThemeType => {
  if (THEMES.some((t) => t.id === id)) return id as ThemeType;
  if (LIGHT_THEME_IDS.includes(id as ThemeType) || /sakura|spring|holographic|frost|mint/.test(id)) return 'notebook';
  if (/retro|mario|pixel/.test(id)) return 'pixel';
  if (/neon|cyber|synthwave|laser|vice|tokyo|glitch/.test(id)) return 'neon_grid';
  if (/space|galaxy|nebula|void|graviton|pulsar|dark_matter|saturn/.test(id)) return 'space';
  if (/arctic|ice|winter/.test(id)) return 'winter';
  return 'dark';
};
