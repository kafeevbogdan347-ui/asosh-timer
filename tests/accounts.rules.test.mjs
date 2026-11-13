// Тесты правил базы для аккаунтов, журнала и родителей. Запуск: npm run test:rules
// (поднимает эмулятор Firebase на время теста; нужен Java).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, update, remove, serverTimestamp } from 'firebase/database';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const env = await initializeTestEnvironment({
  projectId: 'demo-asosh',
  database: { rules: readFileSync('database.rules.json', 'utf8'), host: '127.0.0.1', port: 9000 },
});
const T = 'asosh_teacher_claims';
// Отпечаток одного из реальных кодов из правил — им «занят» учитель teacher1
const H = readFileSync('database.rules.json', 'utf8').match(/\$h === '([0-9a-f]{64})'/)[1];
await env.withSecurityRulesDisabled(async (c) => {
  await set(ref(c.database(), `${T}/${H}`), { uid: 'teacher1', t: 1 });
  await set(ref(c.database(), 'asosh_teachers/teacher1'), { h: H, name: 'Мария Ивановна', t: 1 });
});
const db = (uid) => env.authenticatedContext(uid).database();
const stu1 = db('stu1'), stu2 = db('stu2'), teacher = db('teacher1'), fake = db('fake'), par1 = db('par1'), par2 = db('par2');
const anon = env.unauthenticatedContext().database();
const results = [];
const check = async (name, p) => {
  try { await p; results.push(['✅', name]); } catch (e) { results.push(['❌', name + ' — ' + String(e.message || e).slice(0, 120)]); }
};
const cls = encodeURIComponent('5а');
const user = (role, extra = {}) => ({ role, name: 'Иван П.', login: 'ivan_p', t: 1, ...extra });

// Профили
await check('ученик пишет свой профиль', assertSucceeds(set(ref(stu1, 'asosh_users/stu1'), user('student', { cls: '5А' }))));
await check('ученик не пишет чужой профиль', assertFails(set(ref(stu1, 'asosh_users/stu2'), user('student'))));
await check('самозванец не может стать учителем', assertFails(set(ref(fake, 'asosh_users/fake'), user('teacher'))));
await check('учитель с кодом — может', assertSucceeds(set(ref(teacher, 'asosh_users/teacher1'), user('teacher', { name: 'Мария Ивановна', login: 'maria', subjects: 'Математика' }))));
await check('неверный логин отклоняется', assertFails(set(ref(stu2, 'asosh_users/stu2'), user('student', { login: 'Иван!' }))));
await check('без входа ничего нельзя', assertFails(get(ref(anon, 'asosh_users/stu1'))));

// Состав класса
await check('ученик записывается в класс', assertSucceeds(set(ref(stu1, `asosh_roster/${cls}/stu1`), { name: 'Иван П.', t: 1 })));
await check('ученик не подтверждает себя сам', assertFails(set(ref(stu1, `asosh_roster/${cls}/stu1`), { name: 'Иван П.', t: 1, ok: true })));
await check('ученик не ставит ok отдельно', assertFails(set(ref(stu1, `asosh_roster/${cls}/stu1/ok`), true)));
await check('ученик не видит весь класс', assertFails(get(ref(stu1, `asosh_roster/${cls}`))));
await check('учитель видит класс', assertSucceeds(get(ref(teacher, `asosh_roster/${cls}`))));
await check('учитель подтверждает ученика', assertSucceeds(update(ref(teacher, `asosh_roster/${cls}/stu1`), { ok: true, okBy: 'teacher1' })));
await check('самозванец не подтверждает', assertFails(update(ref(fake, `asosh_roster/${cls}/stu1`), { ok: true, okBy: 'fake' })));
await check('ученик 2 записывается (не подтверждён)', assertSucceeds(set(ref(stu2, `asosh_roster/${cls}/stu2`), { name: 'Петя С.', t: 1 })));

