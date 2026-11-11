// Аварийный рубильник: администратор ставит в Firebase asosh_config/lockdown = true —
// сервер сразу перестаёт принимать любые записи (чат, домашка, замены, рейтинг, журнал),
// а приложение показывает предупреждение. Снять — удалить флаг или поставить false.

import { ref, onValue } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';

export function subscribeLockdown(cb: (on: boolean) => void): () => void {
  const { db } = initFirebase();
  if (!db) return () => {};
  let unsub = () => {};
  let alive = true;
  ensureSignedIn().then((ok) => {
    if (!alive || !ok) return;
    unsub = onValue(
      ref(db, 'asosh_config/lockdown'),
      (snap) => cb(snap.val() === true),
      () => cb(false) // старые правила без раздела asosh_config — рубильника нет
    );
  });
  return () => {
    alive = false;
    unsub();
  };
}
