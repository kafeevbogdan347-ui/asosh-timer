// Профили учеников в классе и оценки от учителей.
//
// asosh_students/<класс>/<pid>        — { name: «Иван П.», owner: uid, t, ok?, okBy? }
// asosh_student_secrets/<класс>/<pid> — секрет профиля, база его никому не отдаёт
// asosh_grades/<класс>/<pid>/<id>     — оценка: предмет, балл 2–5, дата, комментарий, учитель
//
// Профиль заводит сам ученик (только участник класса), подтверждает или отклоняет учитель.
// Оценки ставят учителя и только подтверждённым ученикам. Видят оценки сам ученик и учителя.
// Профиль не привязан к телефону: pid и секрет переезжают при переносе по QR,
// и на новом телефоне профиль «перепривязывается» к новому анонимному uid по секрету.

import { ref, get, set, update, push, remove, onValue, serverTimestamp, Unsubscribe } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { myUid, ensureClassMember } from './classShared';
import { classDbKey } from '../utils/kdf';
import { censor } from '../utils/moderation';

export interface StudentRecord {
  pid: string;
  name: string;
  owner: string;
  t: number;
  ok?: boolean; // true — подтверждён учителем, false — отклонён, нет — ждёт
  okBy?: string;
}

export interface Grade {
  id: string;
  sub: string;
  v: number; // 2–5
  date: string; // YYYY-MM-DD
  note?: string;
  teacher: string;
  tuid: string;
  t: number;
}

export type MyStudentStatus = 'none' | 'pending' | 'ok' | 'rejected';
export interface MyStudentState {
  status: MyStudentStatus;
  name?: string;
  cls?: string;
  grades: Grade[];
  online: boolean;
}

export const GRADE_VALUES = [5, 4, 3, 2] as const;

const LOCAL_KEY = 'asosh_student_profile_v1';
const GRADES_CACHE_KEY = 'asosh_my_grades_cache_v1';

interface LocalStudent {
  cls: string;
  pid: string;
  secret: string;
  name: string;
}

const isDenied = (err: unknown) => /permission.denied/i.test(String((err as { code?: string })?.code || err));

function randomToken(bytes = 24): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getLocalStudent(): LocalStudent | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return raw?.pid && raw?.secret && raw?.cls ? raw : null;
  } catch {
    return null;
  }
}

function saveLocalStudent(s: LocalStudent | null) {
  if (s) localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
  else localStorage.removeItem(LOCAL_KEY);
}

const studentPath = (cls: string, pid = '') => `asosh_students/${classDbKey(cls)}${pid ? '/' + pid : ''}`;
const gradesPath = (cls: string, pid = '') => `asosh_grades/${classDbKey(cls)}${pid ? '/' + pid : ''}`;

async function ready(): Promise<boolean> {
  const { db } = initFirebase();
  return !!db && navigator.onLine && (await ensureSignedIn());
}

// ---------- Ученик ----------

export type RegisterResult = { ok: true } | { ok: false; error: string };

// Завести профиль в классе или поменять имя. После смены имени учитель подтверждает заново
export async function registerStudent(cls: string, shortName: string): Promise<RegisterResult> {
  if (!(await ready())) return { ok: false, error: 'Нужен интернет' };
  if (!(await ensureClassMember(cls))) {
    return { ok: false, error: 'Сначала войди в класс по коду классного руководителя' };
  }
  const { db } = initFirebase();
  const uid = myUid();
  let local = getLocalStudent();
  if (local && local.cls !== cls) local = null; // перешёл в другой класс — новый профиль
  try {
    // Профиль удалён учителем — заведём новый
    if (local && (await rebindIfNeeded(local)) === 'gone') local = null;
    if (local) {
      await set(ref(db, studentPath(cls, local.pid)), { name: shortName, owner: uid, t: serverTimestamp() });
    } else {
      const pid = push(ref(db, studentPath(cls))).key as string;
      const secret = randomToken();
      await update(ref(db), {
        [studentPath(cls, pid)]: { name: shortName, owner: uid, t: serverTimestamp() },
        [`asosh_student_secrets/${classDbKey(cls)}/${pid}`]: secret,
      });
      local = { cls, pid, secret, name: shortName };
    }
    saveLocalStudent({ ...local, name: shortName });
    return { ok: true };
  } catch (err) {
    console.warn('Student register failed:', err);
    return { ok: false, error: isDenied(err) ? 'Сервер не принял имя. Проверь, что оно настоящее.' : 'Не получилось сохранить. Проверь интернет.' };
  }
}

