import React, { useState, useEffect } from 'react';
import { LanguageType } from '../types';
import { DICT, SPLASHES_RU, SPLASHES_BA } from '../data/constants';
import {
  checkClassCode,
  ClassCodeCheck,
  isClassUnlocked,
  saveClassUnlocked,
  ClassCodeInfo,
  CLASS_LIST,
} from '../data/classCodes';
import {
  checkClassCodeLockout,
  recordFailedClassCodeAttempt,
  resetFailedClassCodeAttempts,
} from '../utils/privacy';
import {
  KeyRound,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  X,
  AlertCircle,
  ShieldAlert,
  Shield,
} from 'lucide-react';

interface SelectClassScreenProps {
  shift: string;
  subGroup: number;
  onSelectShift: (shift: string) => void;
  onSelectSubGroup: (grp: number) => void;
  onSelectClass: (cls: string) => void;
  onLogoTap: () => void;
  onGoAbout: () => void;
  lang: LanguageType;
  timeStr: string;
  dayName: string;
}

export const SelectClassScreen: React.FC<SelectClassScreenProps> = ({
  shift,
  subGroup,
  onSelectShift,
  onSelectSubGroup,
  onSelectClass,
  onLogoTap,
  onGoAbout,
  lang,
  timeStr,
  dayName,
}) => {
  const [selectedParallel, setSelectedParallel] = useState<number | null>(null);
  const [codeQuery, setCodeQuery] = useState('');
  const [codeStatus, setCodeStatus] = useState<'idle' | 'checking' | 'wrong' | 'error'>('idle');

  // Modal for unlocking a specific class clicked in the list
  const [targetClassToUnlock, setTargetClassToUnlock] = useState<string | null>(null);
  const [modalInputCode, setModalInputCode] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [lockoutSec, setLockoutSec] = useState<number>(() => checkClassCodeLockout().remainingSec);

  useEffect(() => {
    if (lockoutSec > 0) {
      const t = setInterval(() => {
        setLockoutSec((prev) => {
          if (prev <= 1) {
            clearInterval(t);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [lockoutSec]);

  const d = DICT[lang] || DICT.ru;
  const splashes = lang === 'ba' ? SPLASHES_BA : SPLASHES_RU;
  const splash = splashes[Math.floor(Math.random() * splashes.length)] || 'Аргаяшский вайб ⚡';

  const grades = [5, 6, 7, 8, 9, 10, 11];
  const letters = ['А', 'Б', 'В', 'Г'];

  // Неудачная проверка кода: учитываем попытку и включаем блокировку при переборе
  const handleFailedCheck = (res: ClassCodeCheck): string => {
    if (res.status === 'locked') {
      setLockoutSec(res.lockedSec);
      return `Слишком много попыток! Повторите через ${res.lockedSec} сек.`;
    }
    if (res.status === 'error') {
      return 'Нет связи с сервером. Проверьте интернет и попробуйте снова.';
    }
    const local = recordFailedClassCodeAttempt();
    if (local.locked) {
      setLockoutSec(local.remainingSec);
      return `Лимит попыток исчерпан! Блокировка от подбора на ${local.remainingSec} сек.`;
    }
    return '';
  };

  const handleCheckTopCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (lockoutSec > 0 || !codeQuery.trim() || codeStatus === 'checking') return;
    setCodeStatus('checking');
    const res = await checkClassCode(codeQuery);
    if (res.status === 'ok') {
      // Код верный — сразу входим в класс, без лишнего шага подтверждения
      setCodeStatus('idle');
      handleApplyTopCode(res.info);
    } else {
      handleFailedCheck(res);
      setCodeStatus(res.status === 'error' ? 'error' : 'wrong');
    }
  };

  const handleApplyTopCode = (info: ClassCodeInfo) => {
    if (lockoutSec > 0) return;
    resetFailedClassCodeAttempts();
    saveClassUnlocked(info.className);
    onSelectShift(info.defaultShift);
    onSelectClass(info.className);
  };

  const handleLetterClick = (fullCls: string) => {
    // If class already unlocked on this device, enter immediately
    if (isClassUnlocked(fullCls)) {
      const info = CLASS_LIST.find((c) => c.className === fullCls);
      if (info) onSelectShift(info.defaultShift);
      onSelectClass(fullCls);
    } else {
      // Prompt for private code
      setTargetClassToUnlock(fullCls);
      setModalInputCode('');
      setModalError(null);
    }
  };

  const handleConfirmUnlockModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassToUnlock) return;

    if (lockoutSec > 0) {
      setModalError(`Защита от перебора кодов активна. Подождите ${lockoutSec} сек.`);
      return;
    }

    const trimmed = modalInputCode.trim();
    if (!trimmed) {
      setModalError('Введите персональный код класса');
      return;
    }

    const res = await checkClassCode(trimmed);
    if (res.status === 'ok' && res.info.className === targetClassToUnlock) {
      resetFailedClassCodeAttempts();
      saveClassUnlocked(targetClassToUnlock);
      const targetCls = targetClassToUnlock;
      setTargetClassToUnlock(null);
      setModalInputCode('');
      setModalError(null);
      onSelectShift(res.info.defaultShift);
      onSelectClass(targetCls);
    } else {
      const lockMsg = res.status === 'ok' ? handleFailedCheck({ status: 'wrong' }) : handleFailedCheck(res);
      setModalError(lockMsg || `Неверный код. Получите код у классного руководителя ${targetClassToUnlock} класса.`);
    }
  };

  return (
    <div className="space-y-3 screen-enter">
      {/* Шапка */}
      <div className="card text-center">
        <h1 className="text-2xl font-black select-none text-cyan-300" onClick={onLogoTap}>
          Выбери свой класс
        </h1>
        <p className="text-white/70 text-xs mt-1 max-w-md mx-auto">
          Введи код, который дал классный руководитель. Код нужен один раз — дальше приложение запомнит класс.
        </p>
      </div>

      {/* Вход по приватному коду класса (выдаётся классным руководителем) */}
      <div className="card bg-gradient-to-br from-slate-900/90 via-cyan-950/40 to-slate-900/90 border border-cyan-400/30 shadow-lg">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 grid place-items-center text-amber-300">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
              <span>Код класса</span>
            </h2>
            <p className="text-[11px] text-white/60">
              Вводи полностью, вместе с классом. Можно латиницей и без дефиса
            </p>
          </div>
        </div>

        {/* Предупреждение о защитной блокировке */}
        {lockoutSec > 0 && (
          <div className="mb-2 p-2.5 bg-rose-500/20 border border-rose-400/40 rounded-2xl text-xs text-rose-200 flex items-center gap-2 font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Защита от перебора кодов: повтор через {lockoutSec} сек.</span>
          </div>
        )}

        {/* Поле ввода личного кода */}
        <form className="flex gap-2 mb-2" onSubmit={handleCheckTopCode}>
          <input
            type="text"
            disabled={lockoutSec > 0}
            value={codeQuery}
            onChange={(e) => {
              setCodeQuery(e.target.value);
              setCodeStatus('idle');
            }}
            placeholder={lockoutSec > 0 ? `Подожди ${lockoutSec} с…` : 'Например: 7А-XXXX'}
            autoCapitalize="characters"
            autoComplete="off"
            className="flex-1 min-w-0 px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={lockoutSec > 0 || !codeQuery.trim() || codeStatus === 'checking'}
            className="shrink-0 px-4 rounded-2xl bg-cyan-500 text-slate-950 text-sm font-black hover:bg-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {codeStatus === 'checking' ? '…' : 'Войти'}
          </button>
        </form>

        {codeStatus === 'wrong' || codeStatus === 'error' ? (
          <div className="text-[11px] text-amber-300/90 px-1 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {codeStatus === 'error'
                ? 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'
                : 'Код не совпадает. Проверьте правильность кода, полученного от классного руководителя.'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Смена и подгруппа */}
      <div className="card">
        <h2 className="text-lg font-black mb-3 text-cyan-300">{d.shift}</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className={`choice ${shift === '1' ? 'active' : ''}`}
            onClick={() => onSelectShift('1')}
          >
            ☀️ 1 смена (Утро)
          </button>
          <button
            type="button"
            className={`choice ${shift === '2' ? 'active' : ''}`}
            onClick={() => onSelectShift('2')}
          >
            🌙 2 смена (Обед)
          </button>
        </div>

        <label className="text-xs font-bold text-white/70 mt-4 mb-2 block">{d.subg}</label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className={`choice ${subGroup === 1 ? 'active' : ''}`}
            onClick={() => onSelectSubGroup(1)}
          >
            1 подгруппа
          </button>
          <button
            type="button"
            className={`choice ${subGroup === 2 ? 'active' : ''}`}
            onClick={() => onSelectSubGroup(2)}
          >
            2 подгруппа
          </button>
        </div>
      </div>

      {/* Выбор параллели и класса */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-cyan-300">
            {selectedParallel ? `${selectedParallel} класс: выбери букву` : d.grade}
          </h2>
          <span className="text-[11px] text-amber-300/80 flex items-center gap-1 font-semibold">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Коды у руководителей</span>
          </span>
        </div>

        {!selectedParallel ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {grades.map((g) => (
              <button
                key={g}
                type="button"
                className="choice py-3"
                onClick={() => setSelectedParallel(g)}
              >
                <div className="text-lg font-black">{g} класс</div>
                <div className="text-[11px] text-white/70">А • Б • В • Г</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {letters.map((l) => {
                const fullCls = `${selectedParallel}${l}`;
                const unlocked = isClassUnlocked(fullCls);

                return (
                  <button
                    key={l}
                    type="button"
                    className={`choice py-3.5 flex flex-col items-center justify-center gap-1.5 group transition-all ${
                      unlocked
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'
                        : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/40'
                    }`}
                    onClick={() => handleLetterClick(fullCls)}
                  >
                    <div className="text-2xl font-black group-hover:scale-110 transition-transform flex items-center gap-1">
                      <span>{selectedParallel}{l}</span>
                      {unlocked && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] font-bold flex items-center gap-1">
                      {unlocked ? (
                        <span className="text-emerald-300 flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Разблокирован</span>
                        </span>
                      ) : (
                        <span className="text-amber-300/80 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-amber-400" />
                          <span>Требуется код</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn darkBtn justify-center text-sm"
              onClick={() => setSelectedParallel(null)}
            >
              {d.back}
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно ввода приватного кода для выбранного класса */}
      {targetClassToUnlock && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 grid place-items-center text-amber-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <b className="text-sm text-white">Вход в {targetClassToUnlock} класс</b>
                  <div className="text-[10px] text-amber-300 font-mono">Приватный доступ</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetClassToUnlock(null)}
                className="p-1 rounded-lg text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Личные коды классов отправлены классным руководителям. Введите секретный код для входа в <b>{targetClassToUnlock}</b> класс:
            </p>

            <form onSubmit={handleConfirmUnlockModal} className="space-y-3 !m-0">
              <div>
                <input
                  type="text"
                  autoFocus
                  value={modalInputCode}
                  onChange={(e) => {
                    setModalInputCode(e.target.value);
                    setModalError(null);
                  }}
                  placeholder={`Код ${targetClassToUnlock} класса...`}
                  className="w-full bg-slate-950 border border-cyan-400/40 rounded-xl px-3.5 py-2.5 text-sm font-mono text-cyan-200 uppercase tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              {modalError && (
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTargetClassToUnlock(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/15"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Подтвердить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onGoAbout}
        className="w-full py-2 text-xs font-bold text-white/60 hover:text-white/90 cursor-pointer"
      >
        ℹ️ О приложении
      </button>
    </div>
  );
};
