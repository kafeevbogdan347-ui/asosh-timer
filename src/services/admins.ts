// Администраторы приложения: их uid вписаны в базу вручную (консоль Firebase → asosh_admins/<uid> = true).
// Только они могут включать заглушку сайта, и только у них значок «Разработчик» —
// значок нельзя подделать, открыв панель разработчика или записав isDev в сообщение.

import { ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { initFirebase, ensureSignedIn } from './firebaseChat';

let admins = new Set<string>();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadAdmins(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const { db } = initFirebase();
    if (!db || !(await ensureSignedIn())) {
      // Нет сети или входа — попробуем снова, когда появится интернет
      loading = null;
      window.addEventListener('online', () => loadAdmins(), { once: true });
      return;
    }
    // Живая подписка: админ, добавленный в консоли, получает права и значок без перезапуска
    onValue(
      ref(db, 'asosh_admins'),
      (snap) => {
        const v = snap.val() as Record<string, unknown> | null;
        admins = new Set(Object.entries(v || {}).filter(([, on]) => on === true).map(([uid]) => uid));
        listeners.forEach((fn) => fn());
      },
      () => {
        // старые правила без asosh_admins — администраторов нет
      }
    );
  })();
  return loading;
}

export const isAdminUid = (uid?: string | null) => Boolean(uid && admins.has(uid));

// Админ ли тот, кто сейчас вошёл в Firebase на этом устройстве
export function isMeAdmin(): boolean {
  const { app } = initFirebase();
  return Boolean(app && isAdminUid(getAuth(app).currentUser?.uid));
}

// Подписка: перерисовать экран, когда список загрузится
export function onAdminsLoaded(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
