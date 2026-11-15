import { SoundProfileType } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playTone(
  freq: number,
  time = 0.06,
  gain = 0.035,
  start = 0,
  profile: SoundProfileType = '1'
) {
  if (profile === '0') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    if (profile === '2') {
      // 8-bit retro
      osc.type = 'square';
      osc.frequency.value = freq * 0.85;
      g.gain.value = Math.min(0.04, gain);
    } else if (profile === '3') {
      // Soft sine
      osc.type = 'sine';
      osc.frequency.value = freq * 0.95;
      g.gain.value = Math.min(0.04, gain * 1.1);
    } else if (profile === '4') {
      // Sci-Fi Bell
      osc.type = 'sawtooth';
      osc.frequency.value = freq * 1.2;
      g.gain.value = Math.min(0.03, gain * 0.8);
    } else {
      // Classic
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.value = gain;
    }

    // smooth envelope
    const now = ctx.currentTime + start;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(g.gain.value, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + time);

    osc.connect(g);
    g.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + time + 0.05);
  } catch {
    // Ignore audio error
  }
}

export function playSound(
  type:
    | 'click'
    | 'nav'
    | 'settings'
    | 'gameover'
    | 'coin'
    | 'warn'
    | 'pomodoro'
    | 'star'
    | 'bell'
    | 'victory'
    | 'buzzer'
    | 'flip'
    | 'combo'
    | 'levelup',
  profile: SoundProfileType = '1'
) {
  if (profile === '0') return;
  if (profile === '5') {
    playAsoshSound(type);
    return;
  }

  if (type === 'nav') {
    playTone(480, 0.04, 0.03, 0, profile);
    playTone(680, 0.04, 0.025, 0.04, profile);
  } else if (type === 'settings') {
    playTone(360, 0.06, 0.03, 0, profile);
    playTone(520, 0.07, 0.025, 0.06, profile);
  } else if (type === 'gameover') {
    playTone(220, 0.2, 0.05, 0, profile);
    playTone(160, 0.25, 0.05, 0.12, profile);
    playTone(110, 0.35, 0.06, 0.25, profile);
  } else if (type === 'coin') {
    playTone(900, 0.08, 0.03, 0, profile);
    playTone(1200, 0.1, 0.03, 0.07, profile);
  } else if (type === 'warn') {
    playTone(700, 0.12, 0.06, 0, profile);
    playTone(850, 0.15, 0.06, 0.1, profile);
    playTone(1000, 0.2, 0.07, 0.2, profile);
  } else if (type === 'pomodoro') {
    playTone(523.25, 0.2, 0.06, 0, profile); // C5
    playTone(659.25, 0.2, 0.06, 0.15, profile); // E5
    playTone(783.99, 0.3, 0.07, 0.3, profile); // G5
    playTone(1046.5, 0.5, 0.08, 0.45, profile); // C6
  } else if (type === 'star') {
    playTone(600, 0.05, 0.03, 0, profile);
    playTone(900, 0.08, 0.04, 0.05, profile);
  } else if (type === 'bell') {
    // School Electric bell pulse
    for (let i = 0; i < 12; i++) {
      playTone(1320 + (i % 2 === 0 ? 40 : -40), 0.06, 0.06, i * 0.08, profile);
    }
  } else if (type === 'victory') {
    playTone(523.25, 0.12, 0.05, 0, profile); // C5
    playTone(659.25, 0.12, 0.05, 0.12, profile); // E5
    playTone(783.99, 0.15, 0.05, 0.24, profile); // G5
    playTone(1046.5, 0.35, 0.07, 0.36, profile); // C6
    playTone(1318.5, 0.5, 0.08, 0.52, profile); // E6
  } else if (type === 'buzzer') {
    playTone(180, 0.25, 0.07, 0, '2');
    playTone(140, 0.3, 0.07, 0.08, '2');
  } else if (type === 'flip') {
    playTone(750, 0.04, 0.025, 0, profile);
  } else if (type === 'combo') {
    playTone(800, 0.06, 0.04, 0, profile);
    playTone(1000, 0.06, 0.04, 0.06, profile);
    playTone(1200, 0.08, 0.05, 0.12, profile);
  } else if (type === 'levelup') {
    playTone(440, 0.08, 0.04, 0, profile);
    playTone(554.37, 0.08, 0.04, 0.08, profile);
    playTone(659.25, 0.08, 0.04, 0.16, profile);
    playTone(880, 0.25, 0.06, 0.24, profile);
  } else {
    playTone(560, 0.05, 0.03, 0, profile);
  }
}

