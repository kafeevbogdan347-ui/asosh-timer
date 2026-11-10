import { normalizeCode } from '../utils/normalizeCode';
import { sha256Hex } from '../utils/sha256';
import { OFFICIAL_SCHEDULE_2026, SECOND_SHIFT_CLASSES } from './schoolSchedule';

// Реестр классов МОУ АСОШ №2
// Сами коды классов задаются в CLASS_CODES (.env или секрет на GitHub) и обновляются каждый год

export interface ClassCodeInfo {
  className: string;
  grade: number;
  letter: string;
  defaultShift: '1' | '2';
}

// Только классы, которые есть в официальном расписании; смена берётся оттуда же
export const CLASS_LIST: ClassCodeInfo[] = Object.keys(OFFICIAL_SCHEDULE_2026)
  .map((className) => ({
    className,
    grade: parseInt(className, 10),
    letter: className.replace(/^\d+/, ''),
    defaultShift: (SECOND_SHIFT_CLASSES.includes(className) ? '2' : '1') as '1' | '2',
  }))
  .sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter, 'ru'));

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

