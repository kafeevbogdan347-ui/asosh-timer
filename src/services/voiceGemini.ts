// Голос Асошика 2.0:
// 1) Озвучка ответов реальным голосом Gemini API (gemini-3.8-flash-lite-tts через v1alpha) + выбор голоса
// 2) Живой голосовой разговор в реальном времени (Gemini Live API по WebSocket)
// 3) Распознавание речи с микрофона (/api/assistant/stt) + запасной голос устройства при отсутствии сети

const MAX_RECORD_SEC = 30;
const TARGET_RATE = 16000;
const DEFAULT_PUBLIC_API = 'https://asosh-timer.ai.studio';

export type GeminiVoiceName = 'Puck' | 'Kore' | 'Zephyr' | 'Charon' | 'Fenrir';

export const GEMINI_VOICES: { id: GeminiVoiceName; label: string; hint: string }[] = [
  { id: 'Puck', label: 'Пак', hint: 'Бодрый' },
  { id: 'Kore', label: 'Кора', hint: 'Мягкий' },
  { id: 'Zephyr', label: 'Зефир', hint: 'Тёплый' },
  { id: 'Charon', label: 'Харон', hint: 'Глубокий' },
  { id: 'Fenrir', label: 'Фенрир', hint: 'Уверенный' },
];

const VOICE_PREF_KEY = 'asosh_asoshik_voice_name';

export function getPreferredVoice(): GeminiVoiceName {
  try {
    const v = localStorage.getItem(VOICE_PREF_KEY) as GeminiVoiceName | null;
    if (v && GEMINI_VOICES.some((x) => x.id === v)) return v;
  } catch {
    // ignore
  }
  return 'Puck';
}

export function setPreferredVoice(v: GeminiVoiceName): void {
  try {
    localStorage.setItem(VOICE_PREF_KEY, v);
  } catch {
    // ignore
  }
}

