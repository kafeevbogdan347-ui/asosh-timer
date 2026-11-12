// Служба конфиденциальности и безопасности МОУ АСОШ №2
// Защита персональных данных (152-ФЗ РФ), PIN-код, Анти-Шпион, Защита от перебора кодов

import { sha256Hex } from './sha256';
import { pbkdf2Hex } from './pbkdf2';

// Страница политики конфиденциальности на сайте приложения
export const PRIVACY_POLICY_URL = 'https://kafeevbogdan347-ui.github.io/asosh-timer-site/privacy.html';

const PIN_STORAGE_KEY = 'asosh_privacy_pin_v1';
const PIN_ENABLED_KEY = 'asosh_privacy_pin_enabled';
const PRIVACY_BLUR_KEY = 'asosh_privacy_blur_mode';
const AUTO_BLUR_KEY = 'asosh_privacy_auto_blur_hidden';
const HIDE_GRADES_KEY = 'asosh_privacy_hide_grades';
const CLASS_CODE_FAILS_KEY = 'asosh_code_fail_attempts';
const CLASS_CODE_LOCK_UNTIL_KEY = 'asosh_code_lock_until';

// ==========================================
// 1. PIN-КОД (APP LOCK)
// ==========================================

export function getStoredPin(): string | null {
  return localStorage.getItem(PIN_STORAGE_KEY);
}

export function isPinEnabled(): boolean {
  return localStorage.getItem(PIN_ENABLED_KEY) === 'true' && !!getStoredPin();
}

// PIN хранится только как отпечаток: «h1:<sha256 от соли и PIN>». Старые записи с открытым PIN
// переводятся в отпечаток при первом верном вводе.
const PIN_SALT = 'asosh-pin-v1:';
const pinHash = async (pin: string) => `h1:${await sha256Hex(PIN_SALT + pin)}`;

export async function savePin(pin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) return false;
  localStorage.setItem(PIN_STORAGE_KEY, await pinHash(pin));
  localStorage.setItem(PIN_ENABLED_KEY, 'true');
  return true;
}

export function disablePin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.setItem(PIN_ENABLED_KEY, 'false');
}

export async function verifyPin(enteredPin: string): Promise<boolean> {
  const current = getStoredPin();
  if (!current) return true;
  if (current.startsWith('h1:')) return current === (await pinHash(enteredPin));
  // Старый формат (открытый текст): проверяем и сразу заменяем отпечатком
  if (current !== enteredPin) return false;
  localStorage.setItem(PIN_STORAGE_KEY, await pinHash(enteredPin));
  return true;
}

// Блокировка после трёх неверных PIN: хранится на устройстве, перезапуск её не сбрасывает
const PIN_FAILS_KEY = 'asosh_pin_fails';
const PIN_LOCK_UNTIL_KEY = 'asosh_pin_lock_until';

export function pinLockRemainingSec(): number {
  const until = Number(localStorage.getItem(PIN_LOCK_UNTIL_KEY) || '0');
  return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
}

// Возвращает число неверных попыток подряд; на третьей включает блокировку на 30 секунд
export function recordPinFail(): number {
  const fails = Number(localStorage.getItem(PIN_FAILS_KEY) || '0') + 1;
  if (fails >= 3) {
    localStorage.setItem(PIN_LOCK_UNTIL_KEY, String(Date.now() + 30_000));
    localStorage.setItem(PIN_FAILS_KEY, '0');
  } else {
    localStorage.setItem(PIN_FAILS_KEY, String(fails));
  }
  return fails;
}

export function resetPinFails(): void {
  localStorage.removeItem(PIN_FAILS_KEY);
  localStorage.removeItem(PIN_LOCK_UNTIL_KEY);
}

// ==========================================
// 2. РЕЖИМ «АНТИ-ШПИОН» (РАЗМЫТИЕ И СКРЫТИЕ)
// ==========================================

export function isPrivacyBlurActive(): boolean {
  return localStorage.getItem(PRIVACY_BLUR_KEY) === 'true';
}

export function setPrivacyBlurActive(enabled: boolean): void {
  localStorage.setItem(PRIVACY_BLUR_KEY, enabled ? 'true' : 'false');
  if (enabled) {
    document.documentElement.classList.add('privacy-blur-active');
  } else {
    document.documentElement.classList.remove('privacy-blur-active');
  }
}

export function isAutoBlurOnWindowBlur(): boolean {
  const val = localStorage.getItem(AUTO_BLUR_KEY);
  return val === null ? true : val === 'true'; // По умолчанию включено для безопасности
}

export function setAutoBlurOnWindowBlur(enabled: boolean): void {
  localStorage.setItem(AUTO_BLUR_KEY, enabled ? 'true' : 'false');
}

export function isHideGradesInProfile(): boolean {
  return localStorage.getItem(HIDE_GRADES_KEY) === 'true';
}

export function setHideGradesInProfile(enabled: boolean): void {
  localStorage.setItem(HIDE_GRADES_KEY, enabled ? 'true' : 'false');
}

// ==========================================
// 3. ЗАЩИТА ОТ ПОДБОРА КОДОВ КЛАССОВ (RATE LIMIT)
// ==========================================

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 секунд

