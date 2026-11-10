import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Trash2, Plus } from 'lucide-react';
import {
  Account,
  ChildLink,
  ParentEntry,
  addChild,
  getMyParentCode,
  regenerateParentCode,
  removeChild,
  removeParent,
  subscribeMyChildren,
  subscribeMyParents,
  subscribeMyRosterStatus,
} from '../services/accounts';
import { Grade, bySubject, average, markColor, subscribeStudentGrades, newGrades, markGradesSeen } from '../services/journal';
import { ClassHomework, subscribeClassHomework, toDateKey } from '../services/classShared';
import { BoardPost, postsFor } from '../services/teacher';
import { getBaseLessonsForClass } from '../data/schoolSchedule';
import { DAYS } from '../data/constants';
import { roomLabel } from '../utils/lessonStatus';

interface DiaryScreenProps {
  account: Account;
  posts: BoardPost[];
  today: Date;
  onShowToast: (msg: string) => void;
  onChildClass?: (cls: string) => void; // родитель выбрал ребёнка — расписание в приложении по его классу
}

const fmtDate = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

// Новые с прошлого просмотра оценки подсвечиваем, после чего считаем просмотренными
function useFreshMarks(): [Set<string>, (sid: string, list: Grade[], fromServer: boolean) => void] {
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const track = (sid: string, list: Grade[], fromServer: boolean) => {
    if (!fromServer) return;
    const ids = newGrades(sid, list).map((g) => g.id);
    if (ids.length) setFresh((prev) => new Set([...prev, ...ids]));
    markGradesSeen(sid, list);
  };
  return [fresh, track];
}

const MarkChip: React.FC<{ g: Grade; fresh?: boolean }> = ({ g, fresh }) => (
  <span
    className={`mark-chip ${fresh ? 'fresh' : ''}`}
    style={{ background: markColor(g.v) }}
    title={`${fmtDate(g.date)} · ${g.teacher}${g.note ? ` · ${g.note}` : ''}`}
  >
    {g.v}
  </span>
);

