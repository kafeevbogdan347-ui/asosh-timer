// Отметки «прочитано» у объявлений учителей.
// asosh_board_read/<объявление>/<uid> — { name, role, t }. Пишет сам ученик или родитель (с аккаунтом),
// список целиком видят только учителя: сколько человек из класса прочитали и кто ещё нет.

import { ref, set, onValue, serverTimestamp } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { Account } from './accounts';

export interface ReadMark {
  uid: string;
  name: string;
  role: 'student' | 'parent';
  t: number;
}

const LOCAL_KEY = 'asosh_ann_read';

export function readLocally(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function markAnnouncementRead(postId: string, account: Account): Promise<boolean> {
  if (account.role !== 'student' && account.role !== 'parent') return false;
  const { db } = initFirebase();
  if (!db || !navigator.onLine || !(await ensureSignedIn())) return false;
  try {
    await set(ref(db, `asosh_board_read/${postId}/${account.uid}`), {
      name: account.name.slice(0, 60),
      role: account.role,
      t: serverTimestamp(),
    });
    const next = [...new Set([...readLocally(), postId])].slice(-200);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

// Учитель: кто прочитал объявление
export function subscribeReadMarks(postId: string, cb: (list: ReadMark[]) => void): () => void {
  const { db } = initFirebase();
  if (!db) return () => {};
  let unsub = () => {};
  let alive = true;
  ensureSignedIn().then((ok) => {
    if (!alive || !ok) return;
    unsub = onValue(
      ref(db, `asosh_board_read/${postId}`),
      (snap) => {
        const v = (snap.val() || {}) as Record<string, Omit<ReadMark, 'uid'>>;
        cb(Object.entries(v).map(([uid, r]) => ({ uid, ...r })).sort((a, b) => a.t - b.t));
      },
      () => cb([])
    );
  });
  return () => {
    alive = false;
    unsub();
  };
}
