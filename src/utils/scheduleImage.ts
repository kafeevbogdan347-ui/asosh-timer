// Расписание на неделю картинкой: рисуем на canvas и отдаём PNG,
// чтобы поделиться в чате класса (Web Share / системное «Поделиться» в APK) или сохранить.

import { lessonNo, roomLabel } from './lessonStatus';

export interface WeekDay {
  name: string; // «Понедельник»
  date?: string; // «16 нояб.»
  lessons: [string, string][];
  bells: [string, string][];
}

const W = 1080;
const PAD = 56;
const ROW = 62;
const DAY_HEAD = 76;
const GAP = 28;

const colors = {
  bg1: '#0b1730',
  bg2: '#13294f',
  card: 'rgba(255,255,255,0.07)',
  line: 'rgba(255,255,255,0.12)',
  text: '#f5f7fa',
  muted: '#9fb3d1',
  accent: '#2dd4bf',
  num: '#f59e0b',
};

const realLessons = (d: WeekDay) => d.lessons.map((l, i) => ({ l, i })).filter(({ l }) => l[0] && l[0] !== '—');

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

export function drawWeekSchedule(opts: { cls: string; shift: string; title: string; days: WeekDay[] }): HTMLCanvasElement {
  const days = opts.days.filter((d) => realLessons(d).length > 0);
  const height = PAD * 2 + 150 + days.reduce((h, d) => h + DAY_HEAD + realLessons(d).length * ROW + GAP, 0) + 40;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, colors.bg1);
  g.addColorStop(1, colors.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, height);

  const font = (size: number, weight = 700) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  let y = PAD;

  ctx.fillStyle = colors.accent;
  ctx.font = font(30, 800);
  ctx.fillText('АСОШ ТАЙМЕР', PAD, y + 30);
  ctx.fillStyle = colors.text;
  ctx.font = font(58, 900);
  ctx.fillText(`Расписание ${opts.cls}`, PAD, y + 98);
  ctx.fillStyle = colors.muted;
  ctx.font = font(30, 600);
  ctx.fillText(`${opts.title} · ${opts.shift === '2' ? '2-я смена' : '1-я смена'}`, PAD, y + 142);
  y += 150 + 16;

  for (const d of days) {
    const rows = realLessons(d);
    const h = DAY_HEAD + rows.length * ROW;
    ctx.fillStyle = colors.card;
    ctx.beginPath();
    ctx.roundRect(PAD, y, W - PAD * 2, h, 28);
    ctx.fill();

    ctx.fillStyle = colors.accent;
    ctx.font = font(36, 900);
    ctx.fillText(d.name, PAD + 32, y + 50);
    if (d.date) {
      ctx.fillStyle = colors.muted;
      ctx.font = font(28, 600);
      ctx.textAlign = 'right';
      ctx.fillText(d.date, W - PAD - 32, y + 50);
      ctx.textAlign = 'left';
    }

    rows.forEach(({ l, i }, r) => {
      const ry = y + DAY_HEAD + r * ROW;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PAD + 28, ry);
      ctx.lineTo(W - PAD - 28, ry);
      ctx.stroke();

      const mid = ry + ROW / 2 + 11;
      ctx.fillStyle = colors.num;
      ctx.font = font(32, 900);
      ctx.fillText(String(lessonNo(opts.shift, i)), PAD + 32, mid);
      ctx.fillStyle = colors.muted;
      ctx.font = font(28, 600);
      const b = d.bells[i];
      ctx.fillText(b ? `${b[0]}–${b[1]}` : '', PAD + 84, mid);
      const sub = l[0].replace('🔄 ', '');
      const room = roomLabel(l[1]);
      ctx.fillStyle = l[0].startsWith('🔄') ? colors.num : colors.text;
      ctx.font = font(32, 800);
      ctx.fillText(fit(ctx, sub, room ? 420 : 600), PAD + 300, mid);
      if (room) {
        ctx.fillStyle = colors.muted;
        ctx.font = font(28, 600);
        ctx.textAlign = 'right';
        ctx.fillText(fit(ctx, room, 170), W - PAD - 32, mid);
        ctx.textAlign = 'left';
      }
    });
    y += h + GAP;
  }

  ctx.fillStyle = colors.muted;
  ctx.font = font(24, 600);
  ctx.textAlign = 'center';
  ctx.fillText('Сделано в АСОШ Таймере · kafeevbogdan347-ui.github.io/asosh-timer-site', W / 2, height - PAD + 10);
  ctx.textAlign = 'left';
  return canvas;
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));

// Поделиться картинкой: в APK — системное меню, в браузере — Web Share, иначе — скачать файл
export async function shareScheduleImage(canvas: HTMLCanvasElement, fileName: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const data = canvas.toDataURL('image/png').split(',')[1];
    const file = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    try {
      await Share.share({ title: 'Расписание', files: [file.uri] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const blob = await toBlob(canvas);
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Расписание' });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 5000);
  return 'saved';
}