export function playBellSimulatorSound(kind: 'classic' | 'melodic' | 'digital' | 'bigben' | 'whistle', profile: SoundProfileType = '1') {
  if (profile === '0') return;
  if (profile === '5' && kind === 'classic') {
    playAsoshSound('bell');
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) return;

  if (kind === 'classic') {
    // Realistic pulsating electric school bell (18 rapid strikes)
    for (let i = 0; i < 22; i++) {
      playTone(1350 + (i % 3 === 0 ? 30 : -25), 0.055, 0.07, i * 0.065, '1');
    }
  } else if (kind === 'melodic') {
    // 3-note melodic school chime (G4 - B4 - D5 - G5)
    const notes = [392.00, 493.88, 587.33, 783.99];
    notes.forEach((n, idx) => {
      playTone(n, 0.6, 0.08, idx * 0.28, '3');
    });
  } else if (kind === 'digital') {
    // Hi-Tech energetic 2-tone school bell
    for (let step = 0; step < 3; step++) {
      const offset = step * 0.35;
      playTone(880, 0.12, 0.07, offset, '4');
      playTone(1174.66, 0.2, 0.08, offset + 0.12, '4');
    }
  } else if (kind === 'bigben') {
    // Westminster chime sequence (E4 - G#4 - F#4 - B3)
    const notes = [329.63, 415.30, 369.99, 246.94];
    notes.forEach((n, idx) => {
      playTone(n, 0.9, 0.09, idx * 0.45, '3');
    });
  } else if (kind === 'whistle') {
    // PE Coach whistle (trill tone)
    for (let i = 0; i < 15; i++) {
      playTone(2400 + (i % 2 === 0 ? 150 : -150), 0.04, 0.08, i * 0.035, '4');
    }
  }
}

// ===== Профиль '5' «АСОШ»: мягкие звуки в духе iPhone =====
// Маримба и стекло: короткие, тихие, округлые, с лёгким эхом.

let asoshBus: GainNode | null = null;

// общий выход с маленьким «комнатным» эхом
function getBus(ctx: AudioContext): AudioNode {
  if (asoshBus) return asoshBus;
  const bus = ctx.createGain();
  bus.connect(ctx.destination);
  try {
    const len = Math.floor(ctx.sampleRate * 0.7);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    bus.connect(verb);
    verb.connect(wet);
    wet.connect(ctx.destination);
  } catch {
    // без эха тоже работает
  }
  asoshBus = bus;
  return bus;
}

interface VoiceOpts {
  freq: number;
  start?: number;
  dur?: number;
  gain?: number;
  // множители частоты и громкость обертонов
  partials?: [number, number][];
  // частота, к которой скользит тон
  glideTo?: number;
  attack?: number;
  cutoff?: number;
}

function voice(o: VoiceOpts) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const { freq, start = 0, dur = 0.12, gain = 0.04, partials = [[1, 1]], glideTo, attack = 0.003, cutoff = 8000 } = o;
    const now = ctx.currentTime + start;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(gain, now + attack);
    master.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    filter.connect(master);
    master.connect(getBus(ctx));
    partials.forEach(([mul, amp], i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mul, now);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo * mul, now + dur * 0.7);
      // верхние обертоны гаснут быстрее — так звучит дерево и стекло
      g.gain.setValueAtTime(amp, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.02, dur / (1 + i * 3)));
      osc.connect(g);
      g.connect(filter);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    });
  } catch {
    // Ignore audio error
  }
}

// короткий шумовой «тик», как клавиатура телефона
function tick(start = 0, gain = 0.05, center = 3200, dur = 0.018) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = center;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(ctx.currentTime + start);
  } catch {
    // Ignore audio error
  }
}

// мягкий «вжух» из шума с плавающим фильтром
function swoosh(start = 0, dur = 0.25, from = 600, to = 3000, gain = 0.035) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + start;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(from, now);
    bp.frequency.exponentialRampToValueAtTime(to, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(getBus(ctx));
    src.start(now);
  } catch {
    // Ignore audio error
  }
}

