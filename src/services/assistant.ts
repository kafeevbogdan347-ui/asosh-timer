// Асошик 2.0 — потоковый школьный помощник на Gemini с гибридным роутингом моделей,
// памятью диалога, проверкой фото тетрадей и интерактивными виджетами в чате.
import { setGeminiVoiceReady } from './voiceGemini';
import { authJsonHeaders } from './assistantAuth';

export type AssistantMood = 'idle' | 'thinking' | 'listening' | 'checking' | 'happy';
export type AssistantMode = 'auto' | 'brief' | 'tutor';

export type AssistantWidget =
  | {
      id: string;
      kind: 'day_plan';
      greeting: string;
      nowText: string;
      nextBellText: string;
      lessons: { num: number; time: string; sub: string; room: string; isCurrent?: boolean; isNext?: boolean }[];
      urgentHw: string[];
      tests: string[];
      weakSubjects: string[];
      quarterNote: string;
    }
  | {
      id: string;
      kind: 'backpack';
      forDate: string;
      dayLabel: string;
      items: { id: string; name: string; checked: boolean; category: string }[];
    }
  | {
      id: string;
      kind: 'pomodoro';
      subject: string;
      focusMin: number;
      breakMin: number;
    }
  | {
      id: string;
      kind: 'formulas';
      query: string;
      cards: { id: string; subject: string; title: string; formula: string; description: string; note?: string }[];
      elements?: { number: number; symbol: string; nameRu: string; mass: string | number; period: number; group: number }[];
    }
  | {
      id: string;
      kind: 'quiz';
      topic: string;
      questions: { q: string; options: string[]; correct: number; explanation: string; picked?: number }[];
    }
  | {
      id: string;
      kind: 'flashcards';
      topic: string;
      cards: { front: string; back: string; flipped?: boolean; known?: boolean }[];
    }
  | {
      id: string;
      kind: 'image';
      title: string;
      caption: string;
      imageUrl: string;
      aspectRatio: string;
      style: string;
      prompt: string;
    };

export interface AssistantMessage {
  role: 'user' | 'model';
  text: string;
  at: number;
  image?: string;
  hadPhoto?: boolean;
  actions?: string[];
  widgets?: AssistantWidget[];
  routeLabel?: string;
  routeKind?: 'fast' | 'deep';
}

export interface AgentResult {
  ok: boolean;
  summary: string;
  widget?: AssistantWidget;
}

export type AgentHandlers = Record<string, (args: Record<string, unknown>) => Promise<AgentResult>>;

