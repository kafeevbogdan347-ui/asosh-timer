// Что сейчас идёт: урок, перемена, ожидание первого урока или ничего.
// Окна («—») — это свободное время, а не уроки: первый урок считается от первого настоящего,
// а окно между уроками показывается как длинная перемена.

export type Lesson = [string, string]; // [предмет, кабинет]
export type Bell = [string, string]; // [начало, конец], «08:00»

export interface LessonStatus {
  type: 'lesson' | 'break' | 'before' | 'none';
  currentIdx: number; // позиция идущего урока, иначе -1
  nextIdx: number; // позиция следующего настоящего урока, иначе -1
  remainSec: number;
  totalSec: number;
  nowText: string;
  nextText: string;
}

export const toSec = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 3600 + m * 60;
};

export const isWindow = (l?: Lesson) => !l || !l[0] || l[0] === '—';

// «каб. 324», но «Спортзал» и «Акт. зал» без приставки
export const roomLabel = (room: string) => (room ? (/^\d/.test(room) ? `каб. ${room}` : room) : '');

// Номер урока, как на стенде: во 2-й смене первая позиция — нулевой урок
export const lessonNo = (shift: string, idx: number) => (shift === '2' ? idx : idx + 1);

const withRoom = (l: Lesson) => `${l[0]}${l[1] ? ` (${roomLabel(l[1])})` : ''}`;

const BEFORE_WINDOW_SEC = 3600; // обратный отсчёт до первого урока включается за час

export function computeLessonStatus(lessons: Lesson[], bells: Bell[], curSec: number): LessonStatus {
  const none: LessonStatus = { type: 'none', currentIdx: -1, nextIdx: -1, remainSec: 0, totalSec: 0, nowText: 'Уроков сейчас нет', nextText: '—' };
  // Настоящие уроки, у которых есть звонок
  const real = lessons.map((l, i) => i).filter((i) => !isWindow(lessons[i]) && bells[i]);
  if (!real.length) return none;

  const first = real[0];
  const firstStart = toSec(bells[first][0]);
  if (curSec < firstStart) {
    const next = withRoom(lessons[first]);
    if (curSec >= firstStart - BEFORE_WINDOW_SEC) {
      return { type: 'before', currentIdx: -1, nextIdx: first, remainSec: firstStart - curSec, totalSec: BEFORE_WINDOW_SEC, nowText: 'Ожидание начала занятий', nextText: next };
    }
    return { ...none, nowText: 'Занятия ещё не начались', nextText: next };
  }

  for (let k = 0; k < real.length; k++) {
    const i = real[k];
    const s = toSec(bells[i][0]);
    const e = toSec(bells[i][1]);
    const nextI = k + 1 < real.length ? real[k + 1] : -1;
    if (curSec >= s && curSec < e) {
      return {
        type: 'lesson',
        currentIdx: i,
        nextIdx: nextI,
        remainSec: e - curSec,
        totalSec: e - s,
        nowText: withRoom(lessons[i]),
        nextText: nextI >= 0 ? withRoom(lessons[nextI]) : 'Это последний урок 🎉',
      };
    }
    if (nextI >= 0) {
      const nextStart = toSec(bells[nextI][0]);
      if (curSec >= e && curSec < nextStart) {
        return {
          type: 'break',
          currentIdx: -1,
          nextIdx: nextI,
          remainSec: nextStart - curSec,
          totalSec: nextStart - e,
          nowText: nextI - i > 1 ? 'Окно' : 'Перемена',
          nextText: withRoom(lessons[nextI]),
        };
      }
    }
  }
  return { ...none, nowText: 'Уроки на сегодня закончены 🎉' };
}

// Время первого настоящего урока — для «Занятия начнутся в …»
export function firstLessonStart(lessons: Lesson[], bells: Bell[]): string | null {
  const i = lessons.findIndex((l, k) => !isWindow(l) && bells[k]);
  return i >= 0 ? bells[i][0] : null;
}
