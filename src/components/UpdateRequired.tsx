import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '../data/constants';
import { isNativeApp } from '../services/bellNotifications';

// Проверка обновлений: сайт публикует version.json, приложение сравнивает со своей версией.
// Если вышла новая — большое окно «ОБНОВИТЕ ДО ПОСЛЕДНЕЙ ВЕРСИИ».
const REMOTE_VERSION_URL = 'https://kafeevbogdan347-ui.github.io/asosh-timer/version.json';
export const APK_URL = 'https://github.com/kafeevbogdan347-ui/asosh-timer/releases/download/apk-latest/asosh-timer.apk';
const WIN_URL = 'https://github.com/kafeevbogdan347-ui/asosh-timer/releases/download/desktop-latest/asosh-timer-win-x64.exe';
const MAC_URL = 'https://github.com/kafeevbogdan347-ui/asosh-timer/releases/download/desktop-latest/asosh-timer-mac-arm64.dmg';
const LINUX_URL = 'https://github.com/kafeevbogdan347-ui/asosh-timer/releases/download/desktop-latest/asosh-timer-linux-x86_64.AppImage';

const TRIED_UPDATE_KEY = 'asosh_update_tried_version';

const isDesktopApp = () =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'app:' || /Electron/i.test(navigator.userAgent || ''));

const getDesktopDownloadUrl = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/Mac/i.test(ua)) return MAC_URL;
  if (/Linux/i.test(ua)) return LINUX_URL;
  return WIN_URL;
};

// На дев-сервере и превью проверяем свой собственный version.json, а в APK/EXE и на github.io — боевой сервер
const getVersionUrl = () => {
  if (typeof window === 'undefined') return REMOTE_VERSION_URL;
  if (isNativeApp() || isDesktopApp() || window.location.hostname.endsWith('github.io')) {
    return REMOTE_VERSION_URL;
  }
  return `${import.meta.env.BASE_URL || '/'}version.json`;
};

// «v16.1» → [16, 1]
const parts = (v: string) => v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
export function isNewer(remote: string, local: string): boolean {
  const a = parts(remote);
  const b = parts(local);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

export const UpdateRequired: React.FC = () => {
  const [latest, setLatest] = useState<string | null>(null);
  const [later, setLater] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch(`${getVersionUrl()}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!alive || !version || !isNewer(version, APP_VERSION)) return;
        // Если пользователь уже нажал «Обновить» для этой версии в текущей сессии,
        // но сервер/CDN или старый EXE ещё отдаёт прежнюю сборку — не зацикливаем окно
        try {
          if (sessionStorage.getItem(TRIED_UPDATE_KEY) === version) return;
        } catch {}
        setLatest(version);
      } catch {
        // нет интернета или сайт недоступен — проверим в следующий раз
      }
    };
    check();
    const timer = setInterval(check, 30 * 60 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!latest || later) return null;
  const native = isNativeApp();
  const desktop = isDesktopApp();

  const handleWebOrDesktopReload = async () => {
    try {
      sessionStorage.setItem(TRIED_UPDATE_KEY, latest);
    } catch {}
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    if (desktop) {
      window.location.reload();
      return;
    }
    // Добавляем параметр версии к адресу, чтобы обойти 10-минутный кэш GitHub Pages CDN для index.html
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('v', latest);
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl border-2 border-rose-400/60 bg-slate-900 p-5 text-center space-y-4 shadow-2xl">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-2xl font-black text-rose-300 leading-tight">ОБНОВИТЕ ДО ПОСЛЕДНЕЙ ВЕРСИИ</h2>
        <p className="text-sm text-white/80">
          У тебя {APP_VERSION}, а уже вышла <b className="text-cyan-300">{latest}</b>. В старой версии могут быть ошибки в расписании и таймере.
        </p>
        {native ? (
          <a href={APK_URL} target="_blank" rel="noopener noreferrer" className="btn green w-full block py-3 font-black text-base">
            ⬇️ Скачать новую версию
          </a>
        ) : desktop ? (
          <div className="space-y-2">
            <a
              href={getDesktopDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setLater(true)}
              className="btn green w-full block py-3 font-black text-base"
            >
              ⬇️ Скачать обновление для ПК
            </a>
            <button
              type="button"
              onClick={handleWebOrDesktopReload}
              className="btn darkBtn w-full py-2.5 font-bold text-xs cursor-pointer"
            >
              🔄 Обновить без переустановки
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleWebOrDesktopReload}
            className="btn green w-full py-3 font-black text-base cursor-pointer"
          >
            🔄 Обновить
          </button>
        )}
        {(native || desktop) && (
          <p className="text-[11px] text-white/55">
            Скачай файл и открой его — новая версия установится поверх, все данные сохранятся.
          </p>
        )}
        <button type="button" onClick={() => setLater(true)} className="text-xs text-white/50 underline underline-offset-2 cursor-pointer">
          Напомнить позже
        </button>
      </div>
    </div>
  );
};
