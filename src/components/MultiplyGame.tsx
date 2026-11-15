import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';

// «Таблица на скорость»: пример падает сверху, успей ввести ответ, пока он не долетел до пола.
// Три уровня: таблица умножения (5–6 класс), умножение и деление до 20 (7–9), квадраты и корни (10–11).

export type Level = 'easy' | 'mid' | 'hard';

export const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: 'easy', label: '5–6 класс', desc: 'таблица умножения' },
  { id: 'mid', label: '7–9 класс', desc: '× и ÷ до 20' },
  { id: 'hard', label: '10–11 класс', desc: 'квадраты и корни' },
];

export interface Task {
  text: string;
  answer: number;
}

// rand — генератор случайных чисел: в онлайн-дуэли у обоих игроков одинаковый, чтобы примеры совпали
export function makeTask(level: Level, rand: () => number = Math.random): Task {
  const rnd = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  if (level === 'easy') {
    const a = rnd(2, 9);
    const b = rnd(2, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (level === 'mid') {
    const a = rnd(3, 19);
    const b = rnd(3, 12);
    return rand() < 0.5 ? { text: `${a} × ${b}`, answer: a * b } : { text: `${a * b} ÷ ${b}`, answer: a };
  }
  const k = rand();
  if (k < 0.35) {
    const a = rnd(11, 25);
    return { text: `${a}²`, answer: a * a };
  }
  if (k < 0.7) {
    const a = rnd(4, 30);
    return { text: `√${a * a}`, answer: a };
  }
  const a = rnd(2, 3);
  const n = a === 2 ? rnd(5, 10) : rnd(3, 6);
  return { text: `${a}^${n}`, answer: a ** n };
}

interface MultiplyGameProps {
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
}

const FALL_H = 120; // высота поля, px: вместе с цифрами помещается на экран телефона

export const MultiplyGame: React.FC<MultiplyGameProps> = ({ soundProfile, vibro, onShowToast }) => {
  const [level, setLevel] = useState<Level>('easy');
  const [playing, setPlaying] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [over, setOver] = useState(false);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const bestKey = `asosh_mult_best_${level}`;
  const [best, setBest] = useState(() => Number(localStorage.getItem('asosh_mult_best_easy') || '0'));
  const yRef = useRef<HTMLDivElement | null>(null);
  const fall = useRef({ t0: 0, dur: 8000, solved: 0 });
  const stateRef = useRef({ score: 0, lives: 3 });

  useEffect(() => {
    setBest(Number(localStorage.getItem(bestKey) || '0'));
  }, [bestKey]);

  const nextTask = () => {
    setTask(makeTask(level));
    setInput('');
    // каждые 5 решённых — падает быстрее: с 8 до 3 секунд
    fall.current.dur = Math.max(3000, 8000 - Math.floor(fall.current.solved / 5) * 700);
    fall.current.t0 = performance.now();
  };

  const finish = () => {
    setPlaying(false);
    setOver(true);
    playSound('gameover', soundProfile);
    doVibro(vibro, 60);
    const total = stateRef.current.score;
    if (total > Number(localStorage.getItem(bestKey) || '0')) {
      localStorage.setItem(bestKey, String(total));
      setBest(total);
      onShowToast('🏆 Новый рекорд в «Таблице на скорость»!');
    }
  };

  const boxRef = useRef<HTMLDivElement | null>(null);
  const start = () => {
    // поле и цифры целиком на экране
    boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    stateRef.current = { score: 0, lives: 3 };
    fall.current.solved = 0;
    setScore(0);
    setLives(3);
    setCombo(0);
    setOver(false);
    setPlaying(true);
    playSound('flip', soundProfile);
    nextTask();
  };

  // Падение примера: каждый кадр двигаем карточку, у пола — минус жизнь
  useEffect(() => {
    if (!playing || !task) return;
    let raf = 0;
    const frame = (now: number) => {
      const p = (now - fall.current.t0) / fall.current.dur;
      if (yRef.current) yRef.current.style.transform = `translateY(${Math.min(1, p) * FALL_H}px)`;
      if (p >= 1) {
        stateRef.current.lives -= 1;
        setLives(stateRef.current.lives);
        setCombo(0);
        setFlash('bad');
        setTimeout(() => setFlash(null), 300);
        playSound('buzzer', soundProfile);
        doVibro(vibro, 40);
        if (stateRef.current.lives <= 0) {
          finish();
          return;
        }
        nextTask();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, task]);

  const type = (ch: string) => {
    if (!playing || !task) return;
    if (ch === 'del') {
      setInput((v) => v.slice(0, -1));
      return;
    }
    const v = (input + ch).slice(0, 5);
    if (Number(v) === task.answer) {
      fall.current.solved += 1;
      const c = combo + 1;
      // быстрее ответил — больше очков; за серию из 5 — бонус
      const left = 1 - (performance.now() - fall.current.t0) / fall.current.dur;
      const pts = 10 + Math.round(left * 10) + (c % 5 === 0 ? 20 : 0);
      stateRef.current.score += pts;
      setScore(stateRef.current.score);
      setCombo(c);
      setFlash('ok');
      setTimeout(() => setFlash(null), 250);
      playSound(c % 5 === 0 ? 'combo' : 'coin', soundProfile);
      doVibro(vibro, 12);
      nextTask();
      return;
    }
    if (v.length >= String(task.answer).length) {
      // неверно: стираем, пример продолжает падать
      setInput('');
      setCombo(0);
      setFlash('bad');
      setTimeout(() => setFlash(null), 250);
      playSound('buzzer', soundProfile);
      return;
    }
    setInput(v);
  };

  // Цифры с клавиатуры на компьютере
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playing) return;
      if (/^[0-9]$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') type('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div ref={boxRef} className="p-4 bg-slate-900/90 rounded-3xl border border-violet-400/30 space-y-3 text-center scroll-mt-2">
      <div className="flex justify-between items-center px-1">
        <div className="text-sm font-black text-violet-300">✖️ Таблица на скорость</div>
        <div className="text-xs text-amber-300 font-mono font-bold">Рекорд: {best} 🏆</div>
      </div>

      {!playing && (
        <div className="grid grid-cols-3 gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`p-2 rounded-xl border text-[11px] font-bold leading-tight cursor-pointer ${
                level === l.id ? 'bg-violet-500/30 border-violet-300 text-white' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              {l.label}
              <span className="block text-[10px] font-normal text-white/60">{l.desc}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={`relative mx-auto max-w-[340px] rounded-2xl border-2 overflow-hidden transition-colors ${
          flash === 'ok' ? 'border-emerald-400 bg-emerald-950/40' : flash === 'bad' ? 'border-rose-500 bg-rose-950/40' : 'border-violet-400/50 bg-slate-950'
        }`}
        style={{ height: FALL_H + 64 }}
      >
        {playing && task ? (
          <div ref={yRef} className="absolute left-0 right-0 top-2 flex justify-center will-change-transform">
            <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-b from-violet-500 to-indigo-600 text-white text-2xl font-black font-mono shadow-lg">
              {task.text.includes('^') ? (
                <>
                  {task.text.split('^')[0]}
                  <sup className="text-base">{task.text.split('^')[1]}</sup>
                </>
              ) : (
                task.text
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-xs text-white/70">
            {over ? `Игра окончена. Очки: ${score}` : 'Пример падает сверху — введи ответ, пока он не упал. Серия из 5 верных — бонус!'}
          </div>
        )}
        <div className="absolute left-0 right-0 bottom-0 h-1.5 bg-rose-500/60" />
      </div>

      <div className="flex justify-between items-center text-xs font-bold px-1">
        <span className="text-white">
          Очки: <b className="text-violet-300 text-lg font-mono">{score}</b>
          {combo >= 2 && <span className="ml-2 text-amber-300">серия ×{combo}</span>}
        </span>
        <span className="text-rose-300 text-sm" aria-label={`Жизней: ${lives}`}>
          {'♥'.repeat(Math.max(0, lives))}
          <span className="text-white/20">{'♥'.repeat(Math.max(0, 3 - lives))}</span>
        </span>
      </div>

      {playing ? (
        <>
          <div className="h-11 mx-auto max-w-[340px] rounded-xl bg-black/40 border border-white/15 flex items-center justify-center text-2xl font-black font-mono text-white">
            {input || <span className="text-white/25">?</span>}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mx-auto max-w-[340px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'].map((k) => (
              <button
                key={k}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  type(k);
                }}
                className={`py-3 rounded-xl bg-white/8 border border-white/12 text-lg font-black text-white active:scale-95 active:bg-violet-500/40 select-none cursor-pointer ${
                  k === '0' ? 'col-span-2' : ''
                }`}
              >
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={start}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Play className="w-4 h-4" />
          <span>{over ? 'ЕЩЁ РАЗ' : 'СТАРТ'}</span>
        </button>
      )}
    </div>
  );
};
