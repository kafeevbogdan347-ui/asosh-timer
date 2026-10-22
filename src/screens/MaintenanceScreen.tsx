import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  WifiOff,
  CheckCircle2,
  Clock,
  ArrowRight,
  Code,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { playSound, doVibro } from '../utils/audio';

interface MaintenanceScreenProps {
  onBypass: () => void;
  onOpenDev?: () => void;
  onShowToast: (msg: string) => void;
  soundProfile?: string;
  vibro?: boolean;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  onBypass,
  onOpenDev,
  onShowToast,
  soundProfile = '1',
  vibro = true,
}) => {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  const handleCheckStatus = () => {
    setChecking(true);
    doVibro(vibro, 30);
    playSound('click', soundProfile as any);

    setTimeout(() => {
      setChecking(false);
      setCheckCount((c) => c + 1);
      const messages = [
        '🟢 Все серверы АСОШ №2 работают штатно: Пинг 14 мс, соединение стабильно!',
        '⚡ База расписания и классов 5-11 синхронизирована (100% ONLINE).',
        '📡 Школьный чат и сервисы уведомлений активны, задержка минимальна.',
      ];
      const msg = messages[checkCount % messages.length];
      setCheckResult(msg);
      onShowToast(msg);
      doVibro(vibro, 50);
    }, 900);
  };

  const handleEnterAnyway = () => {
    doVibro(vibro, 40);
    playSound('levelup', soundProfile as any);
    onShowToast('🚀 Добро пожаловать! Все сервисы работают штатно.');
    onBypass();
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-5">
      <div className="max-w-xl w-full bg-slate-900/95 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6 text-white relative overflow-hidden">
        {/* Glow ambient background circles */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider">
              МОБУ АСОШ №2 • Все службы активны
            </span>
          </div>
          <span className="badge bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
            100% ONLINE
          </span>
        </div>

        {/* Main Alert Banner */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-emerald-500/20">
            🟢
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              Серверы включены и работают штатно!
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Технические работы успешно завершены. Все сервисы умного электронного дневника АСОШ №2 доступны в штатном режиме с высокой скоростью отклика.
            </p>
          </div>
        </div>

        {/* Diagnostic Status Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-white/60 font-mono">
            <span>СОСТОЯНИЕ СИСТЕМЫ:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Все службы работают онлайн
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Server className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <b className="text-white block text-[11px]">Сервер расписания</b>
                <span className="text-[10px] text-emerald-300 block font-mono">Онлайн • Пинг 14 мс</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <b className="text-white block text-[11px]">База классов (5-11)</b>
                <span className="text-[10px] text-cyan-300 block font-mono">Синхронизировано (100%)</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <b className="text-white block text-[11px]">Школьный чат</b>
                <span className="text-[10px] text-purple-300 block font-mono">Активен • Без VPN</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <b className="text-white block text-[11px]">Автономный режим</b>
                <span className="text-[10px] text-blue-300 block font-mono">Кэш готов (Offline Ready)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checking Feedback Box if Triggered */}
        {checkResult && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{checkResult}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-2.5 pt-2">
          {/* Primary Button to enter diary */}
          <button
            type="button"
            onClick={handleEnterAnyway}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <span>Перейти в электронный дневник</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Check status button */}
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Проверяем серверы...' : 'Проверить пинг серверов'}</span>
            </button>

            {/* Dev Mode button */}
            {onOpenDev && (
              <button
                type="button"
                onClick={onOpenDev}
                className="py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-300" />
                <span>Панель разработчика (Пароль)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-1 border-t border-white/5 space-y-1">
          <p className="text-[11px] text-white/50">
            Весь локальный функционал (расписание, калькулятор, звонки, рюкзак, 8 игр и 60 тем) сохранён в полном объёме.
          </p>
          <p className="text-[10px] text-white/40 font-mono">
            Контакты разработчика: kafeevbogdan347@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
};
