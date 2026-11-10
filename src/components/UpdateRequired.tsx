import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '../data/constants';
import { isNativeApp } from '../services/bellNotifications';

// Проверка обновлений: сайт публикует version.json, приложение сравнивает со своей версией.
// Если вышла новая — большое окно «ОБНОВИТЕ ДО ПОСЛЕДНЕЙ ВЕРСИИ».
const VERSION_URL = 'https://kafeevbogdan347-ui.github.io/asosh-timer/version.json';
export const APK_URL = 'https://github.com/kafeevbogdan347-ui/asosh-timer/releases/download/apk-latest/asosh-timer.apk';

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
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (alive && version && isNewer(version, APP_VERSION)) setLatest(version);
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
        ) : (
          <button type="button" onClick={() => window.location.reload()} className="btn green w-full py-3 font-black text-base cursor-pointer">
            🔄 Обновить
          </button>
        )}
        {native && <p className="text-[11px] text-white/55">Скачай файл и открой его — новая версия установится поверх, все данные сохранятся.</p>}
        <button type="button" onClick={() => setLater(true)} className="text-xs text-white/50 underline underline-offset-2 cursor-pointer">
          Напомнить позже
        </button>
      </div>
    </div>
  );
};
