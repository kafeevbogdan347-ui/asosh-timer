import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Delete, Shield, Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react';
import { verifyPin } from '../utils/privacy';

interface PinLockModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onEmergencyMask?: () => void;
  title?: string;
  subtitle?: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onSuccess,
  onEmergencyMask,
  title = 'Защита приложения АСОШ №2',
  subtitle = 'Введите 4-значный PIN-код для доступа',
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showDigits, setShowDigits] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [lockTimer, setLockTimer] = useState<number>(0);

  // Countdown timer for lockout after 3 fails
  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockTimer]);

  // Handle keyboard inputs
  useEffect(() => {
    if (!isOpen || lockTimer > 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' && onEmergencyMask) {
        onEmergencyMask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, lockTimer]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (lockTimer > 0) return;
    if (pin.length >= 4) return;

    const next = pin + digit;
    setPin(next);
    setErrorMsg(null);

    if (next.length === 4) {
      // Check PIN
      setTimeout(() => {
        if (verifyPin(next)) {
          setPin('');
          setFailedCount(0);
          onSuccess();
        } else {
          setShake(true);
          const newFails = failedCount + 1;
          setFailedCount(newFails);

          if (newFails >= 3) {
            setLockTimer(30);
            setErrorMsg('Слишком много попыток. Защитная блокировка на 30 секунд.');
          } else {
            setErrorMsg(`Неверный PIN-код (попытка ${newFails} из 3)`);
          }

          setTimeout(() => {
            setShake(false);
            setPin('');
          }, 600);
        }
      }, 100);
    }
  };

  const handleBackspace = () => {
    if (lockTimer > 0) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (lockTimer > 0) return;
    setPin('');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-xs flex flex-col items-center text-center space-y-5">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-cyan-500/20 to-blue-500/20 border border-amber-400/40 grid place-items-center shadow-xl">
          <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="text-xs text-white/60 mt-1 max-w-[260px] mx-auto">{subtitle}</p>
        </div>

        {/* 4 Dots display */}
        <div
          className={`flex items-center justify-center gap-4 py-2 ${
            shake ? 'animate-bounce' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const hasChar = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 flex items-center justify-center text-xs font-black ${
                  hasChar
                    ? 'bg-amber-400 border-amber-300 text-slate-950 scale-110 shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 border-white/30 text-transparent'
                }`}
              >
                {hasChar && showDigits ? pin[idx] : ''}
              </div>
            );
          })}
        </div>

        {/* Show / Hide Digits switch */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowDigits(!showDigits)}
            className="text-[11px] text-white/50 hover:text-white/80 flex items-center gap-1.5 transition-colors"
          >
            {showDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showDigits ? 'Скрыть символы' : 'Показать символы'}</span>
          </button>
        </div>

        {/* Error message or timer */}
        {lockTimer > 0 ? (
          <div className="p-2.5 bg-rose-500/20 border border-rose-400/40 rounded-2xl text-xs font-bold text-rose-300 flex items-center justify-center gap-2 animate-pulse w-full">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Блокировка: подождите {lockTimer} сек.</span>
          </div>
        ) : errorMsg ? (
          <div className="text-xs font-bold text-rose-400 animate-in fade-in">
            {errorMsg}
          </div>
        ) : (
          <div className="text-[11px] text-emerald-400 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Конфиденциальный доступ защищён</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={lockTimer > 0}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-white/8 hover:bg-white/15 active:bg-amber-500/30 border border-white/12 text-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Clear */}
          <button
            type="button"
            disabled={lockTimer > 0 || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-xs font-bold text-white/70 transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center"
          >
            Сброс
          </button>

          {/* Zero */}
          <button
            type="button"
            disabled={lockTimer > 0}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-white/8 hover:bg-white/15 active:bg-amber-500/30 border border-white/12 text-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shadow-sm"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            disabled={lockTimer > 0 || pin.length === 0}
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-white/80 transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Mask */}
        {onEmergencyMask && (
          <button
            type="button"
            onClick={onEmergencyMask}
            className="text-xs text-white/40 hover:text-white/70 transition-colors pt-2 underline underline-offset-4"
          >
            Экстренная маскировка («Анти-палево»)
          </button>
        )}
      </div>
    </div>
  );
};
