import { lazy, type ComponentType } from 'react';

// Экран, который грузится отдельным файлом. Загрузчики запоминаем, чтобы после запуска
// скачать все экраны заранее: тогда Service Worker сохранит их и они откроются без интернета.
const loaders: (() => Promise<unknown>)[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyScreen<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  loaders.push(load);
  return lazy(load);
}

export function preloadScreens(): void {
  const run = () => loaders.forEach((load) => load().catch(() => {}));
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (idle) idle(run);
  else setTimeout(run, 1500);
}
