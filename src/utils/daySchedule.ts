// Расписание на конкретный день для любого класса — для режимов родителя и учителя,
// где класс не совпадает с выбранным в приложении (или классов несколько).
import { B1, B2, B2F, DAYS } from '../data/constants';
import { getLessonsForDate, SECOND_SHIFT_CLASSES } from '../data/schoolSchedule';
import type { ChangesMap } from './changesFormat';
import type { ClassReplacement } from '../services/classShared';
import { lessonNo, Bell, Lesson } from './lessonStatus';


const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const shiftOfClass = (cls: string): '1' | '2' => (SECOND_SHIFT_CLASSES.includes(cls) ? '2' : '1');

export const bellsFor = (shift: string, dayName: string): Bell[] => (shift === '1' ? B1 : dayName === 'Пятница' ? B2F : B2);

const SHORT: Record<string, string> = { 'Понедельник': 'Пн', 'Вторник': 'Вт', 'Среда': 'Ср', 'Четверг': 'Чт', 'Пятница': 'Пт', 'Суббота': 'Сб', 'Воскресенье': 'Вс' };
export const shortDay = (d: string) => SHORT[d] || d.slice(0, 2);

export const dayNameOf = (d: Date) => DAYS[(d.getDay() + 6) % 7];

// Ближайшая дата этого дня недели: сегодня или вперёд (прошедшие дни — уже следующая неделя)
export function upcomingDate(dayName: string, now: Date): Date {
  const idx = (now.getDay() + 6) % 7;
  const target = DAYS.indexOf(dayName as (typeof DAYS)[number]);
  const diff = target - idx;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + (diff < 0 ? diff + 7 : diff));
}

// Уроки класса на дату: основное расписание + лист изменений + замены класса (🔄)
export function classDay(cls: string, date: Date, changes?: ChangesMap, replacements: ClassReplacement[] = []): Lesson[] {
  const dayName = dayNameOf(date);
  const dateKey = toDateKey(date);
  const map: Record<number, Lesson> = {};
  getLessonsForDate(cls, dayName, dateKey, changes).forEach((l, i) => (map[i] = l));
  replacements
    .filter((r) => r.date === dateKey && r.num >= 1 && r.num <= 12)
    .sort((a, b) => a.created_at - b.created_at)
    .forEach((r) => {
      map[r.num - 1] = r.sub === 'Урока не будет' ? ['—', ''] : [`🔄 ${r.sub}`, r.room || ''];
    });
  const keys = Object.keys(map).map(Number);
  if (!keys.length) return [];
  return Array.from({ length: Math.max(...keys) + 1 }, (_, i) => map[i] || ['—', '']);
}

export const isRealLesson = (l?: Lesson) => !!l && !!l[0] && l[0] !== '—';
export const cleanSub = (s: string) => s.replace('🔄 ', '');
export const lessonsOnly = (l: Lesson[]) => l.filter(isRealLesson);

// Урок учителя: какой класс, где и когда
export interface TeacherLesson {
  cls: string;
  sub: string;
  room: string;
  num: number;
  start: string;
  end: string;
  replaced: boolean;
}

// День учителя: уроки его предметов в его классах, по времени
export function teacherDay(classes: string[], subjects: string[], date: Date, changes?: ChangesMap): TeacherLesson[] {
  const dayName = dayNameOf(date);
  const subs = new Set(subjects);
  const out: TeacherLesson[] = [];
  classes.forEach((cls) => {
    const shift = shiftOfClass(cls);
    const bells = bellsFor(shift, dayName);
    classDay(cls, date, changes).forEach(([sub, room], i) => {
      if (!isRealLesson([sub, room]) || !bells[i] || !subs.has(cleanSub(sub))) return;
      out.push({ cls, sub: cleanSub(sub), room, num: lessonNo(shift, i), start: bells[i][0], end: bells[i][1], replaced: sub.startsWith('🔄') });
    });
  });
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.cls.localeCompare(b.cls, 'ru'));
}
