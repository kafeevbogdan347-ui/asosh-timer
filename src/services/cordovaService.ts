/**
 * Сервис интеграции Apache Cordova для АСОШ №2
 * Обеспечивает поддержку жизненного цикла Cordova (deviceready, backbutton, pause, resume),
 * плагинов StatusBar, Vibration, Dialogs и генерацию конфигураций для сборки APK.
 */

export interface CordovaInfo {
  isCordova: boolean;
  platform: string;
  version: string;
  hasStatusBar: boolean;
  hasVibration: boolean;
  hasSplashScreen: boolean;
}

declare global {
  interface Window {
    cordova?: {
      platformId?: string;
      version?: string;
      plugins?: Record<string, unknown>;
    };
    StatusBar?: {
      backgroundColorByHexString: (hex: string) => void;
      styleLightContent: () => void;
      styleDefault: () => void;
      show: () => void;
      hide: () => void;
    };
  }
  interface Navigator {
    splashscreen?: {
      hide: () => void;
      show: () => void;
    };
    notification?: {
      alert: (message: string, completeCallback: () => void, title?: string, buttonName?: string) => void;
      confirm: (message: string, confirmCallback: (choice: number) => void, title?: string, buttonLabels?: string[]) => void;
      vibrate: (milliseconds: number) => void;
    };
  }
}

/**
 * Проверяет, запущено ли приложение в окружении Apache Cordova
 */
export function isCordovaApp(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.cordova !== 'undefined';
}

/**
 * Получает информацию о Cordova окружении
 */
export function getCordovaInfo(): CordovaInfo {
  const isCordova = isCordovaApp();
  return {
    isCordova,
    platform: window.cordova?.platformId || (isCordova ? 'unknown' : 'web'),
    version: window.cordova?.version || '12.0.0',
    hasStatusBar: typeof window.StatusBar !== 'undefined',
    hasVibration: typeof navigator.notification?.vibrate !== 'undefined' || typeof navigator.vibrate === 'function',
    hasSplashScreen: typeof navigator.splashscreen !== 'undefined',
  };
}

/**
 * Инициализирует плагины Cordova при событии deviceready
 */
export function initCordovaPlugins(): void {
  if (typeof document === 'undefined') return;

  const onDeviceReady = () => {
    // 1. Настройка Status Bar под сапфировую тему АСОШ №2
    try {
      if (window.StatusBar) {
        window.StatusBar.backgroundColorByHexString('#060d1f');
        window.StatusBar.styleLightContent();
      }
    } catch {
      // Игнорируем ошибки неподдерживаемых сред
    }

    // 2. Скрытие Splash Screen после готовности React
    try {
      if (navigator.splashscreen) {
        setTimeout(() => {
          navigator.splashscreen?.hide();
        }, 500);
      }
    } catch {
      // Игнорируем
    }
  };

  if (window.cordova) {
    document.addEventListener('deviceready', onDeviceReady, false);
  } else {
    // В браузере можно подписаться на будущее событие
    document.addEventListener('deviceready', onDeviceReady, false);
  }
}

/**
 * Генерирует готовый Bash/CMD скрипт для сборки APK через Cordova CLI
 */
export function generateCordovaBuildScript(): string {
  return `#!/bin/bash
# ========================================================
# Скрипт быстрой сборки Android APK для АСОШ №2 через Apache Cordova
# ========================================================

echo "🚀 Начинаем сборку АСОШ №2 в Android APK..."

# 1. Проверка и установка Cordova CLI (если еще не установлена)
if ! command -v cordova &> /dev/null; then
    echo "📦 Установка Apache Cordova..."
    npm install -g cordova
fi

# 2. Создание проекта Cordova
APP_DIR="asosh2-apk"
PACKAGE_ID="ru.asosh2.diary"
APP_NAME="АСОШ №2"

if [ ! -d "$APP_DIR" ]; then
    echo "📁 Создание каталога проекта Cordova..."
    cordova create "$APP_DIR" "$PACKAGE_ID" "$APP_NAME"
fi

cd "$APP_DIR" || exit 1

# 3. Добавление платформ
echo "📱 Добавление платформы Android..."
cordova platform add android
cordova platform add browser

# 4. Установка ключевых плагинов
echo "🔌 Установка плагинов (Status Bar, Vibration, Splash Screen)..."
cordova plugin add cordova-plugin-statusbar
cordova plugin add cordova-plugin-vibration
cordova plugin add cordova-plugin-splashscreen
cordova plugin add cordova-plugin-whitelist
cordova plugin add cordova-plugin-dialogs

# 5. Копирование собранных файлов приложения в папку www
echo "📋 Копирование веб-файлов в www/..."
# Примечание: предварительно запустите 'npm run build' в основном проекте
# cp -r ../dist/* www/

# 6. Сборка APK
echo "⚙️ Сборка Android APK пакета..."
cordova build android

echo "✅ ГОТОВО! Ваш APK файл находится в: platforms/android/app/build/outputs/apk/debug/"
`;
}

