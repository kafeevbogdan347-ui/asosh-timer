import React, { useEffect, useState } from 'react';
import { checkRealName } from '../utils/realName';
import { checkBeforePublish } from './HumanCheck';
import { MyStudentState, Grade, subscribeMyStudent, registerStudent, deleteMyStudentProfile, average } from '../services/students';

// Профиль ученика в классе: имя «Иван П.», которое подтверждает учитель, и оценки от учителей
interface ClassProfileCardProps {
  cls: string;
  classVerified: boolean;
  defaultFirstName?: string;
  onShowToast: (msg: string) => void;
}

const gradeColor = (v: number) =>
  v >= 5 ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40' : v === 4 ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' : v === 3 ? 'bg-amber-500/20 text-amber-200 border-amber-400/40' : 'bg-rose-500/25 text-rose-200 border-rose-400/40';

const fmtDay = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

function bySubject(grades: Grade[]): [string, Grade[]][] {
  const map = new Map<string, Grade[]>();
  grades.forEach((g) => map.set(g.sub, [...(map.get(g.sub) || []), g]));
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
}

export const ClassProfileCard: React.FC<ClassProfileCardProps> = ({ cls, classVerified, defaultFirstName = '', onShowToast }) => {
  const [state, setState] = useState<MyStudentState>({ status: 'none', grades: [], online: false });
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(() => (/^[А-ЯЁа-яё-]+$/.test(defaultFirstName.split(' ')[0] || '') ? defaultFirstName.split(' ')[0] : ''));
  const [last, setLast] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  // Профиль заводится или удаляется прямо здесь — после этого подписываемся заново
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeMyStudent(setState), [cls, version]);

  if (!classVerified) {
    return (
      <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-1">
        <h3 className="text-base font-black text-cyan-300">📒 Оценки от учителей</h3>
        <p className="text-xs text-white/70">Чтобы учителя могли ставить тебе оценки в приложении, войди в свой класс по коду классного руководителя.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = checkRealName(first, last);
    if ('error' in check) {
      setError(check.error);
      return;
    }
    const modError = await checkBeforePublish(check.shortName);
    if (modError) {
      setError(modError);
      return;
    }
    setBusy(true);
    setError('');
    const res = await registerStudent(cls, check.shortName);
    setBusy(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setEditing(false);
    setLast('');
    setVersion((v) => v + 1);
    onShowToast('Заявка отправлена учителю ✉️');
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить профиль в классе? Оценки от учителей перестанут быть видны.')) return;
    const ok = await deleteMyStudentProfile();
    onShowToast(ok ? 'Профиль удалён' : 'Не получилось. Проверь интернет.');
    if (ok) setVersion((v) => v + 1);
  };

  const showForm = editing || state.status === 'none' || state.status === 'rejected';
  const avg = average(state.grades);

  return (
    <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-cyan-300">📒 Оценки от учителей · {cls}</h3>
          {state.name && !showForm && (
            <p className="text-xs text-white/80">
              <b className="sensitive-data">{state.name}</b>{' '}
              {state.status === 'ok' ? (
                <span className="text-emerald-300">✓ подтверждён учителем</span>
              ) : (
                <span className="text-amber-300">⏳ ждёт подтверждения учителем</span>
              )}
            </p>
          )}
        </div>
        {avg !== null && (
          <div className="text-center shrink-0">
            <div className="text-2xl font-black text-cyan-300 font-mono sensitive-data">{avg.toFixed(2)}</div>
            <div className="text-[10px] text-white/50">средний</div>
          </div>
        )}
      </div>

      {state.status === 'rejected' && !editing && (
        <p className="text-xs text-rose-300">Учитель не узнал тебя по этому имени. Проверь, что имя и фамилия настоящие, и отправь ещё раз.</p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <p className="text-[11px] text-white/60">
            Укажи настоящие имя и фамилию — так учитель узнает тебя и подтвердит. На сервер уходит только имя и первая буква фамилии, например «Иван П.».
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Имя" maxLength={20} autoComplete="given-name" className="text-sm" />
            <input type="text" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Фамилия" maxLength={20} autoComplete="family-name" className="text-sm" />
          </div>
          {error && <p className="text-xs text-rose-300 font-bold">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn green flex-1 justify-center" disabled={busy}>
              {busy ? 'Отправляю…' : state.status === 'none' ? 'Отправить учителю' : 'Отправить заново'}
            </button>
            {editing && (
              <button type="button" className="btn darkBtn justify-center" onClick={() => setEditing(false)}>
                Отмена
              </button>
            )}
          </div>
        </form>
      )}

      {state.status === 'ok' && state.grades.length === 0 && <p className="text-xs text-white/60">Оценок пока нет. Они появятся здесь, когда учитель их поставит.</p>}

      {state.grades.length > 0 && (
        <div className="space-y-1.5 sensitive-data">
          {bySubject(state.grades).map(([sub, list]) => (
            <div key={sub} className="rounded-2xl bg-white/5 border border-white/10">
              <button type="button" className="w-full p-2.5 flex items-center justify-between gap-2 text-left" onClick={() => setOpenSub(openSub === sub ? null : sub)}>
                <span className="text-sm font-bold truncate">{sub}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {list.slice(0, 6).map((g) => (
                    <span key={g.id} className={`w-6 h-6 rounded-lg border text-xs font-black flex items-center justify-center ${gradeColor(g.v)}`}>
                      {g.v}
                    </span>
                  ))}
                  <span className="text-xs font-mono text-white/70 ml-1">{average(list)?.toFixed(2)}</span>
                </span>
              </button>
              {openSub === sub && (
                <div className="px-2.5 pb-2.5 space-y-1">
                  {list.map((g) => (
                    <div key={g.id} className="text-[11px] text-white/75 flex gap-2">
                      <b className={`w-5 h-5 shrink-0 flex items-center justify-center rounded border ${gradeColor(g.v)}`}>{g.v}</b>
                      <span>
                        {fmtDay(g.date)} · {g.teacher}
                        {g.note ? ` — ${g.note}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!showForm && state.status !== 'none' && (
        <div className="flex gap-2">
          <button type="button" className="btn darkBtn flex-1 justify-center text-xs" onClick={() => setEditing(true)}>
            ✏️ Исправить имя
          </button>
          <button type="button" className="btn darkBtn justify-center text-xs" onClick={handleDelete}>
            🗑 Удалить
          </button>
        </div>
      )}
      {!state.online && state.status !== 'none' && <p className="text-[10px] text-white/40">Без интернета показаны сохранённые оценки.</p>}
    </div>
  );
};
