import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  limitToLast,
  serverTimestamp,
  DatabaseReference,
  Unsubscribe,
} from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { ChatMessage } from '../types';

// Конфиг Firebase берётся из .env (VITE_FIREBASE_*) при сборке, а не хранится в коде
const env = import.meta.env;
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const FIREBASE_STORAGE_KEY = 'asosh_custom_firebase_config';
export const GLOBAL_CHAT_PATH = 'asosh_timer';
// Правила базы запрещают удаление, поэтому «самоуничтожение» — это скрытие в приложении
export const SELF_DESTRUCT_MS = 5 * 60 * 1000;

export function getChatRoomPath(room: string = 'global') {
  if (!room || room === 'all' || room === 'global' || room === 'school') {
    return GLOBAL_CHAT_PATH;
  }
  // Sanitize room key for Firebase RTDB: e.g. "8А" -> "room_8a", "11Б" -> "room_11b"
  const clean = encodeURIComponent(room.replace(/\s+/g, '_').toLowerCase());
  return `asosh_rooms/${clean}`;
}

export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem(FIREBASE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.databaseURL) {
        return { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Error reading saved Firebase config:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveCustomFirebaseConfig(customCfg: Partial<typeof DEFAULT_FIREBASE_CONFIG>) {
  const current = getActiveFirebaseConfig();
  const merged = { ...current, ...customCfg };
  localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(merged));
  // Re-init client
  try {
    const app = getApps().length ? getApp() : initializeApp(merged);
    return app;
  } catch (e) {
    console.error('Firebase re-init error:', e);
    return null;
  }
}

let firebaseAppInstance: any = null;
let firebaseDbInstance: any = null;
let signInPromise: Promise<boolean> | null = null;

export function initFirebase() {
  try {
    if (!firebaseAppInstance) {
      const config = getActiveFirebaseConfig();
      if (!config.apiKey || !config.databaseURL) {
        console.warn('Firebase не настроен: задайте VITE_FIREBASE_* в .env');
        return { app: null, db: null };
      }
      firebaseAppInstance = getApps().length > 0 ? getApp() : initializeApp(config);
      firebaseDbInstance = getDatabase(firebaseAppInstance);
    }
    return { app: firebaseAppInstance, db: firebaseDbInstance };
  } catch (err) {
    console.error('Failed to init Firebase:', err);
    return { app: null, db: null };
  }
}

// Анонимный вход: правила базы пускают в чат только вошедших пользователей,
// поэтому перед чтением и записью тихо входим без логина и пароля
export function ensureSignedIn(): Promise<boolean> {
  if (!signInPromise) {
    const { app } = initFirebase();
    if (!app) return Promise.resolve(false);
    signInPromise = signInAnonymously(getAuth(app))
      .then(() => true)
      .catch((err) => {
        console.warn('Firebase anonymous sign-in error:', err?.code || err);
        signInPromise = null; // попробуем снова при следующем обращении
        return false;
      });
  }
  return signInPromise;
}

/**
 * Send message to Firebase Realtime Database
 */
export async function sendFirebaseMessage(
  username: string,
  content: string,
  room: string = 'global',
  userId?: string,
  avatar?: string,
  options?: { isIncognito?: boolean; isSelfDestruct?: boolean }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const isIncognito = !!options?.isIncognito;
  const isSelfDestruct = !!options?.isSelfDestruct;

  const trimmedUser = isIncognito ? '🎭 Анонимный ученик' : (username.trim() || 'Ученик АСОШ №2');
  const finalUserId = isIncognito ? 'anonymous' : (userId || '');
  const finalAvatar = isIncognito ? '🎭' : (avatar || '');
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return { success: false, error: 'Сообщение не может быть пустым' };
  }

  let firebaseSuccess = false;
  let createdId = '';

  // Firebase Realtime DB
  try {
    const { db } = initFirebase();
    if (db && (await ensureSignedIn())) {
      const path = getChatRoomPath(room);
      const chatRef = ref(db, path);
      const newMsgRef = await push(chatRef, {
        username: trimmedUser,
        userId: finalUserId,
        avatar: finalAvatar,
        content: trimmedContent,
        room: room,
        isIncognito,
        isSelfDestruct,
        created_at: new Date().toISOString(),
        timestamp: Date.now(),
      });
      firebaseSuccess = true;
      if (!createdId) createdId = newMsgRef.key || '';
    }
  } catch (err: any) {
    console.warn('Firebase chat send error:', err?.message);
  }

  if (firebaseSuccess) {
    return { success: true, id: createdId || undefined };
  }

  return { success: false, error: 'Не удалось доставить сообщение. Проверьте интернет-соединение.' };
}

