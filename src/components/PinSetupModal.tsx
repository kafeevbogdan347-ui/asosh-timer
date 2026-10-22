import React, { useState } from 'react';
import { Shield, Lock, X, Check, KeyRound, AlertCircle } from 'lucide-react';
import { savePin, disablePin, isPinEnabled } from '../utils/privacy';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (enabled: boolean) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const hasExistingPin = isPinEnabled();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigitPress = (digit: string) => {
    setError(null);
    if (step === 'enter') {
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 4) {
          setTimeout(() => setStep('confirm'), 150);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          // Check if match
          if (next === pin) {
            savePin(pin);
            onUpdated(true);
            onClose();
          } else {
            setError('PIN-коды не совпадают. Попробуйте снова.');
            setTimeout(() => {
              setPin('');
              setConfirmPin('');
              setStep('enter');
            }, 800);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin((p) => p.slice(0, -1));
    } else {
      setConfirmPin((p) => p.slice(0, -1));
    }
    setError(null);
  };

  const handleRemovePin = () => {
    disablePin();
    onUpdated(false);
    onClose();
  };

  const currentVal = step === 'enter' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 grid place-items-center text-amber-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <b className="text-sm text-white">
                {hasExistingPin ? 'Настройка PIN-кода' : 'Установка PIN-кода'}
              </b>
              <div className="text-[10px] text-cyan-300">Защита от подглядывания</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-white/80 text-center">
          {step === 'enter'
            ? 'Придумайте 4-значный PIN-код для входа в приложение:'
            : 'Повторите 4-значный PIN-код для подтверждения:'}
        </p>

        {/* Dots */}
        <div className="flex items-center justify-center gap-3 py-1">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < currentVal.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  filled
                    ? 'bg-amber-400 border-amber-300 scale-110 shadow-md shadow-amber-400/30'
                    : 'bg-white/10 border-white/30'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs text-center flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Small keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="h-11 rounded-xl bg-white/8 hover:bg-white/15 active:bg-amber-500/30 border border-white/10 text-lg font-bold text-white transition-all active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPin('');
              setConfirmPin('');
              setStep('enter');
            }}
            className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-white/60"
          >
            Сброс
          </button>
          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-11 rounded-xl bg-white/8 hover:bg-white/15 active:bg-amber-500/30 border border-white/10 text-lg font-bold text-white transition-all active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {hasExistingPin && (
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleRemovePin}
              className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-300 text-xs font-bold transition-colors"
            >
              Отключить PIN-код
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
