// Онлайн-дуэль «Таблица на скорость»: два ученика решают одни и те же 10 примеров, кто быстрее.
// Комната asosh_duels/<4 цифры>: создатель (host) и соперник (guest), прогресс каждого — players/<uid>.
// Примеры не хранятся: оба телефона строят их из одного seed.

import { ref, child, set, update, remove, onValue, get, serverTimestamp } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { myUid } from './classShared';
import type { Level } from '../components/MultiplyGame';

export const DUEL_TASKS = 10;
export const DUEL_LIMIT_MS = 120_000; // две минуты на партию

export interface DuelPlayer {
  name: string;
  cls?: string;
  score: number; // решено примеров
  done?: boolean;
  ms?: number; // за сколько решил все
}

export interface DuelRoom {
  host: string;
  hostName?: string;
  created: number;
  seed: number;
  level: Level;
  guest?: string;
  start?: number;
  players?: Record<string, DuelPlayer>;
}

// Детерминированный генератор (mulberry32): одинаковый seed — одинаковые примеры
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Без интернета Firebase молча ждёт сеть — через 10 секунд говорим «нет связи»
function withTimeout<T>(p: Promise<T>, ms = 10_000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('offline')), ms))]);
}

const roomRef = (code: string) => {
  const { db } = initFirebase();
  return db ? ref(db, `asosh_duels/${code}`) : null;
};

export async function createDuel(level: Level, name: string, cls: string): Promise<string> {
  if (!navigator.onLine || !(await withTimeout(ensureSignedIn()))) throw new Error('offline');
  const uid = myUid();
  // Код из 4 цифр: пробуем несколько, пока не найдём свободный (или старую комнату, её можно занять)
  for (let i = 0; i < 6; i++) {
    const code = String(1000 + Math.floor(Math.random() * 9000));
    const r = roomRef(code);
    if (!r) throw new Error('offline');
    try {
      await withTimeout(set(r, {
        host: uid,
        hostName: name.slice(0, 30),
        created: serverTimestamp(),
        seed: Math.floor(Math.random() * 2 ** 31),
        level,
        players: { [uid]: { name: name.slice(0, 30), cls: cls.slice(0, 6), score: 0 } },
      }));
      return code;
    } catch (e) {
      if ((e as Error).message === 'offline') throw e;
      // занято — следующий код
    }
  }
  throw new Error('busy');
}

export async function joinDuel(code: string, name: string, cls: string): Promise<'ok' | 'none' | 'full'> {
  if (!navigator.onLine || !(await withTimeout(ensureSignedIn()))) throw new Error('offline');
  const r = roomRef(code);
  if (!r) throw new Error('offline');
  const snap = await withTimeout(get(r));
  const room = snap.val() as DuelRoom | null;
  if (!room || Date.now() - room.created > 30 * 60_000) return 'none';
  const uid = myUid();
  if (room.host === uid || room.guest === uid) return 'ok';
  if (room.guest) return 'full';
  try {
    await withTimeout(update(r, { guest: uid, [`players/${uid}`]: { name: name.slice(0, 30), cls: cls.slice(0, 6), score: 0 } }));
    return 'ok';
  } catch (e) {
    if ((e as Error).message === 'offline') throw e;
    return 'full';
  }
}

export function subscribeDuel(code: string, cb: (room: DuelRoom | null) => void): () => void {
  const r = roomRef(code);
  if (!r) return () => {};
  return onValue(
    r,
    (s) => cb(s.val()),
    () => cb(null)
  );
}

// Создатель жмёт «Начать»: каждый телефон, увидев start, сам отсчитывает 3 секунды.
// Время решения каждый меряет у себя, поэтому разница часов на телефонах не важна
export async function startDuel(code: string) {
  const r = roomRef(code);
  if (r) await set(child(r, 'start'), serverTimestamp());
}

export async function reportDuel(code: string, p: DuelPlayer) {
  const r = roomRef(code);
  if (!r) return;
  const clean: DuelPlayer = { name: p.name.slice(0, 30), score: p.score };
  if (p.cls) clean.cls = p.cls.slice(0, 6);
  if (p.done) clean.done = true;
  if (p.ms !== undefined) clean.ms = Math.round(p.ms);
  await set(child(r, `players/${myUid()}`), clean).catch(() => {});
}

export async function leaveDuel(code: string, room: DuelRoom | null) {
  const r = roomRef(code);
  if (r && room && room.host === myUid()) await remove(r).catch(() => {});
}
