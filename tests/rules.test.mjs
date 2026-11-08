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

// ---------- Профили учеников и оценки ----------

const S = `asosh_students/${CLS}`;
const SECRET = 's'.repeat(48);
async function createProfile(uid, pid = 'p1', name = 'Иван П.') {
  await join(uid);
  return update(ref(db(uid)), {
    [`${S}/${pid}`]: { name, owner: uid, t: serverTimestamp() },
    [`asosh_student_secrets/${CLS}/${pid}`]: SECRET,
  });
}
const grade = (extra = {}) => ({ sub: 'Алгебра', v: 5, date: '2026-11-09', teacher: 'Мария Ивановна', tuid: 'teacher', t: serverTimestamp(), ...extra });

test('профиль ученика: только участник класса и только похожее на настоящее имя', async () => {
  await assertFails(update(ref(db('stu')), { [`${S}/p1`]: { name: 'Иван П.', owner: 'stu', t: serverTimestamp() } }));
  await join('stu');
  for (const bad of ['Ктулху228 П.', 'иван п.', 'Иван Петров', 'Ivan P.', 'Иван', 'Пиздюк П.', 'Иван П. ']) {
    await assertFails(set(ref(db('stu'), `${S}/x`), { name: bad, owner: 'stu', t: serverTimestamp() }));
  }
  await assertFails(set(ref(db('stu'), `${S}/x`), { name: 'Иван П.', owner: 'stu', t: serverTimestamp(), ok: true }));
  await assertFails(set(ref(db('stu'), `${S}/x`), { name: 'Иван П.', owner: 'other', t: serverTimestamp() }));
  await assertSucceeds(createProfile('stu'));
  await assertSucceeds(set(ref(db('stu'), `${S}/p2`), { name: 'Анна-Мария С.', owner: 'stu', t: serverTimestamp() }));
  // Читает свой профиль, но не чужие и не список класса
  await assertSucceeds(get(ref(db('stu'), `${S}/p1`)));
  await assertFails(get(ref(db('stu'), S)));
  await assertFails(get(ref(db('stranger'), `${S}/p1`)));
  await assertFails(get(ref(db('stu'), `asosh_student_secrets/${CLS}/p1`)));
  await assertFails(set(ref(db('stu'), `asosh_student_secrets/${CLS}/p1`), 'x'.repeat(48)));
});

test('учитель подтверждает ученика, ученик себя подтвердить не может', async () => {
  await createProfile('stu');
  await assertFails(set(ref(db('stu'), `${S}/p1/ok`), true));
  await assertFails(update(ref(db('stu'), `${S}/p1`), { ok: true }));
  await assertSucceeds(get(ref(db('teacher'), S)));
  await assertSucceeds(update(ref(db('teacher'), `${S}/p1`), { ok: true, okBy: 'teacher' }));
  await assertFails(update(ref(db('teacher'), `${S}/p1`), { name: 'Пётр С.' }));
  // Смена имени сбрасывает подтверждение
  await assertFails(set(ref(db('stu'), `${S}/p1`), { name: 'Пётр П.', owner: 'stu', t: serverTimestamp(), ok: true, okBy: 'teacher' }));
  await assertSucceeds(set(ref(db('stu'), `${S}/p1`), { name: 'Пётр П.', owner: 'stu', t: serverTimestamp() }));
  const snap = await get(ref(db('stu'), `${S}/p1/ok`));
  if (snap.exists()) throw new Error('подтверждение не сбросилось');
  await assertSucceeds(remove(ref(db('teacher'), `${S}/p1`)));
});

test('оценки: ставит учитель подтверждённому ученику, видят ученик и учителя', async () => {
  await createProfile('stu');
  const G = `asosh_grades/${CLS}/p1`;
  await assertFails(push(ref(db('teacher'), G), grade())); // ещё не подтверждён
  await update(ref(db('teacher'), `${S}/p1`), { ok: true, okBy: 'teacher' });
  await assertFails(push(ref(db('stu'), G), grade({ tuid: 'stu' })));
  await assertFails(push(ref(db('teacher'), G), grade({ v: 6 })));
  await assertFails(push(ref(db('teacher'), G), grade({ v: 1 })));
  await assertFails(push(ref(db('teacher'), G), grade({ tuid: 'other' })));
  await assertFails(push(ref(db('teacher'), G), grade({ t: 1 })));
  await assertFails(push(ref(db('teacher'), G), grade({ extra: 1 })));
  await assertFails(push(ref(db('teacher'), G), grade({ note: 'пиздец' })));
  const g = await push(ref(db('teacher'), G), grade({ note: 'Молодец' }));
  await assertSucceeds(Promise.resolve(g));
  await assertSucceeds(get(ref(db('stu'), G)));
  await assertFails(get(ref(db('stranger'), G)));
  await assertFails(get(ref(db('stu'), `asosh_grades/${CLS}`)));
  await assertSucceeds(get(ref(db('teacher'), `asosh_grades/${CLS}`)));
  await assertFails(set(ref(db('teacher'), `${G}/${g.key}/v`), 2)); // исправлять нельзя, только удалить
  await assertFails(remove(ref(db('stu'), `${G}/${g.key}`)));
  await assertSucceeds(remove(ref(db('teacher'), `${G}/${g.key}`)));
});

test('перенос на новый телефон: профиль забирается только по секрету', async () => {
  await createProfile('stu');
  await update(ref(db('teacher'), `${S}/p1`), { ok: true, okBy: 'teacher' });
  await push(ref(db('teacher'), `asosh_grades/${CLS}/p1`), grade());
  // Чужой без секрета не заберёт
  await assertFails(update(ref(db('thief')), { [`${S}/p1/owner`]: 'thief', 'asosh_student_rebind/thief': 'x'.repeat(48) }));
  await assertFails(update(ref(db('thief')), { [`${S}/p1/owner`]: 'stu2', 'asosh_student_rebind/thief': SECRET }));
  // Новый телефон с секретом — забирает, подтверждение и оценки остаются
  await assertSucceeds(update(ref(db('stu2')), { [`${S}/p1/owner`]: 'stu2', 'asosh_student_rebind/stu2': SECRET }));
  const ok = await get(ref(db('stu2'), `${S}/p1/ok`));
  if (ok.val() !== true) throw new Error('подтверждение потерялось');
  await assertSucceeds(get(ref(db('stu2'), `asosh_grades/${CLS}/p1`)));
  await assertFails(get(ref(db('stu'), `asosh_grades/${CLS}/p1`)));
  // Удалённый профиль не воскресить перепривязкой
  await remove(ref(db('teacher'), `${S}/p1`));
  await assertFails(update(ref(db('stu2')), { [`${S}/p1/owner`]: 'stu2', 'asosh_student_rebind/stu2': SECRET }));
});
