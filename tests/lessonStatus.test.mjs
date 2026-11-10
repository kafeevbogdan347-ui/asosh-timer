// Проверка таймера уроков: node --experimental-strip-types tests/lessonStatus.test.mjs
import { computeLessonStatus, firstLessonStart, lessonNo, roomLabel } from '../src/utils/lessonStatus.ts';

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — получили ${JSON.stringify(got)}, ждали ${JSON.stringify(want)}`}`);
};
const at = (t) => { const [h, m] = t.split(':').map(Number); return h * 3600 + m * 60; };

// 2-я смена: нулевого урока нет, окно между 2-м и 4-м
const bells = [['13:00', '13:40'], ['13:50', '14:30'], ['14:40', '15:20'], ['15:30', '16:10'], ['16:20', '17:00']];
const day = [['—', ''], ['Алгебра', '324'], ['Физика', '209'], ['—', ''], ['Музыка', 'Акт. зал']];

eq('первый урок — не нулевой', firstLessonStart(day, bells), '13:50');
let s = computeLessonStatus(day, bells, at('13:10'));
eq('во время пустого нулевого урока — ожидание', [s.type, s.nextIdx, s.remainSec], ['before', 1, 40 * 60]);
s = computeLessonStatus(day, bells, at('12:00'));
eq('задолго до уроков', [s.type, s.nowText], ['none', 'Занятия ещё не начались']);
s = computeLessonStatus(day, bells, at('14:00'));
eq('идёт урок', [s.type, s.currentIdx, s.nextIdx, s.nowText], ['lesson', 1, 2, 'Алгебра (каб. 324)']);
s = computeLessonStatus(day, bells, at('14:35'));
eq('перемена', [s.type, s.nowText, s.remainSec], ['break', 'Перемена', 300]);
s = computeLessonStatus(day, bells, at('15:40'));
eq('окно между уроками', [s.type, s.nowText, s.nextIdx, s.remainSec], ['break', 'Окно', 4, 40 * 60]);
s = computeLessonStatus(day, bells, at('16:30'));
eq('последний урок', [s.type, s.nextIdx, s.nowText], ['lesson', -1, 'Музыка (Акт. зал)']);
s = computeLessonStatus(day, bells, at('17:05'));
eq('после уроков', [s.type, s.nowText], ['none', 'Уроки на сегодня закончены 🎉']);
eq('пустой день', computeLessonStatus([['—', '']], bells, at('14:00')).type, 'none');
eq('урок без звонка не учитывается', computeLessonStatus([['Алгебра', '1']], [], at('14:00')).type, 'none');
eq('номер урока: 1-я смена', lessonNo('1', 0), 1);
eq('номер урока: 2-я смена', lessonNo('2', 0), 0);
eq('кабинет', [roomLabel('324'), roomLabel('Спортзал'), roomLabel('')], ['каб. 324', 'Спортзал', '']);

if (failed) { console.log(`\nОшибок: ${failed}`); process.exit(1); }
console.log('\nВсе проверки таймера пройдены');
