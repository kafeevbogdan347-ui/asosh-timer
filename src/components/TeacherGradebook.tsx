import React, { useEffect, useState } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import { DEFAULT_ROOMS_BY_SUBJECT } from '../data/schoolSchedule';
import { toDateKey } from '../services/classShared';
import { checkBeforePublish } from './HumanCheck';
import {
  StudentRecord,
  Grade,
  GRADE_VALUES,
  subscribeClassStudents,
  subscribeClassGrades,
  setStudentApproval,
  deleteStudent,
  addGrade,
  deleteGrade,
  average,
} from '../services/students';

// Журнал учителя: подтверждение учеников класса и оценки
interface TeacherGradebookProps {
  cls: string;
  teacherName: string;
  myUid: string;
  onShowToast: (msg: string) => void;
}

const SUBJECTS = Object.keys(DEFAULT_ROOMS_BY_SUBJECT);
const SUBJECT_KEY = 'asosh_teacher_subject';
const fmtDay = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

export const TeacherGradebook: React.FC<TeacherGradebookProps> = ({ cls, teacherName, myUid, onShowToast }) => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade[]>>({});
  const [openPid, setOpenPid] = useState<string | null>(null);
  const [sub, setSub] = useState(() => localStorage.getItem(SUBJECT_KEY) || '');
  const [date, setDate] = useState(toDateKey(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeClassStudents(cls, setStudents), [cls]);
  useEffect(() => subscribeClassGrades(cls, setGrades), [cls]);

  const pending = students.filter((s) => s.ok === undefined);
  const confirmed = students.filter((s) => s.ok === true);
  const rejected = students.filter((s) => s.ok === false);

  const approve = async (s: StudentRecord, ok: boolean) =>
    onShowToast((await setStudentApproval(cls, s.pid, ok)) ? (ok ? `${s.name} подтверждён` : `${s.name} отклонён`) : 'Не получилось. Проверьте интернет.');

  const remove = async (s: StudentRecord) => {
    if (!window.confirm(`Удалить ${s.name} из списка класса? Его оценки останутся в базе, но ученик их не увидит.`)) return;
    onShowToast((await deleteStudent(cls, s.pid)) ? 'Удалено' : 'Не получилось удалить');
  };

  const give = async (s: StudentRecord, v: number) => {
    const subject = sub.trim();
    if (!subject) {
      onShowToast('Сначала выберите предмет');
      return;
    }
    const modError = await checkBeforePublish(subject, note);
    if (modError) {
      onShowToast(modError);
      return;
    }
    setBusy(true);
    const ok = await addGrade(cls, s.pid, { sub: subject, v, date, note }, teacherName);
    setBusy(false);
    if (ok) {
      localStorage.setItem(SUBJECT_KEY, subject);
      setNote('');
      onShowToast(`${s.name}: ${v} по предмету «${subject}»`);
    } else {
      onShowToast('Не получилось поставить оценку. Проверьте интернет.');
    }
  };

  return (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3">
      <div>
        <h3 className="text-sm font-black text-white/90">📒 Ученики и оценки · {cls}</h3>
        <p className="text-[11px] text-white/60">
          Ученики сами отправляют имя из приложения. Подтвердите тех, кого узнаёте: оценки можно ставить только подтверждённым.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-amber-300">Ждут подтверждения: {pending.length}</div>
          {pending.map((s) => (
            <div key={s.pid} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
              <span className="text-sm font-bold truncate">{s.name}</span>
              <span className="flex gap-1 shrink-0">
                <button type="button" className="p-1.5 rounded-lg bg-emerald-500/25 text-emerald-200" title="Подтвердить" onClick={() => approve(s, true)}>
                  <Check className="w-4 h-4" />
                </button>
                <button type="button" className="p-1.5 rounded-lg bg-rose-500/25 text-rose-200" title="Не узнаю" onClick={() => approve(s, false)}>
                  <X className="w-4 h-4" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-bold text-white/70">Предмет</label>
          <input type="text" list="teacher-subjects" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Например: Алгебра" maxLength={40} className="text-sm" />
          <datalist id="teacher-subjects">
            {SUBJECTS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-[11px] font-bold text-white/70">Дата</label>
          <input type="date" value={date} max={toDateKey(new Date())} onChange={(e) => e.target.value && setDate(e.target.value)} className="text-sm" />
        </div>
      </div>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Комментарий к оценке (необязательно)" maxLength={200} className="text-sm" />

      {confirmed.length === 0 ? (
        <p className="text-xs text-white/60">Подтверждённых учеников пока нет.</p>
      ) : (
        <div className="space-y-1.5">
          {confirmed.map((s) => {
            const list = grades[s.pid] || [];
            const avg = average(list);
            const open = openPid === s.pid;
            return (
              <div key={s.pid} className="rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-2 p-2">
                  <button type="button" className="text-left min-w-0 flex-1" onClick={() => setOpenPid(open ? null : s.pid)}>
                    <span className="text-sm font-bold block truncate">{s.name}</span>
                    <span className="text-[10px] text-white/50">
                      {list.length ? `${list.length} оц. · средний ${avg?.toFixed(2)}` : 'оценок нет'} · {open ? 'скрыть' : 'подробнее'}
                    </span>
                  </button>
                  <span className="flex gap-1 shrink-0">
                    {GRADE_VALUES.map((v) => (
                      <button key={v} type="button" disabled={busy} className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 text-sm font-black hover:bg-cyan-500/30" onClick={() => give(s, v)}>
                        {v}
                      </button>
                    ))}
                  </span>
                </div>
                {open && (
                  <div className="px-2 pb-2 space-y-1">
                    {list.map((g) => (
                      <div key={g.id} className="flex items-center justify-between gap-2 text-[11px] text-white/75">
                        <span className="min-w-0">
                          <b>{g.v}</b> · {g.sub} · {fmtDay(g.date)} · {g.teacher}
                          {g.note ? ` — ${g.note}` : ''}
                        </span>
                        {g.tuid === myUid && (
                          <button
                            type="button"
                            className="p-1 text-red-400 shrink-0"
                            title="Удалить оценку"
                            onClick={async () => onShowToast((await deleteGrade(cls, s.pid, g.id)) ? 'Оценка удалена' : 'Не получилось удалить')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="text-[11px] text-rose-300 underline" onClick={() => remove(s)}>
                      Удалить ученика из списка
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-bold text-white/50">Отклонённые: исправят имя и отправят снова</div>
          {rejected.map((s) => (
            <div key={s.pid} className="flex items-center justify-between gap-2 text-xs text-white/60">
              <span className="truncate">{s.name}</span>
              <span className="flex gap-2 shrink-0">
                <button type="button" className="underline" onClick={() => approve(s, true)}>
                  подтвердить
                </button>
                <button type="button" className="underline text-rose-300" onClick={() => remove(s)}>
                  удалить
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
