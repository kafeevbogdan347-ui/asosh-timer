// Тесты правил базы для аккаунтов, журнала и родителей. Запуск: npm run test:rules
// (поднимает эмулятор Firebase на время теста; нужен Java).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, update, remove } from 'firebase/database';

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

for (const [s, n] of results) console.log(s, n);
const bad = results.filter(([s]) => s === '❌').length;
console.log(bad ? `\nПровалено: ${bad}` : `\nВсе ${results.length} проверок прошли`);
await env.cleanup();
process.exit(bad ? 1 : 0);
