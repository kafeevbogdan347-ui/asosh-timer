// Профиль (ник, эмодзи-аватар, статус, «о себе») привязан к аккаунту:
// хранится в базе asosh_profiles/<uid>, поэтому одинаковый на всех телефонах и компьютерах,
// где выполнен вход в этот аккаунт. Фото-аватар в базу не отправляем — только эмодзи.
// Для просмотра полноценного профиля одноклассников из чата и онлайна публичная карточка
// синхронизируется в asosh_transfer/PUBPROF_<id>.

import { getAuth } from 'firebase/auth';
import { ref, get, set, remove } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { Account, getLocalAccount } from './accounts';
import { getMyProfile, saveMyProfile, getRealGpaNumber, getRealHwDoneCount } from './userService';
import { isDevPanelUnlocked } from '../utils/profileBadges';
import { isHideGradesInProfile } from '../utils/privacy';
import { UserProfile } from '../types';

export interface CloudProfile {
  nick: string;
  avatar: string;
  status: string;
  bio: string;
  t: number;
}

const PUSHED_KEY = 'asosh_profile_pushed'; // что уже отправили, чтобы не писать в базу лишний раз
const PUBPROF_SIG_KEY = 'asosh_pubprof_pushed_sig';
const PUBPROF_CACHE_PREFIX = 'PUBPROF_';

const publicProfileMemoryCache = new Map<string, { profile: UserProfile; fetchedAt: number }>();
const publicProfilePending = new Map<string, Promise<UserProfile | null>>();

const safeKey = (id: string) => id.replace(/[.#$\[\]/]/g, '_').slice(0, 96);

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
  // Параллельно обновляем публичный снимок профиля для просмотра из чата и онлайна
  pushPublicProfile(p).catch(() => {});

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
    const regAt = account.registeredAt || local.registeredAt;
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
      registeredAt: regAt,
      registeredDate: regAt ? new Date(regAt).toLocaleDateString('ru-RU') : local.registeredDate,
    };
    saveMyProfile(next);
    if (!cloud) await pushProfile(account, next);
    else {
      localStorage.setItem(PUSHED_KEY, JSON.stringify([account.uid, cardOf(next, account.name)]));
      pushPublicProfile(next).catch(() => {});
    }
    return next;
  } catch {
    return null;
  }
}

export function forgetPushedProfile() {
  try {
    localStorage.removeItem(PUSHED_KEY);
    localStorage.removeItem(PUBPROF_SIG_KEY);
  } catch {
    // ничего
  }
}

function buildPublicSnapshot(p: UserProfile): UserProfile {
  const hideGrades = isHideGradesInProfile();
  const realGpa = getRealGpaNumber();
  const realHw = getRealHwDoneCount();
  const devUnlocked = isDevPanelUnlocked() || Boolean(p.isDev);
  const acc = getLocalAccount();
  const regAt = acc?.registeredAt || p.registeredAt;
  const safeAvatar =
    p.avatarType === 'image' && p.avatar?.startsWith('data:') && p.avatar.length > 180_000
      ? '🎒'
      : p.avatar || '🎒';
  const safeAvatarType: 'emoji' | 'image' =
    safeAvatar.startsWith('data:') && p.avatarType === 'image' ? 'image' : 'emoji';

  return {
    id: p.id,
    username: (p.username || 'Ученик').slice(0, 40),
    fullName: (p.fullName || p.username || 'Ученик').slice(0, 60),
    className: (p.className || '8А').slice(0, 12),
    avatar: safeAvatar,
    avatarType: safeAvatarType,
    status: (p.status || '').slice(0, 100),
    bio: (p.bio || '').slice(0, 400),
    gpa: hideGrades ? 0 : realGpa || p.gpa || 0,
    hideGrades,
    hwDoneCount: realHw || p.hwDoneCount || 0,
    gamesScore: p.gamesScore || 0,
    certificates: Array.isArray(p.certificates) ? p.certificates.slice(0, 25) : [],
    friends: [],
    friendsCount: Array.isArray(p.friends) ? p.friends.length : 0,
    registeredDate: regAt ? new Date(regAt).toLocaleDateString('ru-RU') : p.registeredDate,
    registeredAt: regAt,
    isDev: devUnlocked,
    verifiedClass: acc?.role === 'student' || Boolean(p.verifiedClass),
  };
}

