// Журнал ошибок: если у ученика приложение упало, ошибка анонимно записывается в базу
// asosh_errors/<uid>/<id> (текст, первые строки стека, версия, экран, платформа).
// Читают только администраторы (asosh_admins) — во вкладке «Ошибки» панели разработчика.
// Не чаще одной записи в минуту с устройства и не больше 5 за запуск: сервер проверяет частоту сам.

import { ref, push, update, get, remove, serverTimestamp } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { myUid } from './classShared';
import { APP_VERSION } from '../data/constants';

export interface ErrorEntry {
  id: string;
  uid: string;
  msg: string;
  stack: string;
  ver: string;
  scr: string;
  plat: string;
  t: number;
}

const MAX_PER_RUN = 5;
const MIN_GAP_MS = 60 * 1000;
let sent = 0;
let lastSent = 0;
const seen = new Set<string>();
let currentScreen = '';

export const setErrorScreen = (s: string) => {
  currentScreen = s;
};

const platform = () => {
  const ua = navigator.userAgent || '';
  if (location.protocol === 'app:' || /Electron/i.test(ua)) return 'desktop';
  if ((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return 'apk';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad/i.test(ua)) return 'ios';
  return 'web';
};

// Убираем из текста то, что может быть личным: адреса почты, длинные числа, ссылки с параметрами
const scrub = (s: string) =>
  s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>')
    .replace(/\d{6,}/g, '<n>')
    .replace(/\?[^\s)]+/g, '');

async function report(message: string, stack: string) {
  if (!message || sent >= MAX_PER_RUN || Date.now() - lastSent < MIN_GAP_MS || !navigator.onLine) return;
  // Шум браузеров и расширений — не наши ошибки
  if (/ResizeObserver loop|Script error\.?$|chrome-extension:|moz-extension:/i.test(message + stack)) return;
  const key = message.slice(0, 120);
  if (seen.has(key)) return;
  seen.add(key);
  sent += 1;
  lastSent = Date.now();
  try {
    const { db } = initFirebase();
    if (!db || !(await ensureSignedIn())) return;
    const uid = myUid();
    if (!uid) return;
    const id = push(ref(db, `asosh_errors/${uid}`)).key;
    await update(ref(db), {
      [`asosh_errors/${uid}/${id}`]: {
        msg: scrub(message).slice(0, 300),
        stack: scrub(stack).split('\n').slice(0, 8).join('\n').slice(0, 1500),
        ver: APP_VERSION.slice(0, 12),
        scr: currentScreen.slice(0, 30),
        plat: platform(),
        t: serverTimestamp(),
      },
      [`asosh_rate/${uid}/err`]: serverTimestamp(),
    });
  } catch {
    // нет сети или лимит — не страшно
  }
}

export function installErrorLog() {
  window.addEventListener('error', (e) => {
    report(String(e.message || e.error?.message || ''), String(e.error?.stack || `${e.filename}:${e.lineno}:${e.colno}`));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | string | undefined;
    const msg = typeof r === 'string' ? r : r?.message || String(r || '');
    // Сетевые ошибки Firebase при плохом интернете — не баги приложения
    if (/network|offline|Failed to fetch|permission[_ ]denied/i.test(msg)) return;
    report(msg, typeof r === 'object' && r?.stack ? r.stack : '');
  });
}

// Для экрана ErrorBoundary: React поймал ошибку при отрисовке
export const reportRenderError = (err: Error, componentStack = '') => report(err.message, `${err.stack || ''}\n${componentStack}`);

export async function loadErrors(): Promise<ErrorEntry[]> {
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) throw new Error('offline');
  const v = (await get(ref(db, 'asosh_errors'))).val() as Record<string, Record<string, Omit<ErrorEntry, 'id' | 'uid'>>> | null;
  const list: ErrorEntry[] = [];
  Object.entries(v || {}).forEach(([uid, items]) =>
    Object.entries(items || {}).forEach(([id, e]) => list.push({ id, uid, ...e }))
  );
  return list.sort((a, b) => b.t - a.t);
}

export async function clearErrors(): Promise<void> {
  const { db } = initFirebase();
  if (!db) return;
  await remove(ref(db, 'asosh_errors'));
}
