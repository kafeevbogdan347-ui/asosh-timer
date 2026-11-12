// Профиль (ник, эмодзи-аватар, статус, «о себе») привязан к аккаунту:
// хранится в базе asosh_profiles/<uid>, поэтому одинаковый на всех телефонах и компьютерах,
// где выполнен вход в этот аккаунт. Фото-аватар в базу не отправляем — только эмодзи.

import { getAuth } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { initFirebase } from './firebaseChat';
import { Account } from './accounts';
import { getMyProfile, saveMyProfile } from './userService';
import { UserProfile } from '../types';

export interface CloudProfile {
  nick: string;
  avatar: string;
  status: string;
  bio: string;
  t: number;
}

const PUSHED_KEY = 'asosh_profile_pushed'; // что уже отправили, чтобы не писать в базу лишний раз

const isEmoji = (p: UserProfile) => p.avatarType !== 'image' && !(p.avatar || '').startsWith('data:');

function cardOf(p: UserProfile, fallbackNick: string): Omit<CloudProfile, 't'> {
  return {
    nick: (p.username || fallbackNick || 'Ученик').trim().slice(0, 30),
    avatar: isEmoji(p) ? (p.avatar || '🎒').slice(0, 4) : '🎒',
    status: (p.status || '').slice(0, 60),
    bio: (p.bio || '').slice(0, 200),
  };
}

// Вошли именно в этот аккаунт (а не анонимно)
function ctxFor(uid: string) {
  const { app, db } = initFirebase();
  if (!app || !db) return null;
  return getAuth(app).currentUser?.uid === uid ? db : null;
}

// Сохранили профиль на этом устройстве — отправляем в аккаунт
export async function pushProfile(account: Account | null, p: UserProfile = getMyProfile()): Promise<void> {
  if (!account || account.role === 'teacher') return;
  const db = ctxFor(account.uid);
  if (!db || !navigator.onLine) return;
  const card = cardOf(p, account.name);
  const sig = JSON.stringify([account.uid, card]);
  try {
    if (localStorage.getItem(PUSHED_KEY) === sig) return;
  } catch {
    // всё равно отправим
  }
  try {
    await set(ref(db, `asosh_profiles/${account.uid}`), { ...card, t: Date.now() });
    localStorage.setItem(PUSHED_KEY, sig);
  } catch {
    // нет сети или защитный режим — отправим при следующем сохранении
  }
}

// Вход в аккаунт или запуск приложения: берём профиль из аккаунта.
// Если в аккаунте профиля ещё нет — создаём его из имени аккаунта (а не «Ученик_1234»).
export async function pullProfile(account: Account | null): Promise<UserProfile | null> {
  if (!account || account.role === 'teacher') return null;
  const db = ctxFor(account.uid);
  if (!db) return null;
  try {
    const snap = await get(ref(db, `asosh_profiles/${account.uid}`));
    const cloud = snap.val() as CloudProfile | null;
    const local = getMyProfile(account.name, account.cls || '');
    const keepPhoto = !isEmoji(local) && cloud?.avatar === '🎒';
    const next: UserProfile = {
      ...local,
      id: account.uid, // один и тот же id на всех устройствах аккаунта
      fullName: account.name,
      className: account.cls || local.className,
      username: cloud?.nick || account.name,
      status: cloud ? cloud.status : local.status,
      bio: cloud ? cloud.bio : local.bio,
      avatar: keepPhoto ? local.avatar : cloud?.avatar || (isEmoji(local) ? local.avatar : '🎒'),
      avatarType: keepPhoto ? local.avatarType : 'emoji',
    };
    saveMyProfile(next);
    if (!cloud) await pushProfile(account, next);
    else localStorage.setItem(PUSHED_KEY, JSON.stringify([account.uid, cardOf(next, account.name)]));
    return next;
  } catch {
    return null;
  }
}

export function forgetPushedProfile() {
  try {
    localStorage.removeItem(PUSHED_KEY);
  } catch {
    // ничего
  }
}
