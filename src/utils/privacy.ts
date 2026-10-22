// Служба конфиденциальности и безопасности МОУ АСОШ №2
// Защита персональных данных (152-ФЗ РФ), PIN-код, Анти-Шпион, Защита от перебора кодов

import { sha256Hex } from './sha256';

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

export function savePin(pin: string): boolean {
  if (/^\d{4}$/.test(pin)) {
    localStorage.setItem(PIN_STORAGE_KEY, pin);
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    return true;
  }
  return false;
}

export function disablePin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.setItem(PIN_ENABLED_KEY, 'false');
}

export function verifyPin(enteredPin: string): boolean {
  const current = getStoredPin();
  if (!current) return true;
  return current === enteredPin;
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
    localStorage.setItem(CLASS_CODE_FAILS_KEY, String(currentFails));

    if (currentFails >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(CLASS_CODE_LOCK_UNTIL_KEY, String(lockUntil));
      return { locked: true, remainingSec: 30 };
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
// 4. ЭКСТРЕННАЯ ОЧИСТКА КОНФИДЕНЦИАЛЬНЫХ ДАННЫХ
// ==========================================

export function wipeConfidentialData(): void {
  // Очистка переписки, персональных заметок и профиля
  const keysToClear = [
    'asosh_chat_history',
    'asosh_profile_v1',
    'studentName',
    'parentName',
    'asosh_hw_pinned',
    'asosh_custom_notes',
  ];

  keysToClear.forEach((key) => localStorage.removeItem(key));
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
    const lockUntil = Number(localStorage.getItem(DEV_LOCK_UNTIL_KEY) || '0');
    const now = Date.now();
    if (lockUntil > now) {
      return {
        locked: true,
        remainingSec: Math.ceil((lockUntil - now) / 1000),
      };
    }
  } catch {
    // Ignore
  }
  return { locked: false, remainingSec: 0 };
}

export function recordFailedDevAttempt(): { locked: boolean; remainingSec: number } {
  try {
    const currentFails = Number(localStorage.getItem(DEV_FAILS_KEY) || '0') + 1;
    localStorage.setItem(DEV_FAILS_KEY, String(currentFails));

    if (currentFails >= MAX_DEV_FAILS) {
      const lockUntil = Date.now() + DEV_LOCK_DURATION_MS;
      localStorage.setItem(DEV_LOCK_UNTIL_KEY, String(lockUntil));
      return { locked: true, remainingSec: 30 };
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
// только как SHA-256-отпечаток (__DEV_PASSWORD_HASH__)
export async function verifyDevPassword(input: string): Promise<boolean> {
  const password = input.trim();
  if (!password || !__DEV_PASSWORD_HASH__) return false;
  try {
    return (await sha256Hex(password)) === __DEV_PASSWORD_HASH__;
  } catch {
    return false;
  }
}

