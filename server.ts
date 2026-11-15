import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  Modality,
  ThinkingLevel,
  Type,
  type GenerateContentResponse,
  type LiveServerMessage,
} from '@google/genai';
import {
  MAX_REFERENCE_IMAGE_CHARS,
  MAX_WAV_CHARS,
  bearerToken,
  clampStreamBody,
  cleanLangName,
  firebaseApiKey,
  isAllowedOrigin,
  rateLimit,
  sanitizeSvg,
  verifyIdToken,
} from './serverSecurity.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Модели Асошика (v16.28):
// - Быстрый чат и вызов инструментов: gemini-3.5-flash-lite (~0.6-1с)
// - Сложные задачи, фото и глубокий разбор: gemini-4-hydrogen с резервом на 3.5-flash-lite и 3.1-flash-lite
// - Голос TTS: gemini-3.8-flash-lite-tts через v1alpha
// - Живой голосовой разговор (Live API): gemini-3.8-live через v1alpha
// - Транскрибация речи (STT): gemini-3.5-transcribe с резервом на 3.5-flash-lite
const FAST_CHAT_MODEL = 'gemini-3.5-flash-lite';
const DEEP_TASK_MODEL = 'gemini-4-hydrogen';
const FALLBACK_LITE_MODEL = 'gemini-3.1-flash-lite';
const LIVE_MODEL = 'gemini-3.8-live';
const STT_MODELS = ['gemini-3.5-transcribe', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'];
const ALLOWED_VOICES = new Set(['Puck', 'Kore', 'Zephyr', 'Charon', 'Fenrir']);

function getGeminiKey(): string {
  return (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
}

function createAI(): GoogleGenAI | null {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function createVoiceAI(): GoogleGenAI | null {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1alpha',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

type RouteKind = 'fast' | 'deep';
type ModePref = 'auto' | 'brief' | 'tutor';

interface ModelCandidate {
  model: string;
  route: RouteKind;
  label: string;
  thinkingLevel?: ThinkingLevel;
}

function selectModelChain(modePref: ModePref, hasMedia: boolean, lastUserText: string): ModelCandidate[] {
  const text = (lastUserText || '').trim();
  const looksComplex =
    hasMedia ||
    text.length >= 160 ||
    /реши|проверь|ошибк|докажи|уравнен|неравен|система|задач|сочинени|изложени|эссе|разбор|подробн|объясни|тест|викторин|карточк|повтори|формул|[=^√∫∑]|\\frac/i.test(
      text
    );

  const isDeep = modePref === 'tutor' || (modePref === 'auto' && looksComplex);

  if (isDeep) {
    return [
      {
        model: DEEP_TASK_MODEL,
        route: 'deep',
        label: hasMedia ? '4 Hydrogen · Разбор фото' : '4 Hydrogen · Глубокий разбор',
        thinkingLevel: ThinkingLevel.LOW,
      },
      {
        model: FAST_CHAT_MODEL,
        route: 'deep',
        label: hasMedia ? '3.5 Flash · Разбор фото' : '3.5 Flash · Подробно',
      },
      {
        model: FALLBACK_LITE_MODEL,
        route: 'fast',
        label: '3.1 Flash Lite · Резерв',
        thinkingLevel: ThinkingLevel.MINIMAL,
      },
    ];
  }

  return [
    {
      model: FAST_CHAT_MODEL,
      route: 'fast',
      label: modePref === 'brief' ? '3.5 Flash · Кратко' : '3.5 Flash · Быстрый чат',
    },
    {
      model: DEEP_TASK_MODEL,
      route: 'deep',
      label: '4 Hydrogen · Умный ответ',
      thinkingLevel: ThinkingLevel.LOW,
    },
    {
      model: FALLBACK_LITE_MODEL,
      route: 'fast',
      label: '3.1 Flash Lite · Резерв',
      thinkingLevel: ThinkingLevel.MINIMAL,
    },
  ];
}

// Кратковременный кэш недоступных моделей (429/503/504/404), чтобы не тормозить каждый запрос.
const modelCooldownUntil = new Map<string, number>();

function extractErrorInfo(err: unknown): { status: number; message: string } {
  const raw = err as { status?: number; code?: number; message?: string };
  const msg = String(raw?.message || err || 'Unknown error');
  const statusMatch = msg.match(/\b(400|401|403|404|408|429|500|503|504)\b/);
  const status = Number(raw?.status || raw?.code || (statusMatch ? statusMatch[1] : 500));
  return { status, message: msg };
}

function friendlyRussianError(status: number): string {
  if (status === 429) return 'Асошик сейчас перегружен. Попробуй через минуту.';
  if (status === 401 || status === 403 || status === 400) return 'Не получилось связаться с ИИ. Проверь ключ в Settings > Secrets.';
  if (status === 404) return 'Модель ИИ временно недоступна. Попробуй ещё раз.';
  return 'Асошик не смог ответить. Попробуй ещё раз позже.';
}

const ASPECT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '1:1': { w: 800, h: 800 },
  '4:3': { w: 800, h: 600 },
  '16:9': { w: 960, h: 540 },
  '3:4': { w: 600, h: 800 },
};

async function startServer() {
  const app = express();
  // За прокси (Google AI Studio и т.п.) берём настоящий адрес клиента из X-Forwarded-For
  app.set('trust proxy', 1);
  // Тело запроса: фото-вопрос и запись голоса укладываются в 8 МБ, больше не принимаем
  app.use(express.json({ limit: '8mb' }));

  // CORS только для своих сайтов (раньше было «*» — любой чужой сайт мог тратить ключ ИИ)
  app.use('/api/assistant', (req: Request, res: Response, next) => {
    const origin = req.headers.origin;
    res.setHeader('Vary', 'Origin');
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.status(origin && isAllowedOrigin(origin) ? 204 : 403).end();
      return;
    }
    next();
  });

  // Все запросы к ИИ (кроме статуса) — только от вошедшего в приложение пользователя и не чаще лимита
  const requireUser = (scope: string, perMinute: number) => async (req: Request, res: Response, next: () => void) => {
    if (!rateLimit(`ip:${req.ip}`, 120)) {
      res.status(429).json({ error: 'Слишком много запросов. Подожди минуту.' });
      return;
    }
    if (!firebaseApiKey()) {
      console.error('[assistant] не задан FIREBASE_API_KEY (или VITE_FIREBASE_API_KEY) — проверить пользователя нечем');
      res.status(503).json({ error: 'Асошик временно недоступен.' });
      return;
    }
    const uid = await verifyIdToken(bearerToken(req.headers.authorization));
    if (!uid) {
      res.status(401).json({ error: 'Нужно войти в приложение, чтобы говорить с Асошиком.' });
      return;
    }
    if (!rateLimit(`${scope}:${uid}`, perMinute)) {
      res.status(429).json({ error: 'Слишком часто. Подожди минуту.' });
      return;
    }
    next();
  };

  // Статус подключения ИИ и доступных возможностей без утечки ключа в браузер
  app.get('/api/assistant/status', (_req: Request, res: Response) => {
    const ready = Boolean(getGeminiKey());
    res.json({
      available: ready,
      fastModel: FAST_CHAT_MODEL,
      deepModel: DEEP_TASK_MODEL,
      voiceModel: TTS_MODELS[0],
      liveModel: LIVE_MODEL,
      liveSupported: ready,
      imageSupported: ready,
    });
  });

  // Потоковый SSE-ответ Асошика с гибридной маршрутизацией моделей и вызовом инструментов
  app.post('/api/assistant/stream', requireUser('stream', 30), async (req: Request, res: Response) => {
    const ai = createAI();
    if (!ai) {
      res.status(503).json({ error: 'Асошик пока не подключён.' });
      return;
    }

    // Тело запроса приводим к безопасному виду: свои инструменты и правила подсунуть нельзя
    const clamped = clampStreamBody(req.body);
    if (typeof clamped === 'string') {
      res.status(400).json({ error: clamped });
      return;
    }
    const { contents, systemInstruction, tools, modePreference, hasMedia, lastUserText, forceRoute } = clamped;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(': ok\n\n');

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    let aborted = false;
    res.on('close', () => {
      if (!res.writableFinished) aborted = true;
    });

    let candidates = selectModelChain(modePreference, hasMedia, lastUserText);
    if (forceRoute === 'deep') {
      candidates = [
        {
          model: DEEP_TASK_MODEL,
          route: 'deep',
          label: hasMedia ? '4 Hydrogen · Разбор фото' : '4 Hydrogen · Глубокий разбор',
          thinkingLevel: ThinkingLevel.LOW,
        },
        ...candidates.filter((c) => c.model !== DEEP_TASK_MODEL),
      ];
    }

    const now = Date.now();
    const activeCandidates = candidates.filter((c) => (modelCooldownUntil.get(c.model) || 0) <= now);
    const orderedCandidates = activeCandidates.length > 0 ? activeCandidates : candidates;

    let lastStatus = 500;
    let succeeded = false;
    const attempts: { model: string; status: number; ms: number; reason: string }[] = [];

    for (const candidate of orderedCandidates) {
      if (aborted) break;
      const attemptStart = Date.now();
      const keepAlive = setInterval(() => {
        if (!aborted && !res.writableEnded) res.write(': ping\n\n');
      }, 4000);
      try {
        const timeoutMs = candidate.model === DEEP_TASK_MODEL ? 10000 : 12000;
        const stream = await Promise.race([
          ai.models.generateContentStream({
            model: candidate.model,
            contents: contents as Parameters<typeof ai.models.generateContentStream>[0]['contents'],
            config: {
              systemInstruction,
              ...(tools.length ? { tools: [{ functionDeclarations: tools as never }] } : {}),
              ...(candidate.thinkingLevel ? { thinkingConfig: { thinkingLevel: candidate.thinkingLevel } } : {}),
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(Object.assign(new Error(`Timeout after ${timeoutMs}ms`), { status: 504 })), timeoutMs)
          ),
        ]);
        clearInterval(keepAlive);
        modelCooldownUntil.delete(candidate.model);

        sendEvent({
          type: 'meta',
          route: candidate.route,
          model: candidate.model,
          label: candidate.label,
          ...(attempts.length ? { attempts } : {}),
        });

        let fullText = '';
        const collectedParts: Record<string, unknown>[] = [];
        const toolCalls: { name: string; args?: Record<string, unknown>; id?: string }[] = [];

        for await (const chunk of stream) {
          if (aborted) break;
          const c = chunk as GenerateContentResponse;
          const chunkParts = (c.candidates?.[0]?.content?.parts || []) as Record<string, unknown>[];
          for (const part of chunkParts) {
            if (typeof part.text === 'string' && part.text && !part.thought) {
              fullText += part.text;
              sendEvent({ type: 'delta', text: part.text });
            }
            if (part.functionCall) {
              collectedParts.push(part);
              toolCalls.push(part.functionCall as { name: string; args?: Record<string, unknown>; id?: string });
            } else if (part.thoughtSignature && collectedParts.length === 0) {
              collectedParts.push(part);
            }
          }
          if (!chunkParts.length && c.text) {
            fullText += c.text;
            sendEvent({ type: 'delta', text: c.text });
          }
        }

        if (aborted) break;

        if (toolCalls.length > 0) {
          const modelParts: Record<string, unknown>[] = [];
          if (fullText) modelParts.push({ text: fullText });
          for (const p of collectedParts) modelParts.push(p);
          sendEvent({ type: 'tool_calls', calls: toolCalls, modelParts, partialText: fullText });
        } else {
          sendEvent({ type: 'done', fullText });
        }
        succeeded = true;
        break;
      } catch (err) {
        clearInterval(keepAlive);
        const info = extractErrorInfo(err);
        lastStatus = info.status;
        if (info.status === 429 || info.status === 503 || info.status === 504) {
          modelCooldownUntil.set(candidate.model, Date.now() + 90_000);
        } else if (info.status === 404) {
          modelCooldownUntil.set(candidate.model, Date.now() + 300_000);
        }
        attempts.push({
          model: candidate.model,
          status: info.status,
          ms: Date.now() - attemptStart,
          reason: info.message.slice(0, 120),
        });
        console.error(`[assistant:${candidate.model}] status=${info.status}`, info.message.slice(0, 200));
        if (info.status === 400 || info.status === 404 || info.status === 408 || info.status === 429 || info.status === 503 || info.status === 504) {
          continue;
        }
        break;
      }
    }

    if (!succeeded && !aborted) {
      sendEvent({ type: 'error', status: lastStatus, message: friendlyRussianError(lastStatus), attempts });
    }
    if (!res.writableEnded) res.end();
  });

  // Генерация иллюстраций, схем и диаграмм (векторное искусство высокой чёткости)
  app.post('/api/assistant/image', requireUser('image', 8), async (req: Request, res: Response) => {
    const ai = createAI();
    if (!ai) {
      res.status(503).json({ error: 'Генерация картинок пока не подключена' });
      return;
    }

    const {
      prompt = '',
      style = 'illustration',
      aspectRatio = '1:1',
      referenceImage,
    } = (req.body || {}) as {
      prompt?: string;
      style?: string;
      aspectRatio?: string;
      referenceImage?: string;
    };

    const cleanPrompt = String(prompt || '').trim().slice(0, 600);
    if (!cleanPrompt) {
      res.status(400).json({ error: 'Опиши, что нужно нарисовать' });
      return;
    }

    if (typeof referenceImage === 'string' && referenceImage.length > MAX_REFERENCE_IMAGE_CHARS) {
      res.status(413).json({ error: 'Картинка слишком большая' });
      return;
    }
    const ratio = ASPECT_DIMENSIONS[aspectRatio] ? aspectRatio : '1:1';
    const { w, h } = ASPECT_DIMENSIONS[ratio];

    const styleHints: Record<string, string> = {
      illustration: 'яркая детализированная книжная иллюстрация с мягкими градиентами, глубиной, объёмными тенями и чистым фоном',
      diagram: 'наглядная школьная учебная схема / инфографика с чёткими стрелками, выносками, цветовой кодировкой и аккуратными русскими подписями',
      comic: 'выразительный комикс-арт с живыми персонажами, динамичными линиями и чистыми формами',
      poster: 'стильный образовательный постер с выразительной композицией, акцентами и сбалансированной палитрой',
      pixel: 'аккуратный пиксель-арт / изометрическая графика с чёткими гранями и сочными цветами',
    };

    const styleDesc = styleHints[style] || styleHints.illustration;

    const imgPrompt = `Нарисуй качественное изображение в формате SVG строго для viewBox="0 0 ${w} ${h}".
Запрос пользователя: ${cleanPrompt}
Стиль: ${styleDesc}.

Требования к SVG:
1. Корневой тег: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">.
2. Сделай полноценную красивую композицию на весь холст: добавь фоновый <rect> с <linearGradient> или <radialGradient> в <defs>, многослойные формы (<path>, <circle>, <ellipse>, <polygon>, <g>), световые блики и мягкие тени.
3. Если это учебная схема, график или объект с подписями — используй читаемый шрифт sans-serif на русском языке с контрастными плашками под текстом, чтобы ничего не сливалось.
4. Не используй внешние URL, <image href="http...">, <script>, <foreignObject> и обработчики событий on*.
5. Все элементы должны целиком помещаться внутри viewBox 0 0 ${w} ${h}.`;

    const parts: Record<string, unknown>[] = [];
    if (typeof referenceImage === 'string' && referenceImage.startsWith('data:image/')) {
      const [head, data] = referenceImage.split(',');
      const mimeType = head.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      if (data) {
        parts.push({ inlineData: { mimeType, data } });
      }
    }
    parts.push({ text: imgPrompt });

    const modelsToTry = [FAST_CHAT_MODEL, DEEP_TASK_MODEL, FALLBACK_LITE_MODEL];
    let lastStatus = 500;

    for (const model of modelsToTry) {
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: parts as never }],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Короткий заголовок картинки по-русски (3–6 слов)' },
                  caption: { type: Type.STRING, description: 'Короткое пояснение к изображению (1 предложение)' },
                  svg: { type: Type.STRING, description: 'Полный валидный SVG-код от <svg...> до </svg>' },
                },
                required: ['title', 'caption', 'svg'],
              },
            },
          }),
          new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error('Image generation timeout'), { status: 504 })), 18000)),
        ]);

        const rawJson = response.text || '';
        const parsed = JSON.parse(rawJson) as { title?: string; caption?: string; svg?: string };
        const cleanSvg = sanitizeSvg(String(parsed.svg || ''), w, h);
        if (!cleanSvg) continue;

        const base64 = Buffer.from(cleanSvg, 'utf8').toString('base64');
        res.json({
          title: String(parsed.title || cleanPrompt).slice(0, 80),
          caption: String(parsed.caption || '').slice(0, 220),
          imageUrl: `data:image/svg+xml;base64,${base64}`,
          aspectRatio: ratio,
          width: w,
          height: h,
          style,
          model,
        });
        return;
      } catch (err) {
        const info = extractErrorInfo(err);
        lastStatus = info.status;
        console.error(`[assistant:image:${model}] status=${info.status}`, info.message.slice(0, 200));
        if (info.status === 429 || info.status === 503 || info.status === 504 || info.status === 404 || err instanceof SyntaxError) {
          continue;
        }
        break;
      }
    }

    res.status(lastStatus >= 400 ? lastStatus : 500).json({
      error: lastStatus === 429 ? 'Слишком много запросов на рисование, подожди немного.' : 'Не получилось нарисовать картинку. Попробуй описать проще.',
    });
  });

  // Распознавание речи с микрофона
  app.post('/api/assistant/stt', requireUser('stt', 20), async (req: Request, res: Response) => {
    const ai = createAI();
    if (!ai) {
      res.status(503).json({ error: 'Асошик пока не подключён' });
      return;
    }
    const { wavBase64, langName: rawLang } = (req.body || {}) as { wavBase64?: string; langName?: string };
    if (!wavBase64 || typeof wavBase64 !== 'string') {
      res.status(400).json({ error: 'Пустая запись' });
      return;
    }
    if (wavBase64.length > MAX_WAV_CHARS) {
      res.status(413).json({ error: 'Запись слишком длинная' });
      return;
    }
    const langName = cleanLangName(rawLang);
    let lastStatus = 500;
    for (const model of STT_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'audio/wav', data: wavBase64 } },
                {
                  text: `Запиши дословно, что сказано в аудио (скорее всего ${langName}). Верни только сам текст, без кавычек и пояснений. Если речи не слышно, верни пустую строку.`,
                },
              ],
            },
          ],
        });
        const text = (response.text || '').replace(/^["«]|["»]$/g, '').trim();
        res.json({ text, model });
        return;
      } catch (err) {
        const info = extractErrorInfo(err);
        lastStatus = info.status;
        if (info.status === 404 || info.status === 429 || info.status === 503) continue;
        break;
      }
    }
    res.status(lastStatus).json({
      error: lastStatus === 429 ? 'Асошик перегружен, попробуй через минуту' : 'Не получилось распознать. Попробуй ещё раз.',
    });
  });

  // Озвучка ответа настоящим голосом Gemini TTS (через v1alpha)
  app.post('/api/assistant/tts', requireUser('tts', 30), async (req: Request, res: Response) => {
    const voiceAI = createVoiceAI();
    if (!voiceAI) {
      res.status(503).json({ error: 'TTS не подключён' });
      return;
    }
    const { text, voiceName = 'Puck', style } = (req.body || {}) as {
      text?: string;
      voiceName?: string;
      style?: string;
    };
    const clean = String(text || '').trim().slice(0, 900);
    if (!clean) {
      res.status(400).json({ error: 'Пустой текст' });
      return;
    }
    const safeVoice = ALLOWED_VOICES.has(voiceName) ? voiceName : 'Puck';
    const voiceStyle =
      typeof style === 'string' && style.trim()
        ? style.trim().slice(0, 140)
        : 'Friendly, clear, warm Russian school assistant speaking naturally';

    for (const model of TTS_MODELS) {
      try {
        const response = await voiceAI.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: clean,
                  speechMetadata: { style: voiceStyle },
                } as never,
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: safeVoice },
              },
            },
          },
        });
        const parts = (response.candidates?.[0]?.content?.parts || []) as {
          inlineData?: { data?: string; mimeType?: string };
        }[];
        const audioPart = parts.find((p) => p.inlineData?.data);
        if (audioPart?.inlineData?.data) {
          res.json({
            audioBase64: audioPart.inlineData.data,
            mimeType: audioPart.inlineData.mimeType || 'audio/wav',
            model,
            voiceName: safeVoice,
          });
          return;
        }
      } catch (err) {
        const info = extractErrorInfo(err);
        console.error(`[assistant:tts:${model}] status=${info.status}`, info.message.slice(0, 260));
        continue;
      }
    }
    res.status(502).json({ error: 'Озвучка Gemini временно недоступна' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (existsSync(distDir)) {
      app.use(express.static(distDir));
      app.use((_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  // HTTP-сервер + WebSocket-шлюз для живого голосового диалога Gemini Live API
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1_000_000 });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url || '';
    if (!url.startsWith('/api/assistant/live')) return;
    // Браузер всегда присылает Origin: чужие сайты не пускаем. Без Origin — не браузер, но токен всё равно нужен.
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (clientWs: WebSocket, req) => {
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    let authedUid = '';
    let authing = false;
    const voiceAI = createVoiceAI();
    if (!voiceAI) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'Голосовой сервер не подключён.' }));
      clientWs.close();
      return;
    }

    let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let connecting: Promise<void> | null = null;
    let closed = false;

    const sendWs = (payload: Record<string, unknown>) => {
      if (!closed && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    const connectSession = async (voiceName = 'Puck', context = '') => {
      if (session) return;
      if (connecting) {
        await connecting;
        return;
      }
      const safeVoice = ALLOWED_VOICES.has(voiceName) ? voiceName : 'Puck';
      const sysText = [
        'Ты — Асошик, дружелюбный голосовой школьный помощник и репетитор в приложении «АСОШ Таймер» для учеников МОУ АСОШ №2.',
        'Отвечай живо, по-доброму, понятно и компактно (как в обычном устном разговоре, без длинных списков и markdown-звёздочек).',
        'По расписанию, звонкам, оценкам и домашке опирайся строго на данные ученика ниже.',
        context ? `\nДанные ученика:\n${String(context).slice(0, 3000)}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      connecting = (async () => {
        try {
          session = await voiceAI.live.connect({
            model: LIVE_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: safeVoice },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction: sysText,
            },
            callbacks: {
              onmessage: (message: LiveServerMessage) => {
                const content = message.serverContent;
                if (content?.inputTranscription?.text) {
                  sendWs({ type: 'inputTranscript', text: content.inputTranscription.text });
                }
                if (content?.outputTranscription?.text) {
                  sendWs({ type: 'outputTranscript', text: content.outputTranscription.text });
                }
                for (const part of content?.modelTurn?.parts ?? []) {
                  if (part.inlineData?.data) {
                    sendWs({ type: 'audio', data: part.inlineData.data });
                  }
                }
                if (content?.interrupted) {
                  sendWs({ type: 'interrupted' });
                }
                if (content?.turnComplete) {
                  sendWs({ type: 'turnComplete' });
                }
              },
              onerror: (err: unknown) => {
                console.error('[assistant:live] error:', err);
                sendWs({ type: 'error', message: 'Связь с голосом Gemini прервалась.' });
              },
              onclose: () => {
                if (!closed) {
                  sendWs({ type: 'closed' });
                  clientWs.close();
                }
              },
            },
          });
          sendWs({ type: 'ready', model: LIVE_MODEL, voiceName: safeVoice });
        } catch (err) {
          const info = extractErrorInfo(err);
          console.error('[assistant:live] connect failed:', info.message.slice(0, 240));
          sendWs({ type: 'error', message: friendlyRussianError(info.status) });
          clientWs.close();
        }
      })();

      await connecting;
    };

    clientWs.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          voiceName?: string;
          context?: string;
          data?: string;
          text?: string;
          token?: string;
        };
        // Первое сообщение — setup с токеном входа; до проверки всё остальное игнорируем
        if (!authedUid) {
          if (msg.type !== 'setup' || authing) return;
          authing = true;
          const uid = await verifyIdToken(String(msg.token || ''));
          if (!uid || !rateLimit(`live:${uid}`, 6) || !rateLimit(`liveip:${clientIp}`, 20)) {
            sendWs({ type: 'error', message: uid ? 'Слишком часто. Подожди минуту.' : 'Нужно войти в приложение.' });
            clientWs.close();
            return;
          }
          authedUid = uid;
        }
        if (msg.type === 'setup') {
          await connectSession(msg.voiceName, msg.context);
          return;
        }
        if (!session) return;

        if (msg.type === 'audio' && typeof msg.data === 'string' && msg.data) {
          session.sendRealtimeInput({
            audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.type === 'text' && typeof msg.text === 'string' && msg.text.trim()) {
          session.sendRealtimeInput({ text: msg.text.trim() });
        }
      } catch (err) {
        console.error('[assistant:live:msg]', err);
      }
    });

    // Звонок не дольше 15 минут, чтобы один ученик не держал соединение вечно
    const maxCall = setTimeout(() => clientWs.close(), 15 * 60_000);

    clientWs.on('close', () => {
      clearTimeout(maxCall);
      closed = true;
      try {
        session?.close();
      } catch {
        // ignore
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ASOSH Timer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
