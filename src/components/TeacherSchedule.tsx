import React, { useState } from 'react';
import { CLASS_LIST } from '../data/classCodes';
import { ALL_SUBJECTS, roomFloor } from '../data/schoolSchedule';
import { DAYS } from '../data/constants';
import type { ChangesMap } from '../services/scheduleChanges';
import { shortDay, teacherDay, upcomingDate } from '../utils/daySchedule';
import { roomLabel } from '../utils/lessonStatus';
import { LiveLessonCard } from './LiveLessonCard';

// «Моё расписание» учителя: уроки его предметов в выбранных классах, по времени, с живым таймером.
// Классы и предметы учитель выбирает сам (хранятся на этом устройстве).
const PLAN_KEY = 'asosh_teacher_plan_v1';
const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
interface Plan {
  classes: string[];
  subjects: string[];
}
const loadPlan = (defSubjects: string[]): Plan => {
  try {
    const p = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null') as Plan | null;
    if (p && Array.isArray(p.classes) && Array.isArray(p.subjects)) return p;
  } catch {
    // нет сохранённого
  }
  return { classes: [], subjects: defSubjects.filter((s) => ALL_SUBJECTS.includes(s)) };
};

interface TeacherScheduleProps {
  defaultSubjects?: string[];
  changes?: ChangesMap;
  onOpenBells?: () => void;
}

export const TeacherSchedule: React.FC<TeacherScheduleProps> = ({ defaultSubjects = [], changes, onOpenBells }) => {
  const [plan, setPlan] = useState<Plan>(() => loadPlan(defaultSubjects));
  const [setup, setSetup] = useState(() => loadPlan(defaultSubjects).classes.length === 0);
  const today = new Date();
  const todayName = DAYS[(today.getDay() + 6) % 7];
  const [day, setDay] = useState<string>(todayName === 'Воскресенье' ? 'Понедельник' : todayName);

  const save = (next: Plan) => {
    setPlan(next);
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(next));
    } catch {
      // нет места — до перезапуска
    }
  };
  const toggle = (key: 'classes' | 'subjects', v: string) =>
    save({ ...plan, [key]: plan[key].includes(v) ? plan[key].filter((x) => x !== v) : [...plan[key], v] });

  const todayLessons = teacherDay(plan.classes, plan.subjects, today, changes);
  const dayLessons = teacherDay(plan.classes, plan.subjects, upcomingDate(day, today), changes);
  const ready = plan.classes.length > 0 && plan.subjects.length > 0;

  return (
    <div className="space-y-3">
      {ready && (
        <LiveLessonCard
          title="Сейчас у вас"
          lessons={todayLessons.map((l) => [`${l.sub} · ${l.cls}`, l.room])}
          bells={todayLessons.map((l) => [l.start, l.end])}
          emptyText="Сейчас уроков нет"
        />
      )}

      {ready && (
        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap">
            {DAYS.slice(0, 6).map((d) => (
              <button key={d} type="button" className={`choice !py-1 !px-2.5 !text-[11px] ${day === d ? 'active' : ''}`} onClick={() => setDay(d)}>
                {shortDay(d)} {upcomingDate(d, today).getDate()}
              </button>
            ))}
          </div>
          {dayLessons.length === 0 ? (
            <div className="text-center text-sm text-white/60 py-4">В этот день уроков по вашим предметам нет</div>
          ) : (
            <div className="space-y-1">
              {dayLessons.map((l, i) => {
                const prev = dayLessons[i - 1];
                // Окно — свободный урок между своими (перемены не считаем)
                const gap = !!prev && toMin(l.start) - toMin(prev.end) >= 30;
                return (
                  <React.Fragment key={`${l.cls}-${l.num}-${l.start}`}>
                    {gap && <div className="text-[10px] text-white/40 pl-7">окно {prev.end}–{l.start}</div>}
                    <div className={`flex items-center gap-2 p-2 rounded-xl text-xs border ${l.replaced ? 'bg-amber-500/10 border-amber-400/35' : 'bg-white/5 border-white/10'}`}>
                      <span className="w-[86px] shrink-0 tabular-nums text-white/60">
                        {l.start}–{l.end}
                      </span>
                      <span className="flex-1 min-w-0">
                        <b className="block truncate text-sm">
                          {l.cls} · {l.sub}
                        </b>
                        <span className="text-white/55">
                          {l.num}-й урок · {l.room ? roomLabel(l.room) : 'кабинет не указан'}
                          {roomFloor(l.room) && ` · ${roomFloor(l.room)} этаж`}
                          {l.replaced && ' · изменение'}
                        </span>
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
              <p className="text-[11px] text-white/50">Уроков: {dayLessons.length}. Жёлтым — изменения в расписании.</p>
            </div>
          )}
        </div>
      )}

      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <button type="button" className="w-full flex items-center justify-between text-xs font-bold text-white/80" onClick={() => setSetup(!setup)}>
          <span>⚙️ Мои классы и предметы{ready ? `: ${plan.classes.length} кл., ${plan.subjects.length} пр.` : ''}</span>
          <span>{setup ? '▴' : '▾'}</span>
        </button>
        {setup && (
          <>
            <p className="text-[11px] text-white/60">Отметьте классы, где вы ведёте уроки, и свои предметы — расписание соберётся само.</p>
            <div className="flex flex-wrap gap-1">
              {CLASS_LIST.map((c) => (
                <button key={c.className} type="button" className={`choice !py-1 !px-2 !text-[11px] ${plan.classes.includes(c.className) ? 'active' : ''}`} onClick={() => toggle('classes', c.className)}>
                  {c.className}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {ALL_SUBJECTS.map((s) => (
                <button key={s} type="button" className={`choice !py-1 !px-2 !text-[11px] ${plan.subjects.includes(s) ? 'active' : ''}`} onClick={() => toggle('subjects', s)}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {onOpenBells && (
        <button type="button" className="btn darkBtn w-full justify-center text-xs" onClick={onOpenBells}>
          🔔 Звонки обеих смен
        </button>
      )}
    </div>
  );
};
