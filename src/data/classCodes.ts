// Реестр классов МОУ АСОШ №2
// Сами коды классов приватные: они хранятся только на сервере (CLASS_CODES в .env)
// и проверяются через /api/class/verify-code

export interface ClassCodeInfo {
  className: string;
  grade: number;
  letter: string;
  defaultShift: '1' | '2';
}

export const CLASS_LIST: ClassCodeInfo[] = [
  // 5 КЛАССЫ
  { className: '5А', grade: 5, letter: 'А', defaultShift: '1' },
  { className: '5Б', grade: 5, letter: 'Б', defaultShift: '1' },
  { className: '5В', grade: 5, letter: 'В', defaultShift: '1' },
  { className: '5Г', grade: 5, letter: 'Г', defaultShift: '1' },

  // 6 КЛАССЫ
  { className: '6А', grade: 6, letter: 'А', defaultShift: '2' },
  { className: '6Б', grade: 6, letter: 'Б', defaultShift: '2' },
  { className: '6В', grade: 6, letter: 'В', defaultShift: '2' },
  { className: '6Г', grade: 6, letter: 'Г', defaultShift: '2' },

  // 7 КЛАССЫ
  { className: '7А', grade: 7, letter: 'А', defaultShift: '1' },
  { className: '7Б', grade: 7, letter: 'Б', defaultShift: '1' },
  { className: '7В', grade: 7, letter: 'В', defaultShift: '1' },
  { className: '7Г', grade: 7, letter: 'Г', defaultShift: '1' },

  // 8 КЛАССЫ
  { className: '8А', grade: 8, letter: 'А', defaultShift: '1' },
  { className: '8Б', grade: 8, letter: 'Б', defaultShift: '1' },
  { className: '8В', grade: 8, letter: 'В', defaultShift: '1' },
  { className: '8Г', grade: 8, letter: 'Г', defaultShift: '1' },

  // 9 КЛАССЫ
  { className: '9А', grade: 9, letter: 'А', defaultShift: '1' },
  { className: '9Б', grade: 9, letter: 'Б', defaultShift: '1' },
  { className: '9В', grade: 9, letter: 'В', defaultShift: '1' },
  { className: '9Г', grade: 9, letter: 'Г', defaultShift: '1' },

  // 10 КЛАССЫ
  { className: '10А', grade: 10, letter: 'А', defaultShift: '1' },
  { className: '10Б', grade: 10, letter: 'Б', defaultShift: '1' },
  { className: '10В', grade: 10, letter: 'В', defaultShift: '1' },
  { className: '10Г', grade: 10, letter: 'Г', defaultShift: '1' },

  // 11 КЛАССЫ
  { className: '11А', grade: 11, letter: 'А', defaultShift: '1' },
  { className: '11Б', grade: 11, letter: 'Б', defaultShift: '1' },
  { className: '11В', grade: 11, letter: 'В', defaultShift: '1' },
  { className: '11Г', grade: 11, letter: 'Г', defaultShift: '1' },
];

// Нормализация кода для удобного ввода (поддерживает русский/латиницу, без дефиса, пробелов и в любом регистре)
export function normalizeCode(input: string): string {
  return (input || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_–—]/g, '')
    // Латинские буквы похожие на русские
    .replace(/A/g, 'А')
    .replace(/B/g, 'Б')
    .replace(/V/g, 'В')
    .replace(/G/g, 'Г');
}

export type ClassCodeCheck =
  | { status: 'ok'; info: ClassCodeInfo }
  | { status: 'wrong' }
  | { status: 'locked'; lockedSec: number }
  | { status: 'error' };

// Проверка приватного кода на сервере. Возвращает класс, к которому подходит код
export async function checkClassCode(input: string): Promise<ClassCodeCheck> {
  if (!input.trim()) return { status: 'wrong' };
  try {
    const res = await fetch('/api/class/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: input }),
    });
    const data = await res.json();
    if (res.status === 429) return { status: 'locked', lockedSec: data.lockedSec || 60 };
    if (!data.ok) return { status: 'wrong' };
    const norm = normalizeCode(data.className);
    const info = CLASS_LIST.find((item) => normalizeCode(item.className) === norm);
    return info ? { status: 'ok', info } : { status: 'wrong' };
  } catch {
    return { status: 'error' };
  }
}

// Хранилище разблокированных классов на устройстве
const STORAGE_KEY_UNLOCKED = 'asosh_unlocked_classes_v13';

export function getUnlockedClasses(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function isClassUnlocked(className: string): boolean {
  const unlocked = getUnlockedClasses();
  return unlocked.includes(className);
}

export function saveClassUnlocked(className: string): void {
  try {
    const unlocked = getUnlockedClasses();
    if (!unlocked.includes(className)) {
      unlocked.push(className);
      localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(unlocked));
    }
  } catch {
    // ignore
  }
}

