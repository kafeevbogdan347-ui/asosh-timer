// Аккаунты: логин и пароль (Firebase Auth), роли ученик / учитель / родитель.
//
// asosh_users/<uid>            — профиль: роль, имя, логин, класс (ученик), предметы (учитель)
// asosh_private/<uid>          — код для родителей (видит только сам ученик)
// asosh_roster/<класс>/<uid>   — ученик в классе: имя «Иван П.»; ok — подтвердил учитель
// asosh_parent_codes/<sha256>  — код родителей → ученик (список не читается, только по коду)
// asosh_family/<ученик>/<род.> — кто из родителей видит ученика; ученик может отключить
// asosh_parent_links/<род.>/<ученик> — список детей родителя (имя и класс для экрана)
//
// Кто что может, проверяют правила базы (database.rules.json, тесты — tests/accounts.rules.test.mjs).
// Логин превращается в служебную почту login@asosh-timer.app: настоящая почта не нужна.

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  linkWithCredential,
  unlink,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  User,
} from 'firebase/auth';
import { ref, get, update, remove, onValue } from 'firebase/database';
import { initFirebase } from './firebaseChat';
import { classKey } from './classShared';
import { hashTeacherCode, normalizeTeacherCode } from './teacher';
import { sha256Hex } from '../utils/sha256';
import { removeMyPresence } from './online';

// Класс, в рейтинге которого может висеть запись этого устройства
const localClass = () => {
  try {
    return localStorage.getItem('asosh_class_v105') || localStorage.getItem('class') || '';
  } catch {
    return '';
  }
};

export type Role = 'student' | 'teacher' | 'parent';

export interface Account {
  uid: string;
  role: Role;
  name: string;
  login: string;
  cls?: string;
  subjects?: string[];
  registeredAt?: number;
}

export interface ChildLink {
  sid: string;
  name: string;
  cls: string;
}

export interface ParentEntry {
  puid: string;
  name: string;
  t: number;
}

const DOMAIN = 'asosh-timer.app';
const LOCAL_KEY = 'asosh_account_v1';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CYR_TO_LAT: Record<string, string> = { А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', Р: 'P', С: 'C', Т: 'T', Х: 'X', У: 'Y' };

export const normalizeLogin = (s: string) => s.trim().toLowerCase();
const loginToEmail = (login: string) => `${normalizeLogin(login)}@${DOMAIN}`;

export function loginError(login: string): string | null {
  const l = normalizeLogin(login);
  if (l.length < 3) return 'Логин — минимум 3 символа';
  if (l.length > 20) return 'Логин — не длиннее 20 символов';
  if (!/^[a-z0-9_.]+$/.test(l)) return 'Логин: только латинские буквы, цифры, «_» и «.»';
  return null;
}

export function passwordError(p: string): string | null {
  if (p.length < 8) return 'Пароль — минимум 8 символов';
  if (/^\d+$/.test(p)) return 'Пароль не должен состоять только из цифр';
  return null;
}

// ---------- Локальная копия аккаунта: чтобы приложение знало роль без интернета ----------

export function getLocalAccount(): Account | null {
  try {
    const a = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    return a?.uid && a?.role ? a : null;
  } catch {
    return null;
  }
}

function saveLocalAccount(a: Account | null) {
  try {
    if (a) localStorage.setItem(LOCAL_KEY, JSON.stringify(a));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    // нет места — роль восстановится при следующем входе
  }
}

// ---------- Код для родителей ----------

export function normalizeParentCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .map((ch) => CYR_TO_LAT[ch] || ch)
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .join('');
}

function newParentCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const raw = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

const parentCodeHash = (code: string) => sha256Hex(normalizeParentCode(code));

// ---------- Общее ----------

function authOrNull() {
  const { app, db } = initFirebase();
  return app && db ? { auth: getAuth(app), db } : null;
}

const errCode = (err: unknown) => String((err as { code?: string })?.code || err);

function authMessage(err: unknown): string {
  const c = errCode(err);
  if (c.includes('email-already-in-use') || c.includes('credential-already-in-use')) return 'Этот логин уже занят — придумай другой';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Неверный логин или пароль';
  if (c.includes('too-many-requests')) return 'Слишком много попыток. Подожди пару минут';
  if (c.includes('network')) return 'Нет интернета';
  if (c.includes('operation-not-allowed')) return 'Вход по логину пока выключен. Администратору: Firebase → Authentication → включить Email/Password';
  if (c.includes('weak-password')) return 'Пароль слишком простой';
  if (c.includes('permission')) return 'Сервер не принял данные';
  return 'Не получилось. Проверь интернет и попробуй ещё раз';
}

