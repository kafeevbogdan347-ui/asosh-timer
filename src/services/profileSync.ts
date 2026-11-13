// Профиль (ник, эмодзи-аватар, статус, «о себе») привязан к аккаунту:
// хранится в базе asosh_profiles/<uid>, поэтому одинаковый на всех телефонах и компьютерах,
// где выполнен вход в этот аккаунт. Фото-аватар в базу не отправляем — только эмодзи.
// Для просмотра профиля одноклассников из чата и онлайна публичная карточка лежит в asosh_pubprof/<uid>:
// писать может только владелец аккаунта, читать — вошедшие. В неё НЕ попадают фото, средний балл
// из калькулятора и список друзей: по политике конфиденциальности они остаются на телефоне.

import { getAuth } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { Account, getLocalAccount } from './accounts';
import { getMyProfile, saveMyProfile, getRealHwDoneCount } from './userService';
import { isAdminUid } from './admins';
import { UserProfile, CertificateItem } from '../types';

export interface CloudProfile {
  nick: string;
  avatar: string;
  status: string;
  bio: string;
  t: number;
}

const PUSHED_KEY = 'asosh_profile_pushed'; // что уже отправили, чтобы не писать в базу лишний раз
const PUBPROF_SIG_KEY = 'asosh_pubprof_pushed_sig';

const publicProfileMemoryCache = new Map<string, { profile: UserProfile; fetchedAt: number }>();
const publicProfilePending = new Map<string, Promise<UserProfile | null>>();

// Ключ в базе — только uid аккаунта (буквы и цифры), иначе не читаем
const validUid = (id: string) => /^[A-Za-z0-9_-]{6,128}$/.test(id) && !id.startsWith('user_');

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
    let regAt = account.registeredAt || local.registeredAt;
    if (!account.registeredAt) {
      try {
        const tSnap = await get(ref(db, `asosh_users/${account.uid}/t`));
        const serverT = tSnap.val();
        if (typeof serverT === 'number' && Number.isFinite(serverT) && serverT > 1_000_000_000_000) {
          regAt = serverT;
          try {
            localStorage.setItem('asosh_account_v1', JSON.stringify({ ...account, registeredAt: serverT }));
          } catch {
            // игнорируем
          }
        }
      } catch {
        // остаёмся на локальном времени
      }
    }
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

// Что видят другие: имя из аккаунта («Иван П.»), ник, эмодзи, статус, «о себе», класс,
// выполненные ДЗ, очки в играх, число друзей и грамоты (без файлов)
interface PublicCard {
  name: string;
  nick: string;
  avatar: string;
  status: string;
  bio: string;
  cls: string;
  hw: number;
  games: number;
  friends: number;
  certs: string;
  reg?: number;
  t: number;
}

function packCerts(list: CertificateItem[] | undefined): string {
  const slim = (Array.isArray(list) ? list : []).slice(0, 25).map((c) => ({
    title: String(c.title || '').slice(0, 120),
    category: c.category,
    level: c.level,
    year: String(c.year || '').slice(0, 12),
    place: c.place,
    issuer: c.issuer ? String(c.issuer).slice(0, 80) : undefined,
    subject: c.subject ? String(c.subject).slice(0, 40) : undefined,
  }));
  let out = JSON.stringify(slim);
  while (out.length > 6000 && slim.length) {
    slim.pop();
    out = JSON.stringify(slim);
  }
  return out;
}

function buildPublicCard(p: UserProfile, account: Account): PublicCard {
  const card = cardOf(p, account.name);
  const rawReg = account.registeredAt || p.registeredAt;
  const reg = typeof rawReg === 'number' && Number.isFinite(rawReg) && rawReg > 1_000_000_000_000
    ? Math.min(rawReg, Date.now())
    : undefined;
  const n = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  return {
    name: account.name.slice(0, 60),
    nick: card.nick || account.name.slice(0, 30),
    avatar: card.avatar,
    status: card.status,
    bio: card.bio,
    cls: (account.cls || '').slice(0, 4),
    hw: n(getRealHwDoneCount() || p.hwDoneCount, 100000),
    games: n(p.gamesScore, 100000000),
    friends: n(Array.isArray(p.friends) ? p.friends.length : 0, 10000),
    certs: packCerts(p.certificates),
    ...(reg ? { reg } : {}),
    t: Date.now(),
  };
}

