import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SCHOOL_QUARTERS } from '../data/constants';
import { toDateKey } from '../services/classShared';
import { BoardPost, BoardAudience, AUDIENCE_LABEL, addBoardPost, deleteBoardPost } from '../services/teacher';

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
  post?: BoardPost; // событие учителя из общей базы
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
  boardEvents: BoardPost[]; // события учителей, которые видит этот человек
  teacherName: string | null;
  cls: string;
  myUid: string;
}

// Кому видно событие: «только мне» хранится на телефоне, остальное — в общей базе (только для учителей)
type Visibility = 'me' | BoardAudience;

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ today, onShowToast, boardEvents, teacherName, cls, myUid }) => {
  const todayKey = toDateKey(today);
  const [events, setEvents] = useState<MyEvent[]>(loadEvents);
  const [date, setDate] = useState(todayKey);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('test');
  const [vis, setVis] = useState<Visibility>('me');
  const [forClass, setForClass] = useState(true);

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
    boardEvents
      .filter((p) => p.kind === 'event' && p.date)
      .forEach((p) => list.push({ id: `b-${p.id}`, date: p.date!, title: p.title, icon: '📣', post: p }));
    // Будущие и идущие сейчас (каникулы, которые ещё не закончились)
    return list
      .filter((e) => (e.endDate || e.date) >= todayKey)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [events, boardEvents, todayKey]);

  const lastDay = SCHOOL_QUARTERS[SCHOOL_QUARTERS.length - 1].end;
  const daysToSummer = dayDiff(todayKey, lastDay);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = title.trim() || KIND[kind].label;
    if (vis !== 'me' && teacherName) {
      const ok = await addBoardPost({ kind: 'event', title: `${KIND[kind].icon} ${text}`.slice(0, 120), date, aud: vis, cls: forClass ? cls : '', author: teacherName.slice(0, 60) });
      if (ok) setTitle('');
      onShowToast(ok ? `Событие опубликовано: ${AUDIENCE_LABEL[vis]}` : 'Не получилось опубликовать. Проверьте интернет.');
      return;
    }
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
        <div className="text-xs font-black text-white/80">{teacherName ? 'Добавить событие' : 'Добавить своё событие'}</div>
        {teacherName && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(['me', 'all', 'students', 'teachers'] as Visibility[]).map((v) => (
                <button key={v} type="button" className={`choice !py-1.5 !px-1 text-[11px] ${vis === v ? 'active' : ''}`} onClick={() => setVis(v)}>
                  {v === 'me' ? '🔒 Только мне' : AUDIENCE_LABEL[v]}
                </button>
              ))}
            </div>
            {vis !== 'me' && cls && (
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" className={`choice !py-1.5 text-[11px] ${forClass ? 'active' : ''}`} onClick={() => setForClass(true)}>
                  Класс {cls}
                </button>
                <button type="button" className={`choice !py-1.5 text-[11px] ${!forClass ? 'active' : ''}`} onClick={() => setForClass(false)}>
                  Вся школа
                </button>
              </div>
            )}
          </>
        )}
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
                    {e.post && ` · 👩‍🏫 ${e.post.author} · ${e.post.cls || 'вся школа'}${teacherName ? ` · ${AUDIENCE_LABEL[e.post.aud]}` : ''}`}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-white/70 shrink-0">{now ? 'сейчас' : diff === 1 ? 'завтра' : `через ${diff} дн.`}</span>
                {e.post && e.post.uid === myUid && (
                  <button
                    type="button"
                    className="p-1 text-red-400 hover:text-red-300 shrink-0"
                    onClick={async () => onShowToast((await deleteBoardPost(e.post!)) ? 'Событие удалено' : 'Не получилось удалить')}
                    title="Удалить для всех"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