// Создаём учётную запись. Если на телефоне уже был анонимный вход (чат, код учителя),
// превращаем его в аккаунт с тем же uid — ничего не теряется
async function createCredentialUser(login: string, password: string): Promise<{ user: User; linked: boolean }> {
  const ctx = authOrNull();
  if (!ctx) throw new Error('no-firebase');
  await ctx.auth.authStateReady();
  const cur = ctx.auth.currentUser;
  const credential = EmailAuthProvider.credential(loginToEmail(login), password);
  if (cur?.isAnonymous) {
    const res = await linkWithCredential(cur, credential);
    return { user: res.user, linked: true };
  }
  if (cur) {
    await removeMyPresence(localClass());
    await signOut(ctx.auth);
  }
  const res = await createUserWithEmailAndPassword(ctx.auth, loginToEmail(login), password);
  return { user: res.user, linked: false };
}

// Если данные не записались — откатываем вход, чтобы логин не «повис» занятым
async function rollback(user: User, linked: boolean) {
  try {
    if (linked) await unlink(user, EmailAuthProvider.PROVIDER_ID);
    else await user.delete();
  } catch {
    // не страшно: логин можно будет занять заново после входа
  }
}

export type RegisterInput =
  | { role: 'student'; login: string; password: string; name: string; cls: string }
  | { role: 'teacher'; login: string; password: string; name: string; subjects: string[]; teacherCode: string }
  | { role: 'parent'; login: string; password: string; name: string; parentCode: string };

export type RegisterResult = { ok: true; account: Account; parentCode?: string; child?: ChildLink } | { ok: false; error: string };

export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  const lErr = loginError(input.login) || passwordError(input.password);
  if (lErr) return { ok: false, error: lErr };
  if (!navigator.onLine) return { ok: false, error: 'Для регистрации нужен интернет' };
  const ctx = authOrNull();
  if (!ctx) return { ok: false, error: 'Сервер недоступен' };
  const login = normalizeLogin(input.login);
  const name = input.name.trim().slice(0, 60);

  // Код учителя и код родителей проверяем заранее, чтобы не создавать аккаунт зря
  // Пустой код учителя допустим, если на этом телефоне уже вошли кодом раньше (проверим после входа)
  let teacherHash = '';
  if (input.role === 'teacher' && input.teacherCode.trim()) {
    const code = normalizeTeacherCode(input.teacherCode);
    if (code.length !== 12) return { ok: false, error: 'Код учителя — 12 символов, например ABCD-EFGH-JKLM' };
    teacherHash = await hashTeacherCode(code);
  }
  let parentHash = '';
  if (input.role === 'parent') {
    if (normalizeParentCode(input.parentCode).length !== 8) return { ok: false, error: 'Код ребёнка — 8 символов, например K7QM-2XPA' };
    parentHash = await parentCodeHash(input.parentCode);
  }

  let user: User;
  let linked = false;
  try {
    ({ user, linked } = await createCredentialUser(login, input.password));
  } catch (err) {
    return { ok: false, error: authMessage(err) };
  }
  const uid = user.uid;
  const t = Date.now();
  const base = { role: input.role, name, login, t };

  try {
    if (input.role === 'student') {
      const code = newParentCode();
      const h = await parentCodeHash(code);
      await update(ref(ctx.db), {
        [`asosh_users/${uid}`]: { ...base, cls: input.cls },
        [`asosh_roster/${classKey(input.cls)}/${uid}`]: { name, t },
        [`asosh_parent_codes/${h}`]: { student: uid, t },
        [`asosh_private/${uid}`]: { pcode: code },
      });
      const account: Account = { uid, role: 'student', name, login, cls: input.cls, registeredAt: t };
      saveLocalAccount(account);
      return { ok: true, account, parentCode: code };
    }

    if (input.role === 'teacher') {
      const subjects = input.subjects.join(', ').slice(0, 300);
      const already = (await get(ref(ctx.db, `asosh_teachers/${uid}`))).exists();
      if (!already && !teacherHash) {
        await rollback(user, linked);
        return { ok: false, error: 'Введите код учителя' };
      }
      if (!already) {
        const claim = await get(ref(ctx.db, `asosh_teacher_claims/${teacherHash}`));
        const owner = claim.exists() ? (claim.val() as { uid?: string }).uid : null;
        if (owner && owner !== uid) {
          await rollback(user, linked);
          return { ok: false, error: 'Этот код учителя уже использован. Попросите у администратора новый.' };
        }
        const changes: Record<string, unknown> = {
          [`asosh_teachers/${uid}`]: { h: teacherHash, name, t },
          [`asosh_users/${uid}`]: { ...base, subjects },
        };
        if (!owner) changes[`asosh_teacher_claims/${teacherHash}`] = { uid, t };
        await update(ref(ctx.db), changes);
      } else {
        await update(ref(ctx.db), { [`asosh_users/${uid}`]: { ...base, subjects } });
      }
      localStorage.setItem('asosh_teacher', JSON.stringify({ name }));
      const account: Account = { uid, role: 'teacher', name, login, subjects: input.subjects, registeredAt: t };
      saveLocalAccount(account);
      return { ok: true, account };
    }

    // Родитель: по коду находим ребёнка, привязываемся, потом читаем его имя и класс
    const codeSnap = await get(ref(ctx.db, `asosh_parent_codes/${parentHash}`));
    const sid = codeSnap.exists() ? (codeSnap.val() as { student?: string }).student : null;
    if (!sid) {
      await rollback(user, linked);
      return { ok: false, error: 'Код не найден. Проверь его в профиле ребёнка («Дневник» → «Код для родителей»)' };
    }
    await update(ref(ctx.db), {
      [`asosh_users/${uid}`]: base,
      [`asosh_family/${sid}/${uid}`]: { h: parentHash, name, t },
    });
    const child = await linkChildInfo(uid, sid);
    const account: Account = { uid, role: 'parent', name, login, cls: child?.cls, registeredAt: t };
    saveLocalAccount(account);
    return { ok: true, account, child: child || undefined };
  } catch (err) {
    console.warn('Register failed:', err);
    await rollback(user, linked);
    const denied = errCode(err).includes('permission');
    return {
      ok: false,
      error: denied && input.role === 'teacher' ? 'Неверный код учителя' : authMessage(err),
    };
  }
}

