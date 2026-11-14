import React, { useState } from 'react';
import { ref, get } from 'firebase/database';
import { initFirebase, ensureSignedIn } from '../services/firebaseChat';

// Отчёт ИИ-агентов безопасности (.github/workflows/security.yml, каждое утро).
// Лежит в asosh_security, читать могут только администраторы (asosh_admins)
interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  file: string;
  quote: string;
  why: string;
  fix: string;
}
interface AgentReport {
  id: string;
  name: string;
  model?: string;
  summary: string;
  error?: string;
  dropped?: number;
  findings?: Finding[];
}
interface Report {
  t: number;
  commit?: string;
  agents?: AgentReport[];
  totals?: Record<string, number>;
  audit?: { critical: number; high: number; moderate: number; low: number; top?: { name: string; severity: string; fix: string }[] } | null;
}

const SEV: Record<string, { label: string; cls: string }> = {
  critical: { label: 'критично', cls: 'bg-rose-600 text-white' },
  high: { label: 'опасно', cls: 'bg-rose-500/25 text-rose-200 border border-rose-400/40' },
  medium: { label: 'средне', cls: 'bg-amber-500/20 text-amber-200 border border-amber-400/40' },
  low: { label: 'мелочь', cls: 'bg-white/10 text-white/70 border border-white/15' },
};

export const SecurityPanel: React.FC = () => {
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'denied' | 'error' | 'empty'>('idle');
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    setStatus('loading');
    try {
      const { db } = initFirebase();
      if (!db || !(await ensureSignedIn())) throw new Error('offline');
      const v = (await get(ref(db, 'asosh_security/latest'))).val() as Report | null;
      setReport(v);
      setStatus(v ? 'idle' : 'empty');
    } catch (e) {
      setStatus(/permission/i.test(String((e as { code?: string })?.code || e)) ? 'denied' : 'error');
    }
  };

  const t = report?.totals || {};
  const a = report?.audit;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-white/60 leading-relaxed">
        Каждое утро в 7:00 три ИИ-агента проверяют правила базы, код и изменения за сутки. Находки, которые ИИ не смог подтвердить строкой из кода, отбрасываются.
      </p>
      <button type="button" onClick={load} className="btn cyan w-full justify-center text-xs py-2.5 cursor-pointer">
        {status === 'loading' ? 'Загружаю…' : '🛡 Загрузить последний отчёт'}
      </button>
      {status === 'denied' && <p className="text-xs text-amber-300">Отчёт видят только администраторы: добавь свой uid в asosh_admins в консоли Firebase.</p>}
      {status === 'error' && <p className="text-xs text-rose-300">Не получилось. Нужен интернет и обновлённые правила базы (asosh_security).</p>}
      {status === 'empty' && <p className="text-xs text-white/60">Отчётов пока нет: агенты ещё ни разу не запускались.</p>}

      {report && (
        <>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[11px] text-white/60">
              {new Date(report.t).toLocaleString('ru-RU')}
              {report.commit ? ` · коммит ${report.commit}` : ''}
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              {(['critical', 'high', 'medium', 'low'] as const).map((s) => (
                <span key={s} className={`px-2 py-0.5 rounded-full ${SEV[s].cls}`}>
                  {SEV[s].label}: {t[s] || 0}
                </span>
              ))}
            </div>
            {a && (
              <div className="text-[11px] text-white/70">
                📦 Библиотеки (npm audit): критично {a.critical}, опасно {a.high}, средне {a.moderate}, мелочь {a.low}
                {(a.top || []).map((x) => (
                  <div key={x.name} className="text-white/55">
                    · {x.name} — {x.severity === 'critical' ? 'критично' : 'опасно'}, {x.fix}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(report.agents || []).map((ag) => (
            <div key={ag.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between gap-2">
                <b className="text-xs text-cyan-300">🤖 {ag.name}</b>
                <span className="text-[10px] text-white/45 font-mono shrink-0">{ag.model || ''}</span>
              </div>
              <p className="text-[11px] text-white/70">{ag.summary}</p>
              {ag.error && <p className="text-[11px] text-rose-300 break-all">{ag.error}</p>}
              {!!ag.dropped && <p className="text-[10px] text-white/45">Отброшено неподтверждённых находок: {ag.dropped}</p>}
              {(ag.findings || []).length === 0 && !ag.error && <p className="text-[11px] text-emerald-300">Ничего опасного не нашёл ✅</p>}
              {(ag.findings || []).map((f, i) => {
                const key = `${ag.id}-${i}`;
                const isOpen = open === key;
                const sev = SEV[f.severity] || SEV.low;
                return (
                  <button key={key} type="button" onClick={() => setOpen(isOpen ? null : key)} className="w-full text-left p-2.5 rounded-xl bg-black/25 border border-white/10 space-y-1 cursor-pointer">
                    <div className="flex items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${sev.cls}`}>{sev.label}</span>
                      <b className="text-xs text-white">{f.title}</b>
                    </div>
                    <div className="text-[10px] font-mono text-white/50 break-all">{f.file}</div>
                    {isOpen && (
                      <div className="space-y-1.5 pt-1">
                        <pre className="text-[10px] text-white/70 whitespace-pre-wrap break-all bg-black/40 p-2 rounded-lg">{f.quote}</pre>
                        <p className="text-[11px] text-white/75">⚠️ {f.why}</p>
                        <p className="text-[11px] text-emerald-200">🔧 {f.fix}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
