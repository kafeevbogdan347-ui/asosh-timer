import React, { useState, useEffect } from 'react';
import { LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import {
  Calculator,
  Target,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Plus,
  Trash2,
  Award,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface GpaCalculatorScreenProps {
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  onUnlockAchievement?: (id: string) => void;
}

interface SubjectGrades {
  id: string;
  name: string;
  grades: number[];
  target: number; // 4 or 5
}

export const GpaCalculatorScreen: React.FC<GpaCalculatorScreenProps> = ({
  lang,
  soundProfile,
  vibro,
  onShowToast,
  onUnlockAchievement,
}) => {
  const defaultSubjects: SubjectGrades[] = [
    { id: '1', name: 'Алгебра', grades: [5, 4, 4, 5, 3, 5], target: 5 },
    { id: '2', name: 'Русский язык', grades: [4, 4, 3, 5, 4], target: 5 },
    { id: '3', name: 'Геометрия', grades: [5, 5, 4, 5], target: 5 },
    { id: '4', name: 'Физика', grades: [4, 3, 4, 5], target: 4 },
  ];

  const [subjects, setSubjects] = useState<SubjectGrades[]>(() => {
    const saved = localStorage.getItem('asosh_gpa_subjects');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return defaultSubjects;
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string>(subjects[0]?.id || '1');
  const [newSubjectName, setNewSubjectName] = useState('');

  useEffect(() => {
    localStorage.setItem('asosh_gpa_subjects', JSON.stringify(subjects));
  }, [subjects]);

  const activeSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0];

  const addGrade = (val: number) => {
    if (!activeSubject) return;
    playSound('coin', soundProfile);
    doVibro(vibro, 10);
    const updated = subjects.map((s) => {
      if (s.id === activeSubject.id) {
        const nextGrades = [...s.grades, val];
        return { ...s, grades: nextGrades };
      }
      return s;
    });
    setSubjects(updated);

    // Calculate new average
    const curGrades = [...activeSubject.grades, val];
    const sum = curGrades.reduce((a, b) => a + b, 0);
    const avg = sum / curGrades.length;
    if (avg >= 4.60) {
      onUnlockAchievement?.('top_student');
    }
  };

  const removeLastGrade = () => {
    if (!activeSubject || activeSubject.grades.length === 0) return;
    playSound('settings', soundProfile);
    doVibro(vibro, 8);
    const updated = subjects.map((s) => {
      if (s.id === activeSubject.id) {
        return { ...s, grades: s.grades.slice(0, -1) };
      }
      return s;
    });
    setSubjects(updated);
  };

  const clearGrades = () => {
    if (!activeSubject) return;
    playSound('settings', soundProfile);
    const updated = subjects.map((s) => {
      if (s.id === activeSubject.id) {
        return { ...s, grades: [] };
      }
      return s;
    });
    setSubjects(updated);
    onShowToast(`Оценки по предмету «${activeSubject.name}» очищены`);
  };

  const addNewSubject = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) {
      onShowToast('Введите название предмета!');
      return;
    }
    const newSub: SubjectGrades = {
      id: Date.now().toString(),
      name: trimmed,
      grades: [],
      target: 5,
    };
    setSubjects([...subjects, newSub]);
    setActiveSubjectId(newSub.id);
    setNewSubjectName('');
    playSound('click', soundProfile);
    onShowToast(`Предмет «${trimmed}» добавлен!`);
  };

  const deleteSubject = (id: string) => {
    if (subjects.length <= 1) {
      onShowToast('Должен остаться хотя бы один предмет!');
      return;
    }
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    if (activeSubjectId === id) {
      setActiveSubjectId(updated[0].id);
    }
    playSound('settings', soundProfile);
  };

  // Calculations
  const grades = activeSubject ? activeSubject.grades : [];
  const count = grades.length;
  const sum = grades.reduce((a, b) => a + b, 0);
  const average = count > 0 ? sum / count : 0;

  // Grade badge determination
  let currentGradeEstimate = '-';
  let gradeColor = 'text-white/60';
  if (count > 0) {
    if (average >= 4.60) {
      currentGradeEstimate = '5 (Отлично)';
      gradeColor = 'text-emerald-400';
    } else if (average >= 3.60) {
      currentGradeEstimate = '4 (Хорошо)';
      gradeColor = 'text-cyan-400';
    } else if (average >= 2.60) {
      currentGradeEstimate = '3 (Удовл.)';
      gradeColor = 'text-amber-400';
    } else {
      currentGradeEstimate = '2 (Плохо)';
      gradeColor = 'text-rose-400';
    }
  }

  // How many 5s or 4s needed to reach target?
  // Thresholds: to get 5 need >= 4.60, to get 4 need >= 3.60
  const calculateNeededGrades = (targetGrade: 4 | 5) => {
    const targetThreshold = targetGrade === 5 ? 4.60 : 3.60;
    if (count === 0) return 1;
    if (average >= targetThreshold) return 0;

    // (sum + 5*x) / (count + x) >= targetThreshold
    // sum + 5x >= targetThreshold*count + targetThreshold*x
    // x*(5 - targetThreshold) >= targetThreshold*count - sum
    // x >= (targetThreshold*count - sum) / (5 - targetThreshold)
    const needed = Math.ceil((targetThreshold * count - sum) / (5 - targetThreshold));
    return needed > 0 ? needed : 0;
  };

  const neededFivesForFive = calculateNeededGrades(5);
  const neededFivesForFour = calculateNeededGrades(4);

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
          <span>🎯</span>
          <span>Калькулятор Среднего Балла & Симулятор Четверти</span>
        </h2>
        <p className="text-xs text-white/70">
          Точный расчет среднего балла и прогноз: сколько пятерок нужно до желаемой оценки в четверти
        </p>
      </div>

      {/* Subject Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white/80">Выбери школьный предмет:</label>
          <span className="text-[11px] text-cyan-300 font-mono">Всего: {subjects.length}</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          {subjects.map((sub) => {
            const subAvg = sub.grades.length > 0 ? sub.grades.reduce((a, b) => a + b, 0) / sub.grades.length : 0;
            return (
              <button
                key={sub.id}
                type="button"
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center gap-2 ${
                  activeSubjectId === sub.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-black'
                    : 'bg-white/6 text-white/80 border-white/10 hover:bg-white/12'
                }`}
                onClick={() => {
                  setActiveSubjectId(sub.id);
                  playSound('click', soundProfile);
                }}
              >
                <span>{sub.name}</span>
                {sub.grades.length > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                    activeSubjectId === sub.id ? 'bg-slate-900 text-cyan-300' : 'bg-white/10 text-white'
                  }`}>
                    {subAvg.toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add custom subject */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Добавить предмет (напр. Обществознание)..."
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNewSubject()}
            className="text-xs flex-1"
          />
          <button
            type="button"
            className="btn cyan text-xs py-2 px-3 shrink-0"
            onClick={addNewSubject}
          >
            <Plus className="w-4 h-4" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* Main Score & Simulation Card */}
      {activeSubject && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-cyan-400/30 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Предмет</span>
              <h3 className="text-base font-black text-white">{activeSubject.name}</h3>
            </div>
            <button
              type="button"
              className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20"
              onClick={() => deleteSubject(activeSubject.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить предмет</span>
            </button>
          </div>

          {/* Average Badge & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-white/60 font-bold block mb-1">Средний балл</span>
              <div className="text-3xl font-black font-mono text-cyan-300">
                {count > 0 ? average.toFixed(2) : '—'}
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-white/60 font-bold block mb-1">Оценка в четверти</span>
              <div className={`text-base font-black ${gradeColor}`}>
                {currentGradeEstimate}
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-white/60 font-bold block mb-1">Всего оценок</span>
              <div className="text-3xl font-black font-mono text-white">
                {count}
              </div>
            </div>
          </div>

          {/* Interactive Grade Entry Pad */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-white/90">Быстрый ввод оценок:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[11px] text-white/60 hover:text-white flex items-center gap-1"
                  onClick={removeLastGrade}
                  disabled={count === 0}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Отменить</span>
                </button>
                <button
                  type="button"
                  className="text-[11px] text-rose-400 hover:text-rose-300"
                  onClick={clearGrades}
                  disabled={count === 0}
                >
                  Очистить
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { val: 5, label: '5 (Отлично)', color: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-emerald-500/20' },
                { val: 4, label: '4 (Хорошо)', color: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-400 shadow-cyan-500/20' },
                { val: 3, label: '3 (Удовл.)', color: 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-amber-500/20' },
                { val: 2, label: '2 (Плохо)', color: 'bg-rose-500 hover:bg-rose-400 text-white border-rose-400 shadow-rose-500/20' },
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  className={`py-3 px-2 rounded-2xl font-black text-lg border transition-all active:scale-95 shadow-md flex flex-col items-center justify-center ${btn.color}`}
                  onClick={() => addGrade(btn.val)}
                >
                  <span className="text-2xl font-black leading-none">{btn.val}</span>
                  <span className="text-[9px] font-bold tracking-tight opacity-90">{btn.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Current Grades Row */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-bold text-white/70 block mb-2">Журнал текущих оценок:</span>
            {grades.length === 0 ? (
              <p className="text-xs text-white/40 italic">Оценок пока нет. Нажми кнопки выше, чтобы добавить!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {grades.map((g, idx) => (
                  <span
                    key={idx}
                    className={`w-7 h-7 rounded-xl font-mono font-black text-sm flex items-center justify-center border shadow-sm ${
                      g === 5
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : g === 4
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : g === 3
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-rose-500/20 border-rose-400 text-rose-300'
                    }`}
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Intelligent Simulation Forecast */}
          <div className="p-3.5 bg-gradient-to-r from-cyan-950/60 to-purple-950/60 rounded-2xl border border-cyan-400/40 space-y-2">
            <div className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Школьный Симулятор и Прогноз:</span>
            </div>

            {count === 0 ? (
              <p className="text-xs text-white/70">
                Добавь хотя бы одну оценку, чтобы симулятор рассчитал траекторию к пятерке или четверке.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {/* Target 5 */}
                <div className="p-2.5 bg-white/6 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>До четвертной «5» (нужно ≥ 4.60):</span>
                  </div>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {neededFivesForFive === 0 ? '✅ Уже достигнуто!' : `+${neededFivesForFive} пятёрок ⭐️`}
                  </span>
                </div>

                {/* Target 4 */}
                <div className="p-2.5 bg-white/6 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                    <span>До четвертной «4» (нужно ≥ 3.60):</span>
                  </div>
                  <span className="font-mono font-black text-cyan-300 text-sm">
                    {neededFivesForFour === 0 ? '✅ Уже достигнуто!' : `+${neededFivesForFour} пятёрок/четвёрок`}
                  </span>
                </div>

                <p className="text-[10px] text-white/50 italic leading-tight pt-1">
                  * Расчет базируется на официальном школьном правиле округления среднего арифметического балла (≥4.60 = 5, ≥3.60 = 4, ≥2.60 = 3).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
