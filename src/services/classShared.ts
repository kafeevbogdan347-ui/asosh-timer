import { ref, push, remove, set, onValue, query, limitToLast, serverTimestamp, Unsubscribe } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { censorFields } from '../utils/moderation';
import { classDbKey } from '../utils/kdf';
import { getClassMemberKey } from '../data/classCodes';

// Общие данные класса в Firebase: замены уроков и домашка.
// Читать их может любой (замены видны и гостям), а добавлять — только участники класса и учителя.
// Удалить запись может только её автор (см. database.rules.json).

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
  teacher?: boolean; // задал учитель (правила базы разрешают это только учителям)
  uid: string;
  created_at: number;
}

type Section = 'replacements' | 'homework';

function classPath(cls: string, section: Section) {
  return `asosh_class/${classDbKey(cls)}/${section}`;
}

export function myUid(): string {
  const { app } = initFirebase();
  return app ? getAuth(app).currentUser?.uid || '' : '';
}

// ---------- Участие в классе ----------
// Код класса проверяется не только в приложении, но и в базе: устройство записывает себя
// в asosh_members/<класс>/<uid> вместе с ключом участника, а база сверяет ключ с asosh_class_keys.
// Только после этого она пускает в чат класса и даёт добавлять замены и домашку.

const JOINED_KEY = 'asosh_class_joined_v1';
const joining = new Map<string, Promise<boolean>>();

function readJoined(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(JOINED_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// true — устройство уже участник класса в базе (или стало им сейчас)
export function ensureClassMember(cls: string): Promise<boolean> {
  const memberKey = cls ? getClassMemberKey(cls) : null;
  if (!memberKey) return Promise.resolve(false);
  const uid = myUid();
  const mark = `${uid}|${classDbKey(cls)}`;
  if (uid && readJoined().includes(mark)) return Promise.resolve(true);
  const pending = joining.get(mark);
  if (pending) return pending;
  const attempt = (async () => {
    const { db } = initFirebase();
    if (!db || !navigator.onLine || !(await ensureSignedIn())) return false;
    const id = myUid();
    try {
      await set(ref(db, `asosh_members/${classDbKey(cls)}/${id}`), { k: memberKey, t: serverTimestamp() });
      try {
        localStorage.setItem(JOINED_KEY, JSON.stringify([...readJoined(), `${id}|${classDbKey(cls)}`].slice(-20)));
      } catch {
        // нет места — проверим снова при следующем запуске
      }
      return true;
    } catch (err) {
      // Ключ не подошёл (коды классов сменились) или нет связи — попробуем в следующий раз
      console.warn('Class membership write failed:', err);
      return false;
    } finally {
      joining.delete(mark);
    }
  })();
  joining.set(mark, attempt);
  return attempt;
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
        // Мат, попавший в базу в обход приложения, показываем звёздочками
        const items = Object.keys(val).map((id) => censorFields({ ...val[id], id }) as T);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(items));
        } catch {
          // нет места — без кэша
        }
        onUpdate(items);
      },
      (err) => console.warn('Class data read error:', err)
    );
  });
  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

async function add(cls: string, section: Section, data: Record<string, unknown>): Promise<boolean> {
  const { db } = initFirebase();
  // Без сети запись ждала бы интернет бесконечно, и кнопка не отпускалась бы
  if (!db || !navigator.onLine || !(await ensureSignedIn())) return false;
  // Учителя пишут в любой класс без кода; ученикам нужно быть участником класса
  await ensureClassMember(cls);
  try {
    await push(ref(db, classPath(cls, section)), { ...data, uid: myUid(), created_at: serverTimestamp() });
    return true;
  } catch (err) {
    console.warn('Class data write error:', err);
    return false;
  }
}

async function del(cls: string, section: Section, id: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db || !navigator.onLine || !(await ensureSignedIn())) return false;
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
export const addClassHomework = (cls: string, h: Pick<ClassHomework, 'sub' | 'text' | 'forDate' | 'author' | 'teacher'>) =>
  add(cls, 'homework', h);
export const deleteClassHomework = (cls: string, id: string) => del(cls, 'homework', id);

// Дата в формате YYYY-MM-DD по местному времени
export function toDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