// Журнал
const grade = (v, extra = {}) => ({ sub: 'Математика', v, date: '2026-11-09', tuid: 'teacher1', teacher: 'Мария Ивановна', t: 1, ...extra });
await check('учитель ставит 5 подтверждённому', assertSucceeds(set(ref(teacher, `asosh_journal/${cls}/stu1/g1`), grade(5, { note: 'Молодец' }))));
await check('учитель ставит «Н»', assertSucceeds(set(ref(teacher, `asosh_journal/${cls}/stu1/g2`), grade('Н'))));
await check('оценка 6 не принимается', assertFails(set(ref(teacher, `asosh_journal/${cls}/stu1/g3`), grade(6))));
await check('неподтверждённому оценку не поставить', assertFails(set(ref(teacher, `asosh_journal/${cls}/stu2/g1`), grade(4))));
await check('ученик себе оценку не ставит', assertFails(set(ref(stu1, `asosh_journal/${cls}/stu1/g9`), grade(5, { tuid: 'stu1' }))));
await check('самозванец оценку не ставит', assertFails(set(ref(fake, `asosh_journal/${cls}/stu1/g9`), grade(5, { tuid: 'fake' }))));
await check('учитель исправляет свою оценку', assertSucceeds(set(ref(teacher, `asosh_journal/${cls}/stu1/g1`), grade(4))));
await check('ученик видит свои оценки', assertSucceeds(get(ref(stu1, `asosh_journal/${cls}/stu1`))));
await check('одноклассник чужие не видит', assertFails(get(ref(stu2, `asosh_journal/${cls}/stu1`))));
await check('учитель видит журнал класса', assertSucceeds(get(ref(teacher, `asosh_journal/${cls}`))));

// Родители
const code = 'K7QM-2XPA', h = sha(code.replace('-', ''));
await check('ученик сохраняет код для родителей', assertSucceeds(set(ref(stu1, `asosh_parent_codes/${h}`), { student: 'stu1', t: 1 })));
await check('список кодов никто не прочитает', assertFails(get(ref(par1, 'asosh_parent_codes'))));
await check('зная код, родитель находит ребёнка', assertSucceeds(get(ref(par1, `asosh_parent_codes/${h}`))));
await check('ученик видит свой код', assertSucceeds(set(ref(stu1, 'asosh_private/stu1'), { pcode: code })));
await check('родитель чужой private не видит', assertFails(get(ref(par1, 'asosh_private/stu1'))));
await check('родитель до кода оценки не видит', assertFails(get(ref(par1, `asosh_journal/${cls}/stu1`))));
await check('родитель с верным кодом привязывается', assertSucceeds(update(ref(par1), {
  'asosh_family/stu1/par1': { h, name: 'Мама Ивана', t: 1 },
  'asosh_parent_links/par1/stu1': { name: 'Иван П.', cls: '5А', t: 1 },
})));
await check('с неверным кодом — нет', assertFails(set(ref(par2, 'asosh_family/stu1/par2'), { h: sha('WRONGCODE'), name: 'Чужой', t: 1 })));
await check('родитель видит оценки ребёнка', assertSucceeds(get(ref(par1, `asosh_journal/${cls}/stu1`))));
await check('родитель видит профиль ребёнка', assertSucceeds(get(ref(par1, 'asosh_users/stu1'))));
await check('родитель не видит чужого ребёнка', assertFails(get(ref(par1, `asosh_journal/${cls}/stu2`))));
await check('родитель не ставит оценки', assertFails(set(ref(par1, `asosh_journal/${cls}/stu1/g7`), grade(5, { tuid: 'par1' }))));
await check('ученик видит своих родителей', assertSucceeds(get(ref(stu1, 'asosh_family/stu1'))));
await check('ученик отключает родителя', assertSucceeds(remove(ref(stu1, 'asosh_family/stu1/par1'))));
await check('после отключения родитель не видит', assertFails(get(ref(par1, `asosh_journal/${cls}/stu1`))));
await check('учитель удаляет свою оценку', assertSucceeds(remove(ref(teacher, `asosh_journal/${cls}/stu1/g2`))));
await check('учитель убирает ученика из класса', assertSucceeds(remove(ref(teacher, `asosh_roster/${cls}/stu2`))));

// --- Онлайн класса ---
const card = (extra = {}) => ({ nick: 'ivan_p', avatar: '🎒', status: 'Учусь', bio: '', week: '2026-11-09', sec: 3600, last: 1, ...extra });
await check('онлайн: пишу свою карточку', assertSucceeds(set(ref(stu1, `asosh_online/${cls}/stu1`), card())));
await check('онлайн: не пишу чужую', assertFails(set(ref(stu1, `asosh_online/${cls}/stu2`), card())));
await check('онлайн: одноклассник видит рейтинг', assertSucceeds(get(ref(stu2, `asosh_online/${cls}`))));
await check('онлайн: без входа не видно', assertFails(get(ref(anon, `asosh_online/${cls}`))));
await check('онлайн: лишнее поле отклоняется', assertFails(set(ref(stu1, `asosh_online/${cls}/stu1`), card({ phone: '89990000000' }))));
await check('онлайн: больше недели секунд нельзя', assertFails(set(ref(stu1, `asosh_online/${cls}/stu1`), card({ sec: 999999 }))));
await check('онлайн: время из будущего нельзя', assertFails(set(ref(stu1, `asosh_online/${cls}/stu1`), card({ last: Date.now() + 3600000 }))));
await check('онлайн: длинное «о себе» отклоняется', assertFails(set(ref(stu1, `asosh_online/${cls}/stu1`), card({ bio: 'x'.repeat(201) }))));
await check('онлайн: выключаю — запись удаляется', assertSucceeds(remove(ref(stu1, `asosh_online/${cls}/stu1`))));
const anonDev = db('anon_device');
await check('онлайн: без аккаунта в рейтинг не попасть', assertFails(set(ref(anonDev, `asosh_online/${cls}/anon_device`), card())));
await check('онлайн: свою старую запись удалить можно', assertSucceeds(remove(ref(anonDev, `asosh_online/${cls}/anon_device`))));
await check('онлайн: время прибавляется', assertSucceeds(set(ref(stu1, `asosh_online/${cls}/stu1`), card())));
await check('онлайн: прибавка со второго устройства', assertSucceeds(update(ref(stu1, `asosh_online/${cls}/stu1`), { sec: 3700, last: 2 })));

