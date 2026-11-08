// Проверка правил базы (database.rules.json) в эмуляторе Firebase.
// Запуск: npm run test:rules (нужны Java и firebase-tools: npx firebase emulators:exec …)
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, push, remove, update, serverTimestamp } from 'firebase/database';

const CLS = encodeURIComponent('8а'); // как classDbKey('8А')
const OTHER = encodeURIComponent('9б');
const KEY = 'a'.repeat(64);

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-asosh',
    database: { rules: readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8') },
  });
});
after(() => env?.cleanup());
beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await set(ref(ctx.database(), 'asosh_class_keys'), { [CLS]: KEY, [OTHER]: 'b'.repeat(64) });
    await set(ref(ctx.database(), 'asosh_teachers/teacher'), { h: 'x', name: 'Мария Ивановна', t: 1 });
    await set(ref(ctx.database(), 'asosh_admins/admin'), true);
  });
});

const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
const join = (uid, cls = CLS, k = KEY) => set(ref(db(uid), `asosh_members/${cls}/${uid}`), { k, t: serverTimestamp() });
const msg = (extra = {}) => ({
  username: '🎒 Петя',
  userId: 'p1',
  avatar: '🎒',
  content: 'Привет, ребята!',
  room: '8А',
  isIncognito: false,
  isSelfDestruct: false,
  created_at: new Date().toISOString(),
  timestamp: serverTimestamp(),
  ...extra,
});

test('участник класса: только с верным ключом', async () => {
  await assertFails(join('stu', CLS, 'f'.repeat(64)));
  await assertFails(set(ref(db('stu'), `asosh_members/${CLS}/other`), { k: KEY, t: serverTimestamp() }));
  await assertFails(set(ref(db('stu'), `asosh_members/${CLS}/stu`), { k: KEY, t: 1 }));
  await assertSucceeds(join('stu'));
  await assertSucceeds(join('stu')); // повторная запись при новом запуске
  await assertFails(remove(ref(db('stu'), `asosh_members/${CLS}/stu`)));
  await assertFails(get(ref(db('stu'), 'asosh_class_keys')));
  await assertFails(get(ref(db('stu'), `asosh_members/${CLS}`)));
});

test('чат класса: читать и писать могут только участники и учителя', async () => {
  await assertFails(get(ref(db('stranger'), `asosh_rooms/${CLS}`)));
  await assertFails(push(ref(db('stranger'), `asosh_rooms/${CLS}`), msg()));
  await join('stu');
  await assertSucceeds(push(ref(db('stu'), `asosh_rooms/${CLS}`), msg()));
  await assertSucceeds(get(ref(db('stu'), `asosh_rooms/${CLS}`)));
  await assertFails(get(ref(db('stu'), `asosh_rooms/${OTHER}`)));
  await assertSucceeds(get(ref(db('teacher'), `asosh_rooms/${CLS}`)));
  await assertFails(get(ref(db(null), `asosh_rooms/${CLS}`)));
});

test('сообщения: время сервера, без лишних полей, без мата', async () => {
  await join('stu');
  const room = `asosh_rooms/${CLS}`;
  await assertFails(push(ref(db('stu'), room), msg({ timestamp: Date.now() - 86400000 })));
  await assertFails(push(ref(db('stu'), room), msg({ isTeacher: true })));
  await assertFails(push(ref(db('stu'), room), msg({ content: 'ну пиздец' })));
  await assertFails(push(ref(db('stu'), room), msg({ content: 'Ты ХУЙЛО' })));
  await assertFails(push(ref(db('stu'), room), msg({ username: 'Блядь' })));
  await assertFails(push(ref(db('stu'), room), msg({ content: 'x'.repeat(401) })));
  await assertSucceeds(push(ref(db('stu'), room), msg({ content: 'Застрахуй колебание, хлебать суп' })));
  // Общешкольный чат открыт всем вошедшим, но правила сообщений те же
  await assertSucceeds(push(ref(db('stranger'), 'asosh_timer'), msg()));
  await assertFails(push(ref(db('stranger'), 'asosh_timer'), msg({ content: 'fuck' })));
  // Чужое сообщение не изменить
  const r = await push(ref(db('stranger'), 'asosh_timer'), msg());
  await assertFails(set(ref(db('stu'), `asosh_timer/${r.key}/content`), 'подмена'));
});

