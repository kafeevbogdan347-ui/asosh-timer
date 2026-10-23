import React from 'react';
import { APP_VERSION } from '../data/constants';

interface AboutScreenProps {
  onBack?: () => void;
}

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: '⏱ Каждый день',
    items: [
      'Сколько осталось до звонка — на главной и на экране «Сейчас»',
      'Уроки на сегодня и завтра, расписание на неделю',
      'Звонки для обеих смен и сокращённых дней',
      'Напоминание за 2 и 5 минут до звонка',
    ],
  },
  {
    title: '📘 Учёба',
    items: [
      'Домашние задания с фото доски',
      'Калькулятор среднего балла: сколько пятёрок нужно до цели',
      'Счётчик четверти и дней до каникул',
      'Формулы, таблица Менделеева, портфель на завтра',
      'Портфолио грамот и олимпиад',
    ],
  },
  {
    title: '💬 Класс',
    items: ['Закрытый чат класса — вход по коду от классного руководителя'],
  },
  {
    title: '🎮 Отдых',
    items: ['Мини-игры на перемену (во время урока закрываются)', 'Помодоро-таймер и фоновые звуки для домашки'],
  },
];

export const AboutScreen: React.FC<AboutScreenProps> = ({ onBack }) => {
  return (
    <div className="card screen-enter space-y-4 max-w-2xl mx-auto">
      <div className="text-center space-y-1">
        <div className="text-4xl">🔔</div>
        <h2 className="text-2xl font-black text-cyan-300">АСОШ Таймер</h2>
        <p className="text-xs text-white/60">Умный дневник для учеников МОУ АСОШ №2, с. Аргаяш · {APP_VERSION}</p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-black text-white mb-2">{section.title}</h3>
          <ul className="space-y-1.5 text-xs text-white/75">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-cyan-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/70 leading-relaxed space-y-1.5">
        <h3 className="text-sm font-black text-white">🛡️ Данные</h3>
        <p>
          Расписание, оценки, ДЗ и профиль хранятся только на этом устройстве. Через интернет передаются только
          сообщения чата класса.
        </p>
        <p>Приложение бесплатное и без рекламы. Работает на Android, iPhone и компьютере прямо из браузера.</p>
      </div>

      {onBack && (
        <button type="button" className="btn darkBtn w-full justify-center" onClick={onBack}>
          Назад
        </button>
      )}
    </div>
  );
};
