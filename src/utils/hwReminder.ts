// Вечернее напоминание о домашке: что из невыполненного задано на завтра.
// Чистая функция — её проверяет tests/hwReminder.test.mjs.

export interface PersonalHw {
  cls: string;
  sub: string;
  text: string;
  done: boolean;
  dueDate?: string;
}

export interface SharedHw {
  sub: string;
  text: string;
  forDate: string;
}

const clean = (sub: string) => sub.replace('🔄 ', '').trim().toLowerCase();

// Своя домашка с датой «на завтра»; без даты — если предмет завтра есть в расписании.
// Домашка класса на завтра — если по этому предмету нет своей выполненной записи на завтра.
export function homeworkForTomorrow(
  personal: PersonalHw[],
  shared: SharedHw[],
  cls: string,
  tomorrowKey: string,
  tomorrowSubjects: string[]
): string[] {
  const subjects = new Set(tomorrowSubjects.filter((s) => s && s !== '—').map(clean));
  const mine = personal.filter((h) => h.cls === cls);
  const isTomorrow = (h: PersonalHw) => (h.dueDate ? h.dueDate === tomorrowKey : subjects.has(clean(h.sub)));
  const doneSubs = new Set(mine.filter((h) => h.done && isTomorrow(h)).map((h) => clean(h.sub)));
  const out = new Map<string, string>();
  mine.filter((h) => !h.done && isTomorrow(h)).forEach((h) => out.set(clean(h.sub), h.sub.replace('🔄 ', '')));
  shared
    .filter((h) => h.forDate === tomorrowKey && !doneSubs.has(clean(h.sub)))
    .forEach((h) => out.has(clean(h.sub)) || out.set(clean(h.sub), h.sub));
  return [...out.values()];
}

export function reminderText(subjects: string[]): { title: string; body: string } {
  const n = subjects.length;
  const word = n === 1 ? 'задание' : n < 5 ? 'задания' : 'заданий';
  return {
    title: `📘 На завтра не сделано ${n} ${word}`,
    body: subjects.slice(0, 5).join(', ') + (n > 5 ? ` и ещё ${n - 5}` : ''),
  };
}
