// Электронный журнал: оценки 2–5 и пропуски «Н».
// asosh_journal/<класс>/<ученик>/<id> — { sub, v, date, note?, teacher, tuid, t }
// Ставят только учителя и только подтверждённым ученикам; видят ученик, его родители и учителя.

import { ref, push, set, remove, onValue } from 'firebase/database';
import { initFirebase } from './firebaseChat';
import { classKey } from './classShared';

export type Mark = 5 | 4 | 3 | 2 | 'Н';
export const MARKS: Mark[] = [5, 4, 3, 2, 'Н'];

export interface Grade {
  id: string;
  sid: string;
  sub: string;
  v: Mark;
  date: string; // YYYY-MM-DD
  note?: string;
  teacher: string;
  tuid: string;
  t: number;
}

type Raw = Record<string, Omit<Grade, 'id' | 'sid'>>;

const toList = (sid: string, raw: Raw | null): Grade[] =>
  Object.entries(raw || {}).map(([id, g]) => ({ ...g, id, sid }));

// Весь журнал класса (учитель)
export function subscribeClassJournal(cls: string, cb: (grades: Grade[]) => void): () => void {
  const { db } = initFirebase();
  if (!db) return () => {};
  return onValue(
    ref(db, `asosh_journal/${classKey(cls)}`),
    (snap) => {
      const all = (snap.val() || {}) as Record<string, Raw>;
      cb(Object.entries(all).flatMap(([sid, raw]) => toList(sid, raw)));
    },
    () => cb([])
  );
}

// Оценки одного ученика (сам ученик или его родитель). Последнее полученное храним для офлайна
export function subscribeStudentGrades(cls: string, sid: string, cb: (grades: Grade[]) => void): () => void {
  const cacheKey = `asosh_grades_cache_${sid}`;
  try {
    cb(JSON.parse(localStorage.getItem(cacheKey) || '[]'));
  } catch {
    cb([]);
  }
  const { db } = initFirebase();
  if (!db) return () => {};
  return onValue(
    ref(db, `asosh_journal/${classKey(cls)}/${sid}`),
    (snap) => {
      const list = toList(sid, snap.val() as Raw | null);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(list));
      } catch {
        // нет места
      }
      cb(list);
    },
    () => {}
  );
}

export async function saveGrade(
  cls: string,
  sid: string,
  g: { id?: string; sub: string; v: Mark; date: string; note?: string; teacher: string; tuid: string }
): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;
  try {
    const path = `asosh_journal/${classKey(cls)}/${sid}`;
    const id = g.id || (push(ref(db, path)).key as string);
    const data: Record<string, unknown> = { sub: g.sub, v: g.v, date: g.date, teacher: g.teacher, tuid: g.tuid, t: Date.now() };
    if (g.note?.trim()) data.note = g.note.trim().slice(0, 200);
    await set(ref(db, `${path}/${id}`), data);
    return true;
  } catch (err) {
    console.warn('saveGrade failed:', err);
    return false;
  }
}

export async function deleteGrade(cls: string, sid: string, id: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db) return false;
  try {
    await remove(ref(db, `asosh_journal/${classKey(cls)}/${sid}/${id}`));
    return true;
  } catch {
    return false;
  }
}

// Средний балл (пропуски не считаем), с двумя знаками
export function average(grades: Grade[]): number | null {
  const nums = grades.map((g) => g.v).filter((v): v is 5 | 4 | 3 | 2 => typeof v === 'number');
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : null;
}

export function bySubject(grades: Grade[]): { sub: string; grades: Grade[]; avg: number | null; absences: number }[] {
  const map = new Map<string, Grade[]>();
  for (const g of grades) map.set(g.sub, [...(map.get(g.sub) || []), g]);
  return [...map.entries()]
    .map(([sub, list]) => {
      const sorted = list.sort((a, b) => (a.date === b.date ? a.t - b.t : a.date < b.date ? -1 : 1));
      return { sub, grades: sorted, avg: average(sorted), absences: sorted.filter((g) => g.v === 'Н').length };
    })
    .sort((a, b) => a.sub.localeCompare(b.sub, 'ru'));
}

export const markColor = (v: Mark) =>
  v === 5 ? '#22c55e' : v === 4 ? '#38bdf8' : v === 3 ? '#f59e0b' : v === 2 ? '#ef4444' : '#a1a1aa';
