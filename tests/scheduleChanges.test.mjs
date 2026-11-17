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

// --- Лист изменений из базы, день класса и расписание учителя ---
const { classDay, teacherDay } = await import('../src/utils/daySchedule.ts');
const { encodeLessons, decodeLessons } = await import('../src/utils/changesFormat.ts');
const tue = new Date(2026, 10, 17);
const db = { '2026-11-17': { '5А': [['Химия', '214'], ['', '']] } };
ok('лист из базы важнее записанного в код', getLessonsForDate('5А', day, date, db)[0][0] === '🔄 Химия');
ok('лист из базы: пустая строка — урока нет', getLessonsForDate('5А', day, date, db)[1][0] === '—');
ok('кодирование листа туда-обратно', JSON.stringify(decodeLessons(encodeLessons([['Химия', '214'], ['', ''], ['Физика', ''], ['', '']]))) === JSON.stringify([['Химия', '214'], ['', ''], ['Физика', '']]));
const repl = [{ id: 'r', date, num: 2, sub: 'Химия', room: '214', author: '', uid: '', created_at: 1 }];
const cd = classDay('5А', tue, undefined, repl);
ok('день класса: замена класса поверх листа', cd[1][0] === '🔄 Химия' && cd[1][1] === '214', JSON.stringify(cd[1]));
const td = teacherDay(['5А', '5Б', '6А'], ['История'], tue);
ok('учитель: уроки истории 5А и 5Б по времени', td.length >= 2 && td.every((l) => l.sub === 'История') && td.map((l) => l.start).join() === [...td.map((l) => l.start)].sort().join(), JSON.stringify(td));
ok('учитель: у урока есть класс, кабинет и номер', td[0].cls && td[0].num >= 1 && td[0].start.includes(':'));
ok('учитель: чужие предметы не попадают', teacherDay(['5А'], ['Химия'], tue).length === 0);

if (fails) { console.log(`\nПровалено: ${fails}`); process.exit(1); }
console.log('\nЗамены на день: все проверки пройдены');
