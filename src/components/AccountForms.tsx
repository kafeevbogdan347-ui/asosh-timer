import React, { useState } from 'react';
import { Account, ChildLink, loginAccount, registerAccount } from '../services/accounts';
import { checkClassCode } from '../data/classCodes';
import { ALL_SUBJECTS } from '../data/schoolSchedule';
import { checkRealName } from '../utils/realName';
import { getLocalTeacher } from '../services/teacher';

export interface AccountDone {
  account: Account;
  parentCode?: string;
  child?: ChildLink;
  fullName?: string; // полное имя ученика — остаётся только на телефоне
}

interface Props {
  onDone: (res: AccountDone) => void;
  onSkip?: () => void; // «Без регистрации»
  startMode?: Mode;
}

type Mode = 'choose' | 'student' | 'teacher' | 'parent' | 'login' | 'pcode';

const Field: React.FC<{ id: string; label: string; hint?: string; children: React.ReactNode }> = ({ id, label, hint, children }) => (
  <div className="text-left space-y-1">
    <label htmlFor={id} className="text-xs font-bold text-white/70">
      {label}
    </label>
    {children}
    {hint && <p className="text-[11px] text-white/50">{hint}</p>}
  </div>
);

const ROLES: { mode: Mode; icon: string; title: string; sub: string }[] = [
  { mode: 'student', icon: '🎒', title: 'Я ученик', sub: 'Логин и пароль, код класса' },
  { mode: 'teacher', icon: '👩‍🏫', title: 'Я учитель', sub: 'Журнал и оценки, нужен код учителя' },
  { mode: 'parent', icon: '👨‍👩‍👧', title: 'Я родитель', sub: 'Оценки и домашка ребёнка, нужен его код' },
  { mode: 'login', icon: '🔑', title: 'У меня есть аккаунт', sub: 'Войти по логину и паролю' },
];

