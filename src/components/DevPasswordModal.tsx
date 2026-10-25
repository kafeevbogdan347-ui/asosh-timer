import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  X,
  HelpCircle,
  Clock,
  Terminal,
} from 'lucide-react';
import {
  verifyDevPassword,
  checkDevLockout,
  recordFailedDevAttempt,
  resetFailedDevAttempts,
} from '../utils/privacy';
import { playSound } from '../utils/audio';
import { SoundProfileType } from '../types';

interface DevPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
}

export const DevPasswordModal: React.FC<DevPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  soundProfile,
  vibro,
  onShowToast,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [lockoutSec, setLockoutSec] = useState<number>(0);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Check lockout on mount and interval
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setErrorMsg(null);
      setShake(false);
      setShowHint(false);
      return;
    }

    const { locked, remainingSec } = checkDevLockout();
    if (locked) {
      setLockoutSec(remainingSec);
    } else {
      setLockoutSec(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (lockoutSec <= 0) return;
    const timer = setInterval(() => {
      setLockoutSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSec]);

  if (!isOpen) return null;

  const triggerVibro = (pattern: number | number[]) => {
    if (vibro && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (lockoutSec > 0) {
      onShowToast(`⏳ Доступ заблокирован на ${lockoutSec} сек. из-за перебора паролей`);
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Введите пароль разработчика');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      triggerVibro(50);
      playSound('warn', soundProfile as any);
      return;
    }

    const isValid = await verifyDevPassword(password);

    if (isValid) {
      resetFailedDevAttempts();
      triggerVibro([40, 60, 40]);
      playSound('levelup', soundProfile as any);
      onShowToast('🔓 Доступ в панель разработчика разрешён');
      setPassword('');
      setErrorMsg(null);
      onSuccess();
    } else {
      const lockRes = recordFailedDevAttempt();
      triggerVibro([80, 100, 80]);
      playSound('buzzer', soundProfile as any);
      setShake(true);
      setTimeout(() => setShake(false), 600);

      if (lockRes.locked) {
        setLockoutSec(lockRes.remainingSec);
        setErrorMsg(`Слишком много неверных попыток! Блокировка на ${lockRes.remainingSec} сек.`);
        onShowToast(`🚫 Блокировка ввода пароля на ${lockRes.remainingSec} сек.`);
      } else {
        setErrorMsg('Неверный пароль разработчика! Доступ запрещён.');
        onShowToast('❌ Неверный пароль панели разработчика');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-5 transition-transform duration-200 ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            triggerVibro(20);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-wide text-white">
                Панель разработчика
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-400/40 rounded-md font-bold">
                Вход по паролю
              </span>
            </div>
            <p className="text-xs text-white/60">
              МОУ АСОШ №2 • Режим Dev Suite
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Вход без пароля запрещён! Доступ открыт только администраторам и разработчикам школы.
          </span>
        </div>

        {/* Lockout Notice if active */}
        {lockoutSec > 0 && (
          <div className="p-3.5 bg-red-500/15 border border-red-400/40 rounded-2xl flex items-center gap-3 text-xs text-red-200 animate-pulse">
            <Clock className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <b className="block font-bold">Ввод временно заблокирован</b>
              <span className="text-[11px] text-red-300/80">
                Повторная попытка через: <span className="font-mono font-bold text-white">{lockoutSec} сек.</span>
              </span>
            </div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Мастер-пароль разработчика:
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3 h-3" /> Скрыть
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" /> Показать
                  </>
                )}
              </button>
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                disabled={lockoutSec > 0}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Введите пароль..."
                className={`w-full px-4 py-3 bg-black/40 rounded-2xl border text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all font-mono ${
                  errorMsg
                    ? 'border-red-500/70 bg-red-500/5'
                    : 'border-white/15 focus:border-cyan-400'
                } ${lockoutSec > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            {errorMsg && (
              <p className="text-[11px] text-red-400 font-medium flex items-center gap-1 mt-1 animate-fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>

          {/* Quick preset keys / Hint Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="text-[11px] text-white/50 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{showHint ? 'Скрыть подсказку' : 'Забыли пароль разработчика?'}</span>
            </button>

            {showHint && (
              <div className="mt-2 p-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/70 space-y-1 animate-fade-in">
                <p>
                  🔑 Пароль разработчика задаётся при сборке приложения (переменная DEV_PASSWORD).
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                triggerVibro(20);
                onClose();
              }}
              className="btn text-xs justify-center py-2.5 font-bold bg-white/10 hover:bg-white/15 text-white/80 border border-white/10 rounded-2xl cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={lockoutSec > 0}
              className={`btn text-xs justify-center py-2.5 font-black flex items-center gap-1.5 rounded-2xl cursor-pointer transition-all shadow-lg shadow-cyan-500/20 ${
                lockoutSec > 0
                  ? 'bg-slate-700 text-white/40 cursor-not-allowed border-transparent'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950'
              }`}
            >
              <Unlock className="w-4 h-4 text-slate-950" />
              <span>Войти в Dev</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
