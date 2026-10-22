import React, { useState } from 'react';
import { LanguageType } from '../types';
import { Copy, Check } from 'lucide-react';

interface ExcuseScreenProps {
  studentName: string;
  parentName: string;
  lang: LanguageType;
  onShowToast: (msg: string) => void;
}

export const ExcuseScreen: React.FC<ExcuseScreenProps> = ({
  studentName,
  parentName,
  onShowToast,
}) => {
  const [excuseType, setExcuseType] = useState('sick');
  const [curStudent, setCurStudent] = useState(studentName || 'моего ребёнка');
  const [curParent, setCurParent] = useState(parentName || 'Родитель');
  const [copied, setCopied] = useState(false);

  const dateStr = new Date().toLocaleDateString('ru-RU');

  let text = '';
  if (excuseType === 'sick') {
    text = `Уважаемый(ая) классный руководитель! Прошу извинить отсутствие на уроках ${dateStr} ${curStudent} в связи с плохим самочувствием / посещением поликлиники. Обязуемся сдать все пройденные темы.\n\nДата: ${dateStr}\nПодпись: ${curParent}`;
  } else if (excuseType === 'family') {
    text = `Уважаемый(ая) классный руководитель! Прошу Вас отпустить ${curStudent} с занятий ${dateStr} по семейным обстоятельствам. Ответственность за жизнь, здоровье и прохождение программы беру на себя.\n\nДата: ${dateStr}\nПодпись: ${curParent}`;
  } else if (excuseType === 'late') {
    text = `Уважаемый учитель! ${curStudent} задерживается на 1-й урок ${dateStr} по уважительной причине. Прошу допустить к занятиям.\n\nДата: ${dateStr}\nПодпись: ${curParent}`;
  } else {
    text = `Уважаемый(ая) классный руководитель! Прошу отпустить ${curStudent} сегодня (${dateStr}) после предпоследнего урока по уважительной причине.\n\nДата: ${dateStr}\nПодпись: ${curParent}`;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('Текст записки скопирован! 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card screen-enter space-y-3">
      <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
        <span>📝</span>
        <span>Генератор записок для учителя</span>
      </h2>

      <div>
        <label className="text-xs font-bold text-white/70">Причина записки</label>
        <select
          value={excuseType}
          onChange={(e) => setExcuseType(e.target.value)}
          className="cursor-pointer text-sm"
        >
          <option value="sick">По состоянию здоровья / поликлиника</option>
          <option value="family">По семейным обстоятельствам</option>
          <option value="late">Опоздание на 1-й урок</option>
          <option value="leave">Отпустить с последнего урока</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-white/70">ФИО Ученика</label>
          <input
            type="text"
            value={curStudent}
            onChange={(e) => setCurStudent(e.target.value)}
            placeholder="Иванова Ивана"
            className="text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-white/70">ФИО Родителя</label>
          <input
            type="text"
            value={curParent}
            onChange={(e) => setCurParent(e.target.value)}
            placeholder="Иванов И.И."
            className="text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-white/70">Готовый текст записки:</label>
        <textarea
          value={text}
          readOnly
          className="text-sm font-sans bg-black/40 min-h-[140px] leading-relaxed cursor-text"
        />
      </div>

      <button
        type="button"
        className="btn green justify-center text-sm py-3 shadow-lg"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            <span>Скопировано в буфер!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Скопировать записку</span>
          </>
        )}
      </button>
    </div>
  );
};