const AGENT_TOOLS = [
  {
    name: 'get_day_brief',
    description: 'Собрать и показать интерактивную утреннюю сводку дня: ближайший звонок, расписание на сегодня, срочное ДЗ, контрольные, оценки, требующие внимания, и план подготовки.',
    parameters: {
      type: 'OBJECT',
      properties: {
        focus: { type: 'STRING', description: 'На чём сделать акцент: today, tomorrow или exams (необязательно)' },
      },
    },
  },
  {
    name: 'check_backpack',
    description: 'Показать интерактивный чек-лист портфеля (с галочками, синхронизированный с разделом Портфель) под уроки завтра или указанного дня.',
    parameters: {
      type: 'OBJECT',
      properties: {
        day: { type: 'STRING', description: '«Завтра» (по умолчанию), «Сегодня» или день недели' },
      },
    },
  },
  {
    name: 'start_pomodoro',
    description: 'Встроить в чат интерактивный таймер Помодоро для фокусировки на учёбе по предмету (по умолчанию 25 мин работа / 5 мин перерыв).',
    parameters: {
      type: 'OBJECT',
      properties: {
        subject: { type: 'STRING', description: 'Предмет или задача, например «Алгебра»' },
        minutes: { type: 'INTEGER', description: 'Длительность фокус-сессии в минутах (15, 25 или 45)' },
      },
    },
  },
  {
    name: 'lookup_formulas',
    description: 'Найти школьные формулы и элементы таблицы Менделеева из справочника приложения и показать их карточкой в чате.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Ключевое слово, название формулы или элемент (например «дискриминант», «Ом», «пифагор», «углерод»)' },
        subject: { type: 'STRING', description: 'math, geometry, physics, chemistry, russian, english (необязательно)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_study_quiz',
    description: 'Создать прямо в чате интерактивный мини-тест (3–5 вопросов с выбором ответа и пояснением) ИЛИ набор переворачиваемых карточек (флеш-карточек) для повторения темы.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mode: { type: 'STRING', description: '"quiz" — тест с вариантами, "flashcards" — карточки для запоминания' },
        topic: { type: 'STRING', description: 'Тема, например «Квадратные уравнения» или «Неправильные глаголы»' },
        questions: {
          type: 'ARRAY',
          description: 'Список вопросов для mode="quiz" (3–5 шт.)',
          items: {
            type: 'OBJECT',
            properties: {
              q: { type: 'STRING', description: 'Текст вопроса' },
              options: { type: 'ARRAY', items: { type: 'STRING' }, description: '4 коротких варианта ответа' },
              correct: { type: 'INTEGER', description: 'Индекс правильного ответа (0..3)' },
              explanation: { type: 'STRING', description: 'Короткое понятное объяснение ответа' },
            },
            required: ['q', 'options', 'correct', 'explanation'],
          },
        },
        flashcards: {
          type: 'ARRAY',
          description: 'Список карточек для mode="flashcards" (4–8 шт.)',
          items: {
            type: 'OBJECT',
            properties: {
              front: { type: 'STRING', description: 'Лицевая сторона: термин, формула, слово или вопрос' },
              back: { type: 'STRING', description: 'Оборот: определение, перевод или ответ' },
            },
            required: ['front', 'back'],
          },
        },
      },
      required: ['mode', 'topic'],
    },
  },
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
  {
    name: 'generate_image',
    description: 'Нарисовать картинку, иллюстрацию, учебную схему, диаграмму, график или постер прямо в чате. Используй, когда просят нарисовать, изобразить, сделать схему или визуально объяснить тему.',
    parameters: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING', description: 'Подробное описание того, что должно быть изображено на картинке или схеме (на русском)' },
        style: {
          type: 'STRING',
          description: '"illustration" (рисунок/иллюстрация), "diagram" (учебная схема с подписями), "comic" (комикс), "poster" (постер), "pixel" (пиксель/изометрия)',
        },
        aspect_ratio: {
          type: 'STRING',
          description: '"1:1" (квадрат, по умолчанию), "4:3" (альбомная схема), "16:9" (широкая), "3:4" (вертикальный постер)',
        },
      },
      required: ['prompt'],
    },
  },
];

const MAX_AGENT_STEPS = 4;
export const ASSISTANT_NAME = 'Асошик';
export const DAILY_LIMIT = 30;
const HISTORY_FOR_MODEL = 18;

let serverAvailable = true;

export const assistantAvailable = () => serverAvailable;

const DEFAULT_PUBLIC_API = 'https://asosh-timer.ai.studio';

function resolveAssistantBase(): string {
  const custom = (import.meta.env.VITE_ASSISTANT_API_URL || '').trim().replace(/\/+$/, '');
  if (custom) return custom;
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:' || protocol === 'capacitor:' || hostname.endsWith('github.io')) {
    return DEFAULT_PUBLIC_API;
  }
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && !port) {
    return DEFAULT_PUBLIC_API;
  }
  return '';
}

function assistantApiUrl(path: string, forceRemote = false): string {
  const base = forceRemote ? DEFAULT_PUBLIC_API : resolveAssistantBase();
  return `${base}${path}`;
}

export async function fetchAssistantStatus(): Promise<boolean> {
  try {
    const res = await fetch(assistantApiUrl('/api/assistant/status'));
    if (!res.ok) return serverAvailable;
    const data = (await res.json()) as { available?: boolean };
    serverAvailable = Boolean(data.available);
    setGeminiVoiceReady(serverAvailable);
    return serverAvailable;
  } catch {
    return serverAvailable;
  }
}

