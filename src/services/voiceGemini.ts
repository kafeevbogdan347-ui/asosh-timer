// Голос Асошика через серверный шлюз /api/assistant/stt и /api/assistant/tts.
// Работает одинаково в браузере, на iPhone и в APK (там нет встроенного распознавания речи).
// Если серверная озвучка недоступна — читает встроенный голос телефона.

const MAX_RECORD_SEC = 30;
const TARGET_RATE = 16000;

let serverVoiceReady = true;

export function setGeminiVoiceReady(ready: boolean): void {
  serverVoiceReady = ready;
}

export const geminiVoiceAvailable = () => serverVoiceReady;
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

export function unlockAudio(): void {
  const c = audioCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

// ---------- Запись в WAV 16 кГц ----------
export interface Recording {
  stop: () => Promise<string | null>;
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
      if (length < c.sampleRate * 0.4) return null;
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

// ---------- Распознавание ----------
export async function transcribe(wavBase64: string, langName: string): Promise<string> {
  if (!navigator.onLine) throw new Error('Нет интернета');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch('/api/assistant/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wavBase64, langName }),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Не получилось распознать. Попробуй ещё раз.');
    }
    return String(data.text || '').trim();
  } catch (err) {
    if (err instanceof Error && err.message) throw err;
    throw new Error('Не получилось распознать. Попробуй ещё раз.');
  } finally {
    clearTimeout(t);
  }
}

// ---------- Озвучка ----------
const plain = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$?[^$]*\$\$?/g, ' ')
    .replace(/[*_`#>|✓✕]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

let current: { stop: () => void } | null = null;
export function stopVoice(): void {
  current?.stop();
  current = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

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

export async function speakAnswer(text: string, browserLang: string, onEnd: () => void): Promise<'gemini' | 'device' | 'none'> {
  stopVoice();
  const clean = plain(text).slice(0, 900);
  if (!clean) {
    onEnd();
    return 'none';
  }
  if (navigator.onLine && serverVoiceReady) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 35000);
    try {
      const res = await fetch('/api/assistant/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voiceName: 'Puck' }),
        signal: ctrl.signal,
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { audioBase64?: string; mimeType?: string };
        if (data.audioBase64 && (await playAudio(data.audioBase64, data.mimeType || '', onEnd))) {
          return 'gemini';
        }
      }
    } catch {
      // пробуем голос устройства
    } finally {
      clearTimeout(timer);
    }
  }
  if ('speechSynthesis' in window) {
    speakBrowser(clean, browserLang, onEnd);
    return 'device';
  }
  onEnd();
  return 'none';
}