/**
 * Subscribe to Realtime messages
 */
export function subscribeToFirebaseMessages(
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  limitCount = 100,
  room: string = 'global'
): (() => void) | null {
  const knownMessages = new Map<string, ChatMessage>();

  // Последние сообщения храним на устройстве: без интернета чат показывает их, а не пустую комнату
  const cacheKey = `asosh_chat_cache_${room}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]') as ChatMessage[];
    cached.forEach((m) => knownMessages.set(String(m.id), m));
  } catch {
    // повреждённый кэш просто игнорируем
  }
  // Сеть может не ответить вовсе — показываем сохранённое сразу
  if (knownMessages.size) queueMicrotask(() => emitMerged());
  const saveCache = () => {
    try {
      const keep = Array.from(knownMessages.values())
        .filter((m) => !m.isSelfDestruct)
        .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
        .slice(-50);
      localStorage.setItem(cacheKey, JSON.stringify(keep));
    } catch {
      // нет места — без кэша
    }
  };

  const emitMerged = () => {
    const now = Date.now();
    const list = Array.from(knownMessages.values()).filter(
      (m) => !m.isSelfDestruct || !m.created_at || now - new Date(m.created_at).getTime() < SELF_DESTRUCT_MS
    );
    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
    onMessagesUpdate(list.slice(-limitCount));
  };

  // Firebase Realtime subscription (после анонимного входа)
  let firebaseUnsubscribe: Unsubscribe | null = null;
  let cancelled = false;
  const { db } = initFirebase();
  if (!db) {
    emitMerged();
  } else {
    ensureSignedIn().then((signedIn) => {
      if (cancelled) return;
      if (!signedIn) {
        // Без входа база не пустит: показываем пустую комнату, а не вечное «Подключение…»
        emitMerged();
        return;
      }
      try {
        const chatRef = ref(db, getChatRoomPath(room));
        const recentQuery = query(chatRef, limitToLast(limitCount));

        firebaseUnsubscribe = onValue(
          recentQuery,
          (snapshot) => {
            // Снимок содержит всю выборку: пересобираем список, чтобы удалённые сообщения пропадали
            knownMessages.clear();
            if (snapshot.exists()) {
              const data = snapshot.val();
              Object.keys(data).forEach((key) => {
                const item = data[key];
                knownMessages.set(key, {
                  id: key,
                  username: item.username || 'Ученик',
                  userId: item.userId || '',
                  avatar: item.avatar || '',
                  content: item.content || '',
                  created_at: item.created_at || (item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()),
                  isIncognito: !!item.isIncognito,
                  isSelfDestruct: !!item.isSelfDestruct,
                });
              });
            }
            // Пустая комната — тоже ответ: сообщаем экрану, что подключение есть
            saveCache();
            emitMerged();
          },
          (error) => {
            console.warn('Firebase subscription warning:', error);
            emitMerged();
          }
        );
      } catch (err) {
        console.warn('Firebase subscription error:', err);
        emitMerged();
      }
    });
  }

  const expiryTimer = setInterval(() => {
    if (Array.from(knownMessages.values()).some((m) => m.isSelfDestruct)) emitMerged();
  }, 15_000);

  return () => {
    cancelled = true;
    clearInterval(expiryTimer);
    if (firebaseUnsubscribe) {
      try {
        firebaseUnsubscribe();
      } catch {}
    }
  };
}
