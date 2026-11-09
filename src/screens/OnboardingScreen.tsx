import React, { useState } from 'react';
import { LanguageType, DeviceType } from '../types';
import { APP_VERSION } from '../data/constants';
import { LANGS, t } from '../i18n';
import { AccountForms, AccountDone } from '../components/AccountForms';

interface OnboardingScreenProps {
  onComplete: (data: {
    studentName: string;
    parentName: string;
    device: DeviceType;
    lang: LanguageType;
    isDeveloperMode?: boolean;
    guest?: boolean;
    account?: AccountDone;
  }) => void;
  lang: LanguageType;
  onLangChange: (lang: LanguageType) => void;
  onOpenDevModalDirectly?: () => void;
}

// Телефон или компьютер определяем сами, чтобы не спрашивать ученика
function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return window.innerWidth >= 900 ? 'pc' : 'android';
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, lang, onLangChange }) => {
  // Шаг 1 — язык, шаг 2 — имя. Язык выбирают первым, чтобы дальше всё было на нём
  const [step, setStep] = useState<'lang' | 'role' | 'name'>('lang');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = studentName.trim();
    if (name.length < 2) {
      setError(t('nameErr', lang));
      return;
    }
    onComplete({
      studentName: name,
      parentName: '',
      device: detectDevice(),
      lang,
      isDeveloperMode: false,
    });
  };

  // Гость: без имени и без кода класса. Доступно всё, кроме чата класса
  const handleGuest = () => {
    onComplete({
      studentName: studentName.trim() || 'Гость',
      parentName: '',
      device: detectDevice(),
      lang,
      isDeveloperMode: false,
      guest: true,
    });
  };

  if (step === 'lang') {
    return (
      <div className="card screen-enter max-w-lg mx-auto text-center space-y-5 py-8">
        <div className="space-y-2">
          <div className="text-5xl">🌍</div>
          <h1 className="text-2xl font-black text-cyan-300">{t('chooseLang', lang)}</h1>
          <p className="text-xs text-white/60">Выбери язык · Телде һайла · Тілді таңда · Dili seç</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`choice !py-3 flex flex-col items-center gap-0.5 ${lang === l.id ? 'active' : ''}`}
              onClick={() => {
                onLangChange(l.id);
                setStep('role');
              }}
            >
              <span className="text-base font-black">{l.native}</span>
              {l.id !== 'ru' && <span className="text-[10px] opacity-70 font-bold">{l.ru}</span>}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/50">{t('langLater', lang)}</p>
      </div>
    );
  }

  if (step === 'role') {
    return (
      <div className="card screen-enter max-w-lg mx-auto space-y-4 py-6">
        <div className="text-center space-y-1">
          <div className="text-4xl">🔔</div>
          <h1 className="text-2xl font-black text-cyan-300">АСОШ Таймер</h1>
          <p className="text-xs text-white/60">Аккаунт работает на любом телефоне: войди по логину и паролю</p>
        </div>
        <AccountForms
          onSkip={() => setStep('name')}
          onDone={(res) =>
            onComplete({
              studentName: res.fullName || res.account.name,
              parentName: '',
              device: detectDevice(),
              lang,
              isDeveloperMode: false,
              account: res,
            })
          }
        />
        <button type="button" className="w-full text-[11px] font-bold text-white/50 hover:text-white/80 cursor-pointer" onClick={() => setStep('lang')}>
          🌍 {t('changeLang', lang)} · {LANGS.find((l) => l.id === lang)?.native}
        </button>
      </div>
    );
  }

  return (
    <form className="card screen-enter max-w-lg mx-auto text-center space-y-5 py-8" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="text-5xl">🔔</div>
        <h1 className="text-3xl font-black text-cyan-300">АСОШ Таймер</h1>
        <p className="text-sm text-white/70">
          {t('tagline', lang)}
        </p>
      </div>

      <ul className="text-left text-sm text-white/80 space-y-1.5 bg-white/5 border border-white/10 rounded-2xl p-4">
        <li>⏱ {t('f1', lang)}</li>
        <li>📅 {t('f2', lang)}</li>
        <li>📘 {t('f3', lang)}</li>
        <li>💬 {t('f4', lang)}</li>
      </ul>

      <div className="text-left space-y-1.5">
        <label htmlFor="onboarding-name" className="text-xs font-bold text-white/70">
          {t('askName', lang)}
        </label>
        <input
          id="onboarding-name"
          type="text"
          autoComplete="given-name"
          value={studentName}
          onChange={(e) => {
            setStudentName(e.target.value);
            setError('');
          }}
          placeholder={t('namePh', lang)}
          className="w-full"
        />
        <p className="text-[11px] text-white/50">{t('nameLocal', lang)}</p>
      </div>

      {error && (
        <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-xl p-2.5">{error}</div>
      )}

      <button type="submit" className="btn green w-full justify-center text-base font-black py-3">
        {t('begin', lang)}
      </button>

      <div className="space-y-1">
        <button type="button" className="btn darkBtn w-full justify-center text-sm py-2.5" onClick={handleGuest}>
          {t('guest', lang)}
        </button>
        <p className="text-[11px] text-white/50">{t('guestSub', lang)}</p>
      </div>

      <button type="button" className="text-[11px] font-bold text-white/60 hover:text-white/90 cursor-pointer" onClick={() => setStep('role')}>
        ← Регистрация по логину и паролю
      </button>
      <p className="text-[10px] text-white/40">{APP_VERSION}</p>
    </form>
  );
};
