// Вечернее напоминание о домашке. Запуск: npm test
import { homeworkForTomorrow, reminderText } from '../src/utils/hwReminder.ts';

let failed = 0;
const eq = (name, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failed++;
    console.log('❌', name, '— получили', JSON.stringify(got), 'ждали', JSON.stringify(want));
  }
};
const T = '2026-11-14';
const p = (sub, done, dueDate, cls = '7А') => ({ cls, sub, text: 'x', done, dueDate });
const s = (sub, forDate) => ({ sub, text: 'y', forDate });

eq('своя на завтра', homeworkForTomorrow([p('Алгебра', false, T)], [], '7А', T, []), ['Алгебра']);
eq('выполненная не считается', homeworkForTomorrow([p('Алгебра', true, T)], [], '7А', T, []), []);
eq('на другой день не считается', homeworkForTomorrow([p('Алгебра', false, '2026-11-20')], [], '7А', T, ['Алгебра']), []);
eq('без даты — если предмет завтра', homeworkForTomorrow([p('Физика', false)], [], '7А', T, ['Физика']), ['Физика']);
eq('без даты и предмета нет завтра', homeworkForTomorrow([p('Физика', false)], [], '7А', T, ['Химия']), []);
eq('другой класс не считается', homeworkForTomorrow([p('Алгебра', false, T, '8Б')], [], '7А', T, []), []);
eq('домашка класса на завтра', homeworkForTomorrow([], [s('Русский язык', T)], '7А', T, []), ['Русский язык']);
eq('домашка класса, а своя по предмету сделана', homeworkForTomorrow([p('Русский язык', true, T)], [s('Русский язык', T)], '7А', T, []), []);
eq('без дублей', homeworkForTomorrow([p('Алгебра', false, T)], [s('Алгебра', T)], '7А', T, []), ['Алгебра']);
eq('замена 🔄 в расписании', homeworkForTomorrow([p('Физика', false)], [], '7А', T, ['🔄 Физика']), ['Физика']);
eq('текст: 1 задание', reminderText(['Алгебра']).title, '📘 На завтра не сделано 1 задание');
eq('текст: 3 задания', reminderText(['a', 'b', 'c']).title, '📘 На завтра не сделано 3 задания');
eq('текст: длинный список', reminderText(['a', 'b', 'c', 'd', 'e', 'f', 'g']).body, 'a, b, c, d, e и ещё 2');

console.log(failed ? `\nПровалено: ${failed}` : 'Напоминание о домашке: все проверки пройдены');
process.exit(failed ? 1 : 0);
