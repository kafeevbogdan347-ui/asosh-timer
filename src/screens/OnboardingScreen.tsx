import React, { useState } from 'react';
import { LanguageType, DeviceType } from '../types';
import { APP_VERSION } from '../data/constants';

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

// Телефон или компьютер определяем сами, чтобы не спрашивать ученика
function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return window.innerWidth >= 900 ? 'pc' : 'android';
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, lang }) => {
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = studentName.trim();
    if (name.length < 2) {
      setError('Напиши своё имя');
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

  return (
    <form className="card screen-enter max-w-lg mx-auto text-center space-y-5 py-8" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="text-5xl">🔔</div>
        <h1 className="text-3xl font-black text-cyan-300">АСОШ Таймер</h1>
        <p className="text-sm text-white/70">
          Расписание, звонки, домашка и чат класса МОУ АСОШ №2
        </p>
      </div>

      <ul className="text-left text-sm text-white/80 space-y-1.5 bg-white/5 border border-white/10 rounded-2xl p-4">
        <li>⏱ Сколько осталось до звонка</li>
        <li>📅 Уроки на сегодня и завтра</li>
        <li>📘 Домашние задания и оценки</li>
        <li>💬 Закрытый чат своего класса</li>
      </ul>

      <div className="text-left space-y-1.5">
        <label htmlFor="onboarding-name" className="text-xs font-bold text-white/70">
          Как тебя зовут?
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
          placeholder="Например: Иван Петров"
          className="w-full"
        />
        <p className="text-[11px] text-white/50">Имя хранится только на этом устройстве.</p>
      </div>

      {error && (
        <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-xl p-2.5">{error}</div>
      )}

      <button type="submit" className="btn green w-full justify-center text-base font-black py-3">
        Начать
      </button>

      <p className="text-[10px] text-white/40">{APP_VERSION}</p>
    </form>
  );
};
