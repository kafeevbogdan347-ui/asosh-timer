import React, { useMemo, useState } from 'react';
import { DAYS, DICT } from '../data/constants';
import { LessonUpdate, LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import { Plus, Trash2, Users, User, Lock } from 'lucide-react';
import { ClassReplacement, toDateKey } from '../services/classShared';

interface AddUpdateScreenProps {
  cls: string;
  updates: LessonUpdate[];
  onAddUpdate: (update: LessonUpdate) => void;
  onDeleteUpdate: (id: string) => void;
  classReplacements: ClassReplacement[];
  myUid: string;
  onAddClassReplacement: (r: Pick<ClassReplacement, 'date' | 'num' | 'sub' | 'room'>) => Promise<boolean>;
  onDeleteClassReplacement: (id: string) => void;
  today: Date;
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  // Гость без кода класса не может отправлять замены всему классу
  canShare: boolean;
}

const RU_DATE = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
};

export const AddUpdateScreen: React.FC<AddUpdateScreenProps> = ({
  cls,
  updates,
  onAddUpdate,
  onDeleteUpdate,
  classReplacements,
  myUid,
  onAddClassReplacement,
  onDeleteClassReplacement,
  today,
  lang,
  soundProfile,
  vibro,
  onShowToast,
  canShare,
}) => {
  const [mode, setMode] = useState<'class' | 'me'>(canShare ? 'class' : 'me');
  const todayKey = toDateKey(today);
  const tomorrowKey = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  const [date, setDate] = useState(todayKey);
  const [day, setDay] = useState<string>(DAYS[0]);
  const [num, setNum] = useState(1);
  const [sub, setSub] = useState('');
  const [room, setRoom] = useState('');
  const [noLesson, setNoLesson] = useState(false);
  const [saving, setSaving] = useState(false);

  const d = DICT[lang] || DICT.ru;
  const classUpdates = updates.filter((u) => u.cls === cls);

  // Ближайшие замены класса: сегодня и позже, по дате и номеру урока
  const upcoming = useMemo(
    () =>
      classReplacements
        .filter((r) => r.date >= todayKey)
        .sort((a, b) => (a.date === b.date ? a.num - b.num : a.date < b.date ? -1 : 1)),
    [classReplacements, todayKey]
  );

  const resetForm = () => {
    setSub('');
    setRoom('');
    setNoLesson(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subject = noLesson ? 'Урока не будет' : sub.trim();
    if (!subject) return;

    if (mode === 'me') {
      onAddUpdate({ id: `${cls}-${day}-${num}-${Date.now()}`, cls, day, num, sub: subject, room: room.trim() });
      onShowToast('Урок сохранён ✨');
    } else {
      setSaving(true);
      const ok = await onAddClassReplacement({ date, num, sub: subject, room: room.trim() });
      setSaving(false);
      if (!ok) {
        onShowToast('Не удалось отправить замену. Проверь интернет.');
        return;
      }
      onShowToast('Замена отправлена всему классу 📣');
    }
    resetForm();
    playSound('coin', soundProfile);
    doVibro(vibro, 20);
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
      active ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'text-white/70 hover:bg-white/10'
    }`;

  return (
    <div className="card screen-enter space-y-4">
      <div>
        <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
          <span>✏️</span>
          <span>Замены и своё расписание — {cls}</span>
        </h2>
        <p className="text-xs text-white/70">
          {mode === 'class'
            ? 'Замена на конкретный день появится в расписании у всего класса.'
            : 'Постоянное изменение по дню недели. Видно только тебе.'}
        </p>
      </div>

      <div className="flex gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10">
        <button
          type="button"
          className={tabClass(mode === 'class')}
          onClick={() => (canShare ? setMode('class') : onShowToast('🔒 Замены для класса — только с кодом класса'))}
        >
          {canShare ? <Users className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span>Замена для класса</span>
        </button>
        <button type="button" className={tabClass(mode === 'me')} onClick={() => setMode('me')}>
          <User className="w-3.5 h-3.5" />
          <span>Только для меня</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {mode === 'class' ? (
            <div>
              <label className="text-xs font-bold text-white/70">День</label>
              <div className="flex gap-1.5">
                <button type="button" className={`choice !py-2 !px-3 text-xs ${date === todayKey ? 'active' : ''}`} onClick={() => setDate(todayKey)}>
                  Сегодня
                </button>
                <button type="button" className={`choice !py-2 !px-3 text-xs ${date === tomorrowKey ? 'active' : ''}`} onClick={() => setDate(tomorrowKey)}>
                  Завтра
                </button>
                <input
                  type="date"
                  value={date}
                  min={todayKey}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="flex-1 min-w-0 text-sm px-2 py-2"
                  aria-label="Другая дата"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-white/70">День недели</label>
              <select value={day} onChange={(e) => setDay(e.target.value)} className="cursor-pointer text-sm w-full">
                {DAYS.map((dName) => (
                  <option key={dName} value={dName}>
                    {dName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-white/70">Номер урока</label>
            <select value={num} onChange={(e) => setNum(Number(e.target.value))} className="cursor-pointer text-sm w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} урок
                </option>
              ))}
            </select>
          </div>
        </div>

        {mode === 'class' && (
          <label className="flex items-center gap-2 text-xs font-bold text-white/80 cursor-pointer !m-0">
            <input type="checkbox" checked={noLesson} onChange={(e) => setNoLesson(e.target.checked)} className="w-4 h-4" />
            <span>Урока не будет</span>
          </label>
        )}

        {!noLesson && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-white/70">Предмет</label>
              <input type="text" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Например: Алгебра" className="text-sm w-full" maxLength={60} />
            </div>
            <div>
              <label className="text-xs font-bold text-white/70">Кабинет</label>
              <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="324" className="text-sm w-full" maxLength={20} />
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn green w-full justify-center text-sm py-3 mt-2 shadow-md disabled:opacity-60">
          <Plus className="w-4 h-4" />
          <span>{mode === 'class' ? (saving ? 'Отправляю…' : 'Отправить замену классу') : d.save}</span>
        </button>
      </form>

      <div className="border-t border-white/10 pt-3">
        {mode === 'class' ? (
          <>
            <h3 className="text-sm font-black text-white/80 mb-2">Ближайшие замены класса ({upcoming.length}):</h3>
            <div className="space-y-2">
              {upcoming.length > 0 ? (
                upcoming.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="min-w-0">
                      <b className="text-sm text-cyan-200">
                        {r.date === todayKey ? 'Сегодня' : r.date === tomorrowKey ? 'Завтра' : RU_DATE(r.date)} · {r.num} урок
                      </b>
                      <div className="text-xs text-white/80">
                        {r.sub} {r.room ? `(каб. ${r.room})` : ''}
                      </div>
                      <div className="text-[10px] text-white/50">Добавил(а): {r.author || 'ученик'}</div>
                    </div>
                    {r.uid === myUid && (
                      <button type="button" onClick={() => onDeleteClassReplacement(r.id)} className="p-1.5 text-red-400 hover:text-red-300" title="Удалить мою замену">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-white/50">Замен пока нет</div>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-sm font-black text-white/80 mb-2">Мои изменения ({classUpdates.length}):</h3>
            <div className="space-y-2">
              {classUpdates.length > 0 ? (
                classUpdates.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <b className="text-sm text-cyan-200">
                        {u.day} · {u.num} урок
                      </b>
                      <div className="text-xs text-white/70">
                        {u.sub} {u.room ? `(каб. ${u.room})` : ''}
                      </div>
                    </div>
                    <button type="button" onClick={() => onDeleteUpdate(u.id)} className="p-1.5 text-red-400 hover:text-red-300" title="Удалить">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-white/50">Пока нет изменений</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
