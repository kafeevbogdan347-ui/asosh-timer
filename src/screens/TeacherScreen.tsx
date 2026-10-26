import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CLASS_LIST } from '../data/classCodes';
import { toDateKey } from '../services/classShared';
import {
  BoardAudience,
  BoardPost,
  AUDIENCE_LABEL,
  addBoardPost,
  deleteBoardPost,
  loginTeacher,
} from '../services/teacher';

// Кабинет учителя: вход по одноразовому коду, объявления и события для классов
interface TeacherScreenProps {
  teacherName: string | null;
  cls: string;
  posts: BoardPost[];
  myUid: string;
  onLoggedIn: (name: string) => void;
  onLogout: () => void;
  onPickClass: () => void;
  onShowToast: (msg: string) => void;
}

const fmtDate = (key: string) => new Date(key + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

export const TeacherScreen: React.FC<TeacherScreenProps> = ({ teacherName, cls, posts, myUid, onLoggedIn, onLogout, onPickClass, onShowToast }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [kind, setKind] = useState<'ann' | 'event'>('ann');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [date, setDate] = useState(toDateKey(new Date()));
  const [aud, setAud] = useState<BoardAudience>('all');
  const [target, setTarget] = useState(''); // '' — вся школа

  if (!teacherName) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      const res = await loginTeacher(code, name);
      setBusy(false);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      onLoggedIn(name.trim().slice(0, 60));
      setCode('');
    };
    return (
      <div className="card screen-enter space-y-4">
        <div>
          <h2 className="text-xl font-black text-amber-300">👩‍🏫 Вход для учителя</h2>
          <p className="text-xs text-white/70">
            Код учителя выдаёт администратор приложения. Он одноразовый: после входа им нельзя войти ещё раз на другом телефоне.
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-2.5">
          <div>
            <label className="text-xs font-bold text-white/70">Код учителя</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABCD-EFGH-JKLM"
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono tracking-widest text-sm"
              maxLength={20}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white/70">Как к вам обращаться</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Мария Ивановна" maxLength={60} className="text-sm" />
          </div>
          {error && <p className="text-xs text-rose-300 font-bold">{error}</p>}
          <button type="submit" className="btn green w-full justify-center" disabled={busy}>
            {busy ? 'Проверяю код…' : 'Войти как учитель'}
          </button>
        </form>
        <p className="text-[11px] text-white/50">
          Ученикам этот раздел не нужен — им хватает кода класса от классного руководителя.
        </p>
      </div>
    );
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onShowToast('Напишите заголовок');
      return;
    }
    setBusy(true);
    const ok = await addBoardPost({
      kind,
      title: title.trim().slice(0, 120),
      text: kind === 'ann' ? text.trim().slice(0, 1000) : undefined,
      date: kind === 'event' ? date : undefined,
      aud,
      cls: target,
      author: teacherName.slice(0, 60),
    });
    setBusy(false);
    if (ok) {
      setTitle('');
      setText('');
      onShowToast(kind === 'ann' ? 'Объявление опубликовано 📢' : 'Событие добавлено в календарь 🗓');
    } else {
      onShowToast('Не получилось опубликовать. Проверьте интернет.');
    }
  };

  const mine = posts.filter((p) => p.uid === myUid);
  const colleagues = posts.filter((p) => p.aud === 'teachers' && p.uid !== myUid);

  const PostRow: React.FC<{ p: BoardPost; canDelete: boolean }> = ({ p, canDelete }) => (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <b className="text-sm block">
          {p.kind === 'ann' ? '📢' : '🗓'} {p.title}
        </b>
        {p.text && <div className="text-xs text-white/80 whitespace-pre-line break-words">{p.text}</div>}
        <div className="text-[10px] text-white/50 mt-0.5">
          {AUDIENCE_LABEL[p.aud]} · {p.cls || 'вся школа'}
          {p.date ? ` · ${fmtDate(p.date)}` : ''} · {p.author}
        </div>
      </div>
      {canDelete && (
        <button
          type="button"
          className="p-1 text-red-400 hover:text-red-300 shrink-0"
          title="Удалить"
          onClick={async () => onShowToast((await deleteBoardPost(p)) ? 'Удалено' : 'Не получилось удалить')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="card screen-enter space-y-4">
      <div>
        <h2 className="text-xl font-black text-amber-300">👩‍🏫 Кабинет учителя</h2>
        <p className="text-xs text-white/70">Здравствуйте, {teacherName}! Объявления появятся на главном экране учеников, события — в их календаре.</p>
      </div>

      <form onSubmit={handlePublish} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={`choice !py-2 text-xs ${kind === 'ann' ? 'active' : ''}`} onClick={() => setKind('ann')}>
            📢 Объявление
          </button>
          <button type="button" className={`choice !py-2 text-xs ${kind === 'event' ? 'active' : ''}`} onClick={() => setKind('event')}>
            🗓 Событие
          </button>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === 'ann' ? 'Заголовок, например: Родительское собрание' : 'Например: Контрольная по алгебре'}
          maxLength={120}
          className="text-sm"
        />
        {kind === 'ann' ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Текст объявления (необязательно)" rows={3} maxLength={1000} className="text-sm" />
        ) : (
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="text-sm" />
        )}
        <div>
          <div className="text-xs font-bold text-white/70 mb-1">Кто увидит</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.keys(AUDIENCE_LABEL) as BoardAudience[]).map((a) => (
              <button key={a} type="button" className={`choice !py-2 !px-1 text-[11px] ${aud === a ? 'active' : ''}`} onClick={() => setAud(a)}>
                {AUDIENCE_LABEL[a]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold text-white/70 mb-1">Для какого класса</div>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="text-sm">
            <option value="">Вся школа</option>
            {CLASS_LIST.map((c) => (
              <option key={c.className} value={c.className}>
                {c.className}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn green w-full justify-center" disabled={busy}>
          {busy ? 'Публикую…' : 'Опубликовать'}
        </button>
        <p className="text-[11px] text-white/50">Домашку задавайте в разделе «ДЗ» — там будет галочка «Задать классу». Личные события — в «Календаре».</p>
      </form>

      {mine.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black text-white/85">Мои публикации</h3>
          {mine.map((p) => (
            <PostRow key={p.id} p={p} canDelete />
          ))}
        </div>
      )}

      {colleagues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-black text-white/85">Для учителей</h3>
          {colleagues.map((p) => (
            <PostRow key={p.id} p={p} canDelete={false} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn darkBtn justify-center text-xs" onClick={onPickClass}>
          🏫 {cls ? `Класс: ${cls}` : 'Выбрать класс'}
        </button>
        <button type="button" className="btn darkBtn justify-center text-xs" onClick={onLogout}>
          🚪 Выйти из режима
        </button>
      </div>
      <p className="text-[11px] text-white/50">
        После выхода на этом телефоне можно снова войти тем же кодом. На другом телефоне код уже не сработает — нужен новый.
      </p>
    </div>
  );
};
