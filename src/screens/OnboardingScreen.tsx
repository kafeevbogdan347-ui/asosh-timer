import React, { useState } from 'react';
import { LanguageType, DeviceType } from '../types';
import { DICT, SPLASHES_RU, SPLASHES_BA } from '../data/constants';
import { verifyDevPassword } from '../utils/privacy';
import { Terminal, KeyRound, CheckCircle2 } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: (data: {
    studentName: string;
    parentName: string;
    device: DeviceType;
    lang: LanguageType;
    isDeveloperMode?: boolean;
  }) => void;
  lang: LanguageType;
  onLangChange: (lang: LanguageType) => void;
  onOpenDevModalDirectly?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  lang,
  onLangChange,
  onOpenDevModalDirectly,
}) => {
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [password, setPassword] = useState('');
  const [device, setDevice] = useState<DeviceType>('android');
  const [error, setError] = useState('');

  // Developer Mode Toggle & Password
  const [isDevMode, setIsDevMode] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [devAuthSuccess, setDevAuthSuccess] = useState(false);

  const d = DICT[lang] || DICT.ru;
  const splashes = lang === 'ba' ? SPLASHES_BA : SPLASHES_RU;
  const splash = splashes[0] || 'Списывать плохо!';

  const handleDevAuth = async () => {
    if (await verifyDevPassword(devPassword)) {
      setDevAuthSuccess(true);
      setError('');
    } else {
      setError('Неверный код разработчика!');
    }
  };

  const handleSubmit = () => {
    if (password.trim().length < 8) {
      setError(lang === 'ba' ? 'Серһүҙ 8 символдан кәм булмаҫҡа тейеш!' : 'Пароль должен быть от 8 символов!');
      return;
    }

    if (isDevMode && !devAuthSuccess) {
      setError('Для включения режима разработчика введите верный секретный код!');
      return;
    }

    setError('');
    const devActive = isDevMode && devAuthSuccess;

    if (devActive) {
      localStorage.setItem('asosh_dev_unlocked', 'true');
    }

    onComplete({
      studentName: studentName.trim(),
      parentName: parentName.trim(),
      device,
      lang,
      isDeveloperMode: devActive,
      authProvider: 'local',
    });
  };

  return (
    <div className="card text-center screen-enter max-w-lg mx-auto">
      <div className="mc-splash">{splash}</div>
      <h1 className="text-3xl font-black mb-1 mt-2 text-cyan-300">АСОШ №2</h1>
      <div className="badge bg-cyan-500/20 text-cyan-300 border-cyan-400 mb-3">
        v11.0 Ultra Live
      </div>
      <p className="text-white/70 text-sm mb-6">{d.welcome}</p>

      <div className="text-left space-y-3">
        <div>
          <label className="text-xs font-bold text-white/70">{d.langsel}</label>
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as LanguageType)}
            className="cursor-pointer"
          >
            <option value="ru">Русский язык (Россия)</option>
            <option value="ba">Башҡорт теле (Башкортостан / Аргаяш)</option>
            <option value="tj">Тоҷикӣ (Таджикистан)</option>
            <option value="kk">Қазақша (Казахстан)</option>
            <option value="uz">O'zbekcha (Узбекистан)</option>
            <option value="ky">Кыргызча (Кыргызстан)</option>
            <option value="be">Беларуская (Беларусь)</option>
            <option value="hy">Հայերեն (Армения)</option>
            <option value="az">Azərbaycan dili (Азербайджан)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-white/70">{d.lblst}</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder={d.phstudent}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-white/70">{d.lblpr}</label>
          <input
            type="text"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder={d.phparent}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-white/70">{d.lblps}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-white/70">{d.lbldev}</label>
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value as DeviceType)}
            className="cursor-pointer"
          >
            <option value="android">Android смартфон</option>
            <option value="ios">iPhone (iOS)</option>
            <option value="pc">ПК / Ноутбук</option>
          </select>
        </div>

        {/* Режим разработчика при регистрации */}
        <div className="pt-2 border-t border-white/10">
          <div
            onClick={() => setIsDevMode(!isDevMode)}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-white/6 hover:bg-white/10 border border-white/12 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <b className="text-xs text-white block">🛠️ Режим разработчика</b>
                <span className="text-[10px] text-white/60">Доступ только для создателя приложения</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isDevMode}
              onChange={(e) => setIsDevMode(e.target.checked)}
              className="w-4 h-4 accent-amber-400 cursor-pointer"
            />
          </div>

          {isDevMode && (
            <div className="mt-2.5 p-3 rounded-2xl bg-amber-950/40 border border-amber-400/40 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-amber-200 text-xs font-bold">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Секретный ключ разработчика:</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={devPassword}
                  onChange={(e) => {
                    setDevPassword(e.target.value);
                    setDevAuthSuccess(false);
                  }}
                  placeholder="Введите секретный код..."
                  className="flex-1 bg-slate-950 border border-amber-400/40 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none placeholder-white/30"
                />

                <button
                  type="button"
                  onClick={handleDevAuth}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    devAuthSuccess
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {devAuthSuccess ? '✓ OK' : 'Ввод'}
                </button>
              </div>

              {(devAuthSuccess) && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Пароль принят! Режим разработчика активирован.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold text-center">
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn green justify-center mt-4 text-center text-lg shadow-lg w-full"
        onClick={handleSubmit}
      >
        <span>🚀</span>
        <span>{d.start}</span>
      </button>
    </div>
  );
};