function cardToProfile(uid: string, c: PublicCard): UserProfile {
  let certificates: CertificateItem[] = [];
  try {
    const raw = JSON.parse(c.certs || '[]');
    if (Array.isArray(raw)) certificates = raw.map((x, i) => ({ ...x, id: `pub-${uid}-${i}` }));
  } catch {
    // повреждённый список грамот — показываем без них
  }
  return {
    id: uid,
    username: c.nick,
    fullName: c.name,
    className: c.cls || '',
    avatar: c.avatar || '🎒',
    avatarType: 'emoji',
    status: c.status || '',
    bio: c.bio || '',
    gpa: 0,
    hideGrades: true, // средний балл из калькулятора не публикуется
    hwDoneCount: Number(c.hw) || 0,
    gamesScore: Number(c.games) || 0,
    certificates,
    friends: [],
    friendsCount: Number(c.friends) || 0,
    registeredAt: c.reg,
    registeredDate: c.reg ? new Date(c.reg).toLocaleDateString('ru-RU') : '',
    isDev: isAdminUid(uid),
    verifiedClass: true,
  };
}

export async function pushPublicProfile(p: UserProfile = getMyProfile(), force = false): Promise<void> {
  const account = getLocalAccount();
  if (!account || !navigator.onLine) return;
  const db = ctxFor(account.uid);
  if (!db) return;
  const card = buildPublicCard(p, account);
  const { t: _t, ...stable } = card;
  const sig = JSON.stringify([account.uid, stable]);
  try {
    if (!force && localStorage.getItem(PUBPROF_SIG_KEY) === sig) return;
  } catch {
    // продолжаем
  }
  try {
    await set(ref(db, `asosh_pubprof/${account.uid}`), card);
    publicProfileMemoryCache.set(account.uid, { profile: cardToProfile(account.uid, card), fetchedAt: Date.now() });
    localStorage.setItem(PUBPROF_SIG_KEY, sig);
  } catch {
    // Если сервер отклонил reg из-за расхождения часов, пробуем сохранить карточку без reg
    if ('reg' in card) {
      try {
        const { reg: _reg, ...withoutReg } = card;
        await set(ref(db, `asosh_pubprof/${account.uid}`), withoutReg);
        publicProfileMemoryCache.set(account.uid, { profile: cardToProfile(account.uid, withoutReg), fetchedAt: Date.now() });
        localStorage.setItem(PUBPROF_SIG_KEY, sig);
      } catch {
        // нет сети или защитный режим — попробуем при следующем сохранении
      }
    }
  }
}

function withFreshAdminFlag(uid: string, prof: UserProfile): UserProfile {
  const isAdm = isAdminUid(uid);
  return isAdm && !prof.isDev ? { ...prof, isDev: true } : prof;
}

export function getCachedPublicProfile(idOrUid?: string): UserProfile | null {
  if (!idOrUid || idOrUid === 'anonymous') return null;
  const cached = publicProfileMemoryCache.get(idOrUid);
  return cached ? withFreshAdminFlag(idOrUid, cached.profile) : null;
}

export async function fetchPublicProfile(uid: string, maxAgeMs = 60_000): Promise<UserProfile | null> {
  if (!uid || !validUid(uid)) return null;
  const cached = publicProfileMemoryCache.get(uid);
  if (cached && Date.now() - cached.fetchedAt < maxAgeMs) return withFreshAdminFlag(uid, cached.profile);

  const inflight = publicProfilePending.get(uid);
  if (inflight) return inflight;

  const promise = (async (): Promise<UserProfile | null> => {
    const { db } = initFirebase();
    if (!db || !navigator.onLine || !(await ensureSignedIn())) return cached?.profile || null;
    try {
      const card = (await get(ref(db, `asosh_pubprof/${uid}`))).val() as PublicCard | null;
      if (!card || typeof card !== 'object' || !card.nick) return cached?.profile || null;
      const prof = cardToProfile(uid, card);
      publicProfileMemoryCache.set(uid, { profile: prof, fetchedAt: Date.now() });
      return prof;
    } catch {
      return cached?.profile || null;
    } finally {
      publicProfilePending.delete(uid);
    }
  })();

  publicProfilePending.set(uid, promise);
  return promise;
}
