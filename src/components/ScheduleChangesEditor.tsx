import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CLASS_LIST } from '../data/classCodes';
import { ALL_SUBJECTS, getBaseLessonsForClass, LessonEntry } from '../data/schoolSchedule';
import { DAYS } from '../data/constants';
import { ChangesMap, MAX_CHANGE_LESSONS, deleteScheduleChange, saveScheduleChange, subscribeScheduleChanges } from '../services/scheduleChanges';
import { classWriteErrorText, toDateKey } from '../services/classShared';
import { bellsFor, classDay, cleanSub, shiftOfClass } from '../utils/daySchedule';
import { lessonNo } from '../utils/lessonStatus';

// Учитель вносит «Изменения в основном расписании» на дату: день целиком для класса.
// Ученики и родители видят их сразу — выпускать новую версию приложения не нужно.
interface Props {
  teacherName: string;
  defaultCls?: string;
  onShowToast: (msg: string) => void;
}

const fmtDay = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
const EXTRA_SUBJECTS = ['Пробный экзамен', 'Классный час', 'Экскурсия'];

export const ScheduleChangesEditor: React.FC<Props> = ({ teacherName, defaultCls, onShowToast }) => {
  const now = new Date();
  const [date, setDate] = useState(() => toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)));
  const [cls, setCls] = useState(() => (defaultCls && CLASS_LIST.some((c) => c.className === defaultCls) ? defaultCls : CLASS_LIST[0]?.className || ''));
  const [changes, setChanges] = useState<ChangesMap>({});
  const [rows, setRows] = useState<LessonEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeScheduleChanges([date], setChanges), [date]);

  const dateObj = new Date(date + 'T00:00:00');
  const dayName = DAYS[(dateObj.getDay() + 6) % 7];
  const shift = shiftOfClass(cls);
  const bells = bellsFor(shift, dayName);
  const saved = changes[date]?.[cls];
  const classesWithChanges = Object.keys(changes[date] || {}).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));

  // Строки формы: сохранённый лист или текущее расписание на эту дату
  const fill = () => {
    const from = saved ?? classDay(cls, dateObj, changes).map(([s, r]) => [s === '—' ? '' : cleanSub(s), r] as LessonEntry);
    setRows(Array.from({ length: MAX_CHANGE_LESSONS }, (_, i) => from[i] || ['', '']));
    setDirty(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fill, [cls, date, JSON.stringify(saved)]);

  const setRow = (i: number, k: 0 | 1, v: string) => {
    setRows((prev) => prev.map((r, j) => (j === i ? ((k === 0 ? [v, r[1]] : [r[0], v]) as LessonEntry) : r)));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    const res = await saveScheduleChange(date, cls, rows, teacherName);
    setBusy(false);
    if (res.ok) setDirty(false);
    onShowToast(res.ok ? `Изменения для ${cls} на ${fmtDay(date)} сохранены — ученики уже видят` : `Не сохранилось: ${classWriteErrorText(res.error)}`);
  };
  const resetToBase = () => {
    const base = getBaseLessonsForClass(cls, dayName).map(([s, r]) => [s === '—' ? '' : s, r] as LessonEntry);
    setRows(Array.from({ length: MAX_CHANGE_LESSONS }, (_, i) => base[i] || ['', '']));
    setDirty(true);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/60">
        Лист «Изменения в основном расписании»: выберите дату и класс, поправьте уроки и кабинеты. Ученики и родители увидят изменения сразу, обновлять приложение не нужно.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-white/70 space-y-1">
          <span>Дата</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-full" />
        </label>
        <label className="text-xs font-bold text-white/70 space-y-1">
          <span>Класс</span>
          <select value={cls} onChange={(e) => setCls(e.target.value)} className="w-full">
            {CLASS_LIST.map((c) => (
              <option key={c.className}>{c.className}</option>
            ))}
          </select>
        </label>
      </div>

      {classesWithChanges.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center text-[11px] text-white/60">
          <span>Уже есть изменения на {fmtDay(date)}:</span>
          {classesWithChanges.map((c) => (
            <button key={c} type="button" className={`choice !py-0.5 !px-2 !text-[11px] ${c === cls ? 'active' : ''}`} onClick={() => setCls(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {dayName === 'Воскресенье' ? (
        <div className="text-center text-sm text-white/60 py-4">Воскресенье — уроков нет</div>
      ) : (
        <div className="space-y-1">
          <datalist id="chg-subjects">
            {[...ALL_SUBJECTS, ...EXTRA_SUBJECTS].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {rows.map(([s, r], i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-12 shrink-0 text-[10px] text-white/55 leading-tight">
                <b className="text-white/80">{lessonNo(shift, i)}</b>
                <br />
                {bells[i]?.[0] || ''}
              </span>
              <input list="chg-subjects" value={s} placeholder="нет урока" onChange={(e) => setRow(i, 0, e.target.value.slice(0, 60))} className="flex-1 min-w-0 !py-1.5 text-sm" />
              <input value={r} placeholder="каб." onChange={(e) => setRow(i, 1, e.target.value.slice(0, 20))} className="w-20 !py-1.5 text-sm" />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button type="button" disabled={busy || dayName === 'Воскресенье'} className="btn green flex-1 justify-center text-sm" onClick={save}>
          {busy ? 'Сохраняю…' : dirty || !saved ? '💾 Сохранить для класса' : '✓ Сохранено'}
        </button>
        <button type="button" className="btn darkBtn justify-center text-xs" onClick={resetToBase}>
          Как в основном
        </button>
        {saved && (
          <button
            type="button"
            className="btn darkBtn justify-center text-xs text-red-300"
            onClick={async () => onShowToast((await deleteScheduleChange(date, cls)) ? 'Изменения удалены — снова основное расписание' : 'Не получилось удалить')}
          >
            <Trash2 className="w-3.5 h-3.5" /> Удалить
          </button>
        )}
      </div>
    </div>
  );
};