function resolveApiBase(): string {
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

function voiceApiUrl(path: string, forceRemote = false): string {
  const base = forceRemote ? DEFAULT_PUBLIC_API : resolveApiBase();
  return `${base}${path}`;
}

function liveWsUrl(): string {
  const base = resolveApiBase();
  if (base) {
    return `${base.replace(/^http/i, 'ws')}/api/assistant/live`;
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/api/assistant/live`;
  }
  return `${DEFAULT_PUBLIC_API.replace(/^http/i, 'ws')}/api/assistant/live`;
}

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
    if (!ctx || ctx.state === 'closed') {
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

// ---------- Запись в WAV 16 кГц (Push-to-Talk) ----------
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

function encodePcm16(samples: Float32Array): string {
  const buf = new ArrayBuffer(samples.length * 2);
  const v = new DataView(buf);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return bytesToBase64(new Uint8Array(buf));
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

// ---------- Распознавание (STT) ----------
export async function transcribe(wavBase64: string, langName: string): Promise<string> {
  if (!navigator.onLine) throw new Error('Нет интернета');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  const primary = voiceApiUrl('/api/assistant/stt');
  const remote = voiceApiUrl('/api/assistant/stt', true);
  try {
    let res = await fetch(primary, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wavBase64, langName }),
      signal: ctrl.signal,
    });
    if ((res.status === 404 || res.status === 405) && primary !== remote) {
      res = await fetch(remote, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wavBase64, langName }),
        signal: ctrl.signal,
      });
    }
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

// ---------- Озвучка (Gemini TTS + резерв устройства) ----------
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
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

async function playAudio(base64: string, mime: string, onEnd: () => void): Promise<boolean> {
  const c = audioCtx();
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const isEncoded = /wav|mpeg|mp3|ogg/i.test(mime) || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46);

  if (c) {
    try {
      let buf: AudioBuffer;
      if (isEncoded) {
        buf = await c.decodeAudioData(bytes.buffer.slice(0));
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
    } catch {
      // пробуем HTML5 Audio fallback для WAV/MP3
    }
  }

  if (isEncoded) {
    try {
      const audio = new Audio(`data:${mime || 'audio/wav'};base64,${base64}`);
      const stop = () => {
        audio.pause();
        audio.currentTime = 0;
      };
      audio.onended = () => {
        if (current?.stop === stop) current = null;
        onEnd();
      };
      audio.onerror = () => {
        if (current?.stop === stop) current = null;
        onEnd();
      };
      current = { stop };
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function speakAnswer(
  text: string,
  browserLang: string,
  onEnd: () => void,
  voiceName?: GeminiVoiceName
): Promise<'gemini' | 'none'> {
  stopVoice();
  const clean = plain(text).slice(0, 900);
  if (!clean) {
    onEnd();
    return 'none';
  }
  if (navigator.onLine && serverVoiceReady) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 35000);
    const chosenVoice = voiceName || getPreferredVoice();
    const primary = voiceApiUrl('/api/assistant/tts');
    const remote = voiceApiUrl('/api/assistant/tts', true);
    try {
      let res = await fetch(primary, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voiceName: chosenVoice }),
        signal: ctrl.signal,
      });
      if ((res.status === 404 || res.status === 405) && primary !== remote) {
        res = await fetch(remote, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean, voiceName: chosenVoice }),
          signal: ctrl.signal,
        });
      }
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { audioBase64?: string; mimeType?: string };
        if (data.audioBase64 && (await playAudio(data.audioBase64, data.mimeType || 'audio/wav', onEnd))) {
          return 'gemini';
        }
      }
    } catch {
      // пробуем голос устройства
    } finally {
      clearTimeout(timer);
    }
  }
  onEnd();
  return 'none';
}

// ---------- Живой голосовой разговор Gemini Live API (/api/assistant/live) ----------
export type LiveCallState = 'connecting' | 'listening' | 'speaking' | 'closed' | 'error';

export interface LiveVoiceSession {
  stop: () => void;
  sendText: (text: string) => void;
}

export async function startLiveVoiceCall(opts: {
  voiceName?: GeminiVoiceName;
  context: string;
  onState: (state: LiveCallState) => void;
  onTranscript?: (who: 'user' | 'model', text: string) => void;
  onError?: (message: string) => void;
}): Promise<LiveVoiceSession> {
  if (!navigator.onLine) {
    throw new Error('Нет интернета для голосового звонка');
  }
  if (!micSupported()) {
    throw new Error('Микрофон недоступен в этом браузере');
  }

  opts.onState('connecting');
  const voiceName = opts.voiceName || getPreferredVoice();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('Аудио не поддерживается браузером');
  }

  const inputCtx = new AudioCtx({ sampleRate: 16000 });
  const outputCtx = new AudioCtx({ sampleRate: 24000 });
  await Promise.all([inputCtx.resume().catch(() => {}), outputCtx.resume().catch(() => {})]);

  const ws = new WebSocket(liveWsUrl());
  let closed = false;
  let nextStartTime = 0;
  let speakingTimer: ReturnType<typeof setTimeout> | null = null;
  const activeSources = new Set<AudioBufferSourceNode>();

  const clearPlayback = () => {
    if (speakingTimer) {
      clearTimeout(speakingTimer);
      speakingTimer = null;
    }
    for (const s of activeSources) {
      try {
        s.stop();
      } catch {
        // ignore
      }
    }
    activeSources.clear();
    nextStartTime = outputCtx.currentTime;
  };

  const schedulePcm24k = (base64: string) => {
    if (closed) return;
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const n = Math.floor(bytes.length / 2);
    if (n === 0) return;

    const buf = outputCtx.createBuffer(1, n, 24000);
    const ch = buf.getChannelData(0);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < n; i++) ch[i] = view.getInt16(i * 2, true) / 0x8000;

    const src = outputCtx.createBufferSource();
    src.buffer = buf;
    src.connect(outputCtx.destination);

    const now = outputCtx.currentTime;
    if (nextStartTime < now) nextStartTime = now + 0.02;
    src.start(nextStartTime);
    nextStartTime += buf.duration;

    activeSources.add(src);
    opts.onState('speaking');
    src.onended = () => {
      activeSources.delete(src);
      if (activeSources.size === 0 && !closed) {
        if (speakingTimer) clearTimeout(speakingTimer);
        speakingTimer = setTimeout(() => {
          if (!closed && activeSources.size === 0) opts.onState('listening');
        }, 250);
      }
    };
  };

  const sourceNode = inputCtx.createMediaStreamSource(stream);
  const proc = inputCtx.createScriptProcessor(4096, 1, 1);
  const muteGain = inputCtx.createGain();
  muteGain.gain.value = 0;

  let wsReady = false;
  proc.onaudioprocess = (e) => {
    if (closed || !wsReady || ws.readyState !== WebSocket.OPEN) return;
    const raw = e.inputBuffer.getChannelData(0);
    const samples = inputCtx.sampleRate > TARGET_RATE ? downsample(raw, inputCtx.sampleRate, TARGET_RATE) : raw;
    ws.send(JSON.stringify({ type: 'audio', data: encodePcm16(samples) }));
  };

  sourceNode.connect(proc);
  proc.connect(muteGain);
  muteGain.connect(inputCtx.destination);

  const cleanup = (notify = true) => {
    if (closed) return;
    closed = true;
    clearPlayback();
    proc.onaudioprocess = null;
    try {
      sourceNode.disconnect();
      proc.disconnect();
      muteGain.disconnect();
    } catch {
      // ignore
    }
    stream.getTracks().forEach((t) => t.stop());
    try {
      ws.close();
    } catch {
      // ignore
    }
    inputCtx.close().catch(() => {});
    outputCtx.close().catch(() => {});
    if (notify) opts.onState('closed');
  };

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'setup', voiceName, context: opts.context }));
  };

  ws.onmessage = (ev) => {
    if (closed) return;
    try {
      const msg = JSON.parse(String(ev.data)) as {
        type?: string;
        data?: string;
        text?: string;
        message?: string;
      };
      if (msg.type === 'ready') {
        wsReady = true;
        opts.onState('listening');
      } else if (msg.type === 'audio' && msg.data) {
        schedulePcm24k(msg.data);
      } else if (msg.type === 'interrupted') {
        clearPlayback();
        opts.onState('listening');
      } else if (msg.type === 'inputTranscript' && msg.text) {
        opts.onTranscript?.('user', msg.text);
      } else if (msg.type === 'outputTranscript' && msg.text) {
        opts.onTranscript?.('model', msg.text);
      } else if (msg.type === 'error') {
        opts.onError?.(msg.message || 'Ошибка голосового соединения');
        cleanup(false);
        opts.onState('error');
      } else if (msg.type === 'closed') {
        cleanup(true);
      }
    } catch {
      // ignore malformed message
    }
  };

  ws.onerror = () => {
    if (!closed) {
      opts.onError?.('Не удалось подключиться к живому голосу Gemini');
      cleanup(false);
      opts.onState('error');
    }
  };

  ws.onclose = () => {
    if (!closed) cleanup(true);
  };

  return {
    stop: () => cleanup(true),
    sendText: (text: string) => {
      if (!closed && ws.readyState === WebSocket.OPEN && text.trim()) {
        ws.send(JSON.stringify({ type: 'text', text: text.trim() }));
      }
    },
  };
}
