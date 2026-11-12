// Праздничное оформление: какой праздник сегодня и как его украсить.
// Даты — месяц-день, без года. День рождения ученик указывает в профиле, хранится только на телефоне.

export type HolidayEffect = 'snow' | 'salute' | 'petals' | 'stars' | 'leaves' | 'confetti';

export interface Holiday {
  id: string;
  title: string; // приветствие на баннере
  sub?: string; // вторая строка
  icon: string;
  effect: HolidayEffect;
  garland?: boolean; // гирлянда сверху (Новый год)
}

const BIRTHDAY_KEY = 'asosh_birthday'; // «ММ-ДД»

export function getBirthday(): string {
  try {
    return localStorage.getItem(BIRTHDAY_KEY) || '';
  } catch {
    return '';
  }
}

export function setBirthday(md: string): void {
  try {
    if (md) localStorage.setItem(BIRTHDAY_KEY, md);
    else localStorage.removeItem(BIRTHDAY_KEY);
  } catch {
    // нет места — день рождения просто не запомнится
  }
}

const md = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function holidayById(id: string, name = ''): Holiday | null {
  switch (id) {
    case 'newyear':
      return { id, title: 'С Новым годом!', sub: 'Пусть год будет на пятёрку', icon: '🎄', effect: 'snow', garland: true };
    case 'newyear-soon':
      return { id, title: 'Скоро Новый год!', sub: '', icon: '🎄', effect: 'snow', garland: true };
    case 'feb23':
      return { id, title: 'С Днём защитника Отечества!', icon: '⭐', effect: 'stars' };
    case 'mar8':
      return { id, title: 'С 8 Марта!', sub: 'Весны, улыбок и хороших оценок', icon: '🌷', effect: 'petals' };
    case 'may9':
      return { id, title: 'С Днём Победы!', sub: 'Помним и гордимся', icon: '🎆', effect: 'salute' };
    case 'may1':
      return { id, title: 'С праздником Весны и Труда!', icon: '🌸', effect: 'petals' };
    case 'sep1':
      return { id, title: 'С Днём знаний!', sub: 'Удачного учебного года', icon: '🍁', effect: 'leaves' };
    case 'teacher':
      return { id, title: 'С Днём учителя!', sub: 'Спасибо нашим учителям', icon: '💐', effect: 'petals' };
    case 'nov4':
      return { id, title: 'С Днём народного единства!', icon: '⭐', effect: 'stars' };
    case 'lastbell':
      return { id, title: 'Последний звонок!', sub: 'Удачи выпускникам', icon: '🔔', effect: 'confetti' };
    case 'birthday':
      return { id, title: name ? `С днём рождения, ${name}!` : 'С днём рождения!', sub: 'Асошик и вся школа поздравляют', icon: '🎂', effect: 'confetti' };
    default:
      return null;
  }
}

// Какой праздник сейчас. День рождения важнее всего остального.
export function activeHoliday(date: Date, name = ''): Holiday | null {
  const today = md(date);
  const bday = getBirthday();
  if (bday && bday === today) return holidayById('birthday', name);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 12 && d >= 31) || (m === 1 && d <= 8)) return holidayById('newyear');
  if (m === 12 && d >= 20) {
    const left = 31 - d + 1;
    const h = holidayById('newyear-soon')!;
    return { ...h, sub: `Осталось ${left} ${left === 1 ? 'день' : left < 5 ? 'дня' : 'дней'}` };
  }
  const fixed: Record<string, string> = {
    '02-23': 'feb23',
    '03-08': 'mar8',
    '05-01': 'may1',
    '05-09': 'may9',
    '05-25': 'lastbell',
    '09-01': 'sep1',
    '10-05': 'teacher',
    '11-04': 'nov4',
  };
  return fixed[today] ? holidayById(fixed[today]) : null;
}

