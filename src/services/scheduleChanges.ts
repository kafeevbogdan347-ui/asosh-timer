import { ref, update, remove, onValue } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { classKey, myUid, ClassWriteResult } from './classShared';

// Лист «Изменения в основном расписании» в базе: учитель вносит день целиком для класса,
// и все видят его сразу, без выпуска новой версии приложения.
// asosh_changes/<YYYY-MM-DD>/<ключ класса> = { c: '5А', l: 'Предмет|каб\nПредмет|каб', by, uid, t }
// Строка списка = позиция урока (как в основном расписании), пустая строка — урока нет.

export type { ChangesMap } from '../utils/changesFormat';
import type { ChangesMap } from '../utils/changesFormat';
import type { LessonEntry } from '../data/schoolSchedule';

interface ChangeRecord {
  c: string;
  l: string;
  by?: string;
  uid: string;
  t: number;
}

export { MAX_CHANGE_LESSONS, encodeLessons, decodeLessons } from '../utils/changesFormat';
import { decodeLessons, encodeLessons } from '../utils/changesFormat';

const CACHE_KEY = 'asosh_changes_cache';

// Подписка на изменения по нескольким датам (обычно — неделя вперёд)
export function subscribeScheduleChanges(dates: string[], onUpdate: (map: ChangesMap) => void): () => void {
  const map: ChangesMap = {};
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as ChangesMap;
    dates.forEach((d) => {
      if (cached[d]) map[d] = cached[d];
    });
  } catch {
    // нет кэша
  }
  const emit = () => {
    // В кэше — все даты, на которые подписаны разные экраны: обновляем только свои
    try {
      const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as ChangesMap;
      dates.forEach((d) => {
        if (map[d]) all[d] = map[d];
        else delete all[d];
      });
      // Старше двух недель не храним
      const old = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      Object.keys(all).forEach((d) => d < old && delete all[d]);
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch {
      // нет места
    }
    onUpdate({ ...map });
  };
  emit();
  const { db } = initFirebase();
  if (!db || !dates.length) return () => {};
  const unsubs: (() => void)[] = [];
  let cancelled = false;
  ensureSignedIn().then((ok) => {
    if (cancelled || !ok) return;
    dates.forEach((date) => {
      unsubs.push(
        onValue(
          ref(db, `asosh_changes/${date}`),
          (snap) => {
            const v = (snap.val() || {}) as Record<string, ChangeRecord>;
            const byClass: Record<string, LessonEntry[]> = {};
            Object.values(v).forEach((rec) => {
              if (rec && typeof rec.c === 'string' && typeof rec.l === 'string') byClass[rec.c] = decodeLessons(rec.l);
            });
            if (Object.keys(byClass).length) map[date] = byClass;
            else delete map[date];
            emit();
          },
          () => {}
        )
      );
    });
  });
  return () => {
    cancelled = true;
    unsubs.forEach((u) => u());
  };
}

// Учитель сохраняет лист изменений для класса на дату
export async function saveScheduleChange(date: string, cls: string, lessons: LessonEntry[], by: string): Promise<ClassWriteResult> {
  const { db } = initFirebase();
  if (!db || !navigator.onLine) return { ok: false, error: 'offline' };
  if (!(await ensureSignedIn())) return { ok: false, error: 'auth' };
  try {
    await update(ref(db), {
      [`asosh_changes/${date}/${classKey(cls)}`]: { c: cls, l: encodeLessons(lessons), by: by.slice(0, 60), uid: myUid(), t: Date.now() },
    });
    return { ok: true };
  } catch (err) {
    console.warn('Schedule change write error:', err);
    return { ok: false, error: /permission/i.test(String((err as { code?: string })?.code || err)) ? 'denied' : 'other' };
  }
}

export async function deleteScheduleChange(date: string, cls: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db || !navigator.onLine || !(await ensureSignedIn())) return false;
  try {
    await remove(ref(db, `asosh_changes/${date}/${classKey(cls)}`));
    return true;
  } catch {
    return false;
  }
}