// --- Публичная карточка профиля (видят вошедшие, пишет только владелец) ---
const pub = (extra = {}) => ({ name: 'Иван П.', nick: 'Ваня', avatar: '😎', status: '', bio: '', cls: '5А', hw: 3, games: 10, friends: 1, certs: '[]', t: 1, ...extra });
await check('публичный профиль: пишу свой', assertSucceeds(set(ref(stu1, 'asosh_pubprof/stu1'), pub())));
await check('публичный профиль: одноклассник читает', assertSucceeds(get(ref(stu2, 'asosh_pubprof/stu1'))));
await check('публичный профиль: без входа не читается', assertFails(get(ref(anon, 'asosh_pubprof/stu1'))));
await check('публичный профиль: чужой не перезаписать', assertFails(set(ref(stu2, 'asosh_pubprof/stu1'), pub({ nick: 'Взлом' }))));
await check('публичный профиль: чужой не удалить', assertFails(remove(ref(stu2, 'asosh_pubprof/stu1'))));
await check('публичный профиль: без аккаунта нельзя', assertFails(set(ref(anonDev, 'asosh_pubprof/anon_device'), pub())));
await check('публичный профиль: фото не принимается', assertFails(set(ref(stu1, 'asosh_pubprof/stu1'), pub({ photo: 'data:image/png;base64,AAAA' }))));
await check('публичный профиль: средний балл не принимается', assertFails(set(ref(stu1, 'asosh_pubprof/stu1'), pub({ gpa: 4.5 }))));
await check('публичный профиль: дата регистрации из будущего нельзя', assertFails(set(ref(stu1, 'asosh_pubprof/stu1'), pub({ reg: Date.now() + 86400000 }))));

// --- Заглушка сайта и администраторы ---
await check('заглушка: флаг читается без входа (сайт)', assertSucceeds(get(ref(anon, 'asosh_config/siteClosed'))));
await check('заглушка: ученик не закроет приложение', assertFails(set(ref(stu1, 'asosh_config/siteClosed'), true)));
await check('заглушка: аноним не закроет приложение', assertFails(set(ref(anonDev, 'asosh_config/siteClosed'), true)));
await check('админы: себя не добавить', assertFails(set(ref(stu1, 'asosh_admins/stu1'), true)));
await env.withSecurityRulesDisabled(async (c) => { await set(ref(c.database(), 'asosh_admins/admin1'), true); });
const admin = db('admin1');
await check('заглушка: администратор закрывает', assertSucceeds(set(ref(admin, 'asosh_config/siteClosed'), true)));
await check('заглушка: администратор открывает', assertSucceeds(set(ref(admin, 'asosh_config/siteClosed'), false)));
await check('заглушка: только true/false', assertFails(set(ref(admin, 'asosh_config/siteClosed'), 'closed')));
await check('админы: список видят вошедшие (значок «Разработчик»)', assertSucceeds(get(ref(stu2, 'asosh_admins'))));
await check('админ: остальной конфиг не трогает', assertFails(set(ref(admin, 'asosh_config/lockdown'), true)));