async function linkChildInfo(puid: string, sid: string): Promise<ChildLink | null> {
  const ctx = authOrNull();
  if (!ctx) return null;
  const snap = await get(ref(ctx.db, `asosh_users/${sid}`));
  const v = snap.val() as { name?: string; cls?: string } | null;
  if (!v?.name || !v?.cls) return null;
  await update(ref(ctx.db), { [`asosh_parent_links/${puid}/${sid}`]: { name: v.name, cls: v.cls, t: Date.now() } });
  return { sid, name: v.name, cls: v.cls };
}

// Родитель добавляет ещё одного ребёнка по его коду
export async function addChild(parentName: string, code: string): Promise<{ ok: true; child: ChildLink } | { ok: false; error: string }> {
  const ctx = authOrNull();
  const me = ctx?.auth.currentUser;
  if (!ctx || !me) return { ok: false, error: 'Сначала войди в аккаунт' };
  if (normalizeParentCode(code).length !== 8) return { ok: false, error: 'Код — 8 символов, например K7QM-2XPA' };
  try {
    const h = await parentCodeHash(code);
    const snap = await get(ref(ctx.db, `asosh_parent_codes/${h}`));
    const sid = snap.exists() ? (snap.val() as { student?: string }).student : null;
    if (!sid) return { ok: false, error: 'Код не найден' };
    await update(ref(ctx.db), { [`asosh_family/${sid}/${me.uid}`]: { h, name: parentName, t: Date.now() } });
    const child = await linkChildInfo(me.uid, sid);
    return child ? { ok: true, child } : { ok: false, error: 'Ребёнок ещё не выбрал класс' };
  } catch (err) {
    return { ok: false, error: authMessage(err) };
  }
}

export function subscribeMyChildren(puid: string, cb: (children: ChildLink[]) => void): () => void {
  const ctx = authOrNull();
  if (!ctx) return () => {};
  return onValue(
    ref(ctx.db, `asosh_parent_links/${puid}`),
    (snap) => {
      const v = (snap.val() || {}) as Record<string, { name: string; cls: string }>;
      cb(Object.entries(v).map(([sid, c]) => ({ sid, name: c.name, cls: c.cls })));
    },
    () => cb([])
  );
}

