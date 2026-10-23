import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SCHOOL_QUARTERS } from '../data/constants';
import { toDateKey } from '../services/classShared';

// Календарь учебного года: каникулы и четверти, праздники и свои события (контрольные, сокращённые дни)
type EventKind = 'test' | 'short' | 'other';

interface MyEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: EventKind;
}

interface CalEntry {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  icon: string;
  mine?: boolean;
}

const STORAGE_KEY = 'asosh_calendar_events';
const KIND: Record<EventKind, { icon: string; label: string }> = {
  test: { icon: '📝', label: 'Контрольная' },
  short: { icon: '⏱', label: 'Сокращённый день' },
  other: { icon: '📌', label: 'Другое' },
};

// Государственные праздники, попадающие на учебный год
const HOLIDAYS: { md: string; title: string }[] = [
  { md: '11-04', title: 'День народного единства' },
  { md: '02-23', title: 'День защитника Отечества' },
  { md: '03-08', title: 'Международный женский день' },
  { md: '05-01', title: 'Праздник Весны и Труда' },
  { md: '05-09', title: 'День Победы' },
];

const dayDiff = (from: string, to: string) => {
  const [a, b] = [from, to].map((k) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86400000);
};
const shiftDate = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d + days));
};
const fmt = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
};

function loadEvents(): MyEvent[] {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

interface CalendarScreenProps {
  today: Date;
  onShowToast: (msg: string) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ today, onShowToast }) => {
  const todayKey = toDateKey(today);
  const [events, setEvents] = useState<MyEvent[]>(loadEvents);
  const [date, setDate] = useState(todayKey);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('test');

  const save = (list: MyEvent[]) => {
    setEvents(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      onShowToast('Не хватает памяти, событие не сохранилось');
    }
  };

  const entries = useMemo(() => {
    const list: CalEntry[] = [];
    SCHOOL_QUARTERS.forEach((q, i) => {
      list.push({ id: `q${i}-start`, date: q.start, title: `Начало: ${q.name}`, icon: '📚' });
      const next = SCHOOL_QUARTERS[i + 1];
      const breakStart = shiftDate(q.end, 1);
      list.push({
        id: `q${i}-break`,
        date: breakStart,
        endDate: next ? shiftDate(next.start, -1) : undefined,
        title: q.breakName,
        icon: '🏖️',
      });
    });
    const first = SCHOOL_QUARTERS[0].start.slice(0, 4);
    const last = SCHOOL_QUARTERS[SCHOOL_QUARTERS.length - 1].end.slice(0, 4);
    HOLIDAYS.forEach((h) => {
      const year = h.md >= '09-01' ? first : last;
      list.push({ id: `h-${h.md}`, date: `${year}-${h.md}`, title: h.title, icon: '🎉' });
    });
    events.forEach((e) => list.push({ id: e.id, date: e.date, title: e.title, icon: KIND[e.kind].icon, mine: true }));
    // Будущие и идущие сейчас (каникулы, которые ещё не закончились)
    return list
      .filter((e) => (e.endDate || e.date) >= todayKey)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [events, todayKey]);

  const lastDay = SCHOOL_QUARTERS[SCHOOL_QUARTERS.length - 1].end;
  const daysToSummer = dayDiff(todayKey, lastDay);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = title.trim() || KIND[kind].label;
    save([...events, { id: `ev-${Date.now()}`, date, title: text, kind }]);
    setTitle('');
    onShowToast('Событие добавлено 📅');
  };

  let lastMonth = '';
  return (
    <div className="card screen-enter space-y-4">
      <div>
        <h2 className="text-xl font-black text-cyan-300">📅 Календарь</h2>
        <p className="text-xs text-white/70">
          {daysToSummer > 0 ? `До конца учебного года ${daysToSummer} дн.` : 'Учебный год закончился — ура, лето!'}
        </p>
      </div>

      <form onSubmit={handleAdd} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <div className="text-xs font-black text-white/80">Добавить своё событие</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(KIND) as EventKind[]).map((k) => (
            <button key={k} type="button" className={`choice !py-1.5 !px-2.5 text-xs ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>
              {KIND[k].icon} {KIND[k].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="text-sm px-2 py-2 w-full sm:w-40" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === 'test' ? 'Например: алгебра' : 'Название'}
            maxLength={60}
            className="flex-1 min-w-[140px] text-sm px-3 py-2"
          />
          <button type="submit" className="btn green !py-2 !px-3 shrink-0" aria-label="Добавить">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="space-y-1.5">
        {entries.map((e) => {
          const month = new Date(e.date + 'T00:00:00').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
          const header = month !== lastMonth ? month : '';
          lastMonth = month;
          const now = e.date <= todayKey;
          const diff = dayDiff(todayKey, e.date);
          return (
            <React.Fragment key={e.id}>
              {header && <h3 className="text-xs font-black text-white/50 uppercase tracking-wide pt-2 first-letter:uppercase">{header}</h3>}
              <div className={`flex items-center gap-3 p-2.5 rounded-2xl border ${now ? 'bg-cyan-500/10 border-cyan-400/40' : 'bg-white/5 border-white/10'}`}>
                <span className="text-xl shrink-0">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <b className="text-sm block truncate">{e.title}</b>
                  <span className="text-[11px] text-white/60">
                    {fmt(e.date)}
                    {e.endDate ? ` — ${fmt(e.endDate)}` : ''}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-white/70 shrink-0">{now ? 'сейчас' : diff === 1 ? 'завтра' : `через ${diff} дн.`}</span>
                {e.mine && (
                  <button type="button" className="p-1 text-red-400 hover:text-red-300 shrink-0" onClick={() => save(events.filter((x) => x.id !== e.id))} title="Удалить">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
