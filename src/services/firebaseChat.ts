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
import { ChatMessage } from '../types';

// Конфиг Firebase берётся из .env (VITE_FIREBASE_*), а не хранится в коде
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

/**
 * Send message to Firebase Realtime Database and internal Server Chat (No VPN required)
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

  let serverSuccess = false;
  let firebaseSuccess = false;
  let createdId = '';

  // 1. Direct Server Chat (Always works in Russia without VPN)
  try {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: trimmedUser,
        content: trimmedContent,
        room,
        userId: finalUserId,
        avatar: finalAvatar,
        isIncognito,
        isSelfDestruct,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      serverSuccess = true;
      createdId = data.message?.id || '';
    }
  } catch (err) {
    console.warn('Server chat send warning:', err);
  }

  // 2. Firebase Realtime DB (when accessible)
  try {
    const { db } = initFirebase();
    if (db) {
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
    console.warn('Firebase chat send error (falling back to server chat):', err?.message);
  }

  if (serverSuccess || firebaseSuccess) {
    return { success: true, id: createdId || undefined };
  }

  return { success: false, error: 'Не удалось доставить сообщение. Проверьте интернет-соединение.' };
}

/**
 * Subscribe to Realtime messages with automatic Server fallback (Guaranteed no-VPN support)
 */
export function subscribeToFirebaseMessages(
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  limitCount = 100,
  room: string = 'global'
): (() => void) | null {
  const knownMessages = new Map<string, ChatMessage>();

  const emitMerged = () => {
    const list = Array.from(knownMessages.values());
    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeA - timeB;
    });
    onMessagesUpdate(list.slice(-limitCount));
  };

  // 1. Initial and periodic load from direct server chat (Works 100% in Russia without VPN)
  const fetchServerMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?room=${encodeURIComponent(room)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          data.messages.forEach((item: any) => {
            if (item && item.id) {
              knownMessages.set(item.id, {
                id: item.id,
                username: item.username || 'Ученик',
                userId: item.userId || '',
                avatar: item.avatar || '',
                content: item.content || '',
                created_at: item.created_at || new Date().toISOString(),
              });
            }
          });
          emitMerged();
        }
      }
    } catch (e) {
      // server poll failed
    }
  };

  fetchServerMessages();
  const pollInterval = setInterval(fetchServerMessages, 3500);

  // 2. Firebase Realtime subscription
  let firebaseUnsubscribe: Unsubscribe | null = null;
  try {
    const { db } = initFirebase();
    if (db) {
      const path = getChatRoomPath(room);
      const chatRef = ref(db, path);
      const recentQuery = query(chatRef, limitToLast(limitCount));

      firebaseUnsubscribe = onValue(
        recentQuery,
        (snapshot) => {
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
              });
            });
            emitMerged();
          }
        },
        (error) => {
          console.warn('Firebase subscription warning (using server chat relay):', error);
        }
      );
    }
  } catch (err) {
    console.warn('Firebase init error for subscription, using server chat:', err);
  }

  return () => {
    clearInterval(pollInterval);
    if (firebaseUnsubscribe) {
      try {
        firebaseUnsubscribe();
      } catch {}
    }
  };
}