const SYSTEM_PROMPT = `Ты — ${ASSISTANT_NAME}, умный и дружелюбный школьный репетитор и ассистент в приложении «АСОШ Таймер» для учеников МОУ АСОШ №2 (5–11 классы).

Правила общения и точности:
- Отвечай по-русски (или на языке интерфейса из данных). В режиме краткости — 1–4 предложения без воды. В обычном/репетиторском режиме — структурировано и понятно.
- Про уроки, время до звонка, кабинеты, четверть, оценки и домашку отвечай строго по данным пользователя ниже. Если данных нет — честно скажи.
- Опирайся на профиль оценок и ближайшие контрольные из данных: если ученик спрашивает, что учить или на чём сфокусироваться, подсказывай предметы с низким баллом или контрольной впереди.
- Задачи и домашку решай по шагам с короткими пояснениями и короткой проверкой в конце, чтобы ученик смог объяснить у доски.
- Проверка решений по фото (тетрадь, доска, учебник):
  1) Сначала перепиши условие и решение ученика по строкам/шагам.
  2) Если ученик прислал своё решение — оцени каждый шаг с явными метками «✓ Верно» или «✕ Ошибка в шаге N».
  3) На первой ошибке объясни, какое правило нарушено, и покажи верный ход.
  4) Если фото размытое или обрезано — не выдумывай, попроси переснять ближе и светлее.
- Не спрашивай и не запоминай личные данные (ФИО, адрес, телефон). На неподходящие для школы запросы вежливо откажи.
- Форматирование: **жирный**, *курсив*, списки с «- » или «1. », формулы обычным текстом или в \`обратных кавычках\` без LaTeX и знаков $: 3/4, x², √16, 2·5.

Инструменты и интерактивные виджеты:
- Когда просят сводку дня, план на утро/вечер или «что меня сегодня ждёт» — вызывай get_day_brief.
- Когда спрашивают «что положить в портфель» или «собери рюкзак» — вызывай check_backpack.
- Когда просят таймер, Помодоро, «позаниматься 25 минут» — вызывай start_pomodoro.
- Когда спрашивают формулу или элемент таблицы Менделеева — вызывай lookup_formulas.
- Когда просят тест, викторину, проверить знания или сделать карточки для повторения — вызывай create_study_quiz (передавая готовые качественные вопросы или карточки).
- Когда просят нарисовать картинку, иллюстрацию, мем, схему, график или наглядно изобразить тему — вызывай generate_image с подробным описанием и подходящим стилем.
- Для записи/выполнения ДЗ, календаря, оценок, замен, перехода по разделам и тем используй соответствующие инструменты.
- По умолчанию scope="me". Для класса (scope="class") и объявлений — пользователь подтверждает кнопкой до выполнения, если инструмент вернул ok — значит уже опубликовано.`;

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
    // ignore
  }
}

// Память диалога + сжатое саммари старых реплик
const HISTORY_KEY = 'asosh_assistant_history';
const SUMMARY_KEY = 'asosh_assistant_summary';

export function loadHistory(): AssistantMessage[] {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function loadSessionSummary(): string {
  try {
    return localStorage.getItem(SUMMARY_KEY) || '';
  } catch {
    return '';
  }
}

export function clearSessionMemory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(SUMMARY_KEY);
  } catch {
    // ignore
  }
}

function buildCondensedSummary(older: AssistantMessage[], existing: string): string {
  const topics = older
    .filter((m) => m.role === 'user')
    .map((m) => m.text.replace(/\s+/g, ' ').trim().slice(0, 70))
    .filter(Boolean);
  const actions = older
    .flatMap((m) => m.actions || [])
    .map((a) => a.trim().slice(0, 60))
    .filter(Boolean);
  const parts = [
    existing,
    topics.length ? `Предыдущие темы: ${topics.slice(-6).join('; ')}` : '',
    actions.length ? `Выполненные действия: ${actions.slice(-5).join('; ')}` : '',
  ].filter(Boolean);
  return parts.join(' | ').slice(-600);
}

export function saveHistory(list: AssistantMessage[]) {
  try {
    const kept = list.slice(-60);
    if (kept.length > HISTORY_FOR_MODEL) {
      const older = kept.slice(0, kept.length - HISTORY_FOR_MODEL);
      const summary = buildCondensedSummary(older, loadSessionSummary());
      if (summary) localStorage.setItem(SUMMARY_KEY, summary);
    }
    const slim = kept.map((m, i) => (m.image && i < kept.length - 6 ? { ...m, image: undefined } : m));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
  } catch {
    // ignore
  }
}

export interface AssistantReply {
  text: string;
  actions: string[];
  widgets: AssistantWidget[];
  routeLabel?: string;
  routeKind?: 'fast' | 'deep';
}

export interface StreamCallbacks {
  modePreference?: AssistantMode;
  forceRoute?: 'fast' | 'deep';
  signal?: AbortSignal;
  onMeta?: (meta: { route: 'fast' | 'deep'; model: string; label: string }) => void;
  onDelta?: (fullTextSoFar: string) => void;
}

interface SseOutcome {
  fullText: string;
  calls: { name: string; args?: Record<string, unknown>; id?: string }[];
  modelParts: Record<string, unknown>[];
  routeLabel?: string;
  routeKind?: 'fast' | 'deep';
}

