import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import { LEVELS, Level, makeTask } from './MultiplyGame';
import { DUEL_LIMIT_MS, DUEL_TASKS, DuelRoom, createDuel, joinDuel, leaveDuel, reportDuel, seededRandom, startDuel, subscribeDuel } from '../services/duel';
import { myUid } from '../services/classShared';

// Онлайн-дуэль: один создаёт комнату и говорит код, второй вводит код на своём телефоне.
// Оба решают одни и те же 10 примеров; видно, сколько решил соперник. Кто первым решил все — победил.

interface OnlineDuelProps {
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  playerName: string;
  cls: string;
}

type Phase = 'menu' | 'room' | 'countdown' | 'play' | 'result';

export const OnlineDuel: React.FC<OnlineDuelProps> = ({ soundProfile, vibro, onShowToast, playerName, cls }) => {
  const name = playerName.trim() || 'Ученик';
  const [level, setLevel] = useState<Level>('easy');
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<DuelRoom | null>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [busy, setBusy] = useState(false);
  const [solved, setSolved] = useState(0);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const [left, setLeft] = useState(3);
  const t0 = useRef(0);
  const finishedMs = useRef<number | null>(null);
  const roomRef = useRef<DuelRoom | null>(null);
  roomRef.current = room;
  const uid = myUid();

  // Подписка на комнату
  useEffect(() => {
    if (!code) return;
    let seen = false;
    const stop = subscribeDuel(code, (r) => {
      if (!r && seen && roomRef.current?.host !== myUid()) {
        onShowToast('Соперник закрыл дуэль');
        setPhase('menu');
        setCode('');
      }
      if (r) seen = true;
      setRoom(r);
    });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Уходим со вкладки — комнату создателя удаляем, чтобы код не висел
  useEffect(
    () => () => {
      if (code) leaveDuel(code, roomRef.current);
    },
    [code]
  );

  // Появился start — у обоих отсчёт 3 секунды
  useEffect(() => {
    if (phase === 'room' && room?.start) {
      setPhase('countdown');
      setSolved(0);
      setInput('');
      finishedMs.current = null;
      t0.current = performance.now() + 3000;
      playSound('warn', soundProfile);
    }
  }, [room?.start, phase, soundProfile]);

  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'play') return;
    const id = setInterval(() => {
      const now = performance.now();
      if (phase === 'countdown') {
        const s = Math.ceil((t0.current - now) / 1000);
        setLeft(s);
        if (s <= 0) {
          setPhase('play');
          playSound('bell', soundProfile);
        }
      } else if (now - t0.current > DUEL_LIMIT_MS) {
        setPhase('result');
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, soundProfile]);

  const tasks = useMemo(() => {
    if (!room) return [];
    const r = seededRandom(room.seed);
    return Array.from({ length: DUEL_TASKS }, () => makeTask(room.level, r));
  }, [room?.seed, room?.level]); // eslint-disable-line react-hooks/exhaustive-deps

  const me = room?.players?.[uid];
  const oppUid = room ? (room.host === uid ? room.guest : room.host) : undefined;
  const opp = oppUid ? room?.players?.[oppUid] : undefined;

  // Оба закончили (или соперник закончил, а у меня всё решено) — итог
  useEffect(() => {
    if (phase === 'play' && me?.done && opp?.done) setPhase('result');
  }, [phase, me?.done, opp?.done]);

  const create = async () => {
    setBusy(true);
    try {
      const c = await createDuel(level, name, cls);
      setCode(c);
      setPhase('room');
      playSound('coin', soundProfile);
    } catch {
      onShowToast('Нужен интернет, чтобы создать дуэль');
    }
    setBusy(false);
  };

  const join = async () => {
    const c = codeInput.trim();
    if (!/^\d{4}$/.test(c)) {
      onShowToast('Код дуэли — 4 цифры');
      return;
    }
    setBusy(true);
    try {
      const res = await joinDuel(c, name, cls);
      if (res === 'ok') {
        setCode(c);
        setPhase('room');
        playSound('coin', soundProfile);
      } else onShowToast(res === 'full' ? 'В этой дуэли уже два игрока' : 'Дуэль с таким кодом не найдена');
    } catch {
      onShowToast('Нужен интернет, чтобы войти в дуэль');
    }
    setBusy(false);
  };

  const exit = () => {
    if (code) leaveDuel(code, room);
    setCode('');
    setRoom(null);
    setPhase('menu');
  };

  const type = (ch: string) => {
    if (phase !== 'play' || solved >= DUEL_TASKS) return;
    if (ch === 'del') {
      setInput((v) => v.slice(0, -1));
      return;
    }
    const task = tasks[solved];
    const v = (input + ch).slice(0, 5);
    if (Number(v) === task.answer) {
      const n = solved + 1;
      setSolved(n);
      setInput('');
      playSound(n === DUEL_TASKS ? 'victory' : 'coin', soundProfile);
      doVibro(vibro, 12);
      if (n === DUEL_TASKS) {
        finishedMs.current = performance.now() - t0.current;
        reportDuel(code, { name, cls, score: n, done: true, ms: finishedMs.current });
      } else reportDuel(code, { name, cls, score: n });
      return;
    }
    if (v.length >= String(task.answer).length) {
      setInput('');
      setWrong(true);
      setTimeout(() => setWrong(false), 250);
      playSound('buzzer', soundProfile);
      return;
    }
    setInput(v);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play') return;
      if (/^[0-9]$/.test(e.key)) type(e.key);
      else if (e.key === 'Backspace') type('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Итог партии
  const verdict = (() => {
    const myMs = me?.done ? me.ms ?? Infinity : Infinity;
    const opMs = opp?.done ? opp.ms ?? Infinity : Infinity;
    if (myMs !== opMs) return myMs < opMs ? 'win' : 'lose';
    const a = me?.score || 0;
    const b = opp?.score || 0;
    return a === b ? 'draw' : a > b ? 'win' : 'lose';
  })();
  useEffect(() => {
    if (phase !== 'result') return;
    playSound(verdict === 'win' ? 'victory' : verdict === 'lose' ? 'gameover' : 'star', soundProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const bar = (n: number, color: string) => (
    <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(n / DUEL_TASKS) * 100}%` }} />
    </div>
  );

  if (phase === 'menu') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-white/60">Одни и те же 10 примеров у тебя и у соперника на другом телефоне. Кто быстрее решит все — победил.</p>
        <div className="grid grid-cols-3 gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`p-2 rounded-xl border text-[11px] font-bold leading-tight cursor-pointer ${
                level === l.id ? 'bg-purple-500/30 border-purple-300 text-white' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              {l.label}
              <span className="block text-[10px] font-normal text-white/60">{l.desc}</span>
            </button>
          ))}
        </div>
        <button type="button" disabled={busy} onClick={create} className="btn orange w-full justify-center text-xs py-2.5">
          {busy ? 'Подключаемся…' : 'Создать дуэль и получить код'}
        </button>
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            maxLength={4}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Код от друга"
            className="flex-1 text-center font-mono font-black tracking-[0.3em] placeholder:tracking-normal placeholder:font-normal"
          />
          <button type="button" disabled={busy} onClick={join} className="btn darkBtn text-xs px-4 py-2.5 w-auto">
            Войти
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'room') {
    const isHost = room?.host === uid;
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-400/40">
          <div className="text-[11px] text-white/60">Код дуэли</div>
          <div className="text-4xl font-black font-mono tracking-[0.25em] text-purple-200">{code}</div>
          <div className="text-[11px] text-white/60 mt-1">{LEVELS.find((l) => l.id === room?.level)?.label} · {LEVELS.find((l) => l.id === room?.level)?.desc}</div>
        </div>
        {opp ? (
          <div className="text-xs font-bold text-emerald-300">
            Соперник: {opp.name}
            {opp.cls ? ` (${opp.cls})` : ''}
          </div>
        ) : (
          <div className="text-xs text-white/70 animate-pulse">{isHost ? 'Скажи код другу — ждём, пока он войдёт…' : 'Подключаемся…'}</div>
        )}
        {isHost ? (
          <button type="button" disabled={!opp} onClick={() => startDuel(code)} className="btn orange w-full justify-center text-xs py-2.5 disabled:opacity-40">
            Начать!
          </button>
        ) : (
          opp && <div className="text-xs text-white/70">Ждём, пока {opp.name} нажмёт «Начать»</div>
        )}
        <button type="button" onClick={exit} className="text-[11px] text-white/50 underline cursor-pointer">
          Выйти из дуэли
        </button>
      </div>
    );
  }

  if (phase === 'countdown') {
    return <div className="py-14 text-6xl font-black text-purple-200">{Math.max(1, left)}</div>;
  }

  if (phase === 'play') {
    const task = tasks[solved];
    return (
      <div className="space-y-3">
        <div className="space-y-1.5 text-left text-[11px] font-bold">
          <div className="flex justify-between text-cyan-200">
            <span>Ты</span>
            <span>
              {solved}/{DUEL_TASKS}
            </span>
          </div>
          {bar(solved, 'bg-cyan-400')}
          <div className="flex justify-between text-rose-200">
            <span>{opp?.name || 'Соперник'}</span>
            <span>
              {opp?.score || 0}/{DUEL_TASKS}
            </span>
          </div>
          {bar(opp?.score || 0, 'bg-rose-400')}
        </div>
        {solved < DUEL_TASKS ? (
          <>
            <div className={`py-4 rounded-2xl border-2 text-3xl font-black font-mono text-white transition-colors ${wrong ? 'border-rose-500 bg-rose-950/40' : 'border-purple-400/50 bg-slate-950'}`}>
              {task.text.includes('^') ? (
                <>
                  {task.text.split('^')[0]}
                  <sup className="text-lg">{task.text.split('^')[1]}</sup>
                </>
              ) : (
                task.text
              )}
              <div className="text-xl text-purple-200 mt-1 min-h-[1.75rem]">{input || '?'}</div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    type(k);
                  }}
                  className={`py-3 rounded-xl bg-white/8 border border-white/12 text-lg font-black text-white active:scale-95 active:bg-purple-500/40 select-none cursor-pointer ${k === '0' ? 'col-span-2' : ''}`}
                >
                  {k === 'del' ? '⌫' : k}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="py-6 text-sm font-bold text-emerald-300">
            Все решены за {((finishedMs.current || 0) / 1000).toFixed(1)} с! Ждём соперника…
          </div>
        )}
      </div>
    );
  }

  // result
  return (
    <div className="space-y-3">
      <div className={`text-2xl font-black ${verdict === 'win' ? 'text-emerald-300' : verdict === 'lose' ? 'text-rose-300' : 'text-amber-300'}`}>
        {verdict === 'win' ? '🏆 Победа!' : verdict === 'lose' ? 'Поражение' : 'Ничья'}
      </div>
      <div className="text-xs text-white/80 space-y-1">
        <div>
          Ты: {me?.score || 0}/{DUEL_TASKS}
          {me?.done && me.ms !== undefined ? ` за ${(me.ms / 1000).toFixed(1)} с` : ''}
        </div>
        <div>
          {opp?.name || 'Соперник'}: {opp?.score || 0}/{DUEL_TASKS}
          {opp?.done && opp.ms !== undefined ? ` за ${(opp.ms / 1000).toFixed(1)} с` : ''}
        </div>
      </div>
      <button type="button" onClick={exit} className="btn orange w-full justify-center text-xs py-2.5">
        Новая дуэль
      </button>
    </div>
  );
};