// маримба: основной тон + 4-й и 10-й обертоны
const MARIMBA: [number, number][] = [[1, 1], [3.93, 0.28], [9.2, 0.06]];
// стекло: чистый тон и тихая октава с квинтой
const GLASS: [number, number][] = [[1, 1], [2.0, 0.18], [3.0, 0.07]];

function marimba(freq: number, start = 0, dur = 0.45, gain = 0.06) {
  voice({ freq, start, dur, gain, partials: MARIMBA, attack: 0.002 });
}
function glass(freq: number, start = 0, dur = 0.6, gain = 0.035) {
  voice({ freq, start, dur, gain, partials: GLASS, attack: 0.004 });
}

// ноты
const N = { G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1568, A6: 1760, C7: 2093 };

function playAsoshSound(type: Parameters<typeof playSound>[0]) {
  if (type === 'click') {
    tick(0, 0.05);
  } else if (type === 'nav') {
    // мягкий «поп» вниз
    voice({ freq: 1100, glideTo: 700, dur: 0.06, gain: 0.04, cutoff: 4000 });
  } else if (type === 'settings') {
    // как переключатель: два тихих тика
    tick(0, 0.045, 2600);
    tick(0.045, 0.035, 3600);
  } else if (type === 'flip') {
    swoosh(0, 0.14, 900, 2600, 0.03);
  } else if (type === 'coin') {
    // уведомление: две ноты маримбы вверх
    marimba(N.E6, 0, 0.35, 0.05);
    marimba(N.A6, 0.09, 0.5, 0.05);
  } else if (type === 'star') {
    glass(N.G6, 0, 0.5, 0.03);
    glass(N.C7, 0.06, 0.7, 0.025);
  } else if (type === 'combo') {
    [N.C6, N.E6, N.G6].forEach((n, i) => marimba(n, i * 0.06, 0.3, 0.045));
  } else if (type === 'warn') {
    // «скоро звонок»: три мягкие ноты вниз
    [N.G5, N.E5, N.C5].forEach((n, i) => marimba(n, i * 0.16, 0.6, 0.065));
  } else if (type === 'bell') {
    // фирменный звонок АСОШ: перелив маримбы, дважды, и стеклянный хвост
    const line = [N.C6, N.G5, N.E6, N.D6, N.G6];
    for (let r = 0; r < 2; r++) {
      line.forEach((n, i) => marimba(n, r * 0.9 + i * 0.13, 0.55, 0.06));
    }
    glass(N.C6, 1.75, 1.6, 0.03);
    glass(N.G6, 1.75, 1.6, 0.02);
  } else if (type === 'pomodoro') {
    [N.C5, N.E5, N.G5, N.C6].forEach((n, i) => marimba(n, i * 0.14, 0.7, 0.06));
    glass(N.E6, 0.56, 1.4, 0.025);
  } else if (type === 'levelup') {
    swoosh(0, 0.3, 500, 4000, 0.03);
    [N.C6, N.E6, N.G6, N.C7].forEach((n, i) => glass(n, 0.18 + i * 0.07, 0.8, 0.03));
  } else if (type === 'victory') {
    [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((n, i) => marimba(n, i * 0.09, 0.5, 0.055));
    [N.C6, N.G6, N.C7].forEach((n) => glass(n, 0.5, 1.6, 0.022));
  } else if (type === 'gameover') {
    // без драмы: две мягкие ноты вниз
    marimba(N.E5, 0, 0.5, 0.06);
    marimba(N.C5, 0.18, 0.8, 0.06);
  } else if (type === 'buzzer') {
    // «не то»: два глухих стука, как при неверном пароле
    voice({ freq: 190, dur: 0.12, gain: 0.08, partials: [[1, 1], [2, 0.3]], cutoff: 900 });
    voice({ freq: 170, start: 0.13, dur: 0.16, gain: 0.08, partials: [[1, 1], [2, 0.3]], cutoff: 900 });
  } else {
    tick(0, 0.05);
  }
}

export function doVibro(enabled = true, ms = 15) {
  if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }
}