// На новом телефоне (после переноса по QR) профиль числится за старым uid — забираем его по секрету
async function rebindIfNeeded(local: LocalStudent): Promise<'mine' | 'gone'> {
  const { db } = initFirebase();
  const uid = myUid();
  try {
    const snap = await get(ref(db, `${studentPath(local.cls, local.pid)}/owner`));
    if (snap.val() === uid) return 'mine';
  } catch {
    // чужой профиль не читается — это и есть случай переноса
  }
  try {
    await update(ref(db), {
      [`${studentPath(local.cls, local.pid)}/owner`]: uid,
      [`asosh_student_rebind/${uid}`]: local.secret,
    });
    return 'mine';
  } catch (err) {
    if (isDenied(err)) return 'gone'; // профиль удалён учителем
    throw err;
  }
}

export async function deleteMyStudentProfile(): Promise<boolean> {
  const local = getLocalStudent();
  if (!local) return true;
  if (!(await ready())) return false;
  const { db } = initFirebase();
  try {
    await rebindIfNeeded(local);
    await remove(ref(db, studentPath(local.cls, local.pid)));
  } catch (err) {
    if (!isDenied(err)) return false;
  }
  saveLocalStudent(null);
  localStorage.removeItem(GRADES_CACHE_KEY);
  return true;
}