export async function removeChild(puid: string, sid: string): Promise<boolean> {
  const ctx = authOrNull();
  if (!ctx) return false;
  try {
    await update(ref(ctx.db), { [`asosh_family/${sid}/${puid}`]: null, [`asosh_parent_links/${puid}/${sid}`]: null });
    return true;
  } catch {
    return false;
  }
}

// ---------- Вход и выход ----------

export async function loginAccount(login: string, password: string): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
  const ctx = authOrNull();
  if (!ctx) return { ok: false, error: 'Сервер недоступен' };
  if (!navigator.onLine) return { ok: false, error: 'Для входа нужен интернет' };
  try {
    // Анонимная запись этого устройства в рейтинге больше не нужна: дальше пишем от имени аккаунта.
    // Без этого один человек виден в рейтинге дважды
    await ctx.auth.authStateReady().catch(() => {});
    const before = ctx.auth.currentUser;
    if (before && before.isAnonymous) await removeMyPresence(localClass());
    const res = await signInWithEmailAndPassword(ctx.auth, loginToEmail(login), password);
    const snap = await get(ref(ctx.db, `asosh_users/${res.user.uid}`));
    const v = snap.val() as { role: Role; name: string; login: string; cls?: string; subjects?: string; t?: number } | null;
    if (!v) return { ok: false, error: 'Аккаунт найден, но профиль пустой. Зарегистрируйся заново' };
    const account: Account = {
      uid: res.user.uid,
      role: v.role,
      name: v.name,
      login: v.login,
      cls: v.cls,
      subjects: v.subjects ? v.subjects.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      registeredAt: typeof v.t === 'number' ? v.t : undefined,
    };
    if (v.role === 'teacher') localStorage.setItem('asosh_teacher', JSON.stringify({ name: v.name }));
    if (v.role === 'parent') {
      // Класс родителя — класс первого ребёнка (по нему показываем расписание)
      const kids = await get(ref(ctx.db, `asosh_parent_links/${res.user.uid}`));
      const first = Object.values((kids.val() || {}) as Record<string, { cls: string }>)[0];
      account.cls = first?.cls;
    }
    saveLocalAccount(account);
    return { ok: true, account };
  } catch (err) {
    return { ok: false, error: authMessage(err) };
  }
}

// Сохранённые копии оценок не должны оставаться на телефоне после выхода
function clearGradeCaches() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('asosh_grades_cache_') || k.startsWith('asosh_grades_seen_'))) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

// Аккаунт записан на телефоне, а вход в базе потерян (перенос по QR, очистка данных браузера):
// тогда оценки молча не читаются. Возвращает false — нужно войти заново.
export async function verifyAccountSession(account: Account): Promise<boolean> {
  const ctx = authOrNull();
  if (!ctx) return true; // база не настроена — проверять нечем
  try {
    await ctx.auth.authStateReady();
  } catch {
    return true;
  }
  if (ctx.auth.currentUser?.uid === account.uid) return true;
  saveLocalAccount(null);
  if (account.role === 'teacher') localStorage.removeItem('asosh_teacher');
  clearGradeCaches();
  return false;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = passwordError(newPassword);
  if (err) return { ok: false, error: err };
  const ctx = authOrNull();
  const user = ctx?.auth.currentUser;
  if (!ctx || !user?.email) return { ok: false, error: 'Сначала войди в аккаунт' };
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, oldPassword));
    await updatePassword(user, newPassword);
    return { ok: true };
  } catch (e) {
    const c = errCode(e);
    if (c.includes('invalid-credential') || c.includes('wrong-password')) return { ok: false, error: 'Старый пароль неверный' };
    return { ok: false, error: authMessage(e) };
  }
}

export async function logoutAccount(): Promise<void> {
  saveLocalAccount(null);
  clearGradeCaches();
  localStorage.removeItem('asosh_teacher');
  localStorage.removeItem('asosh_profile_pushed');
  const ctx = authOrNull();
  if (ctx) {
    // Строка аккаунта в рейтинге остаётся (на других устройствах он ещё вошёл),
    // а это устройство после выхода станет анонимным и запишется отдельно, только если снова выберет класс
    await signOut(ctx.auth).catch(() => {});
  }
}

// ---------- Ученик ----------

