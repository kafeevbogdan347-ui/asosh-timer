import React, { useState } from 'react';
import { loadVisits, DeviceVisit } from '../services/stats';
import { toDateKey } from '../services/classShared';

// Сводка анонимной статистики для панели разработчика
const PLATFORM: Record<string, string> = { apk: '🤖 APK', android: '📱 Android (браузер)', ios: '🍏 iPhone/iPad', desktop: '💻 Компьютер' };

function countBy(list: DeviceVisit[], key: (v: DeviceVisit) => string): [string, number][] {
  const m = new Map<string, number>();
  list.forEach((v) => m.set(key(v), (m.get(key(v)) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const screenBucket = (v: DeviceVisit) =>
  v.p === 'desktop' ? 'Компьютер' : v.sw < 360 ? 'Узкий (<360)' : v.sw < 400 ? 'Обычный (360–399)' : v.sw < 600 ? 'Широкий (400–599)' : 'Планшет (600+)';

const memBucket = (v: DeviceVisit) => (!v.mem ? 'Неизвестно' : v.mem <= 2 ? '≤ 2 ГБ (слабый)' : v.mem <= 4 ? '3–4 ГБ' : '8+ ГБ');

const Rows: React.FC<{ title: string; rows: [string, number][]; total: number }> = ({ title, rows, total }) => (
  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
    <b className="text-xs text-cyan-200">{title}</b>
    {rows.map(([name, n]) => (
      <div key={name} className="text-[11px]">
        <div className="flex justify-between text-white/80">
          <span>{name}</span>
          <span className="font-mono">
            {n} · {Math.round((n / total) * 100)}%
          </span>
        </div>
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400" style={{ width: `${(n / total) * 100}%` }} />
        </div>
      </div>
    ))}
  </div>
);

export const StatsPanel: React.FC = () => {
  const [data, setData] = useState<Record<string, Record<string, DeviceVisit>> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const load = async () => {
    setStatus('loading');
    try {
      const res = await loadVisits(7);
      if (!res) throw new Error('no db');
      setData(res);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  // Последняя запись каждого устройства за неделю
  const latest = new Map<string, DeviceVisit>();
  Object.keys(data || {})
    .sort()
    .forEach((day) => Object.entries(data![day]).forEach(([uid, v]) => latest.set(uid, v as DeviceVisit)));
  const devices = [...latest.values()];
  const today = Object.keys(data?.[toDateKey(new Date())] || {}).length;
  const days = Object.keys(data || {}).sort();

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs text-white/70">
        Анонимно: без имён и классов. Каждое устройство отмечается раз в день — тип, экран, память и качество графики.
      </div>

      <button type="button" className="btn cyan w-full" onClick={load} disabled={status === 'loading'}>
        {status === 'loading' ? 'Загружаю…' : data ? '🔄 Обновить' : '📈 Загрузить статистику за 7 дней'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-rose-300">Не удалось загрузить. Нужен интернет и обновлённые правила базы (asosh_stats).</p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-2xl font-black text-cyan-300 font-mono">{today}</div>
              <div className="text-[10px] text-white/60 uppercase">Устройств сегодня</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-2xl font-black text-amber-300 font-mono">{devices.length}</div>
              <div className="text-[10px] text-white/60 uppercase">За 7 дней</div>
            </div>
          </div>

          {days.length > 0 && (
            <Rows title="По дням" rows={days.map((d) => [d.slice(5), Object.keys(data[d]).length] as [string, number])} total={Math.max(...days.map((d) => Object.keys(data[d]).length))} />
          )}

          {devices.length > 0 ? (
            <>
              <Rows title="Чем открывают" rows={countBy(devices, (v) => PLATFORM[v.p] || v.p)} total={devices.length} />
              <Rows title="Система" rows={countBy(devices, (v) => v.os)} total={devices.length} />
              <Rows title="Браузер" rows={countBy(devices, (v) => v.br)} total={devices.length} />
              <Rows title="Ширина экрана" rows={countBy(devices, screenBucket)} total={devices.length} />
              <Rows title="Память телефона" rows={countBy(devices, memBucket)} total={devices.length} />
              <Rows title="Качество графики" rows={countBy(devices, (v) => ({ eco: 'Экономия', normal: 'Обычное', ultra: 'Максимум' } as Record<string, string>)[v.q] || v.q)} total={devices.length} />
            </>
          ) : (
            <p className="text-xs text-white/60 text-center">Пока никто не отметился.</p>
          )}
        </>
      )}
    </div>
  );
};