function readCachedGrades(): Grade[] {
  try {
    const list = JSON.parse(localStorage.getItem(GRADES_CACHE_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const toGrades = (val: Record<string, Omit<Grade, 'id'>> | null): Grade[] =>
  Object.entries(val || {})
    .map(([id, g]) => ({ ...g, id, sub: censor(g.sub), note: g.note ? censor(g.note) : undefined }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.t - a.t);

// Свой профиль и свои оценки. Без интернета показываем сохранённые оценки
export function subscribeMyStudent(onUpdate: (state: MyStudentState) => void): () => void {
  const local = getLocalStudent();
  let state: MyStudentState = local
    ? { status: 'pending', name: local.name, cls: local.cls, grades: readCachedGrades(), online: false }
    : { status: 'none', grades: [], online: false };
  const emit = (patch: Partial<MyStudentState>) => {
    state = { ...state, ...patch };
    onUpdate(state);
  };
  emit({});
  if (!local) return () => {};

  const unsubs: Unsubscribe[] = [];
  let cancelled = false;
  (async () => {
    if (!(await ready())) return;
    await ensureClassMember(local.cls);
    let bound: 'mine' | 'gone';
    try {
      bound = await rebindIfNeeded(local);
    } catch {
      return; // нет связи — остаёмся на сохранённом
    }
    if (cancelled) return;
    if (bound === 'gone') {
      saveLocalStudent(null);
      localStorage.removeItem(GRADES_CACHE_KEY);
      emit({ status: 'none', name: undefined, grades: [], online: true });
      return;
    }
    const { db } = initFirebase();
    unsubs.push(
      onValue(
        ref(db, studentPath(local.cls, local.pid)),
        (snap) => {
          const rec = snap.val() as Omit<StudentRecord, 'pid'> | null;
          if (!rec) {
            emit({ status: 'none', name: undefined, grades: [], online: true });
            return;
          }
          emit({ status: rec.ok === true ? 'ok' : rec.ok === false ? 'rejected' : 'pending', name: rec.name, online: true });
        },
        () => emit({ status: 'none', name: undefined, grades: [], online: true })
      )
    );
    unsubs.push(
      onValue(
        ref(db, gradesPath(local.cls, local.pid)),
        (snap) => {
          const grades = toGrades(snap.val());
          try {
            localStorage.setItem(GRADES_CACHE_KEY, JSON.stringify(grades));
          } catch {
            // нет места — без кэша
          }
          emit({ grades });
        },
        (err) => console.warn('Grades read error:', err)
      )
    );
  })();
  return () => {
    cancelled = true;
    unsubs.forEach((u) => u());
  };
}

// ---------- Учитель ----------

export function subscribeClassStudents(cls: string, onUpdate: (list: StudentRecord[]) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  ready().then((ok) => {
    if (!ok || cancelled) return;
    const { db } = initFirebase();
    unsub = onValue(
      ref(db, studentPath(cls)),
      (snap) => {
        const val = (snap.val() || {}) as Record<string, Omit<StudentRecord, 'pid'>>;
        onUpdate(
          Object.entries(val)
            .map(([pid, r]) => ({ ...r, pid, name: censor(r.name) }))
            .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        );
      },
      (err) => console.warn('Students read error:', err)
    );
  });
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}

export function subscribeClassGrades(cls: string, onUpdate: (byStudent: Record<string, Grade[]>) => void): () => void {
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  ready().then((ok) => {
    if (!ok || cancelled) return;
    const { db } = initFirebase();
    unsub = onValue(
      ref(db, gradesPath(cls)),
      (snap) => {
        const val = (snap.val() || {}) as Record<string, Record<string, Omit<Grade, 'id'>>>;
        const out: Record<string, Grade[]> = {};
        Object.entries(val).forEach(([pid, g]) => (out[pid] = toGrades(g)));
        onUpdate(out);
      },
      (err) => console.warn('Class grades read error:', err)
    );
  });
  return () => {
    cancelled = true;
    if (unsub) unsub();
  };
}

export async function setStudentApproval(cls: string, pid: string, ok: boolean): Promise<boolean> {
  if (!(await ready())) return false;
  const { db } = initFirebase();
  try {
    await update(ref(db, studentPath(cls, pid)), { ok, okBy: myUid() });
    return true;
  } catch (err) {
    console.warn('Approve failed:', err);
    return false;
  }
}

export async function deleteStudent(cls: string, pid: string): Promise<boolean> {
  if (!(await ready())) return false;
  const { db } = initFirebase();
  try {
    await remove(ref(db, studentPath(cls, pid)));
    return true;
  } catch (err) {
    console.warn('Student delete failed:', err);
    return false;
  }
}

export async function addGrade(
  cls: string,
  pid: string,
  g: { sub: string; v: number; date: string; note?: string },
  teacherName: string
): Promise<boolean> {
  if (!(await ready())) return false;
  const { db } = initFirebase();
  const data: Record<string, unknown> = {
    sub: g.sub.trim().slice(0, 40),
    v: g.v,
    date: g.date,
    teacher: teacherName.slice(0, 60),
    tuid: myUid(),
    t: serverTimestamp(),
  };
  if (g.note?.trim()) data.note = g.note.trim().slice(0, 200);
  try {
    await push(ref(db, gradesPath(cls, pid)), data);
    return true;
  } catch (err) {
    console.warn('Grade add failed:', err);
    return false;
  }
}

export async function deleteGrade(cls: string, pid: string, id: string): Promise<boolean> {
  if (!(await ready())) return false;
  const { db } = initFirebase();
  try {
    await remove(ref(db, `${gradesPath(cls, pid)}/${id}`));
    return true;
  } catch (err) {
    console.warn('Grade delete failed:', err);
    return false;
  }
}

// Средний балл с двумя знаками, или null, если оценок нет
export function average(grades: Grade[]): number | null {
  if (!grades.length) return null;
  return Math.round((grades.reduce((s, g) => s + g.v, 0) / grades.length) * 100) / 100;
}
