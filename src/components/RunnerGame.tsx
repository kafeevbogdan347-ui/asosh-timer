import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';

// «Беги со звонка»: раннер по школьному коридору.
// Прыжок: тап по полю, кнопка, пробел или стрелка вверх. В воздухе можно прыгнуть ещё раз.

const W = 300;
const H = 200;
const FLOOR = 166; // линия пола
const PX = 60; // где бежит ученик
const GRAVITY = 0.55;
const JUMP = -9.2;
const JUMP2 = -7.6;

type Kind = 'bag' | 'books' | 'bucket' | 'zavuch' | 'ball';

const KINDS: Record<Kind, { emoji: string; size: number; w: number; h: number; extra: number; fly?: boolean; why: string }> = {
  bag: { emoji: '🎒', size: 24, w: 18, h: 20, extra: 0, why: 'Споткнулся о портфель!' },
  books: { emoji: '📚', size: 24, w: 20, h: 20, extra: 0, why: 'Влетел в стопку учебников!' },
  bucket: { emoji: '🪣', size: 22, w: 16, h: 18, extra: 0, why: 'Опрокинул ведро уборщицы!' },
  zavuch: { emoji: '👩‍🏫', size: 34, w: 18, h: 32, extra: 1.1, why: 'Завуч поймал в коридоре!' },
  // мяч летит на уровне головы: под ним надо пробежать, а не прыгать
  ball: { emoji: '⚽', size: 20, w: 14, h: 14, extra: 2.2, fly: true, why: 'Поймал мяч с физры головой!' },
};

interface Obstacle {
  x: number;
  kind: Kind;
}
interface Five {
  x: number;
  y: number;
  got?: boolean;
}

const CLASSES = ['5А', '6Б', '7В', '8А', '9Б', '10', '11', '🔬', '📐', '🏀'];

interface RunnerGameProps {
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
}