test('замены и домашка: читают все, добавляют участники и учителя', async () => {
  const hw = { sub: 'Алгебра', text: '№ 125', forDate: '', author: 'Петя', created_at: serverTimestamp() };
  const path = `asosh_class/${CLS}/homework`;
  await assertFails(push(ref(db('stranger'), path), { ...hw, uid: 'stranger' }));
  await assertSucceeds(get(ref(db('stranger'), path)));
  await join('stu');
  await assertFails(push(ref(db('stu'), path), { ...hw, uid: 'stu', created_at: 1 }));
  await assertFails(push(ref(db('stu'), path), { ...hw, uid: 'stu', text: 'пиздец' }));
  await assertFails(push(ref(db('stu'), path), { ...hw, uid: 'stu', teacher: true }));
  const mine = await push(ref(db('stu'), path), { ...hw, uid: 'stu' });
  await assertSucceeds(Promise.resolve(mine));
  await assertSucceeds(push(ref(db('teacher'), path), { ...hw, uid: 'teacher', teacher: true }));
  await assertFails(remove(ref(db('teacher'), `${path}/${mine.key}`)));
  await assertSucceeds(remove(ref(db('stu'), `${path}/${mine.key}`)));

  const rep = { date: '2026-11-09', num: 3, sub: 'Окно', room: '', author: 'Петя', created_at: serverTimestamp() };
  await assertFails(push(ref(db('stranger'), `asosh_class/${CLS}/replacements`), { ...rep, uid: 'stranger' }));
  await assertSucceeds(push(ref(db('stu'), `asosh_class/${CLS}/replacements`), { ...rep, uid: 'stu' }));
});

test('статистика: пишет каждый своё, читают только администраторы', async () => {
  const visit = { p: 'android', t: Date.now(), sw: 393 };
  await assertSucceeds(set(ref(db('stu'), 'asosh_stats/2026-11-08/stu'), visit));
  await assertFails(set(ref(db('stu'), 'asosh_stats/2026-11-08/other'), visit));
  await assertFails(get(ref(db('stu'), 'asosh_stats')));
  await assertSucceeds(get(ref(db('admin'), 'asosh_stats')));
  await assertSucceeds(get(ref(db('admin'), 'asosh_admins/admin')));
  await assertFails(set(ref(db('stu'), 'asosh_admins/stu'), true));
});

test('перенос по QR: одна запись на устройство, срок 30 минут', async () => {
  const rec = { payload: 'iv.cipher', created_at: serverTimestamp() };
  await assertFails(set(ref(db('stu'), 'asosh_transfer/other'), rec));
  await assertFails(set(ref(db('stu'), 'asosh_transfer/stu'), { ...rec, created_at: Date.now() + 3600000 }));
  await assertFails(set(ref(db('stu'), 'asosh_transfer/stu'), { ...rec, extra: 1 }));
  await assertSucceeds(set(ref(db('stu'), 'asosh_transfer/stu'), rec));
  await assertFails(get(ref(db('phone'), 'asosh_transfer')));
  await assertSucceeds(get(ref(db('phone'), 'asosh_transfer/stu')));
  await assertSucceeds(remove(ref(db('phone'), 'asosh_transfer/stu')));
  // Старая запись не читается
  await env.withSecurityRulesDisabled((ctx) =>
    set(ref(ctx.database(), 'asosh_transfer/old'), { payload: 'iv.cipher', created_at: Date.now() - 31 * 60 * 1000 })
  );
  await assertFails(get(ref(db('phone'), 'asosh_transfer/old')));
});

test('учителя и объявления работают как раньше', async () => {
  const post = { kind: 'ann', title: 'Собрание', aud: 'all', cls: '', uid: 'teacher', author: 'М. И.', created_at: Date.now() };
  await assertSucceeds(push(ref(db('teacher'), 'asosh_board/pub'), post));
  await assertFails(push(ref(db('stu'), 'asosh_board/pub'), { ...post, uid: 'stu' }));
  await assertSucceeds(get(ref(db('stu'), 'asosh_board/pub')));
  await assertFails(get(ref(db('stu'), 'asosh_board/teach')));
  await assertFails(update(ref(db('stu')), { 'asosh_teachers/stu': { h: 'nope', name: 'Хакер', t: 1 } }));
});