async function writePublicTransferNode(db: any, keyId: string, payloadStr: string) {
  const path = `asosh_transfer/${PUBPROF_CACHE_PREFIX}${safeKey(keyId)}`;
  const nodeRef = ref(db, path);
  try {
    const existing = await get(nodeRef);
    if (existing.exists()) {
      await remove(nodeRef);
    }
    await set(nodeRef, {
      payload: payloadStr,
      created_at: Date.now(),
    });
  } catch {
    // оффлайн, локдаун или правило запрета записи — игнорируем без падения
  }
}

export async function pushPublicProfile(p: UserProfile = getMyProfile(), force = false): Promise<void> {
  if (!navigator.onLine) return;
  const { app, db } = initFirebase();
  if (!app || !db) return;
  const ok = await ensureSignedIn();
  if (!ok) return;

  const snap = buildPublicSnapshot(p);
  const authUid = getAuth(app).currentUser?.uid || '';
  const keys = Array.from(new Set([snap.id, authUid].filter(Boolean)));
  if (!keys.length) return;

  const payloadStr = JSON.stringify(snap);
  const sig = `${keys.join('|')}::${payloadStr}`;
  try {
    if (!force && localStorage.getItem(PUBPROF_SIG_KEY) === sig) return;
  } catch {
    // продолжаем
  }

  await Promise.all(keys.map((k) => writePublicTransferNode(db, k, payloadStr)));
  keys.forEach((k) => publicProfileMemoryCache.set(k, { profile: snap, fetchedAt: Date.now() }));
  try {
    localStorage.setItem(PUBPROF_SIG_KEY, sig);
  } catch {
    // игнорируем
  }
}

export function getCachedPublicProfile(idOrUid?: string): UserProfile | null {
  if (!idOrUid || idOrUid === 'anonymous') return null;
  const cached = publicProfileMemoryCache.get(idOrUid);
  return cached ? cached.profile : null;
}

export async function fetchPublicProfile(idOrUid: string, maxAgeMs = 60_000): Promise<UserProfile | null> {
  if (!idOrUid || idOrUid === 'anonymous') return null;
  const cached = publicProfileMemoryCache.get(idOrUid);
  if (cached && Date.now() - cached.fetchedAt < maxAgeMs) {
    return cached.profile;
  }

  const inflight = publicProfilePending.get(idOrUid);
  if (inflight) return inflight;

  const promise = (async (): Promise<UserProfile | null> => {
    const { db } = initFirebase();
    if (!db || !navigator.onLine) return cached?.profile || null;
    if (!(await ensureSignedIn())) return cached?.profile || null;

    try {
      const snap = await get(ref(db, `asosh_transfer/${PUBPROF_CACHE_PREFIX}${safeKey(idOrUid)}`));
      if (!snap.exists()) return cached?.profile || null;
      const val = snap.val() as { payload?: string } | null;
      if (!val?.payload) return cached?.profile || null;
      const parsed = JSON.parse(val.payload) as UserProfile;
      if (!parsed || typeof parsed !== 'object') return cached?.profile || null;
      publicProfileMemoryCache.set(idOrUid, { profile: parsed, fetchedAt: Date.now() });
      if (parsed.id && parsed.id !== idOrUid) {
        publicProfileMemoryCache.set(parsed.id, { profile: parsed, fetchedAt: Date.now() });
      }
      return parsed;
    } catch {
      return cached?.profile || null;
    } finally {
      publicProfilePending.delete(idOrUid);
    }
  })();

  publicProfilePending.set(idOrUid, promise);
  return promise;
}