export const RunnerGame: React.FC<RunnerGameProps> = ({ soundProfile, vibro, onShowToast }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [fives, setFives] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem('asosh_runner_highscore') || '0'));
  const [lost, setLost] = useState('');
  const bestRef = useRef(best);
  const animRef = useRef<number | null>(null);

  const stateRef = useRef({
    y: FLOOR,
    vy: 0,
    jumps: 0,
    speed: 3,
    dist: 0,
    fives: 0,
    nextIn: 160,
    pending: null as Kind | null,
    obstacles: [] as Obstacle[],
    coins: [] as Five[],
    t: 0,
  });

  const jump = () => {
    const s = stateRef.current;
    if (!playing || s.jumps >= 2) return;
    s.vy = s.jumps === 0 ? JUMP : JUMP2;
    s.jumps += 1;
    playSound('nav', soundProfile);
  };

  const start = () => {
    stateRef.current = {
      y: FLOOR,
      vy: 0,
      jumps: 0,
      speed: 3,
      dist: 0,
      fives: 0,
      nextIn: 160,
      pending: null,
      obstacles: [],
      coins: [],
      t: 0,
    };
    setScore(0);
    setFives(0);
    setLost('');
    setPlaying(true);
    playSound('flip', soundProfile);
    doVibro(vibro, 25);
  };

  // Клавиатура на компьютере
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!playing) return;
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // чёткая картинка на экранах с высокой плотностью
    // поле растягивается до 600 px, поэтому берём запас по чёткости
    const dpr = Math.min(4, (window.devicePixelRatio || 1) * 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      const s = stateRef.current;
      // стена
      const wall = ctx.createLinearGradient(0, 0, 0, FLOOR);
      wall.addColorStop(0, '#1e293b');
      wall.addColorStop(1, '#0f172a');
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, W, FLOOR);
      // лампы на потолке
      const lampShift = (s.dist * 2) % 120;
      for (let x = -lampShift; x < W + 120; x += 120) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.08)';
        ctx.beginPath();
        ctx.moveTo(x + 20, 4);
        ctx.lineTo(x - 10, 70);
        ctx.lineTo(x + 70, 70);
        ctx.lineTo(x + 40, 4);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(x + 18, 2, 24, 4);
      }
      // двери кабинетов (медленнее пола)
      const doorShift = (s.dist * 4) % 150;
      const firstDoor = Math.floor((s.dist * 4) / 150);
      for (let i = 0; i < 4; i++) {
        const x = i * 150 - doorShift + 40;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, 74, 40, FLOOR - 74);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x + 4, 78, 32, FLOOR - 82);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x + 32, 124, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + 8, 60, 24, 11);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(CLASSES[(firstDoor + i) % CLASSES.length], x + 20, 69);
        ctx.textAlign = 'left';
        // доска объявлений между дверями
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 70, 86, 40, 26);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x + 74, 90, 12, 9);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(x + 92, 94, 13, 10);
      }
      // панель стены
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, FLOOR - 22, W, 3);
      // пол с плиткой
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1;
      const tile = (s.dist * 10) % 30;
      for (let x = -tile; x < W; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, FLOOR);
        ctx.lineTo(x - 14, H);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, FLOOR + 16);
      ctx.lineTo(W, FLOOR + 16);
      ctx.stroke();

      ctx.textBaseline = 'alphabetic';
      // пятёрки
      for (const c of s.coins) {
        if (c.got) continue;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fecaca';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('5', c.x, c.y + 4);
        ctx.textAlign = 'left';
      }
      // препятствия
      for (const o of s.obstacles) {
        const k = KINDS[o.kind];
        ctx.font = `${k.size}px sans-serif`;
        ctx.textAlign = 'center';
        const baseY = k.fly ? FLOOR - 40 + k.h / 2 : FLOOR;
        if (k.fly) {
          ctx.save();
          ctx.translate(o.x, baseY - k.h / 2);
          ctx.rotate(-s.t * 0.2);
          ctx.fillText(k.emoji, 0, k.size * 0.35);
          ctx.restore();
        } else {
          ctx.fillText(k.emoji, o.x, baseY + 2);
        }
        ctx.textAlign = 'left';
      }
      // тень и ученик
      const air = FLOOR - s.y;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(PX, FLOOR + 3, Math.max(4, 11 - air / 10), 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      const bob = air === 0 && playing ? Math.abs(Math.sin(s.t * 0.35)) * 2 : 0;
      ctx.translate(PX, s.y - bob);
      ctx.scale(-1, 1); // эмодзи бежит влево, разворачиваем вправо
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏃', 0, 2);
      ctx.restore();
      ctx.textAlign = 'left';
    };

    if (!playing) {
      draw();
      return;
    }

    let alive = true;

    const step = () => {
      const s = stateRef.current;
      s.t += 1;
      s.speed = Math.min(7.5, 3 + s.dist / 120);
      s.dist += s.speed / 30;

      // прыжок
      s.vy += GRAVITY;
      s.y += s.vy;
      if (s.y >= FLOOR) {
        s.y = FLOOR;
        s.vy = 0;
        s.jumps = 0;
      }

      // появление препятствий: расстояние зависит от скорости, чтобы всегда успеть
      s.nextIn -= s.speed;
      if (s.nextIn <= 0) {
        let kind = s.pending;
        if (!kind) {
          const roll = Math.random();
          const lvl = s.dist;
          kind = roll < 0.35 ? 'bag' : roll < 0.6 ? 'books' : 'bucket';
          if (lvl > 40 && roll > 0.72) kind = 'zavuch';
          if (lvl > 80 && roll > 0.9) kind = 'ball';
        }
        // завуч и мяч быстрее остальных: выпускаем их, когда они добегут до ученика
        // хотя бы на 40 шагов позже прошлого препятствия, иначе проскочить будет нельзя
        const prev = s.obstacles[s.obstacles.length - 1];
        const extra = KINDS[kind].extra;
        if (extra > 0 && prev && (W + 20 - PX) / (s.speed + extra) - (prev.x - PX) / (s.speed + KINDS[prev.kind].extra) < 40) {
          s.pending = kind;
          s.nextIn = 1;
        } else {
          s.pending = null;
          s.obstacles.push({ x: W + 20, kind });
          // пятёрки: дугой над препятствием или по полу за ним
          if (Math.random() < 0.55) {
            const high = Math.random() < 0.5;
            for (let i = 0; i < 3; i++) {
              s.coins.push(high && !KINDS[kind].fly ? { x: W + 4 + i * 16, y: FLOOR - 58 - (i === 1 ? 10 : 0) } : { x: W + 90 + i * 18, y: FLOOR - 12 });
            }
          }
          s.nextIn = s.speed * (40 + Math.random() * 38) + 40;
        }
      }

      const hit = { l: PX - 8, r: PX + 8, t: s.y - 26, b: s.y - 2 };
      for (const o of s.obstacles) {
        const k = KINDS[o.kind];
        o.x -= s.speed + k.extra;
        const ob = k.fly ? FLOOR - 40 + k.h / 2 : FLOOR;
        const box = { l: o.x - k.w / 2, r: o.x + k.w / 2, t: ob - k.h, b: ob };
        if (hit.r > box.l && hit.l < box.r && hit.b > box.t && hit.t < box.b) {
          alive = false;
          setPlaying(false);
          setLost(k.why);
          playSound('gameover', soundProfile);
          doVibro(vibro, 60);
          const total = Math.floor(s.dist) + s.fives * 10;
          setScore(total);
          if (total > bestRef.current) {
            bestRef.current = total;
            setBest(total);
            localStorage.setItem('asosh_runner_highscore', String(total));
            onShowToast('🏆 Новый рекорд в «Беги со звонка»!');
          }
          draw();
          return;
        }
      }
      s.obstacles = s.obstacles.filter((o) => o.x > -30);

      for (const c of s.coins) {
        c.x -= s.speed;
        if (!c.got && Math.abs(c.x - PX) < 14 && c.y > hit.t - 8 && c.y < hit.b + 8) {
          c.got = true;
          s.fives += 1;
          setFives(s.fives);
          playSound('coin', soundProfile);
          doVibro(vibro, 15);
        }
      }
      s.coins = s.coins.filter((c) => c.x > -20 && !c.got);

      const m = Math.floor(s.dist);
      if (m > 0 && m % 100 === 0 && Math.floor(s.dist - s.speed / 30) < m) {
        playSound('star', soundProfile);
        onShowToast(`🏃 ${m} метров без опоздания!`);
      }
      setScore(m + s.fives * 10);
      draw();
    };

    // 60 шагов в секунду при любой частоте экрана (60, 90, 120 Гц)
    const STEP = 1000 / 60;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= STEP * 0.9 && alive) {
        acc -= STEP;
        step();
      }
      if (alive) animRef.current = requestAnimationFrame(frame);
    };
    animRef.current = requestAnimationFrame(frame);
    return () => {
      alive = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <div className="p-4 bg-slate-900/90 rounded-3xl border border-amber-400/30 space-y-3 text-center">
      <div className="flex justify-between items-center px-1">
        <div className="text-sm font-black text-amber-300">🏃 Беги со звонка</div>
        <div className="text-xs text-amber-300 font-mono font-bold">Рекорд: {best} 🏆</div>
      </div>

      <p className="text-xs text-white/60">
        Звонок прозвенел, беги по коридору! Перепрыгивай портфели и завуча, собирай пятёрки (+10). Под мячом пробегай не прыгая. Прыжок: тап по полю или пробел,
        в воздухе можно прыгнуть ещё раз.
      </p>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', maxWidth: 600, aspectRatio: `${W} / ${H}`, touchAction: 'manipulation' }}
        className="mx-auto rounded-2xl border-2 border-amber-400/50 shadow-inner bg-slate-950 block max-w-full select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          jump();
        }}
      />

      <div className="flex justify-between items-center text-xs font-bold px-2">
        <span className="text-white">
          Очки: <b className="text-amber-300 text-lg font-mono">{score}</b>
          <span className="ml-2 text-rose-300">🟥5 × {fives}</span>
        </span>
        {!playing ? (
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-xs hover:opacity-90 shadow-md flex items-center gap-1.5"
            onClick={start}
          >
            <Play className="w-4 h-4" />
            <span>{lost ? 'ЕЩЁ РАЗ' : 'БЕЖАТЬ 🔔'}</span>
          </button>
        ) : (
          <button
            type="button"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs active:scale-95 shadow-lg select-none"
            onPointerDown={(e) => {
              e.preventDefault();
              jump();
            }}
          >
            ПРЫЖОК ⬆️
          </button>
        )}
      </div>

      {lost && (
        <div className="p-3 bg-rose-950/80 rounded-2xl border border-rose-500/40 text-xs font-bold text-rose-300">
          💥 {lost} Нажми «ЕЩЁ РАЗ», чтобы снова бежать.
        </div>
      )}
    </div>
  );
};