export const AccountForms: React.FC<Props> = ({ onDone, onSkip, startMode = 'choose' }) => {
  const [mode, setMode] = useState<Mode>(startMode);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [code, setCode] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<AccountDone | null>(null);

  const go = (m: Mode) => {
    setMode(m);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await loginAccount(login, password);
        if ('error' in res) return setError(res.error);
        return onDone({ account: res.account });
      }
      if (mode === 'student') {
        const nameCheck = checkRealName(first, last);
        if ('error' in nameCheck) return setError(nameCheck.error);
        const cc = await checkClassCode(code);
        if (cc.status !== 'ok') return setError(cc.status === 'error' ? 'Не получилось проверить код' : 'Неверный код класса. Его даёт классный руководитель');
        const res = await registerAccount({ role: 'student', login, password, name: nameCheck.shortName, cls: cc.info.className });
        if ('error' in res) return setError(res.error);
        const result = { account: res.account, parentCode: res.parentCode, fullName: `${first.trim()} ${last.trim()}` };
        setDone(result);
        return go('pcode');
      }
      if (mode === 'teacher') {
        if (name.trim().length < 3) return setError('Напишите, как к вам обращаться, например «Мария Ивановна»');
        if (!subjects.length) return setError('Выберите хотя бы один предмет');
        const res = await registerAccount({ role: 'teacher', login, password, name, subjects, teacherCode: code });
        if ('error' in res) return setError(res.error);
        return onDone({ account: res.account });
      }
      if (mode === 'parent') {
        if (name.trim().length < 2) return setError('Напишите своё имя, например «Ольга Петровна»');
        const res = await registerAccount({ role: 'parent', login, password, name, parentCode: code });
        if ('error' in res) return setError(res.error);
        return onDone({ account: res.account, child: res.child });
      }
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="space-y-2.5">
        {ROLES.map((r) => (
          <button key={r.mode} type="button" className="role-card" onClick={() => go(r.mode)}>
            <span className="text-3xl">{r.icon}</span>
            <span className="min-w-0 text-left">
              <b className="block text-base">{r.title}</b>
              <span className="block text-xs opacity-70">{r.sub}</span>
            </span>
          </button>
        ))}
        {onSkip && (
          <button type="button" className="w-full text-xs font-bold text-white/60 hover:text-white/90 py-2 cursor-pointer" onClick={onSkip}>
            Без регистрации — только на этом телефоне
          </button>
        )}
      </div>
    );
  }

  if (mode === 'pcode' && done) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">🎉</div>
        <b className="text-lg block">Аккаунт создан!</b>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/15 space-y-2">
          <div className="text-xs font-bold text-white/70">Код для родителей</div>
          <div className="text-3xl font-black tracking-widest text-cyan-300 font-mono select-all">{done.parentCode}</div>
          <p className="text-xs text-white/70">
            Дай его маме или папе: они зарегистрируются как родитель и увидят твои оценки и домашку. Код всегда есть в разделе «📒 Дневник».
          </p>
        </div>
        <p className="text-[11px] text-white/50">Оценки появятся, когда классный руководитель подтвердит тебя в списке класса.</p>
        <button type="button" className="btn green w-full justify-center py-3 font-black" onClick={() => onDone(done)}>
          Дальше
        </button>
      </div>
    );
  }

  const title = mode === 'student' ? '🎒 Регистрация ученика' : mode === 'teacher' ? '👩‍🏫 Регистрация учителя' : mode === 'parent' ? '👨‍👩‍👧 Регистрация родителя' : '🔑 Вход';

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="flex items-center justify-between gap-2">
        <b className="text-lg">{title}</b>
        <button type="button" className="text-xs font-bold text-white/60 hover:text-white cursor-pointer" onClick={() => go('choose')}>
          ← Назад
        </button>
      </div>

      {mode === 'student' && (
        <div className="grid grid-cols-2 gap-2">
          <Field id="acc-first" label="Имя">
            <input id="acc-first" type="text" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Иван" className="w-full" />
          </Field>
          <Field id="acc-last" label="Фамилия">
            <input id="acc-last" type="text" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} placeholder="Петров" className="w-full" />
          </Field>
        </div>
      )}
      {mode === 'student' && <p className="text-[11px] text-white/50 text-left -mt-1">Учителя увидят «Иван П.» — полная фамилия остаётся только на телефоне.</p>}

      {(mode === 'teacher' || mode === 'parent') && (
        <Field id="acc-name" label={mode === 'teacher' ? 'Как к вам обращаться' : 'Ваше имя'}>
          <input
            id="acc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === 'teacher' ? 'Мария Ивановна' : 'Ольга Петровна'}
            className="w-full"
          />
        </Field>
      )}

      {mode === 'teacher' && (
        <div className="text-left space-y-1">
          <div className="text-xs font-bold text-white/70">Предметы</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`choice !py-1.5 !px-2.5 !text-xs ${subjects.includes(s) ? 'active' : ''}`}
                onClick={() => setSubjects(subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s])}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field id="acc-login" label="Логин" hint={mode === 'login' ? undefined : 'Латинские буквы и цифры, например ivan_petrov'}>
        <input
          id="acc-login"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="ivan_petrov"
          className="w-full"
        />
      </Field>
      <Field id="acc-pass" label="Пароль" hint={mode === 'login' ? undefined : 'Минимум 8 символов. Запомни его — восстановить пароль можно только через администратора'}>
        <div className="flex gap-2">
          <input
            id="acc-pass"
            type={showPass ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
          <button type="button" className="btn darkBtn !px-3 text-xs shrink-0" onClick={() => setShowPass(!showPass)}>
            {showPass ? 'Скрыть' : 'Показать'}
          </button>
        </div>
      </Field>

      {mode !== 'login' && (
        <Field
          id="acc-code"
          label={mode === 'student' ? 'Код класса' : mode === 'teacher' ? 'Код учителя' : 'Код ребёнка'}
          hint={
            mode === 'student'
              ? 'Даёт классный руководитель, например 7А-123456'
              : mode === 'teacher'
                ? getLocalTeacher()
                  ? 'Вы уже вошли кодом на этом телефоне — код можно не вводить'
                  : 'Одноразовый, выдаёт администратор приложения'
                : 'Ребёнок найдёт его у себя: «📒 Дневник» → «Код для родителей»'
          }
        >
          <input
            id="acc-code"
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={mode === 'student' ? '7А-123456' : mode === 'teacher' ? 'ABCD-EFGH-JKLM' : 'K7QM-2XPA'}
            className="w-full font-mono uppercase"
          />
        </Field>
      )}

      {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-xl p-2.5 text-left">{error}</div>}

      <button type="submit" disabled={busy} className="btn green w-full justify-center py-3 font-black disabled:opacity-60">
        {busy ? 'Секунду…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
      </button>
    </form>
  );
};
