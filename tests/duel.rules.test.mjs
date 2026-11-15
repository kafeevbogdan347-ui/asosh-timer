// Тесты правил базы для онлайн-дуэли (asosh_duels). Запуск: npm run test:rules (эмулятор Firebase, нужен Java).
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, set, get, update, remove, serverTimestamp } from 'firebase/database';

const env = await initializeTestEnvironment({
  projectId: 'demo-asosh',
  database: { rules: readFileSync('database.rules.json', 'utf8'), host: '127.0.0.1', port: 9000 },
});
const db = (uid) => env.authenticatedContext(uid).database();
const host = db('host1'), guest = db('guest1'), third = db('third1');
const anon = env.unauthenticatedContext().database();
const results = [];
const check = async (name, p) => {
  try { await p; results.push(['✅', name]); } catch (e) { results.push(['❌', name + ' — ' + String(e.message || e).slice(0, 120)]); }
};
const room = (uid, extra = {}) => ({ host: uid, hostName: 'Ваня', created: serverTimestamp(), seed: 12345, level: 'easy', players: { [uid]: { name: 'Ваня', cls: '6Б', score: 0 } }, ...extra });

await check('создатель открывает комнату', assertSucceeds(set(ref(host, 'asosh_duels/1234'), room('host1'))));
await check('без входа комнату не открыть', assertFails(set(ref(anon, 'asosh_duels/4321'), room('x'))));
await check('чужое имя хозяина не пройдёт', assertFails(set(ref(third, 'asosh_duels/5555'), room('host1'))));
await check('код не из 4 цифр не пройдёт', assertFails(set(ref(host, 'asosh_duels/12ab'), room('host1'))));
await check('уровень только easy/mid/hard', assertFails(set(ref(host, 'asosh_duels/7777'), room('host1', { level: 'god' }))));
await check('занятую комнату не перезаписать', assertFails(set(ref(third, 'asosh_duels/1234'), room('third1'))));
await check('соперник читает комнату по коду', assertSucceeds(get(ref(guest, 'asosh_duels/1234'))));
await check('список всех комнат не прочитать', assertFails(get(ref(guest, 'asosh_duels'))));
await check('старт без соперника нельзя', assertFails(set(ref(host, 'asosh_duels/1234/start'), serverTimestamp())));
await check('соперник входит', assertSucceeds(update(ref(guest, 'asosh_duels/1234'), { guest: 'guest1', 'players/guest1': { name: 'Петя', cls: '6А', score: 0 } })));
await check('третий не входит', assertFails(update(ref(third, 'asosh_duels/1234'), { guest: 'third1', 'players/third1': { name: 'Лёша', score: 0 } })));
await check('третий не пишет себя в игроки', assertFails(set(ref(third, 'asosh_duels/1234/players/third1'), { name: 'Лёша', score: 0 })));
await check('соперник не жмёт «Начать»', assertFails(set(ref(guest, 'asosh_duels/1234/start'), serverTimestamp())));
await check('создатель жмёт «Начать»', assertSucceeds(set(ref(host, 'asosh_duels/1234/start'), serverTimestamp())));
await check('соперник пишет свой счёт', assertSucceeds(set(ref(guest, 'asosh_duels/1234/players/guest1'), { name: 'Петя', score: 10, done: true, ms: 41000 })));
await check('чужой счёт не исправить', assertFails(set(ref(guest, 'asosh_duels/1234/players/host1'), { name: 'Ваня', score: 0 })));
await check('счёт больше 10 не пройдёт', assertFails(set(ref(host, 'asosh_duels/1234/players/host1'), { name: 'Ваня', score: 99 })));
await check('лишние поля не пройдут', assertFails(set(ref(host, 'asosh_duels/1234/players/host1'), { name: 'Ваня', score: 1, hack: 1 })));
await check('соперник не удаляет комнату', assertFails(remove(ref(guest, 'asosh_duels/1234'))));
await check('создатель удаляет комнату', assertSucceeds(remove(ref(host, 'asosh_duels/1234'))));
await env.withSecurityRulesDisabled(async (c) => {
  await set(ref(c.database(), 'asosh_duels/2222'), { host: 'old', created: Date.now() - 3600_000, seed: 1, level: 'easy' });
});
await check('старую комнату (больше 30 мин) можно занять', assertSucceeds(set(ref(third, 'asosh_duels/2222'), room('third1'))));
await env.withSecurityRulesDisabled(async (c) => { await set(ref(c.database(), 'asosh_config/lockdown'), true); });
await check('рубильник: дуэль не создать', assertFails(set(ref(host, 'asosh_duels/3333'), room('host1'))));

for (const [s, n] of results) console.log(s, n);
const bad = results.filter(([s]) => s === '❌').length;
console.log(bad ? `\nПровалено: ${bad}` : `\nВсе ${results.length} проверок дуэли прошли`);
await env.cleanup();
process.exit(bad ? 1 : 0);
