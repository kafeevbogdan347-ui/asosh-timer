import { ref, set, get, remove } from 'firebase/database';
import { Capacitor } from '@capacitor/core';
import { initFirebase, ensureSignedIn } from './firebaseChat';

// Перенос данных на новый телефон по QR-коду.
// Все данные приложения из localStorage сжимаются и шифруются AES-GCM прямо на устройстве.
// В Firebase лежит только шифр; ключ есть лишь в ссылке из QR-кода (после #, на сервер не уходит).
// Запись живёт 30 минут и удаляется сразу после переноса.

const TTL_MS = 30 * 60 * 1000;
const MAX_PAYLOAD = 3_000_000; // как в правилах базы
const HASH_PREFIX = '#transfer=';
const WEB_APP_URL = 'https://kafeevbogdan347-ui.github.io/asosh-timer/';

// Кусками, чтобы большие данные (фото) не переполняли стек
const b64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

async function streamBytes(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([data]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

function randomId(len = 20) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// Всё, что приложение хранит на устройстве, кроме служебных ключей Firebase
function collectLocalData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !key.startsWith('firebase:')) data[key] = localStorage.getItem(key) || '';
  }
  return data;
}

export type TransferResult = { ok: true; link: string } | { ok: false; error: string };

export async function createTransfer(): Promise<TransferResult> {
  if (!navigator.onLine) return { ok: false, error: 'Для переноса по QR нужен интернет. Без сети используй резервную копию файлом.' };
  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) return { ok: false, error: 'Нет подключения к интернету' };

  const json = new TextEncoder().encode(JSON.stringify(collectLocalData()));
  const packed = await streamBytes(json, new CompressionStream('gzip'));
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, packed));
  const payload = b64(iv) + '.' + b64(cipher);
  if (payload.length > MAX_PAYLOAD) {
    return { ok: false, error: 'Слишком много данных (фото). Перенеси через файл резервной копии.' };
  }

  const id = randomId();
  try {
    await set(ref(db, `asosh_transfer/${id}`), { payload, created_at: Date.now() });
  } catch {
    return { ok: false, error: 'Не удалось отправить данные. Проверь интернет.' };
  }
  // В APK адрес страницы — https://localhost, такая ссылка на другом телефоне не откроется
  const base = Capacitor.isNativePlatform() ? WEB_APP_URL : `${location.origin}${import.meta.env.BASE_URL}`;
  const link = `${base}${HASH_PREFIX}${id}.${b64url(keyBytes)}`;
  return { ok: true, link };
}

// Вызывается до запуска приложения: если открыли ссылку из QR-кода — переносим данные
export async function receiveTransferIfNeeded(): Promise<void> {
  if (!location.hash.startsWith(HASH_PREFIX)) return;
  const [id, keyPart] = location.hash.slice(HASH_PREFIX.length).split('.');
  history.replaceState(null, '', location.pathname + location.search);
  if (!id || !keyPart) return;

  const proceed = window.confirm(
    'Перенести данные со старого телефона?\n\nВсё, что сейчас есть в приложении на этом устройстве, будет заменено.'
  );
  if (!proceed) return;

  const { db } = initFirebase();
  if (!db || !(await ensureSignedIn())) {
    window.alert('Нет подключения к интернету. Открой ссылку ещё раз, когда появится сеть.');
    return;
  }
  try {
    const snap = await get(ref(db, `asosh_transfer/${id}`));
    const record = snap.val() as { payload?: string; created_at?: number } | null;
    if (!record?.payload || Date.now() - (record.created_at || 0) > TTL_MS) {
      window.alert('Ссылка устарела или уже использована. Сделай новый QR-код на старом телефоне.');
      return;
    }
    const [ivPart, cipherPart] = record.payload.split('.');
    const key = await crypto.subtle.importKey('raw', unb64url(keyPart), 'AES-GCM', false, ['decrypt']);
    const packed = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivPart) }, key, unb64(cipherPart)));
    const data = JSON.parse(new TextDecoder().decode(await streamBytes(packed, new DecompressionStream('gzip')))) as Record<string, string>;

    Object.keys(localStorage)
      .filter((k) => !k.startsWith('firebase:'))
      .forEach((k) => localStorage.removeItem(k));
    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
    await remove(ref(db, `asosh_transfer/${id}`)).catch(() => {});
    window.alert('Готово! Данные перенесены.');
  } catch (err) {
    console.warn('Transfer receive error:', err);
    window.alert('Не получилось перенести данные. Попробуй сделать новый QR-код.');
  }
}
