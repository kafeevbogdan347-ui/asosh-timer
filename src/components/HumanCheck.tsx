import React, { useEffect, useState } from 'react';
import { hasProfanity, PROFANITY_MESSAGE } from '../utils/moderation';

// Проверка «Я не робот» перед публикацией для класса или школы. Раз в сутки на устройство.
// Мешает автокликерам и флуду через интерфейс; от скриптов, пишущих в базу напрямую, защищает
// только Firebase App Check (включается ключами в консоли Firebase).

const PASSED_KEY = 'asosh_human_until';
const VALID_MS = 24 * 3600 * 1000;

let openCheck: ((resolve: (ok: boolean) => void) => void) | null = null;

function passedRecently(): boolean {
  try {
    return Number(localStorage.getItem(PASSED_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

export function ensureHuman(): Promise<boolean> {
  if (passedRecently() || !openCheck) return Promise.resolve(true);
  return new Promise((resolve) => openCheck!(resolve));
}

// Общая проверка перед отправкой: мат → текст ошибки, проверка не пройдена → текст ошибки, иначе null
export async function checkBeforePublish(...texts: (string | undefined)[]): Promise<string | null> {
  if (hasProfanity(...texts)) return PROFANITY_MESSAGE;
  if (!(await ensureHuman())) return 'Публикация отменена: проверка не пройдена';
  return null;
}

function makeTask() {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const answer = a + b;
  const options = new Set<number>([answer]);
  while (options.size < 4) options.add(Math.max(2, answer + Math.floor(Math.random() * 9) - 4));
  return { a, b, answer, options: [...options].sort(() => Math.random() - 0.5) };
}

export const HumanCheckHost: React.FC = () => {
  const [resolver, setResolver] = useState<((ok: boolean) => void) | null>(null);
  const [task, setTask] = useState(makeTask);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    openCheck = (resolve) => {
      setTask(makeTask());
      setWrong(false);
      setResolver(() => resolve);
    };
    return () => {
      openCheck = null;
    };
  }, []);

  if (!resolver) return null;

  const finish = (ok: boolean) => {
    if (ok) {
      try {
        localStorage.setItem(PASSED_KEY, String(Date.now() + VALID_MS));
      } catch {
        // без хранилища спросим ещё раз в следующий раз
      }
    }
    resolver(ok);
    setResolver(null);
  };

  const pick = (n: number) => {
    if (n === task.answer) return finish(true);
    setWrong(true);
    setTask(makeTask());
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="card !m-0 w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">🤖❓</div>
        <h2 className="text-lg font-black text-cyan-300">Проверка: вы не робот?</h2>
        <p className="text-sm text-white/70">Это сообщение увидят другие. Решите пример — раз в сутки.</p>
        <div className="text-3xl font-black tabular-nums">
          {task.a} + {task.b} = ?
        </div>
        <div className="grid grid-cols-2 gap-2">
          {task.options.map((n) => (
            <button key={n} type="button" className="btn darkBtn justify-center !py-3 text-lg font-black cursor-pointer" onClick={() => pick(n)}>
              {n}
            </button>
          ))}
        </div>
        {wrong && <p className="text-xs text-rose-300 font-bold">Неверно, попробуйте ещё раз</p>}
        <button type="button" className="text-xs text-white/60 underline cursor-pointer" onClick={() => finish(false)}>
          Отмена
        </button>
      </div>
    </div>
  );
};
