/**
 * Утилиты для поддержки Android APK (MConvertor, Website 2 APK, Capacitor, WebView, PWA)
 * Обеспечивает аппаратную кнопку «Назад», Safe-Area Insets, виброотклик и оффлайн-режим.
 */

export interface ApkDiagnostics {
  isAndroid: boolean;
  isWebView: boolean;
  isStandalone: boolean;
  isMConvertor: boolean;
  hasVibrator: boolean;
  hasTouchScreen: boolean;
  screenResolution: string;
  userAgent: string;
}

/**
 * Определяет, запущено ли приложение на Android устройстве
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Определяет, запущено ли приложение внутри Android WebView / APK-оболочки (MConvertor, etc.)
 */
export function isWebViewOrApk(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  
  // Признаки WebView в Android
  const isWv = /wv|Version\/[\d.]+/i.test(ua) && /Android/i.test(ua);
  // Признаки MConvertor или специфичных конвертеров
  const isMConvertorUa = /MConvertor|Web2Apk|Website2APK|AppWrapper/i.test(ua);
  // Наличие инжектированных Android bridge-объектов
  const hasAndroidBridge = typeof (window as unknown as { Android?: unknown }).Android !== 'undefined' ||
    typeof (window as unknown as { mConvertor?: unknown }).mConvertor !== 'undefined';
  // PWA standalone режим (также используется многими TWA / APK конвертерами)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return isWv || isMConvertorUa || hasAndroidBridge || (isAndroidDevice() && isStandalone);
}

/**
 * Проверяет наличие специфичной сигнатуры MConvertor
 */
export function isMConvertorEnv(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /MConvertor/i.test(ua) || typeof (window as unknown as { mConvertor?: unknown }).mConvertor !== 'undefined';
}

/**
 * Получает диагностическую информацию об окружении APK
 */
export function getApkDiagnostics(): ApkDiagnostics {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isWebView: false,
      isStandalone: false,
      isMConvertor: false,
      hasVibrator: false,
      hasTouchScreen: false,
      screenResolution: 'unknown',
      userAgent: '',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = isAndroidDevice();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return {
    isAndroid,
    isWebView: isWebViewOrApk(),
    isStandalone,
    isMConvertor: isMConvertorEnv(),
    hasVibrator: typeof navigator.vibrate === 'function',
    hasTouchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    userAgent: ua,
  };
}

/**
 * Виброотклик для Android APK с безопасным fallback
 */
export function triggerAndroidVibrate(pattern: number | number[] = 30) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Игнорируем ошибки неподдерживаемых устройств
  }
}
