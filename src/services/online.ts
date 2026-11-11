// Рейтинг онлайна класса. Включён у всех по умолчанию, выключается в Опциях → Приватность.
// Видят только одноклассники (путь в базе — по классу).
// Хранится: ник, эмодзи-аватар, статус, «о себе», минуты в приложении за неделю и время последней активности.

import { ref, set, remove, onValue, onDisconnect, serverTimestamp } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { classKey, myUid } from './classShared';
import { getMyProfile } from './userService';

const OPT_KEY = 'asosh_online_optin';
const TIME_KEY = 'asosh_online_week'; // { week, sec } — время в приложении за текущую неделю
const HEARTBEAT_SEC = 60;
export const ONLINE_WINDOW_MS = 150 * 1000; // «в сети», если был активен за последние 2,5 минуты

export interface OnlineEntry {
  uid: string;
  nick: string;
  avatar: string;
  status: string;
  bio: string;
  week: string;
  sec: number; // секунды в приложении за неделю
  last: number; // последний сигнал, мс
}

export const isOptedIn = () => {
  try {
    return localStorage.getItem(OPT_KEY) !== '0';
  } catch {
    return true;
  }
};

// Неделя с понедельника: «2026-11-09»
export function weekKey(d = new Date()): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function loadWeek(): { week: string; sec: number } {
  try {
    const v = JSON.parse(localStorage.getItem(TIME_KEY) || '{}');
    if (v.week === weekKey()) return { week: v.week, sec: Number(v.sec) || 0 };
  } catch {
    // начнём с нуля
  }
  return { week: weekKey(), sec: 0 };
}

function saveWeek(v: { week: string; sec: number }) {
  try {
    localStorage.setItem(TIME_KEY, JSON.stringify(v));
  } catch {
    // не запомнится — посчитаем заново
  }
}

const path = (cls: string, uid: string) => `asosh_online/${classKey(cls)}/${uid}`;

// Что видят одноклассники. Фото не отправляем — только эмодзи; длины обрезаем
function publicCard() {
  const p = getMyProfile();
  const avatar = p.avatarType === 'image' || (p.avatar || '').startsWith('data:') ? '🎒' : (p.avatar || '🎒').slice(0, 4);
  return {
    nick: (p.username || 'Ученик').slice(0, 30),
    avatar,
    status: (p.status || '').slice(0, 60),
    bio: (p.bio || '').slice(0, 200),
  };
}

async function writeMe(cls: string): Promise<boolean> {
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) return false;
  const uid = myUid();
  if (!uid) return false;
  const w = loadWeek();
  const node = ref(db, path(cls, uid));
  await set(node, { ...publicCard(), week: w.week, sec: Math.round(w.sec), last: serverTimestamp() });
  return true;
}

export async function setOptIn(cls: string, on: boolean): Promise<boolean> {
  try {
    localStorage.setItem(OPT_KEY, on ? '1' : '0');
  } catch {
    // ничего
  }
  const { db } = initFirebase();
  if (!db || !navigator.onLine) return false;
  try {
    if (on) return await writeMe(cls);
    if (!(await ensureSignedIn())) return false;
    const uid = myUid();
    if (uid) await remove(ref(db, path(cls, uid)));
    return true;
  } catch {
    return false;
  }
}

// Считает время, пока приложение открыто и видно, и раз в минуту отправляет сигнал «я в сети».
// Возвращает функцию остановки.
export function startPresence(cls: string): () => void {
  let lastTick = Date.now();
  let stopped = false;
  const tick = async () => {
    const now = Date.now();
    const visible = document.visibilityState === 'visible';
    const w = loadWeek();
    // Засчитываем не больше интервала: если телефон спал, время не растёт
    if (visible) w.sec += Math.min((now - lastTick) / 1000, HEARTBEAT_SEC * 1.5);
    lastTick = now;
    saveWeek(w);
    if (stopped || !visible || !isOptedIn() || !navigator.onLine) return;
    try {
      if (await writeMe(cls)) {
        const { db } = initFirebase();
        const uid = myUid();
        // Закрыл приложение или пропала сеть — сразу «не в сети». После переподключения ставим заново
        if (db && uid) onDisconnect(ref(db, `${path(cls, uid)}/last`)).set(Date.now() - ONLINE_WINDOW_MS - 1000);
      }
    } catch {
      // нет сети — попробуем через минуту
    }
  };
  tick();
  const timer = setInterval(tick, HEARTBEAT_SEC * 1000);
  // Свернул приложение — сразу «не в сети» (не ждём, пока пройдут 2,5 минуты)
  const markAway = async () => {
    if (!isOptedIn() || !navigator.onLine) return;
    const { db } = initFirebase();
    const uid = myUid();
    if (!db || !uid) return;
    try {
      await set(ref(db, `${path(cls, uid)}/last`), Date.now() - ONLINE_WINDOW_MS - 1000);
    } catch {
      // не вышло — через 2,5 минуты всё равно станет «не в сети»
    }
  };
  const onVis = () => {
    if (document.visibilityState === 'visible') lastTick = Date.now();
    tick();
    if (document.visibilityState === 'hidden') markAway();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVis);
  };
}

export function subscribeOnline(cls: string, cb: (list: OnlineEntry[]) => void, onError?: () => void): () => void {
  const { db } = initFirebase();
  if (!db) {
    onError?.();
    return () => {};
  }
  let unsub = () => {};
  let alive = true;
  ensureSignedIn().then((ok) => {
    if (!alive) return;
    if (!ok) {
      onError?.();
      return;
    }
    unsub = onValue(
      ref(db, `asosh_online/${classKey(cls)}`),
      (snap) => {
        const v = (snap.val() || {}) as Record<string, Omit<OnlineEntry, 'uid'>>;
        const week = weekKey();
        const list = Object.entries(v).map(([uid, e]) => ({ uid, ...e, sec: e.week === week ? Number(e.sec) || 0 : 0 }));
        list.sort((a, b) => b.sec - a.sec || b.last - a.last);
        cb(list);
      },
      () => onError?.()
    );
  });
  return () => {
    alive = false;
    unsub();
  };
}

export const myWeekSec = () => loadWeek().sec;

// «в сети» / «был недавно» / «сегодня» / «давно» — без точного времени захода
export function presenceLabel(last: number, now = Date.now()): { online: boolean; text: string } {
  const ago = now - last;
  if (ago < ONLINE_WINDOW_MS) return { online: true, text: 'в сети' };
  if (ago < 60 * 60 * 1000) return { online: false, text: 'был недавно' };
  if (new Date(last).toDateString() === new Date(now).toDateString()) return { online: false, text: 'сегодня' };
  return { online: false, text: 'давно' };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  return `${h} ч ${m % 60} мин`;
}