// --- Отметки «прочитано» у объявлений ---
await env.withSecurityRulesDisabled(async (c) => {
  await set(ref(c.database(), 'asosh_board/pub/ann1'), { kind: 'ann', title: 'Экскурсия', aud: 'all', cls: '5А', uid: 'teacher1', created_at: 1 });
  await set(ref(c.database(), 'asosh_users/par1'), { role: 'parent', name: 'Мама Ивана', login: 'mama', t: 1 });
});
const readMark = (name, role) => ({ name, role, t: serverTimestamp() });
await check('прочитано: ученик отмечает', assertSucceeds(set(ref(stu1, 'asosh_board_read/ann1/stu1'), readMark('Иван П.', 'student'))));
await check('прочитано: родитель отмечает', assertSucceeds(set(ref(par1, 'asosh_board_read/ann1/par1'), readMark('Мама Ивана', 'parent'))));
await check('прочитано: за другого нельзя', assertFails(set(ref(stu1, 'asosh_board_read/ann1/stu2'), readMark('Петя С.', 'student'))));
await check('прочитано: чужое имя нельзя', assertFails(set(ref(stu1, 'asosh_board_read/ann1/stu1'), readMark('Директор', 'student'))));
await check('прочитано: чужую роль нельзя', assertFails(set(ref(stu1, 'asosh_board_read/ann1/stu1'), readMark('Иван П.', 'parent'))));
await check('прочитано: несуществующее объявление нельзя', assertFails(set(ref(stu1, 'asosh_board_read/nope/stu1'), readMark('Иван П.', 'student'))));
await check('прочитано: без аккаунта нельзя', assertFails(set(ref(anonDev, 'asosh_board_read/ann1/anon_device'), readMark('Аноним', 'student'))));
await check('прочитано: учитель видит список', assertSucceeds(get(ref(teacher, 'asosh_board_read/ann1'))));
await check('прочитано: ученик видит только своё', assertSucceeds(get(ref(stu1, 'asosh_board_read/ann1/stu1'))));
await check('прочитано: ученик не видит весь список', assertFails(get(ref(stu1, 'asosh_board_read/ann1'))));

// --- Журнал ошибок ---
const errRec = (extra = {}) => ({ msg: 'TypeError: x is undefined', stack: 'at App', ver: 'v16.21', scr: 'main', plat: 'apk', t: serverTimestamp(), ...extra });
const sendErr = (d, uid, key, extra) => update(ref(d), { [`asosh_errors/${uid}/${key}`]: errRec(extra), [`asosh_rate/${uid}/err`]: serverTimestamp() });
await check('ошибки: ученик отправляет ошибку', assertSucceeds(sendErr(stu2, 'stu2', 'e1')));
await check('ошибки: вторая сразу же — отклоняется', assertFails(sendErr(stu2, 'stu2', 'e2')));
await check('ошибки: без отметки частоты нельзя', assertFails(set(ref(stu1, 'asosh_errors/stu1/e3'), errRec())));
await check('ошибки: от чужого имени нельзя', assertFails(sendErr(stu1, 'stu2', 'e4')));
await check('ошибки: длинный текст отклоняется', assertFails(sendErr(anonDev, 'anon_device', 'e5', { msg: 'x'.repeat(301) })));
await check('ошибки: ученик журнал не читает', assertFails(get(ref(stu2, 'asosh_errors'))));
await check('ошибки: администратор читает', assertSucceeds(get(ref(admin, 'asosh_errors'))));
await check('ошибки: ученик не очищает', assertFails(remove(ref(stu2, 'asosh_errors'))));
await check('ошибки: администратор очищает', assertSucceeds(remove(ref(admin, 'asosh_errors'))));

// --- Профиль аккаунта (ник, аватар, статус) — общий для всех устройств ---
const prof = (extra = {}) => ({ nick: 'Ваня', avatar: '😎', status: 'Учусь', bio: 'Люблю футбол', t: 1, ...extra });
await check('профиль: пишу свой', assertSucceeds(set(ref(stu1, 'asosh_profiles/stu1'), prof())));
await check('профиль: читаю свой (другое устройство)', assertSucceeds(get(ref(stu1, 'asosh_profiles/stu1'))));
await check('профиль: чужой не читается', assertFails(get(ref(stu2, 'asosh_profiles/stu1'))));
await check('профиль: чужой не пишется', assertFails(set(ref(stu2, 'asosh_profiles/stu1'), prof())));
await check('профиль: без аккаунта нельзя', assertFails(set(ref(anonDev, 'asosh_profiles/anon_device'), prof())));
await check('профиль: длинный ник отклоняется', assertFails(set(ref(stu1, 'asosh_profiles/stu1'), prof({ nick: 'x'.repeat(31) }))));
await check('профиль: лишнее поле отклоняется', assertFails(set(ref(stu1, 'asosh_profiles/stu1'), prof({ photo: 'data:...' }))));

