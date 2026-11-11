import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { OnlineEntry, formatDuration, isOptedIn, myWeekSec, presenceLabel, setOptIn, subscribeOnline } from '../services/online';
import { myUid } from '../services/classShared';

interface Props {
  cls: string;
  isGuest: boolean;
  onShowToast: (msg: string) => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export const OnlineScreen: React.FC<Props> = ({ cls, isGuest, onShowToast }) => {
  const [list, setList] = useState<OnlineEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [optIn, setOptInState] = useState(isOptedIn);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<OnlineEntry | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => (cls ? subscribeOnline(cls, setList, () => setFailed(true)) : undefined), [cls]);
  // «в сети» пересчитываем каждые 20 с, даже если база молчит
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !optIn;
    const ok = await setOptIn(cls, next);
    setBusy(false);
    setOptInState(next);
    if (!ok) onShowToast(next ? 'Включено — появишься в рейтинге, когда будет интернет' : 'Выключено. Запись удалится, когда будет интернет');
    else onShowToast(next ? '✅ Теперь одноклассники видят тебя в рейтинге' : 'Ты скрыт из рейтинга');
  };

  const me = myUid();
  const onlineCount = (list || []).filter((e) => presenceLabel(e.last, now).online).length;

  if (isGuest) {
    return (
      <div className="card screen-enter space-y-3">
        <h2 className="text-xl font-black text-cyan-300">🏆 Онлайн класса</h2>
        <p className="text-sm text-white/75">Рейтинг виден только одноклассникам. Войди с кодом класса, чтобы его открыть.</p>
      </div>
    );
  }

  return (
    <div className="card screen-enter space-y-4">
      <div>
        <h2 className="text-xl font-black text-cyan-300">🏆 Онлайн класса {cls}</h2>
        <p className="text-xs text-white/60">Кто больше всех в АСОШ Таймере на этой неделе. Сейчас в сети: {onlineCount}</p>
      </div>

      <div className="p-3 rounded-2xl bg-white/5 border border-white/15 space-y-2">
        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <span>
            <b className="text-sm text-white block">Показывать меня в рейтинге</b>
            <span className="text-[11px] text-white/60 block">Одноклассники увидят твой ник, аватар, статус, время в приложении за неделю и в сети ли ты. Можно выключить в любой момент.</span>
          </span>
          <input type="checkbox" className="w-5 h-5 shrink-0" checked={optIn} disabled={busy} onChange={toggle} />
        </label>
        <div className="text-[11px] text-white/60">Твоё время на этой неделе: <b className="text-cyan-300">{formatDuration(myWeekSec())}</b></div>
      </div>

      {failed && <div className="text-xs text-amber-300 font-bold">Не получилось загрузить рейтинг. Проверь интернет.</div>}
      {!failed && list === null && <div className="text-xs text-white/60">Загружаю…</div>}
      {list && list.length === 0 && <div className="text-sm text-white/60">Пока в рейтинге никого. Включи «Показывать меня» — будешь первым!</div>}

      {list && list.length > 0 && (
        <div className="space-y-1.5">
          {list.map((e, i) => {
            const p = presenceLabel(e.last, now);
            return (
              <button
                key={e.uid}
                type="button"
                onClick={() => setOpen(e)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left cursor-pointer transition-colors ${e.uid === me ? 'bg-cyan-500/15 border-cyan-400/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
              >
                <span className="w-7 text-center font-black text-white/80">{MEDALS[i] || i + 1}</span>
                <span className="relative text-2xl leading-none" data-no-tr>
                  {e.avatar}
                  <span className={`online-dot ${p.online ? 'on' : ''}`} />
                </span>
                <span className="flex-1 min-w-0">
                  <b className="text-sm text-white truncate block" data-no-tr>
                    {e.nick}
                    {e.uid === me && <span className="text-cyan-300 font-bold"> · ты</span>}
                  </b>
                  <span className={`text-[11px] ${p.online ? 'text-emerald-300 font-bold' : 'text-white/50'}`}>{p.text}</span>
                </span>
                <span className="text-right">
                  <b className="text-sm text-cyan-300 block">{formatDuration(e.sec)}</b>
                  <span className="text-[10px] text-white/50">за неделю</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-white/50">Время считается, только пока приложение открыто на экране. Неделя начинается в понедельник.</p>

      {open && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-white/15 p-5 space-y-3 relative shadow-2xl" style={{ background: '#0f172a' }} onClick={(ev) => ev.stopPropagation()}>
            <button type="button" className="absolute top-3 right-3 text-white/60 cursor-pointer" onClick={() => setOpen(null)} aria-label="Закрыть">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="relative text-5xl leading-none" data-no-tr>
                {open.avatar}
                <span className={`online-dot big ${presenceLabel(open.last, now).online ? 'on' : ''}`} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white truncate" data-no-tr>{open.nick}</h3>
                <div className="text-xs text-white/60">{cls} · {presenceLabel(open.last, now).text}</div>
              </div>
            </div>
            {open.status && <div className="text-sm text-cyan-200 font-bold" data-no-tr>{open.status}</div>}
            {open.bio && <div className="text-sm text-white/80 whitespace-pre-line break-words" data-no-tr>{open.bio}</div>}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <b className="text-cyan-300 block">{formatDuration(open.sec)}</b>
                <span className="text-[11px] text-white/60">за неделю</span>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <b className="text-cyan-300 block">{(list?.findIndex((e) => e.uid === open.uid) ?? 0) + 1} место</b>
                <span className="text-[11px] text-white/60">в классе</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
