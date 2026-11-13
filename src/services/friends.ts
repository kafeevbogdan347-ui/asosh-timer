// Друзья через аккаунт: заявка → принятие → взаимная дружба на всех устройствах.
// asosh_friends/<я>/<друг>     — я считаю его другом (карточка: имя, ник, эмодзи, класс)
// asosh_friend_req/<кому>/<от> — входящая заявка
// Друзья — когда оба записали друг друга. Имя в карточке сверяется с аккаунтом в правилах базы.

import { ref, get, update, onValue } from 'firebase/database';
import { initFirebase, ensureSignedIn } from './firebaseChat';
import { Account } from './accounts';
import { getMyProfile } from './userService';

export interface FriendCard {
  uid: string;
  name: string;
  nick: string;
  avatar: string;
  cls: string;
  t: number;
}

export interface FriendsState {
  friends: FriendCard[]; // взаимные
  outgoing: FriendCard[]; // я отправил, ждём ответа
  incoming: FriendCard[]; // заявки мне
}

type Card = Omit<FriendCard, 'uid'>;

const emojiOnly = (a: string) => (a && !a.startsWith('data:') ? a.slice(0, 4) : '🎒');

export function myCard(account: Account): Card {
  const p = getMyProfile();
  return { name: account.name, nick: (p.username || account.name).slice(0, 30), avatar: emojiOnly(p.avatar), cls: (account.cls || '').slice(0, 4), t: Date.now() };
}

const toCard = (c: Omit<FriendCard, 't'>): Card => ({
  name: c.name.slice(0, 60),
  nick: (c.nick || c.name).slice(0, 30),
  avatar: emojiOnly(c.avatar),
  cls: (c.cls || '').slice(0, 4),
  t: Date.now(),
});

async function dbFor(account: Account | null) {
  if (!account) return null;
  const { db } = initFirebase();
  if (!db || !navigator.onLine || !(await ensureSignedIn())) return null;
  return db;
}

export type FriendResult = 'sent' | 'friends' | 'error';

// Добавить в друзья. Если он уже прислал мне заявку — это сразу дружба
export async function addFriend(account: Account, target: Omit<FriendCard, 't'>): Promise<FriendResult> {
  const db = await dbFor(account);
  if (!db || target.uid === account.uid) return 'error';
  try {
    const theyRequested = (await get(ref(db, `asosh_friend_req/${account.uid}/${target.uid}`))).exists();
    const changes: Record<string, unknown> = { [`asosh_friends/${account.uid}/${target.uid}`]: toCard(target) };
    if (theyRequested) changes[`asosh_friend_req/${account.uid}/${target.uid}`] = null;
    else changes[`asosh_friend_req/${target.uid}/${account.uid}`] = myCard(account);
    await update(ref(db), changes);
    return theyRequested ? 'friends' : 'sent';
  } catch {
    return 'error';
  }
}

export async function acceptFriend(account: Account, from: FriendCard): Promise<boolean> {
  return (await addFriend(account, from)) === 'friends';
}

export async function declineFriend(account: Account, fromUid: string): Promise<boolean> {
  const db = await dbFor(account);
  if (!db) return false;
  try {
    await update(ref(db), { [`asosh_friend_req/${account.uid}/${fromUid}`]: null });
    return true;
  } catch {
    return false;
  }
}

// Удалить из друзей или отменить свою заявку
export async function removeFriend(account: Account, uid: string): Promise<boolean> {
  const db = await dbFor(account);
  if (!db) return false;
  try {
    await update(ref(db), { [`asosh_friends/${account.uid}/${uid}`]: null, [`asosh_friend_req/${uid}/${account.uid}`]: null });
    return true;
  } catch {
    return false;
  }
}

// Мои друзья, исходящие и входящие заявки — в реальном времени
export function subscribeFriends(account: Account, cb: (s: FriendsState) => void): () => void {
  const { db } = initFirebase();
  if (!db) return () => {};
  let mine: Record<string, Card> = {};
  let incoming: Record<string, Card> = {};
  const mutual = new Map<string, boolean>(); // друг тоже записал меня
  const watchers = new Map<string, () => void>();
  let alive = true;
  const unsubs: (() => void)[] = [];

  const emit = () => {
    const list = Object.entries(mine).map(([uid, c]) => ({ uid, ...c }));
    cb({
      friends: list.filter((f) => mutual.get(f.uid)).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      outgoing: list.filter((f) => !mutual.get(f.uid)),
      incoming: Object.entries(incoming)
        .filter(([uid]) => !mine[uid])
        .map(([uid, c]) => ({ uid, ...c }))
        .sort((a, b) => b.t - a.t),
    });
  };

  ensureSignedIn().then((ok) => {
    if (!alive || !ok) return;
    unsubs.push(
      onValue(
        ref(db, `asosh_friends/${account.uid}`),
        (snap) => {
          mine = (snap.val() || {}) as Record<string, Card>;
          // Следим, записал ли меня каждый из них
          Object.keys(mine).forEach((uid) => {
            if (watchers.has(uid)) return;
            watchers.set(
              uid,
              onValue(
                ref(db, `asosh_friends/${uid}/${account.uid}`),
                (s) => {
                  mutual.set(uid, s.exists());
                  emit();
                },
                () => {
                  mutual.set(uid, false);
                  emit();
                }
              )
            );
          });
          [...watchers.keys()].filter((uid) => !mine[uid]).forEach((uid) => {
            watchers.get(uid)?.();
            watchers.delete(uid);
            mutual.delete(uid);
          });
          emit();
        },
        () => emit()
      )
    );
    unsubs.push(
      onValue(
        ref(db, `asosh_friend_req/${account.uid}`),
        (snap) => {
          incoming = (snap.val() || {}) as Record<string, Card>;
          emit();
        },
        () => emit()
      )
    );
  });

  return () => {
    alive = false;
    unsubs.forEach((u) => u());
    watchers.forEach((u) => u());
  };
}