// --- Защита от спама: лимиты на сервере ---
const msg = (extra = {}) => ({ username: 'ivan_p', content: 'Привет', created_at: '2026-11-11T08:00:00Z', ...extra });
const sendChat = (d, uid, key) => update(ref(d), { [`asosh_timer/${key}`]: msg(), [`asosh_rate/${uid}/chat`]: serverTimestamp() });
await check('чат: сообщение с отметкой времени проходит', assertSucceeds(sendChat(stu1, 'stu1', 'm1')));
await check('чат: второе сразу же — отклоняется', assertFails(sendChat(stu1, 'stu1', 'm2')));
await check('чат: без отметки времени не пишется', assertFails(set(ref(stu2, 'asosh_timer/m3'), msg())));
await check('чат: чужую отметку не поставить', assertFails(update(ref(stu2), { 'asosh_timer/m4': msg(), 'asosh_rate/stu1/chat': serverTimestamp() })));
await check('чат: время подделать нельзя', assertFails(update(ref(stu2), { 'asosh_timer/m5': msg(), 'asosh_rate/stu2/chat': 1 })));
await check('чат: другой ученик пишет', assertSucceeds(sendChat(stu2, 'stu2', 'm6')));
await check('чат: чужое сообщение не перезаписать', assertFails(set(ref(stu1, 'asosh_timer/m6'), msg({ content: 'взлом' }))));
await env.withSecurityRulesDisabled(async (c) => { await remove(ref(c.database(), 'asosh_rate')); });
await check('чат: подписаться чужим uid нельзя', assertFails(update(ref(stu1), { 'asosh_timer/m10': msg({ userId: 'stu2' }), 'asosh_rate/stu1/chat': serverTimestamp() })));
await check('чат: своим uid можно', assertSucceeds(update(ref(stu1), { 'asosh_timer/m11': msg({ userId: 'stu1' }), 'asosh_rate/stu1/chat': serverTimestamp() })));
await check('чат: гость с user_… можно', assertSucceeds(update(ref(stu2), { 'asosh_timer/m12': msg({ userId: 'user_1700000000000_abc' }), 'asosh_rate/stu2/chat': serverTimestamp() })));
await check('чат: неизвестный вид лимита нельзя', assertFails(set(ref(stu1, 'asosh_rate/stu1/hack'), serverTimestamp())));
const hw = { sub: 'Математика', text: '№ 125', uid: 'stu1', created_at: 1 };
const share = (d, uid, key) => update(ref(d), { [`asosh_class/${cls}/homework/${key}`]: { ...hw, uid }, [`asosh_rate/${uid}/share`]: serverTimestamp() });
await check('домашка: делюсь с отметкой', assertSucceeds(share(stu1, 'stu1', 'h1')));
await check('домашка: вторая сразу же — отклоняется', assertFails(share(stu1, 'stu1', 'h2')));
await check('домашка: без отметки не пишется', assertFails(set(ref(stu2, `asosh_class/${cls}/homework/h3`), { ...hw, uid: 'stu2' })));
await check('домашка: удаляю свою', assertSucceeds(remove(ref(stu1, `asosh_class/${cls}/homework/h1`))));

// --- Рубильник ---
await check('рубильник: ученик не включает и не выключает', assertFails(set(ref(stu1, 'asosh_config/lockdown'), false)));
await check('рубильник: учитель тоже нет', assertFails(set(ref(teacher, 'asosh_config/lockdown'), true)));
await env.withSecurityRulesDisabled(async (c) => { await set(ref(c.database(), 'asosh_config/lockdown'), true); });
await check('рубильник: состояние видно приложению', assertSucceeds(get(ref(stu1, 'asosh_config/lockdown'))));
await check('рубильник: чат остановлен', assertFails(sendChat(stu2, 'stu2', 'm7')));
await check('рубильник: оценки остановлены', assertFails(set(ref(teacher, `asosh_journal/${cls}/stu1/g8`), grade(5))));
await check('рубильник: профиль не меняется', assertFails(set(ref(stu1, 'asosh_users/stu1'), user('student', { cls: '5А' }))));
await check('рубильник: онлайн не пишется', assertFails(set(ref(stu1, `asosh_online/${cls}/stu1`), card())));
await check('рубильник: чтение работает', assertSucceeds(get(ref(stu1, 'asosh_timer'))));
await env.withSecurityRulesDisabled(async (c) => { await remove(ref(c.database(), 'asosh_config/lockdown')); });
await check('рубильник снят: онлайн снова пишется', assertSucceeds(set(ref(stu1, `asosh_online/${cls}/stu1`), card())));

for (const [s, n] of results) console.log(s, n);
const bad = results.filter(([s]) => s === '❌').length;
console.log(bad ? `\nПровалено: ${bad}` : `\nВсе ${results.length} проверок прошли`);
await env.cleanup();
process.exit(bad ? 1 : 0);
