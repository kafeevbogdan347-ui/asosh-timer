// Асошик — школьный помощник на Gemini.
// Ключ задаётся при сборке (VITE_GEMINI_API_KEY в секрете APP_ENV) и в репозиторий не попадает.
// Имя ученика в Google не отправляем: только класс, расписание и домашку.

export interface AssistantMessage {
  role: 'user' | 'model';
  text: string;
  at: number;
  image?: string; // уменьшенная копия фото для истории (data:image/jpeg)
  actions?: string[]; // что Асошик сделал в приложении по просьбе пользователя
}

// ---------- Действия в приложении (агент) ----------
// Сами действия выполняет App: он знает роль, класс и права. Всё, что увидит класс или школа,
// App выполняет только после подтверждения пользователя в чате Асошика.

export interface AgentResult {
  ok: boolean;
  summary: string;
}

export type AgentHandlers = Record<string, (args: Record<string, unknown>) => Promise<AgentResult>>;

const AGENT_TOOLS = [
  {
    name: 'add_homework',
    description: 'Записать домашнее задание. Себе в дневник (scope="me") или опубликовать всему классу (scope="class", нужно подтверждение).',
    parameters: {
      type: 'OBJECT',
      properties: {
        subject: { type: 'STRING', description: 'Предмет, например «Алгебра»' },
        text: { type: 'STRING', description: 'Что задано, например «№ 342, 345»' },
        due_date: { type: 'STRING', description: 'К какой дате, YYYY-MM-DD (необязательно)' },
        scope: { type: 'STRING', description: '"me" — только себе (по умолчанию), "class" — всему классу' },
      },
      required: ['subject', 'text'],
    },
  },
  {
    name: 'finish_homework',
    description: 'Отметить своё ДЗ выполненным или удалить его.',
    parameters: {
      type: 'OBJECT',
      properties: {
        subject: { type: 'STRING' },
        text_contains: { type: 'STRING', description: 'Часть текста задания (необязательно)' },
        action: { type: 'STRING', description: '"done" — выполнено, "delete" — удалить' },
      },
      required: ['subject', 'action'],
    },
  },
  {
    name: 'add_calendar_event',
    description: 'Добавить в свой календарь контрольную, сокращённый день или другое событие.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'YYYY-MM-DD' },
        title: { type: 'STRING' },
        kind: { type: 'STRING', description: '"test" — контрольная, "short" — сокращённый день, "other"' },
      },
      required: ['date', 'title'],
    },
  },
  {
    name: 'add_my_grades',
    description: 'Добавить свои оценки в калькулятор оценок (средний балл), например 5, 4, 5 по физике.',
    parameters: {
      type: 'OBJECT',
      properties: {
        subject: { type: 'STRING' },
        grades: { type: 'ARRAY', items: { type: 'INTEGER' }, description: 'Оценки от 2 до 5' },
      },
      required: ['subject', 'grades'],
    },
  },
  {
    name: 'add_replacement',
    description: 'Замена или отмена урока. Себе (scope="me") или для всего класса на конкретный день (scope="class", нужно подтверждение).',
    parameters: {
      type: 'OBJECT',
      properties: {
        day: { type: 'STRING', description: '«Сегодня», «Завтра» или день недели, например «Среда»' },
        lesson_number: { type: 'INTEGER', description: 'Номер урока как в расписании из данных (во 2-й смене бывает нулевой урок — 0)' },
        subject: { type: 'STRING', description: 'Новый предмет или «Урока не будет»' },
        room: { type: 'STRING', description: 'Кабинет (необязательно)' },
        scope: { type: 'STRING', description: '"me" или "class"' },
      },
      required: ['day', 'lesson_number', 'subject'],
    },
  },
  {
    name: 'publish_announcement',
    description: 'Только для учителя: объявление или событие для класса или всей школы (нужно подтверждение).',
    parameters: {
      type: 'OBJECT',
      properties: {
        kind: { type: 'STRING', description: '"ann" — объявление, "event" — событие с датой' },
        title: { type: 'STRING' },
        text: { type: 'STRING' },
        date: { type: 'STRING', description: 'YYYY-MM-DD для события' },
        target_class: { type: 'STRING', description: 'Класс, например «7А», или пусто — вся школа' },
      },
      required: ['kind', 'title'],
    },
  },
  {
    name: 'open_screen',
    description: 'Открыть раздел приложения.',
    parameters: {
      type: 'OBJECT',
      properties: {
        screen: {
          type: 'STRING',
          description: 'main, schedule, homework, diary, gpa, calendar, bells, map, updates, backpack, pomodoro, formulas, quarter, games, settings',
        },
      },
      required: ['screen'],
    },
  },
  {
    name: 'set_theme',
    description: 'Сменить тему оформления приложения.',
    parameters: {
      type: 'OBJECT',
      properties: { theme: { type: 'STRING', description: 'Идентификатор темы из списка в данных' } },
      required: ['theme'],
    },
  },
];
const MAX_AGENT_STEPS = 4;

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
- Если прислали фото (тетрадь, доска, учебник) — сначала коротко перепиши, какое задание там видно, потом реши. Если на фото ничего не разобрать — попроси переснять ближе и при хорошем свете.
- Будь доброжелательным, без грубости. На вопросы не для школьника (насилие, 18+, опасные действия) вежливо откажи.
- Не спрашивай и не запоминай личные данные (ФИО, адрес, телефон).
- Форматирование: можно **жирный** и списки с «- ». Без таблиц и заголовков.
- Формулы пиши обычным текстом, без LaTeX и знаков $: 3/4, 15/20, 2·5, x², √16, 1 целая 3/20.
Действия в приложении:
- У тебя есть инструменты: записать ДЗ, отметить ДЗ выполненным, добавить событие в календарь, добавить свои оценки в калькулятор, поставить замену, открыть раздел, сменить тему, а учителю — опубликовать объявление.
- Вызывай инструмент, только когда пользователь прямо просит что-то записать, добавить, отметить, открыть или опубликовать. Если просят просто решить или объяснить — не вызывай.
- По умолчанию всё делай только для самого пользователя (scope="me"). Классу — только если он прямо сказал «всему классу» или «для класса».
- Публикации для класса и объявления пользователь подтверждает кнопкой в приложении ещё до того, как ты получишь ответ инструмента. Если инструмент вернул ok — значит уже опубликовано, не пиши «ждём подтверждения». Если вернул отказ — коротко объясни причину своими словами.
- После действия коротко подтверди, что сделано. Даты переводи в YYYY-MM-DD по сегодняшней дате из данных.`;

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
    // Фото храним только у последних сообщений, чтобы не переполнить память телефона
    const last = list.slice(-40);
    const slim = last.map((m, i) => (m.image && i < last.length - 6 ? { ...m, image: undefined } : m));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
  } catch {
    // нет места — история только до перезапуска
  }
}

export interface AssistantReply {
  text: string;
  actions: string[];
}

async function callModel(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } finally {
    clearTimeout(timer);
  }
}

// photo — полноразмерное фото к последнему сообщению (data:image/jpeg;base64,...)
// handlers — действия в приложении; без них Асошик только отвечает
export async function askAssistant(history: AssistantMessage[], context: string, photo?: string, handlers?: AgentHandlers): Promise<AssistantReply> {
  if (!API_KEY) throw new Error(`${ASSISTANT_NAME} пока не подключён.`);
  if (!navigator.onLine) throw new Error('Нет интернета. Асошику нужна сеть, чтобы ответить.');
  if (usedToday() >= DAILY_LIMIT) throw new Error(`На сегодня вопросы закончились (${DAILY_LIMIT} в день). Приходи завтра!`);

  const contents: Record<string, unknown>[] = history.slice(-HISTORY_FOR_MODEL).map((m, i, arr) => {
    const parts: Record<string, unknown>[] = [{ text: m.text }];
    if (photo && i === arr.length - 1) {
      const [head, data] = photo.split(',');
      parts.unshift({ inlineData: { mimeType: head.match(/data:([^;]+)/)?.[1] || 'image/jpeg', data } });
    }
    return { role: m.role, parts };
  });
  const actions: string[] = [];
  let text = '';
  try {
    for (let step = 0; step < MAX_AGENT_STEPS; step++) {
      const res = await callModel({
        systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\nДанные пользователя:\n${context}` }] },
        contents,
        ...(handlers ? { tools: [{ functionDeclarations: AGENT_TOOLS }] } : {}),
        generationConfig: { maxOutputTokens: 1600, temperature: 0.6 },
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error('Асошик сейчас перегружен. Попробуй через минуту.');
        throw new Error('Асошик не смог ответить. Попробуй ещё раз позже.');
      }
      if (step === 0) countQuestion();
      const content = res.data?.candidates?.[0]?.content;
      const parts: any[] = content?.parts || [];
      const stepText = parts.map((p) => p.text || '').join('').trim();
      if (stepText) text = stepText;
      const calls = parts.filter((p) => p?.functionCall);
      if (!calls.length || !handlers) break;
      contents.push({ role: 'model', parts });
      const responses: Record<string, unknown>[] = [];
      for (const p of calls) {
        const { name, args, id } = p.functionCall as { name: string; args?: Record<string, unknown>; id?: string };
        let result: AgentResult;
        try {
          result = handlers[name] ? await handlers[name](args || {}) : { ok: false, summary: 'Такого действия нет' };
        } catch (e) {
          result = { ok: false, summary: `Не получилось: ${(e as Error).message}` };
        }
        actions.push(`${result.ok ? '✅' : '⚠️'} ${result.summary}`);
        responses.push({ functionResponse: { ...(id ? { id } : {}), name, response: result } });
      }
      contents.push({ role: 'user', parts: responses });
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error('Асошик долго думает. Попробуй ещё раз.');
    throw err;
  }
  if (!text) text = actions.length ? 'Готово!' : 'Хм, не получилось ответить на это. Попробуй спросить по-другому.';
  return { text, actions };
}
