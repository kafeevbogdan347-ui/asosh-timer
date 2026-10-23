import { ref, push, remove, onValue, query, limitToLast, Unsubscribe } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { initFirebase, ensureSignedIn } from './firebaseChat';

// Общие данные класса в Firebase: замены уроков и домашка.
// Видны всем, кто вошёл в класс; удалить запись может только её автор (см. database.rules.json).

export interface ClassReplacement {
  id: string;
  date: string; // YYYY-MM-DD — день, к которому относится замена
  num: number; // номер урока
  sub: string; // новый предмет («Окно», если урока не будет)
  room: string;
  author: string;
  uid: string;
  created_at: number;
}

export interface ClassHomework {
  id: string;
  sub: string;
  text: string;
  forDate: string; // YYYY-MM-DD — к какому дню задано (может быть пустым)
  author: string;
  uid: string;
  created_at: number;
}

type Section = 'replacements' | 'homework';

function classPath(cls: string, section: Section) {
  const key = encodeURIComponent(cls.replace(/\s+/g, '_').toLowerCase());
  return `asosh_class/${key}/${section}`;
}

export function myUid(): string {
  const { app } = initFirebase();
  return app ? getAuth(app).currentUser?.uid || '' : '';
}

function subscribe<T extends { id: string }>(
  cls: string,
  section: Section,
  onUpdate: (items: T[]) => void,
  limit: number
): () => void {
  let unsubscribe: Unsubscribe | null = null;
  let cancelled = false;
  // Последний полученный список храним на устройстве: без интернета замены всё равно видны в расписании
  const cacheKey = `asosh_${classPath(cls, section).replace(/\//g, '_')}`;
  let cached: T[] = [];
  try {
    cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
  } catch {
    cached = [];
  }
  onUpdate(cached);
  const { db } = initFirebase();
  if (!db || !cls) return () => {};
  ensureSignedIn().then((ok) => {
    if (cancelled || !ok) return;
    unsubscribe = onValue(
      query(ref(db, classPath(cls, section)), limitToLast(limit)),
      (snap) => {
        const val = snap.val() || {};
        const items = Object.keys(val).map((id) => ({ ...val[id], id }) as T);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(items));
        } catch {
          // нет места — без кэша
        }
        onUpdate(items);
      }
    );
  });
  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

async function add(cls: string, section: Section, data: Record<string, unknown>): Promise<boolean> {
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) return false;
  try {
    await push(ref(db, classPath(cls, section)), { ...data, uid: myUid(), created_at: Date.now() });
    return true;
  } catch (err) {
    console.warn('Class data write error:', err);
    return false;
  }
}

async function del(cls: string, section: Section, id: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) return false;
  try {
    await remove(ref(db, `${classPath(cls, section)}/${id}`));
    return true;
  } catch (err) {
    console.warn('Class data delete error:', err);
    return false;
  }
}

export const subscribeClassReplacements = (cls: string, cb: (items: ClassReplacement[]) => void) =>
  subscribe<ClassReplacement>(cls, 'replacements', cb, 200);
export const addClassReplacement = (cls: string, r: Pick<ClassReplacement, 'date' | 'num' | 'sub' | 'room' | 'author'>) =>
  add(cls, 'replacements', r);
export const deleteClassReplacement = (cls: string, id: string) => del(cls, 'replacements', id);

export const subscribeClassHomework = (cls: string, cb: (items: ClassHomework[]) => void) =>
  subscribe<ClassHomework>(cls, 'homework', cb, 200);
export const addClassHomework = (cls: string, h: Pick<ClassHomework, 'sub' | 'text' | 'forDate' | 'author'>) =>
  add(cls, 'homework', h);
export const deleteClassHomework = (cls: string, id: string) => del(cls, 'homework', id);

// Дата в формате YYYY-MM-DD по местному времени
export function toDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
