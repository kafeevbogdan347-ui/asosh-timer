// Аварийный рубильник и глобальная заглушка сайта и приложения:
// 1) asosh_config/lockdown = true — запрет записи в базу
// 2) asosh_transfer/SYSTEM_MAINTENANCE — глобальное закрытие доступа к приложению и сайту
//    из Панели разработчика (ставит экран-заглушку «АСОШ Таймер временно недоступен. Попробуйте позже.»)

import { ref, onValue, set, remove, get } from 'firebase/database';
import { initFirebase, ensureSignedIn, saveCustomFirebaseConfig } from './firebaseChat';

const SITE_CLOSED_STORAGE_KEY = 'asosh_site_closed';
const SITE_CLOSED_DB_PATH = 'asosh_transfer/SYSTEM_MAINTENANCE';
const DISCOVERED_CFG_KEY = 'asosh_discovered_fb_cfg_v1';

// Если локальный дев-сервер запущен без .env, автоматически подтягиваем публичный веб-конфиг
// с продакшн-страницы GitHub Pages, чтобы кнопка в панели разработчика переключала и сайт, и приложение
async function ensureDatabaseReady() {
  let { db } = initFirebase();
  if (db) return db;

  try {
    const cached = localStorage.getItem(DISCOVERED_CFG_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.apiKey && parsed?.databaseURL) {
        saveCustomFirebaseConfig(parsed);
        ({ db } = initFirebase());
        if (db) return db;
      }
    }
  } catch {
    // ignore
  }

  try {
    const base = 'https://kafeevbogdan347-ui.github.io';
    const html = await fetch(`${base}/asosh-timer/`, { cache: 'no-store' }).then((r) => r.text());
    const m = html.match(/src="(\/asosh-timer\/assets\/[^"]+\.js)"/);
    if (m) {
      const js = await fetch(`${base}${m[1]}`).then((r) => r.text());
      const apiKeyMatch = js.match(/AIzaSy[A-Za-z0-9_-]{33}/);
      const dbMatch = js.match(
        /https:\/\/[a-z0-9-]+-default-rtdb\.[a-z0-9.-]+\.(?:firebaseio\.com|firebasedatabase\.app)/i
      );
      if (apiKeyMatch && dbMatch) {
        const cfg = {
          apiKey: apiKeyMatch[0],
          databaseURL: dbMatch[0],
          projectId: 'asosh-timer',
          authDomain: 'asosh-timer.firebaseapp.com',
        };
        localStorage.setItem(DISCOVERED_CFG_KEY, JSON.stringify(cfg));
        saveCustomFirebaseConfig(cfg);
        ({ db } = initFirebase());
        return db;
      }
    }
  } catch {
    // Офлайн-режим: работаем через localStorage
  }
  return null;
}

export function getLocalSiteClosed(): boolean {
  try {
    return localStorage.getItem(SITE_CLOSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

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

// Подписка на глобальное закрытие приложения и сайта (для всех пользователей в реальном времени)
export function subscribeSiteClosed(cb: (closed: boolean) => void): () => void {
  let unsub = () => {};
  let alive = true;

  // Сразу отдаём локальное состояние
  cb(getLocalSiteClosed());

  const onStorage = (e: StorageEvent) => {
    if (e.key === SITE_CLOSED_STORAGE_KEY) {
      cb(e.newValue === '1');
    }
  };
  window.addEventListener('storage', onStorage);

  ensureDatabaseReady().then(async (db) => {
    if (!alive || !db) return;
    const ok = await ensureSignedIn();
    if (!alive || !ok) return;

    unsub = onValue(
      ref(db, SITE_CLOSED_DB_PATH),
      (snap) => {
        const val = snap.val();
        const isClosed = Boolean(val && val.payload === 'closed');
        try {
          localStorage.setItem(SITE_CLOSED_STORAGE_KEY, isClosed ? '1' : '0');
        } catch {
          // ignore
        }
        cb(isClosed);
      },
      () => {
        // При ошибке сети оставляем текущее локальное значение
      }
    );
  });

  return () => {
    alive = false;
    window.removeEventListener('storage', onStorage);
    unsub();
  };
}

// Включить или выключить заглушку «АСОШ Таймер временно недоступен. Попробуйте позже.»
// для всех пользователей приложения и сайта
export async function setGlobalSiteClosed(closed: boolean): Promise<boolean> {
  try {
    localStorage.setItem(SITE_CLOSED_STORAGE_KEY, closed ? '1' : '0');
  } catch {
    // ignore
  }

  try {
    const db = await ensureDatabaseReady();
    if (!db) return false;
    const ok = await ensureSignedIn();
    if (!ok) return false;

    const maintenanceRef = ref(db, SITE_CLOSED_DB_PATH);
    if (closed) {
      // В правилах asosh_transfer разрешено создание (!data.exists()) и удаление (!newData.exists()).
      // Поэтому перед записью проверяем/очищаем узел, если он уже существовал.
      const existing = await get(maintenanceRef);
      if (existing.exists()) {
        await remove(maintenanceRef);
      }
      await set(maintenanceRef, {
        payload: 'closed',
        created_at: Date.now(),
      });
    } else {
      await remove(maintenanceRef);
    }
    return true;
  } catch (err) {
    console.warn('Не удалось обновить статус глобальной заглушки в базе:', err);
    return false;
  }
}
