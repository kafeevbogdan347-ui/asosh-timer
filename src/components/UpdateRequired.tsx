import React, { useCallback, useEffect, useState } from 'react';
import { APP_VERSION } from '../data/constants';
import { isNativeApp } from '../services/bellNotifications';
import { ScreenId } from '../types';

// Ручное обновление: приложение больше не перезагружается автоматически.
// Когда выходит новая версия, оно лишь показывает красную плашку сверху (на других экранах)
// и карточку на «Главной» с кнопкой ручного обновления.
const REMOTE_BASE = 'https://kafeevbogdan347-ui.github.io/asosh-timer';
const REMOTE_VERSION_URL = `${REMOTE_BASE}/version.json`;
export const APK_URL = 'https://github.com/kafeevbogdan347-ui/asosh-timer/releases/download/apk-latest/asosh-timer.apk';

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

const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

async function clearWebCaches() {
  const work = (async () => {
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
  })();
  // Не ждём очистку дольше 600 мс — иначе кнопка «Обновиться» зависает
  await withTimeout(work, 600, undefined);
}

// Подгрузка свежих модулей с GitHub Pages при ручном нажатии «Обновиться» в APK
async function hotSwapFromRemote(targetVersion: string): Promise<boolean> {
  const ctrl = new AbortController();
  const abortTimer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${REMOTE_BASE}/index.html?v=${encodeURIComponent(targetVersion)}&t=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl.signal,
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

    await withTimeout(
      Promise.all(
        cssMatches.map(
          (m) =>
            new Promise<void>((resolve) => {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = `${toAbs(m[1])}?v=${encodeURIComponent(targetVersion)}`;
              link.onload = () => resolve();
              link.onerror = () => resolve();
              document.head.appendChild(link);
            })
        )
      ),
      3500,
      undefined
    );

    const jsUrl = `${toAbs(jsMatch[1])}?v=${encodeURIComponent(targetVersion)}`;
    const oldRoot = document.getElementById('root');
    const oldHtml = oldRoot ? oldRoot.innerHTML : '';
    if (oldRoot) {
      const freshRoot = document.createElement('div');
      freshRoot.id = 'root';
      freshRoot.className = oldRoot.className;
      oldRoot.replaceWith(freshRoot);
    }

    const loaded = await withTimeout(
      import(/* @vite-ignore */ jsUrl).then(() => true).catch(() => false),
      8000,
      false
    );
    if (!loaded) {
      const curRoot = document.getElementById('root');
      if (curRoot && oldHtml) curRoot.innerHTML = oldHtml;
      return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(abortTimer);
  }
}

export function useAvailableUpdate(simulatedVersion: string | null = null) {
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let alive = true;

    const checkVersion = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch(`${getVersionUrl()}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!alive) return;
        if (version && isNewer(version, APP_VERSION)) {
          setRemoteVersion(version);
        } else {
          setRemoteVersion(null);
        }
      } catch {
        // нет сети или сервер недоступен — проверим позже
      }
    };

    checkVersion();
    const timer = setInterval(checkVersion, 30 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkVersion();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const availableVersion =
    simulatedVersion && isNewer(simulatedVersion, APP_VERSION) ? simulatedVersion : remoteVersion;

  const applyUpdate = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    await clearWebCaches();

    const target = availableVersion || APP_VERSION;

    if (isNativeApp()) {
      const swapped = await hotSwapFromRemote(target);
      if (swapped) {
        setIsUpdating(false);
        return;
      }
    }

    if (isDesktopApp()) {
      window.location.reload();
      return;
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('v', target);
      url.searchParams.set('t', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }, [availableVersion, isUpdating]);

  return { availableVersion, isUpdating, applyUpdate };
}

interface UpdateRequiredProps {
  availableVersion: string | null;
  currentScreen: ScreenId;
  onGoToMain: () => void;
}

export const UpdateRequired: React.FC<UpdateRequiredProps> = ({
  availableVersion,
  currentScreen,
  onGoToMain,
}) => {
  // Красная плашка сверху появляется для всех, кто сейчас в приложении (кроме экрана «Главная»,
  // где показывается подробное сообщение с кнопкой «Обновиться», и спец-экранов)
  if (
    !availableVersion ||
    currentScreen === 'main' ||
    currentScreen === 'maintenance' ||
    currentScreen === 'retroFirst' ||
    currentScreen === 'board'
  ) {
    return null;
  }

  return (
    <div
      role="alert"
      onClick={onGoToMain}
      className="mx-2 mt-1.5 mb-1 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 border border-rose-300/60 text-white shadow-lg cursor-pointer hover:brightness-110 transition-all flex items-center justify-between gap-2.5 z-40"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">🚨</span>
        <span className="text-xs font-black leading-snug">
          Вышла новая версия АСОШ Таймера. Перейдите на страницу &quot;Главная&quot; и обновитесь.
        </span>
      </div>
      <span className="shrink-0 text-[11px] font-black bg-white text-rose-700 px-2.5 py-1 rounded-xl shadow-sm whitespace-nowrap">
        Главная →
      </span>
    </div>
  );
};
