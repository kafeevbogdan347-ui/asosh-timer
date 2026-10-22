import { normalizeCode } from '../utils/normalizeCode';
import { sha256Hex } from '../utils/sha256';

// Реестр классов МОУ АСОШ №2
// Сами коды классов задаются в CLASS_CODES (.env или секрет на GitHub) и обновляются каждый год

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

export { normalizeCode };

export type ClassCodeCheck =
  | { status: 'ok'; info: ClassCodeInfo }
  | { status: 'wrong' }
  | { status: 'locked'; lockedSec: number }
  | { status: 'error' };

// Проверка кода класса. Коды задаются в CLASS_CODES при сборке и попадают в приложение
// только в виде SHA-256-отпечатков (__CLASS_CODE_HASHES__), открытым текстом их здесь нет
export async function checkClassCode(input: string): Promise<ClassCodeCheck> {
  const norm = normalizeCode(input);
  if (!norm) return { status: 'wrong' };
  try {
    const hash = await sha256Hex(norm);
    const match = __CLASS_CODE_HASHES__.find((item) => item.hash === hash);
    if (!match) return { status: 'wrong' };
    const info = CLASS_LIST.find((item) => normalizeCode(item.className) === normalizeCode(match.className));
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

