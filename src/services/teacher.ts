// Режим учителя: вход по одноразовому коду и общие объявления/события.
// Одноразовость проверяет сама база (database.rules.json): код «занимается» за одним
// анонимным аккаунтом и второй раз уже не срабатывает — ни на этом, ни на другом телефоне.
// В правилах лежат только PBKDF2-отпечатки кодов, сами коды есть только у администратора.

import { ref, get, update, push, remove, onValue, query, limitToLast } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { myUid } from './classShared';

const LOCAL_KEY = 'asosh_teacher';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// Русские буквы, похожие на латинские: учитель может набрать код в русской раскладке
const CYR_TO_LAT: Record<string, string> = { А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y' };

export interface TeacherInfo {
  name: string;
}

export function getLocalTeacher(): TeacherInfo | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const info = raw ? (JSON.parse(raw) as TeacherInfo) : null;
    return info?.name ? info : null;
  } catch {
    return null;
  }
}

export function clearLocalTeacher(): void {
  localStorage.removeItem(LOCAL_KEY);
}

export function normalizeTeacherCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .map((ch) => CYR_TO_LAT[ch] || ch)
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('');
}

// Медленный отпечаток кода (PBKDF2, 100 000 повторов): по нему нельзя быстро подобрать сам код
export async function hashTeacherCode(code: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode('asosh-teacher-v1'), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function loginTeacher(rawCode: string, rawName: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = normalizeTeacherCode(rawCode);
  const name = rawName.trim().slice(0, 60);
  if (code.length !== 12) return { ok: false, error: 'Код учителя — 12 символов, например ABCD-EFGH-JKLM' };
  if (name.length < 3) return { ok: false, error: 'Напишите, как к вам обращаться, например «Мария Ивановна»' };
  const { db } = initFirebase();
  if (!db || !navigator.onLine || !(await ensureSignedIn())) return { ok: false, error: 'Нужен интернет, чтобы проверить код' };
  const uid = myUid();
  try {
    const h = await hashTeacherCode(code);
    const claim = await get(ref(db, `asosh_teacher_claims/${h}`));
    const owner = claim.exists() ? (claim.val() as { uid?: string }).uid : null;
    if (owner && owner !== uid) return { ok: false, error: 'Этот код уже использован. Попросите у администратора новый.' };
    const t = Date.now();
    // Код и запись учителя пишутся одним действием: правила базы проверяют их вместе
    const changes: Record<string, unknown> = { [`asosh_teachers/${uid}`]: { h, name, t } };
    if (!owner) changes[`asosh_teacher_claims/${h}`] = { uid, t };
    await update(ref(db), changes);
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ name }));
    return { ok: true };
  } catch (err) {
    console.warn('Teacher login failed:', err);
    return { ok: false, error: 'Неверный код учителя' };
  }
}

// Проверка при запуске: учитель остаётся учителем, только пока запись есть в базе
export async function verifyTeacher(): Promise<TeacherInfo | null | 'offline'> {
  const { db } = initFirebase();
  if (!db || !navigator.onLine || !(await ensureSignedIn())) return 'offline';
  try {
    const snap = await get(ref(db, `asosh_teachers/${myUid()}`));
    return snap.exists() ? { name: (snap.val() as TeacherInfo).name } : null;
  } catch {
    return 'offline';
  }
}

// ---------- Объявления и события ----------
// pub — видят все (или только ученики), teach — только учителя

export type BoardAudience = 'all' | 'students' | 'teachers';

export interface BoardPost {
  id: string;
  kind: 'ann' | 'event';
  title: string;
  text?: string;
  date?: string; // YYYY-MM-DD — у событий
  aud: BoardAudience;
  cls: string; // '' — вся школа, иначе класс, например «6Б»
  author: string;
  uid: string;
  created_at: number;
}

const CACHE_KEY = 'asosh_board_cache';
const boardPath = (aud: BoardAudience) => (aud === 'teachers' ? 'asosh_board/teach' : 'asosh_board/pub');

export function subscribeBoard(isTeacher: boolean, onUpdate: (posts: BoardPost[]) => void): () => void {
  let cached: BoardPost[] = [];
  try {
    cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    cached = [];
  }
  const parts: Record<string, BoardPost[]> = { pub: cached.filter((p) => p.aud !== 'teachers'), teach: isTeacher ? cached.filter((p) => p.aud === 'teachers') : [] };
  const emit = () => {
    const all = [...parts.pub, ...parts.teach].sort((a, b) => b.created_at - a.created_at);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch {
      // нет места — без кэша
    }
    onUpdate(all);
  };
  emit();
  const { db } = initFirebase();
  if (!db) return () => {};
  const unsubs: (() => void)[] = [];
  let cancelled = false;
  ensureSignedIn().then((ok) => {
    if (cancelled || !ok) return;
    (isTeacher ? (['pub', 'teach'] as const) : (['pub'] as const)).forEach((key) => {
      unsubs.push(
        onValue(
          query(ref(db, `asosh_board/${key}`), limitToLast(100)),
          (snap) => {
            const val = snap.val() || {};
            parts[key] = Object.keys(val).map((id) => ({ ...val[id], id }) as BoardPost);
            emit();
          },
          () => {
            // нет прав (например, учитель вышел) — просто не показываем
          }
        )
      );
    });
  });
  return () => {
    cancelled = true;
    unsubs.forEach((u) => u());
  };
}

export async function addBoardPost(post: Omit<BoardPost, 'id' | 'uid' | 'created_at'>): Promise<boolean> {
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) return false;
  try {
    const clean = Object.fromEntries(Object.entries(post).filter(([, v]) => v !== '' && v !== undefined));
    await push(ref(db, boardPath(post.aud)), { ...clean, cls: post.cls, uid: myUid(), created_at: Date.now() });
    return true;
  } catch (err) {
    console.warn('Board write error:', err);
    return false;
  }
}

export async function deleteBoardPost(post: BoardPost): Promise<boolean> {
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) return false;
  try {
    await remove(ref(db, `${boardPath(post.aud)}/${post.id}`));
    return true;
  } catch {
    return false;
  }
}

// Что показать этому человеку: ученику — своё и общешкольное, учителю — всё
export function postsFor(posts: BoardPost[], isTeacher: boolean, cls: string): BoardPost[] {
  return posts.filter((p) => isTeacher || ((p.cls === '' || p.cls === cls) && p.aud !== 'teachers'));
}

export const AUDIENCE_LABEL: Record<BoardAudience, string> = {
  all: '👥 Всем',
  students: '🎒 Ученикам',
  teachers: '👩‍🏫 Учителям',
};