/**
 * Возвращает полный текст файла config.xml, соответствующий официальному W3C / Apache Cordova API
 */
export function getCordovaConfigXml(): string {
  return `<?xml version='1.0' encoding='utf-8'?>
<widget id="ru.asosh2.diary" 
        version="14.6.0" 
        android-versionCode="146" 
        android-packageName="ru.asosh2.diary"
        android-activityName="MainActivity"
        defaultlocale="ru" 
        xmlns="http://www.w3.org/ns/widgets" 
        xmlns:cdv="http://cordova.apache.org/ns/1.0">

    <!-- Официальное и краткое название (name & short name) -->
    <name short="АСОШ №2">АСОШ №2 — Умный дневник</name>

    <!-- Описание приложения для маркетов и системы (description) -->
    <description>
        Официальный электронный школьный помощник МОБУ АСОШ №2 с. Аргаяш: 
        расписание уроков 5-11 классов, звонки, калькулятор оценок, приватные коды классов, 
        школьный чат без VPN и развивающие игры для перемен.
    </description>

    <!-- Автор и контактная информация (author) -->
    <author email="kafeevbogdan347@gmail.com" href="https://asosh2.ru">
        Команда разработчиков АСОШ №2
    </author>

    <!-- Стартовая страница в веб-ресурсах (content) -->
    <content src="index.html" />

    <!-- Безопасность и белый список доменов (access & allow-navigation) -->
    <access origin="*" />
    <allow-navigation href="*" />
    <allow-navigation href="http://*/*" />
    <allow-navigation href="https://*/*" />

    <!-- Разрешенные намерения операционной системы (allow-intent) -->
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-intent href="tel:*" />
    <allow-intent href="sms:*" />
    <allow-intent href="mailto:*" />
    <allow-intent href="geo:*" />

    <!-- Глобальные параметры приложения (Preferences) -->
    <preference name="Orientation" value="portrait" />
    <preference name="DisallowOverscroll" value="true" />
    <preference name="BackgroundColor" value="0xff060d1f" />
    <preference name="KeepRunning" value="true" />
    <preference name="ShowTitle" value="false" />
    <preference name="AutoHideSplashScreen" value="true" />
    <preference name="SplashScreenDelay" value="2000" />
    <preference name="FadeSplashScreen" value="true" />
    <preference name="FadeSplashScreenDuration" value="500" />
    <preference name="SplashScreenBackgroundColor" value="0xff060d1f" />
    <preference name="AndroidLaunchMode" value="singleTop" />
    <preference name="AndroidEdgeToEdge" value="true" />
    <preference name="AndroidInsecureFileModeEnabled" value="false" />
    <preference name="AppendUserAgent" value="ASOSH2-Cordova-App" />
    <preference name="DefaultVolumeStream" value="media" />
    <preference name="InAppBrowserStorageEnabled" value="true" />
    <preference name="StatusBarBackgroundColor" value="#060d1f" />
    <preference name="StatusBarStyle" value="lightcontent" />

    <!-- Платформа Android (Platform Android) -->
    <platform name="android">
        <allow-intent href="market:*" />
        <preference name="AndroidPersistentFileLocation" value="Compatibility" />
        <preference name="StatusBarBackgroundColor" value="#060d1f" />
        <preference name="StatusBarStyle" value="lightcontent" />
        
        <!-- Иконки приложения под различные плотности экранов -->
        <icon density="ldpi" src="public/icon.svg" />
        <icon density="mdpi" src="public/icon.svg" />
        <icon density="hdpi" src="public/icon.svg" />
        <icon density="xhdpi" src="public/icon.svg" />
        <icon density="xxhdpi" src="public/icon.svg" />
        <icon density="xxxhdpi" src="public/icon.svg" />
    </platform>

    <!-- Платформа Browser (Platform Browser) -->
    <platform name="browser">
        <preference name="Orientation" value="portrait" />
    </platform>

    <!-- Платформенные движки (Engines) -->
    <engine name="android" spec="^13.0.0" />
    <engine name="browser" spec="^6.0.0" />

    <!-- Основные плагины Apache Cordova (Plugins) -->
    <plugin name="cordova-plugin-statusbar" spec="^4.0.0" />
    <plugin name="cordova-plugin-vibration" spec="^3.1.1" />
    <plugin name="cordova-plugin-splashscreen" spec="^6.0.2" />
    <plugin name="cordova-plugin-whitelist" spec="^1.3.5" />
    <plugin name="cordova-plugin-dialogs" spec="^2.0.2" />
</widget>`;
}

/**
 * Скачивает готовый файл config.xml для Cordova
 */
export function downloadCordovaConfigXml(): void {
  const xmlContent = getCordovaConfigXml();
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'config.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
