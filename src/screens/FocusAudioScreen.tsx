import React, { useState, useEffect, useRef } from 'react';
import { LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import {
  Headphones,
  Volume2,
  VolumeX,
  Play,
  Pause,
  CloudRain,
  BookOpen,
  Sparkles,
  Timer,
  RotateCcw,
  Zap,
  Activity,
} from 'lucide-react';

interface FocusAudioScreenProps {
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  onUnlockAchievement?: (id: string) => void;
}

type SoundscapeType = 'rain' | 'library' | 'alpha' | 'metronome';

export const FocusAudioScreen: React.FC<FocusAudioScreenProps> = ({
  lang,
  soundProfile,
  vibro,
  onShowToast,
  onUnlockAchievement,
}) => {
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [metronomeBpm, setMetronomeBpm] = useState(80);
  const [metronomeBeat, setMetronomeBeat] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioNode | null>(null);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Web Audio Context
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const stopAllAudio = () => {
    if (noiseSourceRef.current) {
      try {
        (noiseSourceRef.current as AudioBufferSourceNode | OscillatorNode).stop();
        noiseSourceRef.current.disconnect();
      } catch { /* ignore */ }
      noiseSourceRef.current = null;
    }
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    setIsPlaying(false);
    setActiveSoundscape(null);
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const playRainSound = () => {
    stopAllAudio();
    const ctx = getAudioContext();

    // Create pink noise buffer for realistic rain
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to sound like soft rain on window
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume * 0.4;
    gainNodeRef.current = gainNode;

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start();
    noiseSourceRef.current = whiteNoise;
    setIsPlaying(true);
    setActiveSoundscape('rain');
    onUnlockAchievement?.('focus_zen');
  };

  const playLibrarySound = () => {
    stopAllAudio();
    const ctx = getAudioContext();

    // Gentle brown noise for library atmosphere
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 1.8;
    }

    const brownNoise = ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume * 0.5;
    gainNodeRef.current = gainNode;

    brownNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    brownNoise.start();
    noiseSourceRef.current = brownNoise;
    setIsPlaying(true);
    setActiveSoundscape('library');
    onUnlockAchievement?.('focus_zen');
  };

  const playAlphaTone = () => {
    stopAllAudio();
    const ctx = getAudioContext();

    // 432 Hz pure harmonic sine wave + subtle 10 Hz alpha pulsing
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 432;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume * 0.15;
    gainNodeRef.current = gainNode;

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    noiseSourceRef.current = osc;
    setIsPlaying(true);
    setActiveSoundscape('alpha');
    onUnlockAchievement?.('focus_zen');
  };

  const startMetronome = () => {
    stopAllAudio();
    setIsPlaying(true);
    setActiveSoundscape('metronome');

    const intervalMs = (60 / metronomeBpm) * 1000;
    let beat = 0;

    const tick = () => {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isFirstBeat = beat % 4 === 0;
      osc.type = 'triangle';
      osc.frequency.value = isFirstBeat ? 880 : 440; // High beep on 1st beat

      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);

      setMetronomeBeat((b) => (b + 1) % 4);
      beat = (beat + 1) % 4;
      doVibro(vibro, 8);
    };

    tick();
    metronomeIntervalRef.current = setInterval(tick, intervalMs);
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        activeSoundscape === 'alpha' ? newVal * 0.15 : newVal * 0.45,
        audioCtxRef.current.currentTime
      );
    }
  };

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
          <span>🎧</span>
          <span>Фокус-Звуки & Школьный Метроном</span>
        </h2>
        <p className="text-xs text-white/70">
          Синтезатор звуков концентрации (дождь, библиотека, альфа-волны 432 Гц) и метроном для чтения стихов
        </p>
      </div>

      {/* Main Playing Controller */}
      <div className="p-4 bg-slate-900/90 rounded-3xl border border-cyan-400/30 space-y-4 text-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-black text-white">
              {activeSoundscape === 'rain' && '🌧️ Школьный дождь за окном'}
              {activeSoundscape === 'library' && '📖 Тишина школьной библиотеки'}
              {activeSoundscape === 'alpha' && '🧠 Альфа-ритмы 432 Гц (Память)'}
              {activeSoundscape === 'metronome' && `⏱️ Метроном (${metronomeBpm} BPM)`}
              {!activeSoundscape && 'Выберите атмосферу ниже'}
            </span>
          </div>

          {isPlaying && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20 animate-pulse">
              <Activity className="w-3.5 h-3.5" />
              <span>Звучит</span>
            </span>
          )}
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 max-w-[320px] mx-auto">
          {volume === 0 ? <VolumeX className="w-4 h-4 text-white/50" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-white/70 w-8">{Math.round(volume * 100)}%</span>
        </div>

        {isPlaying && (
          <button
            type="button"
            className="btn red text-xs justify-center py-2.5 px-6 mx-auto"
            onClick={stopAllAudio}
          >
            <Pause className="w-4 h-4" />
            <span>Остановить звук</span>
          </button>
        )}
      </div>

      {/* Soundscape Choices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* 1. Rain */}
        <button
          type="button"
          className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
            activeSoundscape === 'rain'
              ? 'bg-cyan-500/20 border-cyan-400 shadow-md'
              : 'bg-white/6 border-white/10 hover:bg-white/10'
          }`}
          onClick={playRainSound}
        >
          <div className="p-2.5 bg-cyan-500/20 rounded-xl text-cyan-300">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <b className="text-xs text-white block">🌧️ Дождь за окном школы</b>
            <p className="text-[11px] text-white/60 leading-relaxed mt-0.5">
              Успокаивающий розовый шум капель для глубокого погружения в подготовку к урокам
            </p>
          </div>
        </button>

        {/* 2. Library */}
        <button
          type="button"
          className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
            activeSoundscape === 'library'
              ? 'bg-amber-500/20 border-amber-400 shadow-md'
              : 'bg-white/6 border-white/10 hover:bg-white/10'
          }`}
          onClick={playLibrarySound}
        >
          <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <b className="text-xs text-white block">📖 Школьная библиотека</b>
            <p className="text-[11px] text-white/60 leading-relaxed mt-0.5">
              Мягкий коричневый шум тишины читального зала, блокирующий лишние домашние звуки
            </p>
          </div>
        </button>

        {/* 3. Alpha 432 Hz */}
        <button
          type="button"
          className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
            activeSoundscape === 'alpha'
              ? 'bg-purple-500/20 border-purple-400 shadow-md'
              : 'bg-white/6 border-white/10 hover:bg-white/10'
          }`}
          onClick={playAlphaTone}
        >
          <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <b className="text-xs text-white block">🧠 Альфа-ритм 432 Гц</b>
            <p className="text-[11px] text-white/60 leading-relaxed mt-0.5">
              Гармонический чистый тон 432 Гц для быстрого запоминания формул, дат и стихов
            </p>
          </div>
        </button>

        {/* 4. Metronome */}
        <div
          className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
            activeSoundscape === 'metronome'
              ? 'bg-emerald-500/20 border-emerald-400 shadow-md'
              : 'bg-white/6 border-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300">
                <Timer className="w-4 h-4" />
              </div>
              <b className="text-xs text-white">⏱️ Метроном для стихов</b>
            </div>
            <span className="font-mono font-bold text-xs text-emerald-400">{metronomeBpm} BPM</span>
          </div>

          {/* BPM selector */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="40"
              max="180"
              step="5"
              value={metronomeBpm}
              onChange={(e) => setMetronomeBpm(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {/* Visual Beat Indicator */}
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((b) => (
                <span
                  key={b}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    activeSoundscape === 'metronome' && metronomeBeat === b
                      ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-400/50'
                      : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              className="btn green text-xs py-1.5 px-3"
              onClick={startMetronome}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Запустить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