async function readStreamTurn(
  payload: Record<string, unknown>,
  signal: AbortSignal | undefined,
  onMeta?: (meta: { route: 'fast' | 'deep'; model: string; label: string }) => void,
  onDelta?: (fullTextSoFar: string) => void
): Promise<SseOutcome> {
  const primaryUrl = assistantApiUrl('/api/assistant/stream');
  const remoteUrl = assistantApiUrl('/api/assistant/stream', true);

  let res: Response;
  try {
    res = await fetch(primaryUrl, {
      method: 'POST',
      headers: await authJsonHeaders(),
      body: JSON.stringify(payload),
      signal,
    });
    if ((res.status === 404 || res.status === 405) && primaryUrl !== remoteUrl) {
      res = await fetch(remoteUrl, {
        method: 'POST',
        headers: await authJsonHeaders(),
        body: JSON.stringify(payload),
        signal,
      });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    if (primaryUrl !== remoteUrl) {
      try {
        res = await fetch(remoteUrl, {
          method: 'POST',
          headers: await authJsonHeaders(),
          body: JSON.stringify(payload),
          signal,
        });
      } catch (err2) {
        if (err2 instanceof DOMException && err2.name === 'AbortError') throw err2;
        throw new Error('Не удалось связаться с сервером Асошика. Проверь интернет и попробуй ещё раз.');
      }
    } else {
      throw new Error('Не удалось связаться с сервером Асошика. Проверь интернет и попробуй ещё раз.');
    }
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || 'Асошик не смог ответить. Попробуй ещё раз.');
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Браузер не поддерживает потоковый ответ.');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let calls: { name: string; args?: Record<string, unknown>; id?: string }[] = [];
  let modelParts: Record<string, unknown>[] = [];
  let routeLabel: string | undefined;
  let routeKind: 'fast' | 'deep' | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) continue;
      let ev: Record<string, unknown>;
      try {
        ev = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      if (ev.type === 'meta') {
        routeKind = ev.route === 'deep' ? 'deep' : 'fast';
        routeLabel = String(ev.label || '');
        onMeta?.({ route: routeKind, model: String(ev.model || ''), label: routeLabel });
      } else if (ev.type === 'delta' && typeof ev.text === 'string') {
        fullText += ev.text;
        onDelta?.(fullText);
      } else if (ev.type === 'tool_calls') {
        calls = (ev.calls as typeof calls) || [];
        modelParts = (ev.modelParts as typeof modelParts) || [];
      } else if (ev.type === 'done' && typeof ev.fullText === 'string' && ev.fullText) {
        fullText = ev.fullText;
        onDelta?.(fullText);
      } else if (ev.type === 'error') {
        throw new Error(String(ev.message || 'Ошибка ответа ИИ'));
      }
    }
  }

  return { fullText, calls, modelParts, routeLabel, routeKind };
}

