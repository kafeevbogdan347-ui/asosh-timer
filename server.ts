import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Модели Асошика:
// - быстрый чат: gemini-3.8-flash (с резервом на gemini-3.1-flash-lite)
// - сложные задачи, фото и глубокий разбор: gemini-4-hydrogen
const FAST_CHAT_MODEL = 'gemini-3.8-flash';
const FAST_RESERVE_MODEL = 'gemini-3.1-flash-lite';
const DEEP_TASK_MODEL = 'gemini-4-hydrogen';
const STT_MODELS = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite'];
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts];

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
    text.length >= 140 ||
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
        ...(hasMedia || modePref === 'tutor' ? { thinkingLevel: ThinkingLevel.LOW } : {}),
      },
      {
        model: FAST_CHAT_MODEL,
        route: 'fast',
        label: '3.8 Flash · Резерв',
      },
      {
        model: FAST_RESERVE_MODEL,
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
      label: modePref === 'brief' ? '3.8 Flash · Кратко' : '3.8 Flash · Быстрый чат',
    },
    {
      model: FAST_RESERVE_MODEL,
      route: 'fast',
      label: '3.1 Flash Lite · Резерв',
      thinkingLevel: ThinkingLevel.MINIMAL,
    },
    {
      model: DEEP_TASK_MODEL,
      route: 'deep',
      label: '4 Hydrogen · Резерв',
    },
  ];
}

// Кратковременный кэш таймаутов, чтобы не заставлять пользователя ждать на каждом сообщении,
// если одна из моделей временно не отвечает в текущем окружении.
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.use('/api/assistant', (req: Request, res: Response, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Статус подключения ИИ без утечки ключа в браузер
  app.get('/api/assistant/status', (_req: Request, res: Response) => {
    res.json({
      available: Boolean(getGeminiKey()),
      fastModel: FAST_CHAT_MODEL,
      deepModel: DEEP_TASK_MODEL,
    });
  });

  // Потоковый SSE-ответ Асошика с гибридной маршрутизацией моделей и вызовом инструментов
  app.post('/api/assistant/stream', async (req: Request, res: Response) => {
    const ai = createAI();
    if (!ai) {
      res.status(503).json({ error: 'Асошик пока не подключён.' });
      return;
    }

    const {
      contents = [],
      systemInstruction = '',
      tools = [],
      modePreference = 'auto',
      hasMedia = false,
      lastUserText = '',
      forceRoute,
    } = (req.body || {}) as {
      contents?: unknown[];
      systemInstruction?: string;
      tools?: unknown[];
      modePreference?: ModePref;
      hasMedia?: boolean;
      lastUserText?: string;
      forceRoute?: RouteKind;
    };

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

    let candidates = selectModelChain(modePreference, Boolean(hasMedia), String(lastUserText || ''));
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
        const timeoutMs = candidate.route === 'deep' ? 9000 : 7000;
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
        if (info.status === 504 || info.status === 404) {
          modelCooldownUntil.set(candidate.model, Date.now() + 60_000);
        }
        attempts.push({
          model: candidate.model,
          status: info.status,
          ms: Date.now() - attemptStart,
          reason: info.message.slice(0, 120),
        });
        console.error(`[assistant:${candidate.model}] status=${info.status}`, info.message.slice(0, 200));
        if (info.status === 404 || info.status === 408 || info.status === 429 || info.status === 503 || info.status === 504) {
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

  // Распознавание речи с микрофона
  app.post('/api/assistant/stt', async (req: Request, res: Response) => {
    const ai = createAI();
    if (!ai) {
      res.status(503).json({ error: 'Асошик пока не подключён' });
      return;
    }
    const { wavBase64, langName = 'русский' } = (req.body || {}) as { wavBase64?: string; langName?: string };
    if (!wavBase64) {
      res.status(400).json({ error: 'Пустая запись' });
      return;
    }
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
        res.json({ text });
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

  // Озвучка ответа голосом Puck
  app.post('/api/assistant/tts', async (req: Request, res: Response) => {
    const ai = createAI();
    if (!ai) {
      res.status(503).json({ error: 'TTS не подключён' });
      return;
    }
    const { text, voiceName = 'Puck' } = (req.body || {}) as { text?: string; voiceName?: string };
    const clean = String(text || '').trim().slice(0, 900);
    if (!clean) {
      res.status(400).json({ error: 'Пустой текст' });
      return;
    }
    for (const model of TTS_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: clean }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
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
          });
          return;
        }
      } catch (err) {
        const info = extractErrorInfo(err);
        if (info.status === 404 || info.status === 429 || info.status === 503) continue;
        break;
      }
    }
    res.status(502).json({ error: 'Озвучка временно недоступна' });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASOSH Timer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
