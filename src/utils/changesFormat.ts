// Формат листа изменений расписания в базе (без Firebase — чтобы проверять в тестах)
import type { LessonEntry } from '../data/schoolSchedule';

export type ChangesMap = Record<string, Record<string, LessonEntry[]>>; // дата → класс → уроки

export const MAX_CHANGE_LESSONS = 9;

export function encodeLessons(lessons: LessonEntry[]): string {
  // Хвостовые пустые строки не храним
  const clean = (v: string) => (v || '').replace(/[|\n\r]/g, ' ').trim();
  const rows = lessons.map(([s, r]) => (clean(s) ? `${clean(s)}|${clean(r)}` : ''));
  while (rows.length && !rows[rows.length - 1]) rows.pop();
  return rows.join('\n');
}

export function decodeLessons(text: string): LessonEntry[] {
  return String(text || '')
    .split('\n')
    .slice(0, MAX_CHANGE_LESSONS)
    .map((row) => {
      const [s = '', r = ''] = row.split('|');
      return [s.trim().slice(0, 60), r.trim().slice(0, 20)] as LessonEntry;
    });
}

