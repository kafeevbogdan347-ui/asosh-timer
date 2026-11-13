export interface ProfileBadgeInfo {
  id: 'developer' | 'newbie' | 'veteran';
  label: string;
  icon: string;
  className: string;
  title: string;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function isDevPanelUnlocked(): boolean {
  try {
    return localStorage.getItem('asosh_dev_unlocked') === 'true';
  } catch {
    return false;
  }
}

export function parseRegisteredTimestamp(
  registeredAt?: number,
  registeredDate?: string,
  fallbackId?: string
): number | undefined {
  if (typeof registeredAt === 'number' && Number.isFinite(registeredAt) && registeredAt > 1_000_000_000_000) {
    return registeredAt;
  }

  if (registeredDate && typeof registeredDate === 'string') {
    const ruMatch = registeredDate.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (ruMatch) {
      const [, dd, mm, yyyy] = ruMatch;
      const ts = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime();
      if (Number.isFinite(ts) && ts > 0) return ts;
    }
    const isoTs = Date.parse(registeredDate);
    if (Number.isFinite(isoTs) && isoTs > 0) return isoTs;
  }

  if (fallbackId && typeof fallbackId === 'string') {
    const idMatch = fallbackId.match(/^user_(\d{12,14})_/);
    if (idMatch) {
      const ts = Number(idMatch[1]);
      if (Number.isFinite(ts) && ts > 1_000_000_000_000) return ts;
    }
  }

  return undefined;
}

export function getProfileBadges(params: {
  isDev?: boolean;
  registeredAt?: number;
  registeredDate?: string;
  id?: string;
  isSelf?: boolean;
}): ProfileBadgeInfo[] {
  const badges: ProfileBadgeInfo[] = [];

  const hasDev = params.isSelf ? isDevPanelUnlocked() || Boolean(params.isDev) : Boolean(params.isDev);
  if (hasDev) {
    badges.push({
      id: 'developer',
      label: 'Разработчик',
      icon: '🛠️',
      className: 'bg-violet-500/25 border border-violet-400/50 text-violet-200',
      title: 'Открыл панель разработчика',
    });
  }

  const regTs = parseRegisteredTimestamp(params.registeredAt, params.registeredDate, params.id);
  if (regTs) {
    const ageMs = Date.now() - regTs;
    if (ageMs >= 0 && ageMs < TWO_DAYS_MS) {
      badges.push({
        id: 'newbie',
        label: 'Новичок',
        icon: '🌱',
        className: 'bg-lime-500/20 border border-lime-400/50 text-lime-200',
        title: 'Зарегистрировался меньше 2 дней назад',
      });
    } else if (ageMs > ONE_MONTH_MS) {
      badges.push({
        id: 'veteran',
        label: 'Ветеран',
        icon: '🏆',
        className: 'bg-amber-500/25 border border-amber-400/50 text-amber-200',
        title: 'Зарегистрировался больше месяца назад',
      });
    }
  }

  return badges;
}
