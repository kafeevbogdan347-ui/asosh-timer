import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Account, RosterEntry, confirmStudent, removeFromRoster, subscribeRoster } from '../services/accounts';
import { Grade, MARKS, Mark, average, deleteGrade, markColor, saveGrade, subscribeClassJournal } from '../services/journal';
import { toDateKey } from '../services/classShared';
import { ALL_SUBJECTS, hasOfficialSchedule } from '../data/schoolSchedule';
import { CLASS_LIST } from '../data/classCodes';

interface Props {
  account: Account;
  defaultCls: string;
  onShowToast: (msg: string) => void;
}

const CLASSES = CLASS_LIST.map((c) => c.className).filter(hasOfficialSchedule);
const shortDate = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });

// Электронный журнал: класс → предмет → таблица «ученики × даты»
export const TeacherJournal: React.FC<Props> = ({ account, defaultCls, onShowToast }) => {
  const subjects = account.subjects?.length ? account.subjects : ALL_SUBJECTS;
  const [cls, setCls] = useState(CLASSES.includes(defaultCls) ? defaultCls : CLASSES[0]);
  const [sub, setSub] = useState(subjects[0]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const today = toDateKey(new Date());
  const [extraDate, setExtraDate] = useState(today);
  const [edit, setEdit] = useState<{ sid: string; name: string; date: string; grade?: Grade } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => subscribeRoster(cls, setRoster), [cls]);
  useEffect(() => subscribeClassJournal(cls, setGrades), [cls]);

  const pending = roster.filter((r) => !r.ok);
  const students = roster.filter((r) => r.ok);
  const subGrades = useMemo(() => grades.filter((g) => g.sub === sub), [grades, sub]);
  const dates = useMemo(() => [...new Set([...subGrades.map((g) => g.date), extraDate])].sort().slice(-14), [subGrades, extraDate]);
  const cellGrades = (sid: string, date: string) => subGrades.filter((g) => g.sid === sid && g.date === date).sort((a, b) => a.t - b.t);

  const openCell = (r: RosterEntry, date: string) => {
    const mine = cellGrades(r.sid, date).find((g) => g.tuid === account.uid);
    setEdit({ sid: r.sid, name: r.name, date, grade: mine });
    setNote(mine?.note || '');
  };

  const put = async (v: Mark) => {
    if (!edit) return;
    const ok = await saveGrade(cls, edit.sid, { id: edit.grade?.id, sub, v, date: edit.date, note, teacher: account.name, tuid: account.uid });
    onShowToast(ok ? `${edit.name}: ${v}` : 'Не сохранилось. Проверьте интернет');
    if (ok) setEdit(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-white/70 space-y-1">
          <span>Класс</span>
          <select value={cls} onChange={(e) => setCls(e.target.value)} className="w-full">
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-white/70 space-y-1">
          <span>Предмет</span>
          <select value={sub} onChange={(e) => setSub(e.target.value)} className="w-full">
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {pending.length > 0 && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/35 space-y-1.5">
          <b className="text-sm">Ждут подтверждения в {cls}: {pending.length}</b>
          <p className="text-[11px] text-white/65">Подтверждайте только тех, кого знаете. Оценки можно ставить только подтверждённым.</p>
          {pending.map((r) => (
            <div key={r.sid} className="flex items-center justify-between gap-2 text-sm">
              <span>{r.name}</span>
              <span className="flex gap-1.5">
                <button type="button" className="btn green !py-1 !px-3 text-xs" onClick={async () => onShowToast((await confirmStudent(cls, r.sid, account.uid)) ? `${r.name} подтверждён` : 'Не получилось')}>
                  ✓ Мой ученик
                </button>
                <button type="button" className="btn darkBtn !py-1 !px-3 text-xs" onClick={async () => onShowToast((await removeFromRoster(cls, r.sid)) ? 'Убран из списка' : 'Не получилось')}>
                  ✗
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {students.length === 0 ? (
        <div className="text-center text-sm text-white/60 py-6">
          В {cls} пока нет подтверждённых учеников. Ученики регистрируются в приложении с кодом класса и появляются здесь.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/65">Нажмите на клетку, чтобы поставить оценку или «Н»</span>
            <input type="date" value={extraDate} max={today} onChange={(e) => e.target.value && setExtraDate(e.target.value)} className="!py-1 !px-2 text-xs w-auto" aria-label="Дата урока" />
          </div>
          <div className="journal-wrap">
            <table className="journal">
              <thead>
                <tr>
                  <th className="name">Ученик</th>
                  {dates.map((d) => (
                    <th key={d} style={d === today ? { color: 'var(--accent)' } : undefined}>
                      {shortDate(d)}
                    </th>
                  ))}
                  <th>Ср.</th>
                </tr>
              </thead>
              <tbody>
                {students.map((r) => {
                  const avg = average(subGrades.filter((g) => g.sid === r.sid));
                  return (
                    <tr key={r.sid}>
                      <td className="name">{r.name}</td>
                      {dates.map((d) => {
                        const list = cellGrades(r.sid, d);
                        return (
                          <td key={d} className="cell" onClick={() => openCell(r, d)}>
                            {list.map((g) => (
                              <span key={g.id} className="font-black" style={{ color: markColor(g.v) }} title={g.note || ''}>
                                {g.v}
                                {g.note ? '*' : ''}{' '}
                              </span>
                            ))}
                          </td>
                        );
                      })}
                      <td className="avg" style={{ color: avg ? markColor(Math.round(avg) as 2 | 3 | 4 | 5) : undefined }}>
                        {avg ?? ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-white/50">* — есть комментарий. Оценки сразу видят ученик и его родители.</p>
        </>
      )}

      {edit && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-end sm:items-center justify-center p-3" onClick={() => setEdit(null)}>
          <div className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-4 space-y-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <b className="text-base block">{edit.name}</b>
                <span className="text-xs text-white/60">
                  {sub} · {new Date(edit.date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
              </div>
              <button type="button" onClick={() => setEdit(null)} className="p-1 opacity-70" aria-label="Закрыть">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Комментарий (необязательно): за что оценка" className="w-full text-sm" />
            <div className="grid grid-cols-5 gap-2">
              {MARKS.map((m) => (
                <button key={m} type="button" className="mark-btn" style={{ background: markColor(m) }} onClick={() => put(m)}>
                  {m}
                </button>
              ))}
            </div>
            {edit.grade && (
              <button
                type="button"
                className="w-full text-xs font-bold text-red-300 py-1 cursor-pointer"
                onClick={async () => {
                  const ok = await deleteGrade(cls, edit.sid, edit.grade!.id);
                  onShowToast(ok ? 'Оценка удалена' : 'Не получилось');
                  if (ok) setEdit(null);
                }}
              >
                Удалить мою оценку «{edit.grade.v}»
              </button>
            )}
            <p className="text-[10px] text-white/50 text-center">«Н» — отсутствовал. Ещё одна оценка за тот же день добавится рядом.</p>
          </div>
        </div>
      )}
    </div>
  );
};
