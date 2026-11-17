import { OFFICIAL_SCHEDULE_2026, OFFICIAL_CHANGES, getLessonsForDate, ALL_SUBJECTS } from '../src/data/schoolSchedule.ts';

let fails = 0;
const ok = (name, cond, extra = '') => {
  if (cond) console.log('✓ ' + name);
  else { fails++; console.log('✗ ' + name + (extra ? ' — ' + extra : '')); }
};

const KNOWN = new Set([...ALL_SUBJECTS, 'Пробный экзамен', 'Музыка', 'Физика']);
for (const [date, byClass] of Object.entries(OFFICIAL_CHANGES)) {
  for (const [cls, lessons] of Object.entries(byClass)) {
    ok(`${date} ${cls}: класс есть в расписании`, !!OFFICIAL_SCHEDULE_2026[cls]);
    ok(`${date} ${cls}: не больше 8 уроков`, lessons.length >= 1 && lessons.length <= 8, String(lessons.length));
    const bad = lessons.map(([s]) => s).filter((s) => s && !KNOWN.has(s));
    ok(`${date} ${cls}: предметы известны`, bad.length === 0, bad.join(', '));
  }
}

const day = 'Вторник', date = '2026-11-17';
// другой день — основное расписание без изменений
ok('другая дата: основное расписание', JSON.stringify(getLessonsForDate('5А', day, '2026-11-24')) === JSON.stringify(getLessonsForDate('5А', day, '1999-01-01')));
const l5 = getLessonsForDate('5А', day, date);
ok('5А: 1-й урок — русский, каб. 106 (без пометки: предмет тот же)', l5[0][0] === 'Русский язык' && l5[0][1] === '106', JSON.stringify(l5[0]));
ok('5А: физкультура — в спортзале', l5[1][0] === 'Физкультура' && l5[1][1] === 'Спортзал', JSON.stringify(l5[1]));
const l9 = getLessonsForDate('9А', day, date);
ok('9А: пробный экзамен помечен как замена', l9[0][0] === '🔄 Пробный экзамен' && l9[0][1] === '332', JSON.stringify(l9[0]));
const l7v = getLessonsForDate('7В', day, date);
ok('7В: кабинет не указан на листе — берём из основного (330)', l7v[2][0] === 'Русский язык' && l7v[2][1] === '330', JSON.stringify(l7v[2]));
const l11 = getLessonsForDate('11Б', day, date);
ok('11Б: 1-го урока нет (окно)', l11[0][0] === '—');
const l6 = getLessonsForDate('6А', day, date);
ok('6А: нулевой урок — литература, каб. 324', l6[0][0].replace('🔄 ', '') === 'Литература' && l6[0][1] === '324', JSON.stringify(l6[0]));
ok('класс без листа: основное расписание', JSON.stringify(getLessonsForDate('2Б', day, date)) === JSON.stringify(getLessonsForDate('2Б', day, '1999-01-01')));

if (fails) { console.log(`\nПровалено: ${fails}`); process.exit(1); }
console.log('\nЗамены на день: все проверки пройдены');