export function checkClassCodeLockout(): { locked: boolean; remainingSec: number } {
  try {
    const lockUntilStr = localStorage.getItem(CLASS_CODE_LOCK_UNTIL_KEY);
    if (lockUntilStr) {
      const lockUntil = Number(lockUntilStr);
      const now = Date.now();
      if (now < lockUntil) {
        return {
          locked: true,
          remainingSec: Math.max(1, Math.ceil((lockUntil - now) / 1000)),
        };
      } else {
        localStorage.removeItem(CLASS_CODE_LOCK_UNTIL_KEY);
        localStorage.removeItem(CLASS_CODE_FAILS_KEY);
      }
    }
  } catch {
    // Ignore storage issues
  }
  return { locked: false, remainingSec: 0 };
}

export function recordFailedClassCodeAttempt(): { locked: boolean; remainingSec: number } {
  try {
    const currentFails = Number(localStorage.getItem(CLASS_CODE_FAILS_KEY) || '0') + 1;

    if (currentFails >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(CLASS_CODE_LOCK_UNTIL_KEY, String(lockUntil));
      localStorage.setItem(CLASS_CODE_FAILS_KEY, '0');
      return { locked: true, remainingSec: 30 };
    } else {
      localStorage.setItem(CLASS_CODE_FAILS_KEY, String(currentFails));
    }
  } catch {
    // Ignore
  }
  return { locked: false, remainingSec: 0 };
}

export function resetFailedClassCodeAttempts(): void {
  try {
    localStorage.removeItem(CLASS_CODE_FAILS_KEY);
    localStorage.removeItem(CLASS_CODE_LOCK_UNTIL_KEY);
  } catch {
    // Ignore
  }
}

// ==========================================
// 4. ЭКСТРЕННАЯ ОЧИСТНАЯ КОНФИДЕНЦИАЛЬНЫХ ДАННЫХ
// ==========================================

// Ключи с данными, которые приложение само восстановит из сети или которые не жалко потерять:
// переписка с Асошиком, сохранённые копии чатов, оценок, замен, ДЗ класса и объявлений
const isCacheKey = (key: string) =>
  key === 'asosh_assistant_history' ||
  key === 'asosh_board_cache' ||
  key.startsWith('asosh_chat_cache_') ||
  key.startsWith('asosh_grades_cache_') ||
  key.startsWith('asosh_asosh_class_');

function removeKeys(match: (key: string) => boolean): number {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && match(k)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  return keys.length;
}

// «Очистить кэш»: ДЗ, оценки в калькуляторе, класс и настройки остаются
export function clearCaches(): number {
  return removeKeys(isCacheKey);
}

// «Очистить личные заметки»: кэш + личные записи (свои события календаря, портфолио, профиль чата)
export function wipeConfidentialData(): void {
  removeKeys(isCacheKey);
  ['asosh_calendar_events', 'asosh_portfolio_items', 'asosh_chat_username', 'asosh_chat_avatar', 'asosh_user_profile_v1'].forEach((key) =>
    localStorage.removeItem(key)
  );
}

// ==========================================
// 5. ПАРОЛЬ ПАНЕЛИ РАЗРАБОТЧИКА (DEV SUITE SECURITY)
// ==========================================

const DEV_FAILS_KEY = 'asosh_dev_fails_v1';
const DEV_LOCK_UNTIL_KEY = 'asosh_dev_lock_until_v1';
const MAX_DEV_FAILS = 4;
const DEV_LOCK_DURATION_MS = 30 * 1000; // 30 секунд блокировки при переборе

export function checkDevLockout(): { locked: boolean; remainingSec: number } {
  try {
    const lockUntilStr = localStorage.getItem(DEV_LOCK_UNTIL_KEY);
    if (lockUntilStr) {
      const lockUntil = Number(lockUntilStr);
      const now = Date.now();
      if (lockUntil > now) {
        return {
          locked: true,
          remainingSec: Math.ceil((lockUntil - now) / 1000),
        };
      } else {
        localStorage.removeItem(DEV_LOCK_UNTIL_KEY);
        localStorage.removeItem(DEV_FAILS_KEY);
      }
    }
  } catch {
    // Ignore
  }
  return { locked: false, remainingSec: 0 };
}

export function recordFailedDevAttempt(): { locked: boolean; remainingSec: number } {
  try {
    const currentFails = Number(localStorage.getItem(DEV_FAILS_KEY) || '0') + 1;

    if (currentFails >= MAX_DEV_FAILS) {
      const lockUntil = Date.now() + DEV_LOCK_DURATION_MS;
      localStorage.setItem(DEV_LOCK_UNTIL_KEY, String(lockUntil));
      localStorage.setItem(DEV_FAILS_KEY, '0');
      return { locked: true, remainingSec: 30 };
    } else {
      localStorage.setItem(DEV_FAILS_KEY, String(currentFails));
    }
  } catch {
    // Ignore
  }
  return { locked: false, remainingSec: 0 };
}

export function resetFailedDevAttempts(): void {
  try {
    localStorage.removeItem(DEV_FAILS_KEY);
    localStorage.removeItem(DEV_LOCK_UNTIL_KEY);
  } catch {
    // Ignore
  }
}

// Пароль разработчика задаётся в DEV_PASSWORD при сборке и хранится в приложении
// только как медленный отпечаток PBKDF2 (__DEV_PASSWORD_HASH__)
export async function verifyDevPassword(input: string): Promise<boolean> {
  const password = input.trim();
  if (!password || !__DEV_PASSWORD_HASH__) return false;
  try {
    return (await pbkdf2Hex(password, __KDF__.salt, __KDF__.iter)) === __DEV_PASSWORD_HASH__;
  } catch {
    return false;
  }
}

