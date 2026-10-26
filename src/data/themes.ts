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
    desc: 'Графит с бирюзовым акцентом и мягким фиолетовым отсветом',
    light: false,
    preview: { background: 'radial-gradient(circle at 15% 0%,rgba(45,212,191,.25),transparent 55%), radial-gradient(circle at 100% 100%,rgba(139,92,246,.25),transparent 55%), #0b0d12', card: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.14)', text: '#f5f7fa', accent: '#2dd4bf', radius: 10, font: 'system-ui' },
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
    id: 'deep_sea',
    name: 'Глубина моря',
    desc: 'Бирюзовая вода и всплывающие пузырьки',
    light: false,
    preview: { background: 'radial-gradient(circle at 30% 70%,rgba(255,255,255,.5) 0 2px,transparent 3px) 0 0/16px 16px, linear-gradient(180deg,#0e7490,#083344 70%,#020617)', card: 'rgba(8,51,68,.6)', border: 'rgba(103,232,249,.5)', text: '#ecfeff', accent: '#22d3ee', radius: 20, font: 'system-ui' },
  },
  {
    id: 'taiga',
    name: 'Тайга',
    desc: 'Ночной хвойный лес и светлячки',
    light: false,
    preview: { background: 'radial-gradient(circle at 70% 30%,#fde047 0 1.5px,transparent 2.5px) 0 0/18px 18px, linear-gradient(180deg,#0b1f17,#123524 60%,#1d4430)', card: 'rgba(20,48,34,.75)', border: 'rgba(163,230,53,.45)', text: '#ecfccb', accent: '#a3e635', radius: 12, font: 'Georgia,serif' },
  },
  {
    id: 'lava',
    name: 'Лава',
    desc: 'Медленно плывущие пятна раскалённой магмы',
    light: false,
    preview: { background: 'radial-gradient(circle at 25% 75%,#f97316,transparent 40%), radial-gradient(circle at 80% 20%,#dc2626,transparent 40%), #1c0a05', card: 'rgba(40,10,5,.7)', border: 'rgba(251,146,60,.55)', text: '#fff7ed', accent: '#fb923c', radius: 22, font: 'system-ui' },
  },
  {
    id: 'northern',
    name: 'Северное сияние',
    desc: 'Переливающееся небо и толстое матовое стекло',
    light: false,
    preview: { background: 'linear-gradient(120deg,#052e2b,#065f46 30%,#4c1d95 70%,#0c0a24)', card: 'rgba(255,255,255,.1)', border: 'rgba(110,231,183,.5)', text: '#f0fdfa', accent: '#6ee7b7', radius: 20, font: 'system-ui' },
  },
  {
    id: 'blueprint',
    name: 'Чертёж',
    desc: 'Синяя миллиметровка, белые линии и шрифт инженера',
    light: false,
    preview: { background: '#0b3a75 linear-gradient(rgba(255,255,255,.18) 1px,transparent 1px) 0 0/10px 10px', card: 'rgba(11,58,117,.6)', border: 'rgba(255,255,255,.75)', text: '#fff', accent: '#ffffff', radius: 2, font: '"Courier New",monospace' },
  },
  {
    id: 'dawn',
    name: 'Рассвет',
    desc: 'Тёплый персиковый свет — светлая и мягкая',
    light: true,
    preview: { background: 'linear-gradient(180deg,#fde4cf,#ffd6e0 60%,#e9d5ff)', card: 'rgba(255,255,255,.8)', border: '#fbb79b', text: '#7c2d12', accent: '#f97316', radius: 18, font: 'system-ui' },
  },
  {
    id: 'comic',
    name: 'Комикс',
    desc: 'Жирные чёрные контуры, точки и яркие плашки',
    light: true,
    preview: { background: '#fff7c2 radial-gradient(#f5c400 1px,transparent 1.5px) 0 0/7px 7px', card: '#ffffff', border: '#111', text: '#111', accent: '#ef4444', radius: 6, font: '"Comic Sans MS","Chalkboard SE",cursive' },
  },
  {
    id: 'candy',
    name: 'Конфетка',
    desc: 'Пастельные цвета и очень круглые карточки',
    light: true,
    preview: { background: 'linear-gradient(135deg,#fce7f3,#ede9fe 50%,#dbeafe)', card: 'rgba(255,255,255,.85)', border: '#f9a8d4', text: '#831843', accent: '#ec4899', radius: 26, font: 'system-ui' },
  },
  {
    id: 'mocha',
    name: 'Кофейня',
    desc: 'Тёплый кофейный цвет, карамельный акцент и уютные заголовки',
    light: false,
    preview: { background: 'radial-gradient(circle at 80% 10%,rgba(224,169,109,.3),transparent 50%), #1a120d', card: 'rgba(255,240,225,.07)', border: 'rgba(224,169,109,.45)', text: '#f5e9dc', accent: '#e0a96d', radius: 16, font: 'Georgia,serif' },
  },
  {
    id: 'sunset_city',
    name: 'Закатный город',
    desc: 'Фиолетово-оранжевое небо и силуэт города внизу',
    light: false,
    preview: { background: 'linear-gradient(180deg,#2a1155,#7a2a6e 55%,#f08a4b)', card: 'rgba(30,10,50,.6)', border: 'rgba(255,138,101,.55)', text: '#fff1f5', accent: '#ff8a65', radius: 14, font: 'system-ui' },
  },
  {
    id: 'midnight_gold',
    name: 'Полночь и золото',
    desc: 'Чёрный бархат и тонкие золотые линии',
    light: false,
    preview: { background: 'radial-gradient(circle at 50% 0%,rgba(212,175,55,.18),transparent 60%), #0a0a0c', card: 'rgba(255,255,255,.03)', border: 'rgba(212,175,55,.6)', text: '#f5f0e1', accent: '#d4af37', radius: 6, font: 'Georgia,serif' },
  },
  {
    id: 'blossom',
    name: 'Цветущая вишня',
    desc: 'Светлая, с падающими лепестками сакуры',
    light: true,
    preview: { background: 'radial-gradient(circle at 30% 30%,#f9a8d4 0 2px,transparent 3px) 0 0/16px 16px, linear-gradient(180deg,#fff5f8,#fde2ec)', card: 'rgba(255,255,255,.85)', border: '#f4b6cc', text: '#6b1d3a', accent: '#db2777', radius: 20, font: 'system-ui' },
  },
  {
    id: 'kraft',
    name: 'Крафт',
    desc: 'Светлая: крафтовая бумага, штампы и шрифт печатной машинки',
    light: true,
    preview: { background: '#d9c4a0', card: '#efe3cc', border: '#7a5a3a', text: '#3b2a1a', accent: '#a0442c', radius: 4, font: '"Courier New",monospace' },
  },
  {
    id: 'fresh_mint',
    name: 'Мятная свежесть',
    desc: 'Светлая, мятная и спокойная — для долгих уроков',
    light: true,
    preview: { background: 'linear-gradient(160deg,#ecfdf5,#d1fae5)', card: '#ffffff', border: '#86efac', text: '#064e3b', accent: '#059669', radius: 18, font: 'system-ui' },
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
