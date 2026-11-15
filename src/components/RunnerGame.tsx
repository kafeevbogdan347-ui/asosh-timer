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

const KINDS: Record<Kind, { w: number; h: number; extra: number; fly?: boolean; why: string }> = {
  bag: { w: 18, h: 20, extra: 0, why: 'Споткнулся о портфель!' },
  books: { w: 20, h: 20, extra: 0, why: 'Влетел в стопку учебников!' },
  bucket: { w: 16, h: 18, extra: 0, why: 'Опрокинул ведро уборщицы!' },
  zavuch: { w: 18, h: 32, extra: 1.1, why: 'Завуч поймал в коридоре!' },
  // мяч летит на уровне головы: под ним надо пробежать, а не прыгать
  ball: { w: 14, h: 14, extra: 2.2, fly: true, why: 'Поймал мяч с физры головой!' },
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

const CLASSES = ['5А', '6Б', '7В', '8А', '9Б', '10', '11', 'ХИМ', 'МАТ', 'ЗАЛ'];

// Безопасный скруглённый прямоугольник для любых версий браузеров и Android WebView
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawRunner(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, inAir: boolean, playing: boolean) {
  ctx.save();
  ctx.globalAlpha = 1;
  const swing = playing ? (inAir ? 0.85 : Math.sin(t * 0.42)) : 0.25;
  const bob = !inAir && playing ? Math.abs(Math.sin(t * 0.42)) * 1.8 : 0;
  ctx.translate(x, y - bob);

  const legA = swing * 0.65;
  const legB = -swing * 0.65;

  // Задняя нога
  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(legB);
  ctx.fillStyle = '#1e3a8a';
  rrect(ctx, -2, 0, 4, 8.5, 1.5);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  rrect(ctx, -2, 7.5, 6, 2.8, 1.2);
  ctx.fill();
  ctx.restore();

  // Задняя рука
  ctx.save();
  ctx.translate(1, -18);
  ctx.rotate(legA * 0.85);
  ctx.fillStyle = '#b91c1c';
  rrect(ctx, -1.8, 0, 3.6, 8, 1.6);
  ctx.fill();
  ctx.restore();

  // Рюкзак за спиной (чуть слева от тела)
  ctx.fillStyle = '#0284c7';
  rrect(ctx, -8.5, -20.5, 6, 10, 2);
  ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-7.5, -16, 4, 1.4);

  // Передняя нога
  ctx.save();
  ctx.translate(0, -10);
  ctx.rotate(legA);
  ctx.fillStyle = '#2563eb';
  rrect(ctx, -2.2, 0, 4.4, 8.5, 1.6);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  rrect(ctx, -2.2, 7.5, 6.5, 2.8, 1.2);
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0.5, 8.2, 3.2, 1.2);
  ctx.restore();

  // Толстовка (корпус)
  ctx.fillStyle = '#ef4444';
  rrect(ctx, -4, -20.5, 8.5, 11.5, 2.6);
  ctx.fill();
  // Светлый воротник
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(-1.5, -21.2, 3.8, 1.6);

  // Передняя рука
  ctx.save();
  ctx.translate(0.5, -18);
  ctx.rotate(legB * 0.9);
  ctx.fillStyle = '#f87171';
  rrect(ctx, -1.8, 0, 3.6, 7.5, 1.6);
  ctx.fill();
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(0, 7.8, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Голова
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(1, -24.5, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Волосы + чёлка
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(0.4, -25.6, 4.6, Math.PI * 0.92, Math.PI * 2.08);
  ctx.fill();
  ctx.fillRect(-3.6, -27.2, 5.2, 2.4);
  // Глаз (смотрит вправо)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(3.3, -24.3, 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, x: number, kind: Kind, t: number) {
  ctx.save();
  ctx.globalAlpha = 1;

  if (kind === 'bag') {
    // Яркий школьный портфель
    ctx.translate(x, FLOOR);
    // Ручка сверху
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -18, 3.5, Math.PI, 0);
    ctx.stroke();
    // Основной корпус
    ctx.fillStyle = '#2563eb';
    rrect(ctx, -8.5, -18, 17, 18, 4);
    ctx.fill();
    // Верхний клапан
    ctx.fillStyle = '#f97316';
    rrect(ctx, -8.5, -18, 17, 7.5, 3.5);
    ctx.fill();
    // Нижний карман
    ctx.fillStyle = '#1d4ed8';
    rrect(ctx, -6.5, -8.5, 13, 7, 2);
    ctx.fill();
    // Светоотражающая полоска и застёжки
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-5.5, -11.5, 2.5, 2.5);
    ctx.fillRect(3, -11.5, 2.5, 2.5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-4.5, -5.5, 9, 1.5);
  } else if (kind === 'books') {
    // Стопка учебников с закладками
    ctx.translate(x, FLOOR);
    // Нижний зелёный учебник
    ctx.fillStyle = '#15803d';
    rrect(ctx, -10, -6.5, 20, 6.5, 1.5);
    ctx.fill();
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(-8.5, -5, 16, 3.2);
    // Средний синий учебник
    ctx.fillStyle = '#1d4ed8';
    rrect(ctx, -9, -13, 19, 6.5, 1.5);
    ctx.fill();
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(-7.5, -11.5, 15, 3.2);
    // Верхний красный учебник
    ctx.fillStyle = '#dc2626';
    rrect(ctx, -9.5, -19.5, 18.5, 6.5, 1.5);
    ctx.fill();
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(-8, -18, 14.5, 3.2);
    // Красная лента-закладка
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(3, -16, 2.2, 5.5);
  } else if (kind === 'bucket') {
    // Ведро уборщицы со шваброй (работает без эмодзи-шрифтов на любой Windows)
    ctx.translate(x, FLOOR);
    // Палка от швабры под углом
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.lineTo(6.5, -24);
    ctx.stroke();
    // Тряпка/насадка швабры внутри ведра
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(-1, -14.5, 4, Math.PI, 0);
    ctx.fill();
    // Само ведро (трапеция)
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(-7.5, -15);
    ctx.lineTo(7.5, -15);
    ctx.lineTo(5.6, 0);
    ctx.lineTo(-5.6, 0);
    ctx.closePath();
    ctx.fill();
    // Блик и ободок
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-4, -14, 2.2, 13);
    ctx.fillStyle = '#e2e8f0';
    rrect(ctx, -8.5, -16.5, 17, 2.8, 1.2);
    ctx.fill();
    // Дужка-ручка спереди
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -14, 7.2, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else if (kind === 'zavuch') {
    // Завуч в строгом костюме, очках и с журналом
    ctx.translate(x, FLOOR);
    // Юбка / брюки
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(-5, -13, 4.2, 13);
    ctx.fillRect(0.8, -13, 4.2, 13);
    // Туфли
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-6.2, -2.5, 5, 2.5);
    ctx.fillRect(0.6, -2.5, 5, 2.5);
    // Строгий пиджак
    ctx.fillStyle = '#6d28d9';
    rrect(ctx, -6.5, -24, 13, 12.5, 3);
    ctx.fill();
    // Белый воротник
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-2.5, -24);
    ctx.lineTo(2.5, -24);
    ctx.lineTo(0, -19.5);
    ctx.closePath();
    ctx.fill();
    // Красный журнал в руке
    ctx.fillStyle = '#dc2626';
    rrect(ctx, -10, -21, 5.5, 7.5, 1);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-9, -19, 3.5, 1.2);
    // Голова + пучок волос + очки
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, -28.2, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.arc(0, -29.4, 4.5, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.8, -31.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Очки (смотрят влево, навстречу ученику)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-4.2, -29.3, 3.2, 2.2);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3.2, -28.6, 1.2, 1.2);
  } else if (kind === 'ball') {
    // Летящий на уровне головы футбольный мяч
    const baseY = FLOOR - 40 + KINDS.ball.h / 2;
    ctx.translate(x, baseY - KINDS.ball.h / 2);
    ctx.rotate(-t * 0.2);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Пятна мяча
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    for (let a = 0; a < 5; a++) {
      const ang = (a * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * 5.6, Math.sin(ang) * 5.6, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

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
      ctx.globalAlpha = 1;
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
        ctx.font = 'bold 7.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(CLASSES[(firstDoor + i) % CLASSES.length], x + 20, 68.5);
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
      // препятствия (векторная графика — без квадратиков на Windows)
      for (const o of s.obstacles) {
        drawObstacle(ctx, o.x, o.kind, s.t);
      }
      // тень и ученик (непрозрачный векторный спрайт)
      const air = FLOOR - s.y;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(PX, FLOOR + 3, Math.max(4, 11 - air / 10), 3, 0, 0, Math.PI * 2);
      ctx.fill();
      drawRunner(ctx, PX, s.y, s.t, air > 0, playing);
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
