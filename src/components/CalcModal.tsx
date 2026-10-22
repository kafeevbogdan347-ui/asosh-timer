import React, { useState } from 'react';
import { X, Delete, History } from 'lucide-react';
import { evaluateSafe } from '../utils/calculator';
import { playSound, doVibro } from '../utils/audio';
import { SoundProfileType } from '../types';

interface CalcModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundProfile: SoundProfileType;
  vibro: boolean;
}

export const CalcModal: React.FC<CalcModalProps> = ({
  isOpen,
  onClose,
  soundProfile,
  vibro,
}) => {
  const [expr, setExpr] = useState('');
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  if (!isOpen) return null;

  const handleInput = (char: string) => {
    playSound('click', soundProfile);
    doVibro(vibro, 10);

    if (char === 'C') {
      setExpr('');
      setDisplay('0');
    } else if (char === 'DEL') {
      if (expr.length > 0) {
        const next = expr.slice(0, -1);
        setExpr(next);
        setDisplay(next || '0');
      }
    } else if (char === '+/-') {
      if (expr) {
        if (expr.startsWith('-')) {
          const next = expr.slice(1);
          setExpr(next);
          setDisplay(next || '0');
        } else {
          const next = '-' + expr;
          setExpr(next);
          setDisplay(next);
        }
      }
    } else if (char === '=') {
      if (!expr) return;
      const res = evaluateSafe(expr);
      if (res.success) {
        setHistory((prev) => [`${expr} = ${res.result}`, ...prev.slice(0, 15)]);
        setDisplay(res.result);
        setExpr(res.result);
        playSound('coin', soundProfile);
      } else {
        setDisplay(res.error || 'Ошибка');
        playSound('gameover', soundProfile);
      }
    } else {
      let next = expr;
      if (['+', '-', '*', '/', '%', '^'].includes(char) && ['+', '-', '*', '/', '^'].includes(expr.slice(-1))) {
        next = expr.slice(0, -1) + char;
      } else {
        next = expr + char;
      }
      setExpr(next);
      setDisplay(next);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] bg-slate-900/95 border border-white/20 rounded-3xl p-5 shadow-2xl text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2 font-black text-cyan-300">
            <span>🧮</span>
            <span>Школьный Калькулятор</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-xl border transition-colors ${
                showHistory ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-white/10 border-white/15 text-white/70'
              }`}
              title="История"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="mb-3 max-h-32 overflow-y-auto bg-black/40 p-2.5 rounded-2xl border border-white/10 text-xs text-white/80 space-y-1">
            {history.length === 0 ? (
              <div className="text-center text-white/40 py-2">История пуста</div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="font-mono text-right border-b border-white/5 pb-0.5">
                  {h}
                </div>
              ))
            )}
          </div>
        )}

        <div className="bg-black/60 border border-white/15 rounded-2xl p-3 mb-4 text-right overflow-x-auto">
          <div className="text-xs text-white/50 h-4 font-mono">{expr || ' '}</div>
          <div className="text-3xl font-black text-cyan-300 font-mono tracking-wider truncate">
            {display}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-lg font-black">
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 active:scale-95"
            onClick={() => handleInput('C')}
          >
            C
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95 flex items-center justify-center"
            onClick={() => handleInput('DEL')}
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('%')}
          >
            %
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 active:scale-95"
            onClick={() => handleInput('/')}
          >
            ÷
          </button>

          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('7')}
          >
            7
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('8')}
          >
            8
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('9')}
          >
            9
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 active:scale-95"
            onClick={() => handleInput('*')}
          >
            ×
          </button>

          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('4')}
          >
            4
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('5')}
          >
            5
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('6')}
          >
            6
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 active:scale-95"
            onClick={() => handleInput('-')}
          >
            -
          </button>

          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('1')}
          >
            1
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('2')}
          >
            2
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('3')}
          >
            3
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 active:scale-95"
            onClick={() => handleInput('+')}
          >
            +
          </button>

          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('+/-')}
          >
            ±
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('0')}
          >
            0
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/20 active:scale-95"
            onClick={() => handleInput('.')}
          >
            ,
          </button>
          <button
            type="button"
            className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black hover:opacity-90 active:scale-95 shadow-lg"
            onClick={() => handleInput('=')}
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
