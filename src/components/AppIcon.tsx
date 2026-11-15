import React, { useId } from 'react';

// Свои иконки АСОШ Таймера вместо эмодзи: одинаковые на всех телефонах и компьютерах.
// Рисунок 24×24, линии 2 px, скруглённые концы.

type Glyph = React.ReactNode;

const dot = (cx: number, cy: number, r = 1.2) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

const GLYPHS: Record<string, Glyph> = {
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  tomorrow: (
    <>
      <path d="M3 19h18" />
      <path d="M7 19a5 5 0 0 1 10 0" />
      <path d="M12 5v3M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h14l-3.5-3.5" />
      <path d="M20 16H6l3.5 3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      {dot(8.5, 14.5)}
      {dot(12, 14.5)}
      {dot(15.5, 14.5)}
    </>
  ),
  door: (
    <>
      <path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" />
      <path d="M3 21h18" />
      {dot(14.5, 12.5)}
    </>
  ),
  backpack: (
    <>
      <path d="M5.5 11a6.5 6.5 0 0 1 13 0v8a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z" />
      <path d="M9 5a3 3 0 0 1 6 0" />
      <path d="M9 14.5h6v3H9z" />
    </>
  ),
  diary: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v18H7.5A2.5 2.5 0 0 1 5 18.5z" />
      <path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H19" />
      <path d="M9 9l2 2 4-4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16.5v-4M12 16.5v-9M17 16.5v-6.5" strokeWidth="2.6" />
    </>
  ),
  calc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M8.5 7.5h7" />
      {dot(9, 12)}
      {dot(12, 12)}
      {dot(15, 12)}
      {dot(9, 16)}
      {dot(12, 16)}
      {dot(15, 16)}
    </>
  ),
  formula: (
    <>
      <path d="M3 13h3l3 7 5-16h7" />
      <path d="M15 11l5 5M20 11l-5 5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.5M10 2.5h4M12 2.5V6" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 16v-4a8 8 0 0 1 16 0v4" />
      <rect x="3" y="14" width="4.5" height="7" rx="1.8" />
      <rect x="16.5" y="14" width="4.5" height="7" rx="1.8" />
    </>
  ),
  chat: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17A2.5 2.5 0 0 1 4 14.5z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.5A5.5 5.5 0 0 1 21 20" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 3.5h8v6a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5a3 3 0 0 0 3.3 4.5M16 5.5h3a3 3 0 0 1-3.3 4.5" />
      <path d="M12 13.5V17M8.5 21h7M9.5 17h5v4h-5z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  folderStar: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M12 10.3l1.1 2.2 2.4.3-1.75 1.65.45 2.35L12 15.7l-2.2 1.1.45-2.35L8.5 12.8l2.4-.3z" strokeWidth="1.6" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2.5" />
      <path d="M8.5 21h7M12 17v4" />
    </>
  ),
  teacher: (
    <>
      <rect x="3.5" y="3.5" width="17" height="11.5" rx="2" />
      <path d="M7 8h6M7 11h4M12 15v5M8 21l4-1 4 1" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="1.8" />
      <path d="M3 7.5h18V11H3zM12 7.5V21" />
      <path d="M12 7.5C10.5 4 7 4 7 6s3 1.5 5 1.5c2 0 5 .5 5-1.5s-3.5-2-5 1.5" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 11L12 3.5l8.5 7.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  stopwatch: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5l3-3M10 2.5h4M18.5 6.5L20 5" />
    </>
  ),
  book: (
    <>
      <path d="M3 5.5c3-1.5 6-1.5 9 .5v14c-3-2-6-2-9-.5z" />
      <path d="M21 5.5c-3-1.5-6-1.5-9 .5v14c3-2 6-2 9-.5z" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 7.5h10a4 4 0 0 1 4 4.6l-.6 4.2a2.5 2.5 0 0 1-4.2 1.4L14 15.5h-4l-2.2 2.2a2.5 2.5 0 0 1-4.2-1.4L3 12.1a4 4 0 0 1 4-4.6z" />
      <path d="M8 10.5v3.5M6.25 12.25h3.5" />
      {dot(15.5, 11)}
      {dot(17.5, 13.3)}
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.85 1.85M16.85 16.85l1.85 1.85M5.3 18.7l1.85-1.85M16.85 7.15l1.85-1.85" />
      <circle cx="12" cy="12" r="6.6" />
    </>
  ),
  runner: (
    <>
      <circle cx="15" cy="4.5" r="2" />
      <path d="M6.5 11l3.5-3.5h4.5l2.5 3.5 3 1" />
      <path d="M12.5 7.5l-1.5 6.5 4 3V22" />
      <path d="M11 14l-2.5 3.5H4" />
    </>
  ),
  multiply: <path d="M6 6l12 12M18 6L6 18" strokeWidth="2.6" />,
  tiles: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </>
  ),
  swords: <path d="M3 3l11 11M21 3L10 14M5.5 13.5l5 5M13.5 18.5l5-5M7.5 16.5L4 20M16.5 16.5L20 20" />,
  snake: (
    <>
      <path d="M4 19.5h8.5a3.5 3.5 0 0 0 0-7H9a3 3 0 0 1 0-6h7.5" />
      <path d="M16.5 6.5l3-2M16.5 6.5l3 2" />
    </>
  ),
  rocket: (
    <>
      <path d="M13 15l-4-4c2-5.5 6-8 12-8 0 6-2.5 10-8 12z" />
      <path d="M9 11l-4.5.5L3 14.5l4 1M13 15l-.5 4.5-3 1.5-1-4" />
      <circle cx="15.5" cy="8.5" r="1.4" />
    </>
  ),
  plane: <path d="M3 11l18-7-7 18-2.5-8zM11.5 14L21 4" />,
  brain: (
    <>
      <path d="M12 5.5a3 3 0 0 0-5.5-1A3 3 0 0 0 4 9a3 3 0 0 0 0 5 3 3 0 0 0 3 4.5 3 3 0 0 0 5 1.5z" />
      <path d="M12 5.5a3 3 0 0 1 5.5-1A3 3 0 0 1 20 9a3 3 0 0 1 0 5 3 3 0 0 1-3 4.5 3 3 0 0 1-5 1.5" />
    </>
  ),
  tictactoe: <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" />,
  cards: (
    <>
      <rect x="8" y="3" width="12" height="15" rx="2" />
      <path d="M5 7v12a2 2 0 0 0 2 2h9" />
    </>
  ),
  zap: <path d="M13 2.5L4.5 14H11l-1 7.5L19.5 10H13z" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-2 0-.6-.3-1-.6-1.4-.4-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-4-4-7.2-9-7.2z" />
      {dot(7.5, 11)}
      {dot(10, 7)}
      {dot(14.5, 7)}
    </>
  ),
  shield: <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z" />,
  sound: (
    <>
      <path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
};

