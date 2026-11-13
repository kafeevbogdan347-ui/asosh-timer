// Итоги четверти: округление, сколько пятёрок нужно, выбор четверти. Запуск: npm test
import { predictMark, fivesNeeded, pickQuarter, quarterSummary } from '../src/utils/quarterGrades.ts';

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failed++;
    console.log('❌', name, '— получили', JSON.stringify(got), 'ждали', JSON.stringify(want));
  }
};

eq('4.5 → 5', predictMark(4.5), 5);
eq('4.49 → 4', predictMark(4.49), 4);
eq('3.5 → 4', predictMark(3.5), 4);
eq('2.5 → 3', predictMark(2.5), 3);
eq('2.4 → 2', predictMark(2.4), 2);

// 4,4,4 (среднее 4) до 4,5: (12+5n)/(3+n) >= 4.5 → n >= 3
eq('4,4,4 → до пятёрки 3 пятёрки', fivesNeeded(12, 3, 5), 3);
// 3,3 до 3,5: (6+5n)/(2+n) >= 3.5 → n >= 0.67 → 1
eq('3,3 → до четвёрки 1 пятёрка', fivesNeeded(6, 2, 4), 1);
eq('уже достаточно → 0', fivesNeeded(9, 2, 4), 0);
eq('2,2,2 → до тройки', fivesNeeded(6, 3, 3), 1);

const Q = [
  { id: 1, name: 'I', start: '2026-09-01', end: '2026-10-30' },
  { id: 2, name: 'II', start: '2026-11-09', end: '2026-12-30' },
];
eq('внутри четверти', pickQuarter(Q, '2026-11-13').id, 2);
eq('на каникулах — прошедшая', pickQuarter(Q, '2026-11-02').id, 1);
eq('до начала года — первая', pickQuarter(Q, '2026-08-20').id, 1);
eq('пусто', pickQuarter([], '2026-11-13'), null);

const g = (sub, v, date) => ({ id: sub + v + date, sid: 's', sub, v, date, teacher: 'T', tuid: 't', t: 1 });
const sum = quarterSummary(
  [g('Математика', 3, '2026-11-10'), g('Математика', 4, '2026-11-11'), g('Математика', 'Н', '2026-11-12'), g('Математика', 5, '2026-10-01'), g('Русский', 5, '2026-11-10'), g('Русский', 5, '2026-11-11'), g('Русский', 4, '2026-11-12')],
  Q[1]
);
eq('сначала проблемные предметы', sum.map((s) => s.sub), ['Математика', 'Русский']);
eq('оценки другой четверти не считаются', sum[0].count, 2);
eq('пропуски отдельно', sum[0].absences, 1);
eq('3,4 → выходит 4', sum[0].predicted, 4);
eq('мало оценок', sum[0].fewMarks, true);
eq('5,5,4 → 5, пятёрок не нужно', [sum[1].predicted, sum[1].fivesToNext], [5, null]);

console.log(failed ? `\nПровалено: ${failed}` : 'Итоги четверти: все проверки пройдены');
process.exit(failed ? 1 : 0);
