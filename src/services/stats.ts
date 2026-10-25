// Анонимная статистика: сколько устройств открывают приложение и какие это устройства.
// Без имени, класса и любых личных данных — только тип устройства, экран и настройки графики.
// Одна запись в день с устройства: asosh_stats/<день>/<анонимный uid>

import { ref, set, get, query, orderByKey, startAt } from 'firebase/database';
import { Capacitor } from '@capacitor/core';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { myUid, toDateKey } from './classShared';

const SENT_KEY = 'asosh_stats_sent_day';

export interface DeviceVisit {
  p: string; // apk | android | ios | desktop
  os: string;
  br: string;
  sw: number; // ширина экрана, CSS px
  sh: number;
  dpr: number;
  mem: number; // ГБ памяти (только Chrome/Android), 0 — неизвестно
  cpu: number; // ядра процессора
  q: string; // качество графики: eco | normal | ultra
  pwa: boolean; // установлено на главный экран
  t: number;
}

function detectOs(ua: string): string {
  const android = ua.match(/Android (\d+)/);
  if (android) return `Android ${android[1]}`;
  const ios = ua.match(/OS (\d+)_\d+.* like Mac OS X/);
  if (ios) return `iOS ${ios[1]}`;
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Другая';
}

function detectBrowser(ua: string): string {
  if (Capacitor.isNativePlatform()) return 'APK';
  if (/YaBrowser/.test(ua)) return 'Яндекс';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome|CriOS/.test(ua)) return 'Chrome';
  if (/Safari/.test(ua)) return 'Safari';
  return 'Другой';
}

function collectVisit(quality: string): DeviceVisit {
  const ua = navigator.userAgent || '';
  const os = detectOs(ua);
  const p = Capacitor.isNativePlatform() ? 'apk' : os.startsWith('Android') ? 'android' : os.startsWith('iOS') ? 'ios' : 'desktop';
  const nav = navigator as Navigator & { deviceMemory?: number; standalone?: boolean };
  return {
    p,
    os,
    br: detectBrowser(ua),
    sw: Math.round(window.screen?.width || window.innerWidth),
    sh: Math.round(window.screen?.height || window.innerHeight),
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    mem: nav.deviceMemory || 0,
    cpu: nav.hardwareConcurrency || 0,
    q: quality,
    pwa: window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true,
    t: Date.now(),
  };
}

// Отмечает визит не чаще раза в день; без интернета просто попробует при следующем запуске
export async function reportVisit(quality: string): Promise<void> {
  try {
    const day = toDateKey(new Date());
    if (localStorage.getItem(SENT_KEY) === day || !navigator.onLine) return;
    const { db } = initFirebase();
    if (!db || !(await ensureSignedIn())) return;
    const uid = myUid();
    if (!uid) return;
    await set(ref(db, `asosh_stats/${day}/${uid}`), collectVisit(quality));
    localStorage.setItem(SENT_KEY, day);
  } catch (err) {
    console.warn('Stats write skipped:', err);
  }
}

// Визиты за последние N дней: { '2026-10-25': { uid: DeviceVisit } }
export async function loadVisits(days: number): Promise<Record<string, Record<string, DeviceVisit>> | null> {
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) return null;
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const snap = await get(query(ref(db, 'asosh_stats'), orderByKey(), startAt(toDateKey(from))));
  return (snap.val() as Record<string, Record<string, DeviceVisit>>) || {};
}
