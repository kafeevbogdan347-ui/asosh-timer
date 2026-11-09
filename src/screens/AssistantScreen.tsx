import React, { useEffect, useId, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import {
  AssistantMessage,
  ASSISTANT_NAME,
  DAILY_LIMIT,
  askAssistant,
  assistantAvailable,
  loadHistory,
  saveHistory,
  usedToday,
} from '../services/assistant';
import { useOnline } from '../utils/useOnline';

interface AssistantScreenProps {
  context: string; // класс, расписание и домашка — собирает App
  vibro: boolean;
}

// Маскот Асошика: градиентная капля с лицом и искоркой. Середина градиента — цвет темы (--accent)
export const AsoshikAvatar: React.FC<{ size?: number; thinking?: boolean }> = ({ size = 40, thinking = false }) => {
  const gid = `asoshik-g-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`asoshik-avatar ${thinking ? 'thinking' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="var(--accent)" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path d="M32 6 C46 6 58 16 58 32 C58 47 47 58 32 58 C17 58 6 48 6 32 C6 17 18 6 32 6Z" fill={`url(#${gid})`} />
      <path d="M18 16 C24 10 34 9 40 12" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g className="asoshik-eyes">
        <rect x="21" y="27" width="6" height="10" rx="3" fill="#fff" />
        <rect x="37" y="27" width="6" height="10" rx="3" fill="#fff" />
      </g>
      <path d="M27 43 q5 4 10 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path className="asoshik-spark" d="M50 8 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6Z" fill="#fde68a" />
    </svg>
  );
};

const SUGGESTIONS = [
  'Какой у меня следующий урок?',
  'Что задано на завтра?',
  'Что положить в портфель на завтра?',
  'Реши: 3/4 + 2/5',
  'Объясни дроби простыми словами',
  'Как подготовиться к контрольной?',
];

// Если модель всё же прислала LaTeX — превращаем в обычный текст: \frac{3}{20} → 3/20, \cdot → ·
const cleanMath = (text: string) =>
  text
    .replace(/(\d+)\s*\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 целых $2/$3')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\(cdot|times)/g, '·')
    .replace(/\\div/g, ':')
    .replace(/\\sqrt\{([^}]*)\}/g, '√$1')
    .replace(/\^\{?2\}?/g, '²')
    .replace(/\^\{?3\}?/g, '³')
    .replace(/\\[,;! ]/g, ' ')
    .replace(/\{,\}/g, ',')
    .replace(/\$+/g, '');

// Лёгкая разметка ответа: **жирный** и строки-списки «- »
const renderText = (text: string) =>
  cleanMath(text).split('\n').map((line, i) => {
    const isItem = /^\s*[-*•]\s+/.test(line);
    const body = line.replace(/^\s*[-*•]\s+/, '');
    const parts = body.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
        <b key={j}>{p.slice(2, -2)}</b>
      ) : p.length > 2 && p.startsWith('*') && p.endsWith('*') ? (
        <i key={j}>{p.slice(1, -1)}</i>
      ) : (
        <React.Fragment key={j}>{p}</React.Fragment>
      )
    );
    if (!line.trim()) return <div key={i} className="h-1.5" />;
    return isItem ? (
      <div key={i} className="flex gap-1.5">
        <span className="opacity-60">•</span>
        <span>{parts}</span>
      </div>
    ) : (
      <div key={i}>{parts}</div>
    );
  });

export const AssistantScreen: React.FC<AssistantScreenProps> = ({ context, vibro }) => {
  const [messages, setMessages] = useState<AssistantMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [used, setUsed] = useState(usedToday);
  const online = useOnline();
  const listEnd = useRef<HTMLDivElement>(null);
  const available = assistantAvailable();
  const left = Math.max(0, DAILY_LIMIT - used);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim().slice(0, 600);
    if (!q || busy) return;
    setError('');
    setInput('');
    const next = [...messages, { role: 'user' as const, text: q, at: Date.now() }];
    setMessages(next);
    saveHistory(next);
    setBusy(true);
    try {
      const answer = await askAssistant(next, context);
      const withAnswer = [...next, { role: 'model' as const, text: answer, at: Date.now() }];
      setMessages(withAnswer);
      saveHistory(withAnswer);
      if (vibro && navigator.vibrate) navigator.vibrate(15);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setUsed(usedToday());
    }
  };

  const clear = () => {
    setMessages([]);
    saveHistory([]);
    setError('');
  };

  return (
    <div className="card screen-enter asoshik-screen flex flex-col">
      {/* Шапка */}
      <div className="asoshik-header">
        <AsoshikAvatar size={52} thinking={busy} />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-black text-white leading-tight">{ASSISTANT_NAME}</div>
          <div className="text-[11px] font-bold text-white/70">
            {busy ? 'думает…' : !available ? 'скоро появится' : online ? 'твой школьный помощник' : 'нет интернета'}
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={clear} className="p-2 rounded-xl hover:bg-white/10 text-white/60 cursor-pointer" title="Очистить диалог">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Сообщения */}
      <div className="asoshik-list">
        {messages.length === 0 && (
          <div className="text-center py-4 space-y-3">
            <div className="text-sm font-bold text-white/85">
              Привет! Я {ASSISTANT_NAME} 👋
              <br />
              <span className="text-white/60 font-normal text-xs">
                Знаю твоё расписание, кабинеты и домашку. Решу задание и объясню по шагам, как оно делается 📝
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="asoshik-chip" disabled={!available || busy} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="asoshik-bubble user">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-1.5">
              <AsoshikAvatar size={26} />
              <div className="asoshik-bubble bot">{renderText(m.text)}</div>
            </div>
          )
        )}

        {busy && (
          <div className="flex items-end gap-1.5">
            <AsoshikAvatar size={26} thinking />
            <div className="asoshik-bubble bot asoshik-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {error && <div className="text-xs font-bold text-amber-300 text-center px-2">{error}</div>}
        <div ref={listEnd} />
      </div>

      {/* Ввод */}
      <form
        className="asoshik-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={available ? `Спроси ${ASSISTANT_NAME}а…` : `${ASSISTANT_NAME} пока не подключён`}
          disabled={!available || left === 0}
          maxLength={600}
          className="text-sm"
        />
        <button type="submit" disabled={!available || busy || !input.trim() || left === 0} className="asoshik-send" aria-label="Отправить">
          <Send className="w-4 h-4" />
        </button>
      </form>
      <div className="text-[10px] text-white/50 text-center mt-1.5">
        Осталось вопросов сегодня: {left} из {DAILY_LIMIT} · Ответы даёт ИИ Google Gemini и могут быть с ошибками. Имя не передаётся.
      </div>
    </div>
  );
};