// Цвет плитки: начало и конец градиента
const COLORS: Record<string, [string, string]> = {
  bell: ['#fbbf24', '#f97316'],
  tomorrow: ['#818cf8', '#6366f1'],
  swap: ['#fb7185', '#e11d48'],
  calendar: ['#38bdf8', '#2563eb'],
  door: ['#f59e0b', '#b45309'],
  backpack: ['#34d399', '#059669'],
  diary: ['#60a5fa', '#4f46e5'],
  chart: ['#a78bfa', '#7c3aed'],
  calc: ['#94a3b8', '#475569'],
  formula: ['#22d3ee', '#0891b2'],
  timer: ['#f87171', '#dc2626'],
  headphones: ['#c084fc', '#9333ea'],
  chat: ['#4ade80', '#16a34a'],
  people: ['#2dd4bf', '#0d9488'],
  trophy: ['#facc15', '#ca8a04'],
  user: ['#7dd3fc', '#0284c7'],
  folderStar: ['#fdba74', '#ea580c'],
  tv: ['#64748b', '#1e293b'],
  teacher: ['#86efac', '#15803d'],
  gift: ['#f472b6', '#db2777'],
  gamepad: ['#22d3ee', '#7c3aed'],
  book: ['#60a5fa', '#2563eb'],
};

export type AppIconName = keyof typeof GLYPHS;

// Плитка-иконка: цветной скруглённый квадрат с белым рисунком
export const AppIcon: React.FC<{ name: AppIconName; size?: number; className?: string }> = ({ name, size = 32, className }) => {
  const id = useId().replace(/:/g, '');
  const [from, to] = COLORS[name] || ['#22d3ee', '#0891b2'];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#g${id})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="rgba(255,255,255,0.28)" />
      <g
        transform="translate(6.4 6.4) scale(0.8)"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: '#fff' }}
      >
        {GLYPHS[name]}
      </g>
    </svg>
  );
};

// Линейная иконка цвета текста (для нижнего меню)
export const LineIcon: React.FC<{ name: AppIconName; size?: number }> = ({ name, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {GLYPHS[name]}
  </svg>
);
