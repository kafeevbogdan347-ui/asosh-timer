// Голос Асошика через Gemini: запись с микрофона → распознавание, ответ → озвучка голосом Puck.
// Работает одинаково в браузере, на iPhone и в APK (там нет встроенного распознавания речи).
// Если лимит озвучки Gemini на сегодня закончился — читает встроенный голос телефона.

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const STT_MODEL = 'gemini-flash-lite-latest';
// Порядок важен: у каждой модели свой дневной лимит, при отказе пробуем следующую
const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
const VOICE = 'Puck';
const MAX_RECORD_SEC = 30;
const TARGET_RATE = 16000;

export const geminiVoiceAvailable = () => Boolean(API_KEY);
export const micSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

// ---------- Общий AudioContext: на iPhone звук можно включить только после нажатия ----------
let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    return ctx;
  } catch {
    return null;
  }
}
// Вызывать в обработчике нажатия (микрофон, отправка), чтобы потом ответ смог прозвучать
export function unlockAudio(): void {
  const c = audioCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

// ---------- Запись в WAV 16 кГц (понимают все модели Gemini и все телефоны) ----------
export interface Recording {
  stop: () => Promise<string | null>; // base64 WAV или null, если записи нет
  cancel: () => void;
}

export async function startRecording(onAutoStop: () => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const c = audioCtx();
  if (!c) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('Телефон не умеет записывать звук');
  }
  await c.resume().catch(() => {});
  const source = c.createMediaStreamSource(stream);
  const proc = c.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let length = 0;
  proc.onaudioprocess = (e) => {
    const data = new Float32Array(e.inputBuffer.getChannelData(0));
    chunks.push(data);
    length += data.length;
  };
  // Тихий выход: ScriptProcessor работает, только если подключён к выходу
  const mute = c.createGain();
  mute.gain.value = 0;
  source.connect(proc);
  proc.connect(mute);
  mute.connect(c.destination);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    proc.onaudioprocess = null;
    try {
      source.disconnect();
      proc.disconnect();
      mute.disconnect();
    } catch {
      // уже отключено
    }
    stream.getTracks().forEach((t) => t.stop());
  };
  const timer = setTimeout(onAutoStop, MAX_RECORD_SEC * 1000);

  return {
    cancel: cleanup,
    stop: async () => {
      cleanup();
      if (length < c.sampleRate * 0.4) return null; // меньше 0,4 с — это не вопрос
      const all = new Float32Array(length);
      let off = 0;
      for (const ch of chunks) {
        all.set(ch, off);
        off += ch.length;
      }
      return encodeWav(downsample(all, c.sampleRate, TARGET_RATE), TARGET_RATE);
    },
  };
}

function downsample(data: Float32Array, from: number, to: number): Float32Array {
  if (from <= to) return data;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(data.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(data.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += data[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, rate: number): string {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytesToBase64(new Uint8Array(buf));
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function post(model: string, body: unknown, timeoutMs = 30000): Promise<{ ok: boolean; status: number; data: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  } finally {
    clearTimeout(t);
  }
}

// ---------- Распознавание ----------
export async function transcribe(wavBase64: string, langName: string): Promise<string> {
  if (!API_KEY) throw new Error('Асошик пока не подключён');
  if (!navigator.onLine) throw new Error('Нет интернета');
  let res;
  try {
    res = await post(STT_MODEL, {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'audio/wav', data: wavBase64 } },
            { text: `Запиши дословно, что сказано в аудио (скорее всего ${langName}). Верни только сам текст, без кавычек и пояснений. Если речи не слышно, верни пустую строку.` },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 400 },
    });
  } catch {
    throw new Error('Не получилось распознать. Попробуй ещё раз.');
  }
  if (!res.ok) throw new Error(res.status === 429 ? 'Асошик перегружен, попробуй через минуту' : 'Не получилось распознать. Попробуй ещё раз.');
  const text = ((res.data?.candidates?.[0]?.content?.parts || []) as { text?: string }[]).map((p) => p.text || '').join('').trim();
  return text.replace(/^["«]|["»]$/g, '').trim();
}

// ---------- Озвучка ----------
const plain = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$?[^$]*\$\$?/g, ' ')
    .replace(/[*_`#>|]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const todayKey = () => new Date().toISOString().slice(0, 10);
const offKey = (m: string) => `asosh_tts_off_${m}`;
const modelOff = (m: string) => {
  try {
    return localStorage.getItem(offKey(m)) === todayKey();
  } catch {
    return false;
  }
};
const markOff = (m: string) => {
  try {
    localStorage.setItem(offKey(m), todayKey());
  } catch {
    // не запомнится — просто попробуем снова
  }
};

let current: { stop: () => void } | null = null;
export function stopVoice(): void {
  current?.stop();
  current = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// Новые модели отдают WAV, старая — «сырой» PCM 16 бит (audio/L16;rate=24000)
async function playAudio(base64: string, mime: string, onEnd: () => void): Promise<boolean> {
  const c = audioCtx();
  if (!c) return false;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let buf: AudioBuffer;
  if (/wav|mpeg|mp3|ogg/i.test(mime) || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46)) {
    try {
      buf = await c.decodeAudioData(bytes.buffer.slice(0));
    } catch {
      return false;
    }
  } else {
    const rate = Number(mime.match(/rate=(\d+)/)?.[1]) || 24000;
    const n = Math.floor(bytes.length / 2);
    buf = c.createBuffer(1, n, rate);
    const ch = buf.getChannelData(0);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < n; i++) ch[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  const stop = () => {
    try {
      src.stop();
    } catch {
      // уже закончилось
    }
  };
  src.onended = () => {
    if (current?.stop === stop) current = null;
    onEnd();
  };
  current = { stop };
  await c.resume().catch(() => {});
  src.start();
  return true;
}

function speakBrowser(text: string, lang: string, onEnd: () => void): void {
  if (!('speechSynthesis' in window)) {
    onEnd();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (v) u.voice = v;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

// Озвучивает ответ голосом Gemini; если не вышло — встроенным голосом телефона.
// Возвращает, чем говорил: 'gemini' | 'device' | 'none'
export async function speakAnswer(text: string, browserLang: string, onEnd: () => void): Promise<'gemini' | 'device' | 'none'> {
  stopVoice();
  const clean = plain(text).slice(0, 900);
  if (!clean) {
    onEnd();
    return 'none';
  }
  if (API_KEY && navigator.onLine) {
    for (const model of TTS_MODELS) {
      if (modelOff(model)) continue;
      try {
        const res = await post(
          model,
          {
            // Только сам текст: инструкции модель зачитывает вслух
            contents: [{ role: 'user', parts: [{ text: clean }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
          },
          45000
        );
        if (!res.ok) {
          if (res.status === 429 || res.status === 403 || res.status === 404) markOff(model);
          continue;
        }
        const part = ((res.data?.candidates?.[0]?.content?.parts || []) as { inlineData?: { data: string; mimeType: string } }[]).find((p) => p.inlineData?.data);
        if (part?.inlineData && (await playAudio(part.inlineData.data, part.inlineData.mimeType || '', onEnd))) return 'gemini';
      } catch {
        // сеть или таймаут — пробуем следующую модель
      }
    }
  }
  if ('speechSynthesis' in window) {
    speakBrowser(clean, browserLang, onEnd);
    return 'device';
  }
  onEnd();
  return 'none';
}
