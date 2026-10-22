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

export function doVibro(enabled = true, ms = 15) {
  if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      // ignore
    }
  }
}
