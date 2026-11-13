import { Capacitor } from '@capacitor/core';

// Системные уведомления о звонках.
// В APK (Capacitor) напоминания планируются заранее на неделю и приходят даже при закрытом приложении.
// В браузере без сервера так нельзя: уведомление показывается, только пока вкладка открыта или свёрнута.

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

// Уведомление «сейчас» — для браузера, когда приложение свёрнуто
export async function showSystemNotification(title: string, body: string) {
  if (isNativeApp() || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // на открытом экране хватает тоста
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag: 'asosh-bell', icon: `${import.meta.env.BASE_URL}icon.svg` });
    else new Notification(title, { body });
  } catch {
    // уведомления недоступны — молча пропускаем
  }
}

// Уведомление «сейчас» о событии (новая оценка, объявление): в APK — системное уведомление,
// в браузере — только когда приложение свёрнуто (на открытом экране хватает тоста)
let instantId = 7900;
export async function notifyNow(title: string, body: string, tag = 'asosh-event') {
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      instantId = instantId >= 7999 ? 7900 : instantId + 1;
      await LocalNotifications.schedule({ notifications: [{ id: instantId, title, body, schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true } }] });
    } catch {
      // нет разрешения на уведомления
    }
    return;
  }
  if (!('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icon.svg` });
    else new Notification(title, { body });
  } catch {
    // уведомления недоступны
  }
}

export interface PlannedReminder {
  at: Date;
  title: string;
  body: string;
}

const FIRST_ID = 7000;
const MAX_REMINDERS = 60;

// Перепланировать напоминания в APK: старые отменяем, ставим новые
export async function scheduleNativeReminders(reminders: PlannedReminder[]) {
  if (!isNativeApp()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter((n) => n.id >= FIRST_ID && n.id < FIRST_ID + MAX_REMINDERS);
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

  const now = Date.now();
  const upcoming = reminders
    .filter((r) => r.at.getTime() > now + 30_000)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_REMINDERS);
  if (!upcoming.length) return;
  await LocalNotifications.schedule({
    notifications: upcoming.map((r, i) => ({
      id: FIRST_ID + i,
      title: r.title,
      body: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
    })),
  });
}

export async function cancelNativeReminders() {
  await scheduleNativeReminders([]);
}