// Оценки по предметам + последние оценки с комментариями
const GradesBlock: React.FC<{ grades: Grade[]; fresh?: Set<string> }> = ({ grades, fresh }) => {
  const subjects = useMemo(() => bySubject(grades), [grades]);
  const recent = useMemo(() => [...grades].sort((a, b) => (a.date === b.date ? b.t - a.t : a.date < b.date ? 1 : -1)).slice(0, 8), [grades]);
  const total = average(grades);
  const absences = grades.filter((g) => g.v === 'Н').length;

  if (!grades.length) {
    return <div className="text-center text-sm text-white/60 py-6">Оценок пока нет. Они появятся, как только учитель поставит их в журнал.</div>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="diary-stat">
          <b>{total ?? '—'}</b>
          <span>средний балл</span>
        </div>
        <div className="diary-stat">
          <b>{grades.filter((g) => g.v !== 'Н').length}</b>
          <span>оценок</span>
        </div>
        <div className="diary-stat">
          <b>{absences}</b>
          <span>пропусков</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {subjects.map((s) => (
          <div key={s.sub} className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm truncate">{s.sub}</b>
              <span className="text-xs font-black shrink-0" style={{ color: s.avg ? markColor(Math.round(s.avg) as 2 | 3 | 4 | 5) : undefined }}>
                {s.avg ?? '—'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {s.grades.map((g) => (
                <MarkChip key={g.id} g={g} fresh={fresh?.has(g.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xs font-black text-white/70 mb-1.5">Последние</div>
        <div className="space-y-1">
          {recent.map((g) => (
            <div key={g.id} className="flex items-start gap-2 text-xs p-2 rounded-xl bg-black/15">
              <MarkChip g={g} fresh={fresh?.has(g.id)} />
              <div className="min-w-0">
                {fresh?.has(g.id) && <span className="text-[10px] font-black text-amber-300">НОВАЯ · </span>}
                <b>{g.sub}</b> · {fmtDate(g.date)} · <span className="text-white/60">{g.teacher}</span>
                {g.note && <div className="text-white/75">💬 {g.note}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Ученик: свой дневник, код для родителей, кто из родителей подключён
const StudentDiary: React.FC<{ account: Account; onShowToast: (m: string) => void }> = ({ account, onShowToast }) => {
  const cls = account.cls || '';
  const [grades, setGrades] = useState<Grade[]>([]);
  const [status, setStatus] = useState<'pending' | 'ok' | 'none'>('pending');
  const [code, setCode] = useState<string | null>(null);
  const [parents, setParents] = useState<ParentEntry[]>([]);

  const [fresh, trackFresh] = useFreshMarks();
  useEffect(
    () =>
      cls
        ? subscribeStudentGrades(cls, account.uid, (list, fromServer) => {
            setGrades(list);
            trackFresh(account.uid, list, fromServer);
          })
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cls, account.uid]
  );
  useEffect(() => (cls ? subscribeMyRosterStatus(cls, account.uid, setStatus) : undefined), [cls, account.uid]);
  useEffect(() => subscribeMyParents(account.uid, setParents), [account.uid]);
  useEffect(() => {
    getMyParentCode(account.uid).then(setCode);
  }, [account.uid]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <b className="text-lg block">{account.name}</b>
          <span className="text-xs text-white/60">
            {cls} · @{account.login}
          </span>
        </div>
        <span className={`diary-status ${status}`}>{status === 'ok' ? '✅ в списке класса' : status === 'pending' ? '⏳ ждёт подтверждения' : '⚠️ нет в списке'}</span>
      </div>
      {status !== 'ok' && (
        <p className="text-xs text-white/70 p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30">
          Учитель ещё не подтвердил тебя в списке класса — до этого оценки не ставятся. Подойди к классному руководителю, если ждёшь долго.
        </p>
      )}

      <GradesBlock grades={grades} fresh={fresh} />

      <div className="p-3 rounded-2xl bg-white/5 border border-white/15 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <b className="text-sm">👨‍👩‍👧 Код для родителей</b>
          <button
            type="button"
            className="text-[11px] font-bold text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
            onClick={async () => {
              const next = await regenerateParentCode(account.uid);
              if (next) {
                setCode(next);
                onShowToast('Новый код готов. Старый больше не подойдёт');
              } else onShowToast('Нужен интернет');
            }}
          >
            <RefreshCw className="w-3 h-3" /> Новый код
          </button>
        </div>
        <div className="text-2xl font-black tracking-widest text-cyan-300 font-mono select-all">{code || '…'}</div>
        <p className="text-[11px] text-white/60">Родитель регистрируется в приложении как «Я родитель» и вводит этот код.</p>
        {parents.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-[11px] font-bold text-white/60">Видят мои оценки:</div>
            {parents.map((p) => (
              <div key={p.puid} className="flex items-center justify-between text-xs p-2 rounded-xl bg-black/15">
                <span>{p.name}</span>
                <button
                  type="button"
                  className="text-red-300 flex items-center gap-1 cursor-pointer"
                  onClick={async () => onShowToast((await removeParent(account.uid, p.puid)) ? 'Доступ закрыт' : 'Не получилось')}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Отключить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Родитель: дети, их оценки, расписание, домашка от учителей, объявления
const ParentDiary: React.FC<DiaryScreenProps> = ({ account, posts, today, onShowToast, onChildClass }) => {
  const [children, setChildren] = useState<ChildLink[] | null>(null);
  const [sel, setSel] = useState<string>('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [homework, setHomework] = useState<ClassHomework[]>([]);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'grades' | 'hw' | 'sched' | 'news'>('grades');
  const [denied, setDenied] = useState(false);
  const [fresh, trackFresh] = useFreshMarks();

  useEffect(() => subscribeMyChildren(account.uid, setChildren), [account.uid]);
  const child = children?.find((c) => c.sid === sel) || children?.[0];
  useEffect(() => {
    if (!child) return;
    onChildClass?.(child.cls);
    setDenied(false);
    const a = subscribeStudentGrades(
      child.cls,
      child.sid,
      (list, fromServer) => {
        setGrades(list);
        trackFresh(child.sid, list, fromServer);
      },
      () => setDenied(true)
    );
    const b = subscribeClassHomework(child.cls, setHomework);
    return () => {
      a();
      b();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.sid, child?.cls]);

  const todayKey = toDateKey(today);
  const dayIdx = (today.getDay() + 6) % 7;
  const schedule = child
    ? [0, 1].map((off) => {
        const day = DAYS[(dayIdx + off) % 7];
        return { label: off ? 'Завтра' : 'Сегодня', day, lessons: getBaseLessonsForClass(child.cls, day).filter(([s]) => s && s !== '—') };
      })
    : [];
  const hw = [...homework]
    .filter((h) => !h.forDate || h.forDate >= todayKey)
    .sort((a, b) => Number(!!b.teacher) - Number(!!a.teacher) || b.created_at - a.created_at);
  const news = child ? postsFor(posts, false, child.cls).slice(0, 10) : [];

  if (children === null) return <div className="text-center text-sm text-white/60 py-8">Загружаю…</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 items-center">
        {children.map((c) => (
          <button key={c.sid} type="button" className={`choice !py-1.5 !px-3 !text-xs ${child?.sid === c.sid ? 'active' : ''}`} onClick={() => setSel(c.sid)}>
            {c.name} · {c.cls}
          </button>
        ))}
        <button type="button" className="choice !py-1.5 !px-3 !text-xs flex items-center gap-1" onClick={() => setAdding(!adding)}>
          <Plus className="w-3.5 h-3.5" /> Ребёнок
        </button>
      </div>

      {adding && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await addChild(account.name, code);
            if ('error' in res) return onShowToast(res.error);
            setAdding(false);
            setCode('');
            setSel(res.child.sid);
            onShowToast(`Добавлен: ${res.child.name}`);
          }}
        >
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код ребёнка, K7QM-2XPA" className="flex-1 min-w-0 font-mono uppercase" />
          <button type="submit" className="btn green !px-4 text-sm">
            Добавить
          </button>
        </form>
      )}

      {!child ? (
        <div className="text-center text-sm text-white/60 py-6">Добавьте ребёнка по его коду из «Дневника».</div>
      ) : (
        <>
          <div className="flex gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
            {(
              [
                ['grades', '📊 Оценки'],
                ['hw', '📘 ДЗ'],
                ['sched', '📅 Уроки'],
                ['news', '📢 Новости'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={`diary-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'grades' &&
            (denied ? (
              <div className="text-center text-sm text-white/70 py-6 px-2">
                🔒 Доступ к оценкам закрыт: ребёнок отключил его в своём «Дневнике» или сменил класс. Попросите у него новый код и добавьте заново.
              </div>
            ) : (
              <GradesBlock grades={grades} fresh={fresh} />
            ))}

          {tab === 'hw' && (
            <div className="space-y-1.5">
              {hw.length === 0 && <div className="text-center text-sm text-white/60 py-6">Домашки от класса пока нет.</div>}
              {hw.map((h) => (
                <div key={h.id} className={`p-2.5 rounded-2xl border text-xs ${h.teacher ? 'bg-amber-500/10 border-amber-400/40' : 'bg-white/5 border-white/10'}`}>
                  <b className="text-sm">{h.sub}</b>
                  {h.forDate && <span className="text-white/60"> · к {fmtDate(h.forDate)}</span>}
                  <div className="whitespace-pre-line mt-0.5">{h.text}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">{h.teacher ? '👩‍🏫 учитель' : 'одноклассник'} · {h.author}</div>
                </div>
              ))}
              <p className="text-[11px] text-white/50">Личные записи ребёнка хранятся только на его телефоне и здесь не видны.</p>
            </div>
          )}

          {tab === 'sched' && (
            <div className="space-y-2">
              {schedule.map((d) => (
                <div key={d.label} className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                  <b className="text-sm">
                    {d.label} · {d.day}
                  </b>
                  {d.lessons.length === 0 ? (
                    <div className="text-xs text-white/60 mt-1">Уроков нет</div>
                  ) : (
                    <ol className="text-xs mt-1 space-y-0.5 list-decimal list-inside">
                      {d.lessons.map(([sub, room], i) => (
                        <li key={i}>
                          {sub}
                          {room && <span className="text-white/55"> · {roomLabel(room)}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'news' && (
            <div className="space-y-1.5">
              {news.length === 0 && <div className="text-center text-sm text-white/60 py-6">Объявлений нет.</div>}
              {news.map((p) => (
                <div key={p.id} className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs">
                  <b className="text-sm">
                    {p.kind === 'ann' ? '📢' : '🗓'} {p.title}
                  </b>
                  {p.text && <div className="whitespace-pre-line mt-0.5">{p.text}</div>}
                  <div className="text-[10px] text-white/55 mt-0.5">
                    {p.author} · {p.cls || 'вся школа'}
                    {p.date ? ` · ${fmtDate(p.date)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="w-full text-[11px] font-bold text-white/45 hover:text-red-300 py-1 cursor-pointer"
            onClick={async () => onShowToast((await removeChild(account.uid, child.sid)) ? 'Ребёнок убран из списка' : 'Не получилось')}
          >
            Убрать {child.name} из списка
          </button>
        </>
      )}
    </div>
  );
};

export const DiaryScreen: React.FC<DiaryScreenProps> = (props) => (
  <div className="card screen-enter space-y-3">
    <h2 className="text-xl font-black text-cyan-300">{props.account.role === 'parent' ? '👨‍👩‍👧 Дневник ребёнка' : '📒 Дневник'}</h2>
    {props.account.role === 'parent' ? <ParentDiary {...props} /> : <StudentDiary account={props.account} onShowToast={props.onShowToast} />}
  </div>
);
