// Виджет Android на рабочем столе (native/android): приложение передаёт уроки на сегодня и завтра,
// а виджет сам считает, сколько осталось до звонка, и показывает следующий кабинет.

import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from './bellNotifications';

export interface WidgetLesson {
  start: number; // мс
  end: number;
  num: number;
  sub: string;
  room: string;
}

interface AsoshWidgetPlugin {
  update(opts: { lessons: string; cls: string }): Promise<{ ok: boolean }>;
}

const AsoshWidget = registerPlugin<AsoshWidgetPlugin>('AsoshWidget');

let lastSent = '';

export async function updateWidget(lessons: WidgetLesson[], cls: string): Promise<void> {
  if (!isNativeApp()) return;
  const payload = JSON.stringify(lessons);
  if (payload + cls === lastSent) return;
  try {
    await AsoshWidget.update({ lessons: payload, cls });
    lastSent = payload + cls;
  } catch {
    // старый APK без виджета — ничего не делаем
  }
}

// «08:30» + дата → мс
export function atTime(date: Date, hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h || 0, m || 0).getTime();
}
