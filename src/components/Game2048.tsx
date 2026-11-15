import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';

// «2048: от двойки до медали». Одинаковые плитки сливаются в следующую ступень учёбы:
// двойка → тройка → четвёрка → пятёрка → … → золотая медаль (2048).

type Grid = number[]; // 16 клеток, 0 — пусто

const STAGES: Record<number, { label: string; caption: string; bg: string; fg: string }> = {
  2: { label: '2', caption: 'двойка', bg: '#7f1d1d', fg: '#fecaca' },
  4: { label: '3', caption: 'тройка', bg: '#9a3412', fg: '#fed7aa' },
  8: { label: '4', caption: 'четвёрка', bg: '#1e40af', fg: '#dbeafe' },
  16: { label: '5', caption: 'пятёрка', bg: '#047857', fg: '#d1fae5' },
  32: { label: '5+', caption: 'с плюсом', bg: '#0f766e', fg: '#ccfbf1' },
  64: { label: 'Чтв', caption: 'четверть', bg: '#6d28d9', fg: '#ede9fe' },
  128: { label: 'Гр', caption: 'грамота', bg: '#a21caf', fg: '#fae8ff' },
  256: { label: 'Ол', caption: 'олимпиада', bg: '#be185d', fg: '#fce7f3' },
  512: { label: 'ПЛ', caption: 'похв. лист', bg: '#b45309', fg: '#fef3c7' },
  1024: { label: 'Ат', caption: 'аттестат', bg: '#a16207', fg: '#fef9c3' },
  2048: { label: '🥇', caption: 'медаль', bg: '#ca8a04', fg: '#fffbeb' },
};

const empty = (): Grid => Array(16).fill(0);

function addRandom(g: Grid): Grid {
  const free = g.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (!free.length) return g;
  const next = g.slice();
  next[free[Math.floor(Math.random() * free.length)]] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

// Сдвиг одной линии влево: [2,2,4,0] → [4,4,0,0], очки = сумма слияний
function slideLine(line: number[]): { line: number[]; gained: number } {
  const vals = line.filter((v) => v);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) {
      out.push(vals[i] * 2);
      gained += vals[i] * 2;
      i++;
    } else out.push(vals[i]);
  }
  while (out.length < 4) out.push(0);
  return { line: out, gained };
}

type Dir = 'left' | 'right' | 'up' | 'down';

export function move(g: Grid, dir: Dir): { grid: Grid; gained: number; moved: boolean } {
  const next = empty();
  let gained = 0;
  for (let k = 0; k < 4; k++) {
    // индексы клеток линии в порядке «к стене»
    const idx = [0, 1, 2, 3].map((j) => {
      if (dir === 'left') return k * 4 + j;
      if (dir === 'right') return k * 4 + (3 - j);
      if (dir === 'up') return j * 4 + k;
      return (3 - j) * 4 + k;
    });
    const res = slideLine(idx.map((i) => g[i]));
    gained += res.gained;
    idx.forEach((i, j) => (next[i] = res.line[j]));
  }
  return { grid: next, gained, moved: next.some((v, i) => v !== g[i]) };
}

const canMove = (g: Grid) => (['left', 'right', 'up', 'down'] as Dir[]).some((d) => move(g, d).moved);

const SAVE_KEY = 'asosh_2048_state';

interface Game2048Props {
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
}

export const Game2048: React.FC<Game2048Props> = ({ soundProfile, vibro, onShowToast }) => {
  // Партия сохраняется: можно уйти на урок и доиграть на перемене
  const [state, setState] = useState<{ grid: Grid; score: number }>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (s && Array.isArray(s.grid) && s.grid.length === 16) return s;
    } catch {
      // нет сохранения
    }
    return { grid: addRandom(addRandom(empty())), score: 0 };
  });
  const [best, setBest] = useState(() => Number(localStorage.getItem('asosh_2048_best') || '0'));
  const [newIdx, setNewIdx] = useState(-1);
  const over = !canMove(state.grid);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // нет места
    }
  }, [state]);

  const doMove = (dir: Dir) => {
    const res = move(state.grid, dir);
    if (!res.moved) return;
    const withNew = addRandom(res.grid);
    setNewIdx(withNew.findIndex((v, i) => v !== res.grid[i]));
    const score = state.score + res.gained;
    setState({ grid: withNew, score });
    const maxBefore = Math.max(...state.grid);
    const maxAfter = Math.max(...res.grid);
    if (maxAfter > maxBefore && maxAfter >= 16) {
      playSound(maxAfter >= 2048 ? 'victory' : 'star', soundProfile);
      onShowToast(maxAfter >= 2048 ? '🥇 Золотая медаль! Ты дошёл до 2048!' : `Новая ступень: ${STAGES[maxAfter]?.caption || maxAfter}!`);
    } else if (res.gained) {
      playSound('coin', soundProfile);
    } else {
      playSound('click', soundProfile);
    }
    doVibro(vibro, 8);
    if (score > best) {
      setBest(score);
      localStorage.setItem('asosh_2048_best', String(score));
    }
    if (!canMove(withNew)) {
      playSound('gameover', soundProfile);
      doVibro(vibro, 50);
    }
  };

  const restart = () => {
    setState({ grid: addRandom(addRandom(empty())), score: 0 });
    setNewIdx(-1);
    playSound('flip', soundProfile);
  };

  // Стрелки и WASD на компьютере
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
      const dir = map[e.code];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="p-4 bg-slate-900/90 rounded-3xl border border-amber-400/30 space-y-3 text-center">
      <div className="flex justify-between items-center px-1">
        <div className="text-sm font-black text-amber-300">🥇 2048: до медали</div>
        <div className="text-xs text-amber-300 font-mono font-bold">Рекорд: {best} 🏆</div>
      </div>
      <p className="text-xs text-white/60">Свайпай или жми стрелки. Две одинаковые оценки сливаются в следующую: 2 → 3 → 4 → 5 → … → золотая медаль.</p>

      <div
        className="mx-auto w-full max-w-[340px] aspect-square p-2 rounded-2xl bg-slate-950 border-2 border-amber-400/40 grid grid-cols-4 grid-rows-4 gap-2 select-none"
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        }}
      >
        {state.grid.map((v, i) => {
          const st = STAGES[v] || (v ? { label: String(v), caption: '', bg: '#ca8a04', fg: '#fff' } : null);
          return (
            <div
              key={`${i}-${v}-${i === newIdx ? 'n' : ''}`}
              className={`rounded-xl flex flex-col items-center justify-center leading-none ${st ? 'tile-pop' : ''}`}
              style={{ background: st ? st.bg : 'rgba(255,255,255,0.05)', color: st?.fg }}
            >
              {st && (
                <>
                  <span className="text-xl sm:text-2xl font-black">{st.label}</span>
                  <span className="text-[9px] font-bold opacity-80 mt-0.5">{st.caption}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-xs font-bold px-1">
        <span className="text-white">
          Очки: <b className="text-amber-300 text-lg font-mono">{state.score}</b>
        </span>
        <button
          type="button"
          onClick={restart}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>НОВАЯ ИГРА</span>
        </button>
      </div>

      {over && (
        <div className="p-3 bg-rose-950/80 rounded-2xl border border-rose-500/40 text-xs font-bold text-rose-300">
          Ходов больше нет. Очки: {state.score}. Нажми «Новая игра».
        </div>
      )}
    </div>
  );
};
