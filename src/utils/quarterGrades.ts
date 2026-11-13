// Итоги четверти по оценкам из журнала: средний балл по каждому предмету,
// какая оценка «выходит» и сколько пятёрок нужно, чтобы дотянуть до следующей.
// Чистая функция без базы — её проверяет tests/quarterGrades.test.mjs.

import type { Grade } from '../services/journal';

export interface QuarterRange {
  id: number;
  name: string;
  start: string; // YYYY-MM-DD
  end: string;
}

export interface SubjectQuarter {
  sub: string;
  avg: number | null; // среднее по оценкам (пропуски не считаются)
  count: number; // сколько оценок
  absences: number;
  predicted: 2 | 3 | 4 | 5 | null; // какая выходит по обычному округлению
  fivesToNext: number | null; // сколько пятёрок подряд нужно до следующей оценки (null — уже 5 или нет оценок)
  fewMarks: boolean; // меньше 3 оценок — четвертную могут не выставить
}

// Обычное школьное округление: 4,5 и выше — 5; 3,5 — 4; 2,5 — 3
export function predictMark(avg: number): 2 | 3 | 4 | 5 {
  if (avg >= 4.5) return 5;
  if (avg >= 3.5) return 4;
  if (avg >= 2.5) return 3;
  return 2;
}

const THRESHOLD: Record<3 | 4 | 5, number> = { 3: 2.5, 4: 3.5, 5: 4.5 };

// Сколько пятёрок добавить, чтобы среднее дошло до порога следующей оценки
export function fivesNeeded(sum: number, count: number, target: 3 | 4 | 5): number {
  const need = THRESHOLD[target];
  if (count > 0 && sum / count >= need) return 0;
  // (sum + 5n) / (count + n) >= need  →  n >= (need·count − sum) / (5 − need)
  return Math.max(0, Math.ceil((need * count - sum) / (5 - need) - 1e-9));
}

// Текущая четверть; на каникулах — последняя закончившаяся; до начала года — первая
export function pickQuarter(quarters: QuarterRange[], today: string): QuarterRange | null {
  if (!quarters.length) return null;
  const now = quarters.find((q) => today >= q.start && today <= q.end);
  if (now) return now;
  const past = quarters.filter((q) => q.end < today);
  return past.length ? past[past.length - 1] : quarters[0];
}

export function quarterSummary(grades: Grade[], q: QuarterRange): SubjectQuarter[] {
  const inQuarter = grades.filter((g) => g.date >= q.start && g.date <= q.end);
  const map = new Map<string, Grade[]>();
  inQuarter.forEach((g) => map.set(g.sub, [...(map.get(g.sub) || []), g]));
  return [...map.entries()]
    .map(([sub, list]) => {
      const nums = list.map((g) => g.v).filter((v): v is 2 | 3 | 4 | 5 => typeof v === 'number');
      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = nums.length ? Math.round((sum / nums.length) * 100) / 100 : null;
      const predicted = avg === null ? null : predictMark(sum / nums.length);
      return {
        sub,
        avg,
        count: nums.length,
        absences: list.length - nums.length,
        predicted,
        fivesToNext: predicted && predicted < 5 ? fivesNeeded(sum, nums.length, (predicted + 1) as 3 | 4 | 5) : null,
        fewMarks: nums.length < 3,
      };
    })
    .sort((a, b) => (a.predicted ?? 9) - (b.predicted ?? 9) || a.sub.localeCompare(b.sub, 'ru'));
}
