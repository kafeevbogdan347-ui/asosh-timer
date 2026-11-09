// Асошик — школьный помощник на Gemini.
// Ключ задаётся при сборке (VITE_GEMINI_API_KEY в секрете APP_ENV) и в репозиторий не попадает.
// Имя ученика в Google не отправляем: только класс, расписание и домашку.

export interface AssistantMessage {
  role: 'user' | 'model';
  text: string;
  at: number;
}

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '';
// Псевдоним всегда указывает на актуальную быструю и дешёвую модель
const MODEL = 'gemini-flash-lite-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const ASSISTANT_NAME = 'Асошик';
export const DAILY_LIMIT = 25; // вопросов в день с одного устройства
const HISTORY_FOR_MODEL = 6; // сколько последних сообщений диалога отправляем модели

export const assistantAvailable = () => Boolean(API_KEY);

const SYSTEM_PROMPT = `Ты — ${ASSISTANT_NAME}, дружелюбный помощник в приложении «АСОШ Таймер» для учеников МОУ АСОШ №2 (5–11 классы).
Правила:
- Отвечай по-русски, коротко и понятно: обычно 2–6 предложений или короткий список. Решения домашки могут быть длиннее.
- Про уроки, кабинеты, звонки и домашку отвечай только по данным ниже. Если данных нет — честно скажи, что не знаешь.
- Домашку решай полностью, если просят: задачи, примеры, упражнения по русскому, ответы на вопросы, сочинения. Решение пиши по шагам и коротко объясняй каждый шаг, чтобы ученик понял, как его получить, и смог повторить у доски.
- В конце решения дай короткую проверку или подсказку «как запомнить», если это уместно.
- Если условие задачи неполное или непонятное — переспроси, а не выдумывай.
- Будь доброжелательным, без грубости. На вопросы не для школьника (насилие, 18+, опасные действия) вежливо откажи.
- Не спрашивай и не запоминай личные данные (ФИО, адрес, телефон).
- Форматирование: можно **жирный** и списки с «- ». Без таблиц и заголовков.
- Формулы пиши обычным текстом, без LaTeX и знаков $: 3/4, 15/20, 2·5, x², √16, 1 целая 3/20.`;

// Счётчик вопросов за день
const LIMIT_KEY = 'asosh_assistant_usage';
const todayKey = () => new Date().toDateString();

export function usedToday(): number {
  try {
    const d = JSON.parse(localStorage.getItem(LIMIT_KEY) || '{}');
    return d.day === todayKey() ? Number(d.count) || 0 : 0;
  } catch {
    return 0;
  }
}

function countQuestion() {
  try {
    localStorage.setItem(LIMIT_KEY, JSON.stringify({ day: todayKey(), count: usedToday() + 1 }));
  } catch {
    // нет места — лимит не посчитается, не страшно
  }
}

// История диалога на устройстве
const HISTORY_KEY = 'asosh_assistant_history';

export function loadHistory(): AssistantMessage[] {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveHistory(list: AssistantMessage[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-40)));
  } catch {
    // нет места — история только до перезапуска
  }
}

export async function askAssistant(history: AssistantMessage[], context: string): Promise<string> {
  if (!API_KEY) throw new Error(`${ASSISTANT_NAME} пока не подключён.`);
  if (!navigator.onLine) throw new Error('Нет интернета. Асошику нужна сеть, чтобы ответить.');
  if (usedToday() >= DAILY_LIMIT) throw new Error(`На сегодня вопросы закончились (${DAILY_LIMIT} в день). Приходи завтра!`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\nДанные ученика:\n${context}` }] },
        contents: history.slice(-HISTORY_FOR_MODEL).map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        generationConfig: { maxOutputTokens: 1600, temperature: 0.6 },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 429) throw new Error('Асошик сейчас перегружен. Попробуй через минуту.');
      throw new Error('Асошик не смог ответить. Попробуй ещё раз позже.');
    }
    countQuestion();
    const text: string = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join('')
      .trim();
    if (!text) return 'Хм, не получилось ответить на это. Попробуй спросить по-другому.';
    return text;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('Асошик долго думает. Попробуй ещё раз.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