export async function generateAssistantImage(opts: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  referenceImage?: string;
  signal?: AbortSignal;
}): Promise<{
  title: string;
  caption: string;
  imageUrl: string;
  aspectRatio: string;
  style: string;
  model: string;
}> {
  if (!navigator.onLine) throw new Error('Нет интернета — не получится нарисовать картинку.');
  const primary = assistantApiUrl('/api/assistant/image');
  const remote = assistantApiUrl('/api/assistant/image', true);
  const body = JSON.stringify({
    prompt: opts.prompt,
    style: opts.style || 'illustration',
    aspectRatio: opts.aspectRatio || '1:1',
    ...(opts.referenceImage ? { referenceImage: opts.referenceImage } : {}),
  });

  let res: Response;
  try {
    res = await fetch(primary, {
      method: 'POST',
      headers: await authJsonHeaders(),
      body,
      signal: opts.signal,
    });
    if ((res.status === 404 || res.status === 405) && primary !== remote) {
      res = await fetch(remote, {
        method: 'POST',
        headers: await authJsonHeaders(),
        body,
        signal: opts.signal,
      });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    if (primary !== remote) {
      res = await fetch(remote, {
        method: 'POST',
        headers: await authJsonHeaders(),
        body,
        signal: opts.signal,
      });
    } else {
      throw new Error('Не удалось связаться с сервером для генерации картинки.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.imageUrl) {
    throw new Error(data.error || 'Не получилось нарисовать картинку. Попробуй другой запрос.');
  }
  return data;
}

export async function askAssistantStream(
  history: AssistantMessage[],
  context: string,
  photo?: string,
  handlers?: AgentHandlers,
  callbacks?: StreamCallbacks
): Promise<AssistantReply> {
  if (!navigator.onLine) throw new Error('Нет интернета. Асошику нужна сеть, чтобы ответить.');
  if (usedToday() >= DAILY_LIMIT) throw new Error(`На сегодня вопросы закончились (${DAILY_LIMIT} в день). Приходи завтра!`);

  const modePref = callbacks?.modePreference || 'auto';
  const modeRule =
    modePref === 'brief'
      ? '\nРежим ответа сейчас: КРАТКО (максимум 2–4 коротких предложения, только суть).'
      : modePref === 'tutor'
      ? '\nРежим ответа сейчас: РЕПЕТИТОР (подробно объясни логику, покажи шаги, проверь понимание и предложи закрепить тестом).'
      : '';

  const summary = loadSessionSummary();
  const fullContext = [context, summary ? `Память прошлых сообщений: ${summary}` : ''].filter(Boolean).join('\n');
  const systemInstruction = `${SYSTEM_PROMPT}${modeRule}\n\nДанные пользователя:\n${fullContext}`;

  const slice = history.slice(-HISTORY_FOR_MODEL);
  const lastUserText = [...slice].reverse().find((m) => m.role === 'user')?.text || '';

  const contents: Record<string, unknown>[] = slice.map((m, i, arr) => {
    const parts: Record<string, unknown>[] = [{ text: m.text }];
    if (photo && i === arr.length - 1) {
      const [head, data] = photo.split(',');
      parts.unshift({ inlineData: { mimeType: head.match(/data:([^;]+)/)?.[1] || 'image/jpeg', data } });
    }
    return { role: m.role, parts };
  });

  const builtInGenerateImage: AgentHandlers[string] = async (args) => {
    const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : '';
    if (!prompt) return { ok: false, summary: 'Не указано описание картинки' };
    const style = typeof args.style === 'string' ? args.style : 'illustration';
    const aspectRatio = typeof args.aspect_ratio === 'string' ? args.aspect_ratio : '1:1';
    const img = await generateAssistantImage({
      prompt,
      style,
      aspectRatio,
      referenceImage: photo && photo.startsWith('data:image/') ? photo : undefined,
      signal: callbacks?.signal,
    });
    return {
      ok: true,
      summary: `Нарисовано: «${img.title}»`,
      widget: {
        id: `img-${Date.now()}`,
        kind: 'image',
        title: img.title,
        caption: img.caption,
        imageUrl: img.imageUrl,
        aspectRatio: img.aspectRatio,
        style: img.style,
        prompt,
      },
    };
  };

  const mergedHandlers: AgentHandlers = {
    generate_image: builtInGenerateImage,
    ...(handlers || {}),
  };

  const actions: string[] = [];
  const widgets: AssistantWidget[] = [];
  let text = '';
  let routeLabel: string | undefined;
  let routeKind: 'fast' | 'deep' | undefined;
  let counted = false;

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    const outcome = await readStreamTurn(
      {
        contents,
        systemInstruction,
        tools: AGENT_TOOLS,
        modePreference: modePref,
        hasMedia: Boolean(photo),
        lastUserText,
        forceRoute: callbacks?.forceRoute,
      },
      callbacks?.signal,
      callbacks?.onMeta,
      (partial) => callbacks?.onDelta?.(text ? `${text}\n${partial}` : partial)
    );

    if (!counted) {
      countQuestion();
      counted = true;
    }

    if (outcome.routeLabel) routeLabel = outcome.routeLabel;
    if (outcome.routeKind) routeKind = outcome.routeKind;

    if (outcome.fullText.trim()) {
      text = text ? `${text}\n${outcome.fullText.trim()}` : outcome.fullText.trim();
      callbacks?.onDelta?.(text);
    }

    if (!outcome.calls.length) break;

    contents.push({ role: 'model', parts: outcome.modelParts });
    const responses: Record<string, unknown>[] = [];
    for (const call of outcome.calls) {
      let result: AgentResult;
      try {
        result = mergedHandlers[call.name]
          ? await mergedHandlers[call.name](call.args || {})
          : { ok: false, summary: 'Такого действия нет' };
      } catch (e) {
        result = { ok: false, summary: `Не получилось: ${(e as Error).message}` };
      }
      actions.push(`${result.ok ? '✅' : '⚠️'} ${result.summary}`);
      if (result.widget) widgets.push(result.widget);
      responses.push({
        functionResponse: {
          ...(call.id ? { id: call.id } : {}),
          name: call.name,
          response: { ok: result.ok, summary: result.summary },
        },
      });
    }
    contents.push({ role: 'user', parts: responses });
  }

  if (!text) text = widgets.length || actions.length ? 'Готово! Открыл нужную карточку ниже.' : 'Хм, не получилось ответить на это. Попробуй спросить по-другому.';
  return { text, actions, widgets, routeLabel, routeKind };
}
