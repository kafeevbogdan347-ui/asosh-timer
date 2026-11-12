import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '../data/constants';
import { isNativeApp } from '../services/bellNotifications';

// Автоматическое обновление без скачивания файлов:
// Приложение проверяет version.json и само подтягивает свежую сборку в браузере, на ПК и в APK,
// после чего автоматически открывается окно «Что нового».
const REMOTE_BASE = 'https://kafeevbogdan347-ui.github.io/asosh-timer';
const REMOTE_VERSION_URL = `${REMOTE_BASE}/version.json`;
export const APK_URL = 'https://github.com/kafeevbogdan347-ui/asosh-timer/releases/download/apk-latest/asosh-timer.apk';

const TRIED_RELOAD_KEY = 'asosh_update_tried_reload';
const TRIED_HOTSWAP_KEY = 'asosh_update_tried_hotswap';

const isDesktopApp = () =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'app:' || /Electron/i.test(navigator.userAgent || ''));

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

async function clearWebCaches() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // ignore
  }
}

// Горячая подгрузка новой сборки напрямую с GitHub Pages (для APK и старых .exe без переустановки)
async function hotSwapFromRemote(targetVersion: string): Promise<boolean> {
  try {
    sessionStorage.setItem(TRIED_HOTSWAP_KEY, targetVersion);
  } catch {}

  try {
    const res = await fetch(`${REMOTE_BASE}/index.html?v=${encodeURIComponent(targetVersion)}&t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const html = await res.text();

    const toAbs = (rawPath: string) => {
      if (/^https?:\/\//i.test(rawPath)) return rawPath;
      const clean = rawPath.replace(/^\/asosh-timer\//, '/').replace(/^\.\//, '/');
      return `${REMOTE_BASE}${clean.startsWith('/') ? '' : '/'}${clean}`;
    };

    const cssMatches = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)];
    const jsMatch = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+\.js)["']/i);
    if (!jsMatch) return false;

    for (const m of cssMatches) {
      const cssUrl = toAbs(m[1]);
      await new Promise<void>((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${cssUrl}?v=${encodeURIComponent(targetVersion)}`;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
      });
    }

    const oldRoot = document.getElementById('root');
    if (oldRoot) {
      const freshRoot = document.createElement('div');
      freshRoot.id = 'root';
      freshRoot.className = oldRoot.className;
      oldRoot.replaceWith(freshRoot);
    }

    const jsUrl = `${toAbs(jsMatch[1])}?v=${encodeURIComponent(targetVersion)}`;
    await import(/* @vite-ignore */ jsUrl);
    return true;
  } catch {
    return false;
  }
}

export const UpdateRequired: React.FC = () => {
  const [updatingTo, setUpdatingTo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const checkAndAutoUpdate = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch(`${getVersionUrl()}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!alive || !version || !isNewer(version, APP_VERSION)) return;

        const alreadyTriedReload = sessionStorage.getItem(TRIED_RELOAD_KEY) === version;
        const alreadyTriedHotSwap = sessionStorage.getItem(TRIED_HOTSWAP_KEY) === version;

        // Если уже пробовали и перезагрузку, и горячую подгрузку в этой сессии — не зацикливаем
        if (alreadyTriedReload && alreadyTriedHotSwap) return;

        setUpdatingTo(version);
        await clearWebCaches();

        // В APK или если обычная перезагрузка уже была, но встроенный index.html остался старым —
        // подтягиваем свежие JS/CSS модули напрямую с сервера без скачивания установочного файла
        if (isNativeApp() || alreadyTriedReload) {
          if (!alreadyTriedHotSwap) {
            await hotSwapFromRemote(version);
          }
          if (alive) setUpdatingTo(null);
          return;
        }

        try {
          sessionStorage.setItem(TRIED_RELOAD_KEY, version);
        } catch {}

        setTimeout(() => {
          if (isDesktopApp()) {
            window.location.reload();
            return;
          }
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('v', version);
            window.location.replace(url.toString());
          } catch {
            window.location.reload();
          }
        }, 600);
      } catch {
        // нет интернета или сервер недоступен — проверим позже
      }
    };

    checkAndAutoUpdate();
    const timer = setInterval(checkAndAutoUpdate, 10 * 60 * 1000);
    const onVisible = () => document.visibilityState === 'visible' && checkAndAutoUpdate();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!updatingTo) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000000] bg-slate-900/95 border border-cyan-400/60 text-white px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-black">
      <span className="animate-spin text-sm">🔄</span>
      <span>Обновляем АСОШ Таймер до {updatingTo}...</span>
    </div>
  );
};