export async function getMyParentCode(uid: string): Promise<string | null> {
  const ctx = authOrNull();
  if (!ctx) return null;
  try {
    return ((await get(ref(ctx.db, `asosh_private/${uid}/pcode`))).val() as string) || null;
  } catch {
    return null;
  }
}

// Новый код: старый перестаёт работать для новых привязок (уже привязанные родители остаются)
export async function regenerateParentCode(uid: string): Promise<string | null> {
  const ctx = authOrNull();
  if (!ctx) return null;
  try {
    const old = await getMyParentCode(uid);
    const code = newParentCode();
    const changes: Record<string, unknown> = {
      [`asosh_parent_codes/${await parentCodeHash(code)}`]: { student: uid, t: Date.now() },
      [`asosh_private/${uid}`]: { pcode: code },
    };
    if (old) changes[`asosh_parent_codes/${await parentCodeHash(old)}`] = null;
    await update(ref(ctx.db), changes);
    return code;
  } catch {
    return null;
  }
}

export function subscribeMyParents(sid: string, cb: (parents: ParentEntry[]) => void): () => void {
  const ctx = authOrNull();
  if (!ctx) return () => {};
  return onValue(
    ref(ctx.db, `asosh_family/${sid}`),
    (snap) => {
      const v = (snap.val() || {}) as Record<string, { name: string; t: number }>;
      cb(Object.entries(v).map(([puid, p]) => ({ puid, name: p.name, t: p.t })));
    },
    () => cb([])
  );
}

export async function removeParent(sid: string, puid: string): Promise<boolean> {
  const ctx = authOrNull();
  if (!ctx) return false;
  try {
    await remove(ref(ctx.db, `asosh_family/${sid}/${puid}`));
    return true;
  } catch {
    return false;
  }
}

// Ученик сменил класс: переписываемся в новый (учитель подтверждает заново)
export async function moveStudentToClass(account: Account, cls: string): Promise<boolean> {
  const ctx = authOrNull();
  if (!ctx || account.role !== 'student') return false;
  try {
    const changes: Record<string, unknown> = {
      [`asosh_users/${account.uid}/cls`]: cls,
      [`asosh_roster/${classKey(cls)}/${account.uid}`]: { name: account.name, t: Date.now() },
    };
    if (account.cls && account.cls !== cls) changes[`asosh_roster/${classKey(account.cls)}/${account.uid}`] = null;
    await update(ref(ctx.db), changes);
    saveLocalAccount({ ...account, cls });
    return true;
  } catch {
    return false;
  }
}

// Статус ученика в классе: ждёт подтверждения / подтверждён / нет в списке
export function subscribeMyRosterStatus(cls: string, sid: string, cb: (s: 'pending' | 'ok' | 'none') => void): () => void {
  const ctx = authOrNull();
  if (!ctx) return () => {};
  return onValue(
    ref(ctx.db, `asosh_roster/${classKey(cls)}/${sid}`),
    (snap) => {
      const v = snap.val() as { ok?: boolean } | null;
      cb(!v ? 'none' : v.ok ? 'ok' : 'pending');
    },
    () => cb('none')
  );
}

// ---------- Учитель: состав класса ----------

export interface RosterEntry {
  sid: string;
  name: string;
  ok: boolean;
  t: number;
}

export function subscribeRoster(cls: string, cb: (list: RosterEntry[]) => void): () => void {
  const ctx = authOrNull();
  if (!ctx) return () => {};
  return onValue(
    ref(ctx.db, `asosh_roster/${classKey(cls)}`),
    (snap) => {
      const v = (snap.val() || {}) as Record<string, { name: string; ok?: boolean; t: number }>;
      cb(
        Object.entries(v)
          .map(([sid, r]) => ({ sid, name: r.name, ok: !!r.ok, t: r.t }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      );
    },
    () => cb([])
  );
}

export async function confirmStudent(cls: string, sid: string, teacherUid: string): Promise<boolean> {
  const ctx = authOrNull();
  if (!ctx) return false;
  try {
    await update(ref(ctx.db, `asosh_roster/${classKey(cls)}/${sid}`), { ok: true, okBy: teacherUid });
    return true;
  } catch {
    return false;
  }
}

export async function removeFromRoster(cls: string, sid: string): Promise<boolean> {
  const ctx = authOrNull();
  if (!ctx) return false;
  try {
    await remove(ref(ctx.db, `asosh_roster/${classKey(cls)}/${sid}`));
    return true;
  } catch {
    return false;
  }
}
