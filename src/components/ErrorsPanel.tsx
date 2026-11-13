import React, { useState } from 'react';
import { ErrorEntry, clearErrors, loadErrors } from '../services/errorLog';

// Журнал ошибок для панели разработчика: читать могут только администраторы (asosh_admins)
export const ErrorsPanel: React.FC = () => {
  const [list, setList] = useState<ErrorEntry[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle');
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    setStatus('loading');
    try {
      setList(await loadErrors());
      setStatus('idle');
    } catch (e) {
      setStatus(/permission/i.test(String((e as { code?: string })?.code || e)) ? 'denied' : 'error');
    }
  };

  // Одинаковые ошибки группируем: видно, что чаще всего ломается
  const groups = new Map<string, ErrorEntry[]>();
  (list || []).forEach((e) => {
    const k = e.msg;
    groups.set(k, [...(groups.get(k) || []), e]);
  });
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || b[1][0].t - a[1][0].t);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={load} className="btn cyan flex-1 justify-center text-xs py-2.5 cursor-pointer">
          {status === 'loading' ? 'Загружаю…' : '🔄 Загрузить ошибки'}
        </button>
        {list && list.length > 0 && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm('Удалить все записи журнала ошибок?')) return;
              try {
                await clearErrors();
                setList([]);
              } catch {
                setStatus('error');
              }
            }}
            className="btn darkBtn text-xs py-2.5 px-3 cursor-pointer"
          >
            🗑 Очистить
          </button>
        )}
      </div>
      {status === 'denied' && (
        <p className="text-xs text-amber-300">Журнал видят только администраторы: добавь свой uid в asosh_admins в консоли Firebase.</p>
      )}
      {status === 'error' && <p className="text-xs text-rose-300">Не получилось. Нужен интернет и обновлённые правила базы (asosh_errors).</p>}
      {list && list.length === 0 && <p className="text-xs text-emerald-300">Ошибок нет 🎉</p>}
      {sorted.map(([msg, items]) => {
        const last = items[0];
        const users = new Set(items.map((i) => i.uid)).size;
        const isOpen = open === msg;
        return (
          <button
            key={msg}
            type="button"
            onClick={() => setOpen(isOpen ? null : msg)}
            className="w-full text-left p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1 cursor-pointer"
          >
            <div className="flex justify-between gap-2">
              <b className="text-xs text-rose-200 break-all">{msg}</b>
              <span className="text-[10px] font-mono text-white/60 shrink-0">×{items.length} · {users} уч.</span>
            </div>
            <div className="text-[10px] text-white/50 font-mono">
              {new Date(last.t).toLocaleString('ru-RU')} · {last.ver} · {last.plat} · {last.scr || '—'}
            </div>
            {isOpen && last.stack && (
              <pre className="text-[10px] text-white/70 whitespace-pre-wrap break-all bg-black/40 p-2 rounded-xl mt-1">{last.stack}</pre>
            )}
          </button>
        );
      })}
    </div>
  );
};
