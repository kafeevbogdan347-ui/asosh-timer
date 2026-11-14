import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Mic,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { compressImage } from '../utils/image';
import {
  AgentHandlers,
  ASSISTANT_NAME,
  AssistantMessage,
  AssistantMode,
  AssistantMood,
  AssistantWidget,
  askAssistantStream,
  assistantAvailable,
  clearSessionMemory,
  DAILY_LIMIT,
  fetchAssistantStatus,
  loadHistory,
  saveHistory,
  usedToday,
} from '../services/assistant';
import { useOnline } from '../utils/useOnline';
import { listenOnce, voiceInputSupported, voiceLang, voiceOutputSupported } from '../utils/voice';
import {
  geminiVoiceAvailable,
  micSupported,
  Recording,
  speakAnswer,
  startRecording,
  stopVoice,
  transcribe,
  unlockAudio,
} from '../services/voiceGemini';
import { LANGS } from '../i18n';
import type { ScreenId, SoundProfileType } from '../types';
import { AssistantWidgetCard } from '../components/AssistantWidgets';

const PDF_THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150"><rect width="120" height="150" rx="14" fill="#e11d48"/><text x="60" y="88" font-family="Arial" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">PDF</text></svg>'
  );

interface AssistantScreenProps {
  context: string;
  vibro: boolean;
  soundProfile?: SoundProfileType;
  autoPrompt?: { text: string; photo?: string } | null;
  onAutoPromptUsed?: () => void;
  agent?: (confirm: (text: string) => Promise<boolean>) => AgentHandlers;
  appLang?: string;
  onOpenScreen?: (screen: ScreenId) => void;
}

// Живой маскот Асошика с 5 эмоциональными состояниями: idle, thinking, listening, checking, happy
export const AsoshikAvatar: React.FC<{ size?: number; thinking?: boolean; mood?: AssistantMood }> = ({
  size = 40,
  thinking = false,
  mood,
}) => {
  const gid = `asoshik-g-${useId().replace(/:/g, '')}`;
  const activeMood: AssistantMood = mood || (thinking ? 'thinking' : 'idle');

  const eyesOffset = activeMood === 'thinking' ? 'translate(1.5px, -2px)' : activeMood === 'checking' ? 'translate(0, 1px)' : 'none';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`asoshik-avatar mood-${activeMood} ${thinking || activeMood === 'thinking' ? 'thinking' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="var(--accent)" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {activeMood === 'listening' && (
        <circle cx="32" cy="32" r="29" fill="none" stroke="var(--accent)" strokeWidth="2" strokeOpacity="0.45" className="asoshik-pulse-ring" />
      )}
      <path d="M32 6 C46 6 58 16 58 32 C58 47 47 58 32 58 C17 58 6 48 6 32 C6 17 18 6 32 6Z" fill={`url(#${gid})`} />
      <path d="M18 16 C24 10 34 9 40 12" stroke="#fff" strokeOpacity="0.52" strokeWidth="3" fill="none" strokeLinecap="round" />

      {activeMood === 'happy' ? (
        <g className="asoshik-eyes">
          <path d="M20 33 q4 -5 8 0" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M36 33 q4 -5 8 0" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        </g>
      ) : activeMood === 'checking' ? (
        <g className="asoshik-eyes" style={{ transform: eyesOffset }}>
          <rect x="20" y="29" width="8" height="6" rx="3" fill="#fff" />
          <rect x="36" y="29" width="8" height="6" rx="3" fill="#fff" />
        </g>
      ) : (
        <g className="asoshik-eyes" style={{ transform: eyesOffset }}>
          <rect x="21" y="27" width="6" height={activeMood === 'listening' ? 11 : 10} rx="3" fill="#fff" />
          <rect x="37" y="27" width="6" height={activeMood === 'listening' ? 11 : 10} rx="3" fill="#fff" />
        </g>
      )}

      {activeMood === 'happy' ? (
        <path d="M25 42 q7 6.5 14 0" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      ) : activeMood === 'thinking' ? (
        <circle cx="32" cy="44" r="2.2" fill="#fff" fillOpacity="0.9" />
      ) : activeMood === 'listening' ? (
        <ellipse cx="32" cy="44" rx="3.2" ry="3.8" fill="#fff" fillOpacity="0.9" />
      ) : (
        <path d="M27 43 q5 4 10 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}

      <path
        className="asoshik-spark"
        d="M50 8 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6Z"
        fill={activeMood === 'happy' ? '#fef08a' : '#fde68a'}
      />
    </svg>
  );
};

const SUGGESTIONS = [
  'Собери сводку дня и план',
  'Что положить в портфель на завтра?',
  'Запусти Помодоро на 25 минут',
  'Покажи формулы по алгебре',
  'Сделай мини-тест по дробям',
  'Какие уроки завтра и что задано?',
];

const MODE_LABELS: { id: AssistantMode; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'brief', label: 'Кратко' },
  { id: 'tutor', label: 'Репетитор' },
];

const cleanMath = (text: string) =>
  text
    .replace(/(\d+)\s*\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 целых $2/$3')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\(cdot|times)/g, '·')
    .replace(/\\div/g, ':')
    .replace(/\\sqrt\{([^}]*)\}/g, '√$1')
    .replace(/\^\{?2\}?/g, '²')
    .replace(/\^\{?3\}?/g, '³')
    .replace(/\\[,;! ]/g, ' ')
    .replace(/\{,\}/g, ',')
    .replace(/\$+/g, '');

const renderInline = (line: string) =>
  line.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g).map((p, j) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <b key={j}>{p.slice(2, -2)}</b>;
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) {
      return (
        <code key={j} className="font-mono text-[12px] px-1.5 py-0.5 rounded-md bg-black/25 text-[var(--accent)]">
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <i key={j}>{p.slice(1, -1)}</i>;
    return <React.Fragment key={j}>{p}</React.Fragment>;
  });

const renderText = (text: string) =>
  cleanMath(text)
    .split('\n')
    .map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-1.5" />;
      const isOk = /^\s*✓\s*/.test(line);
      const isErr = /^\s*✕\s*/.test(line);
      const isBullet = /^\s*[-*•]\s+/.test(line);
      const numMatch = line.match(/^\s*(\d+[.)])\s+(.*)$/);
      const body = isBullet ? line.replace(/^\s*[-*•]\s+/, '') : numMatch ? numMatch[2] : line;

      if (isOk || isErr) {
        return (
          <div
            key={i}
            className={`px-2.5 py-1 rounded-xl text-[13px] ${
              isOk ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'
            }`}
          >
            {renderInline(body)}
          </div>
        );
      }
      if (isBullet) {
        return (
          <div key={i} className="flex gap-1.5">
            <span className="opacity-60">•</span>
            <span>{renderInline(body)}</span>
          </div>
        );
      }
      if (numMatch) {
        return (
          <div key={i} className="flex gap-1.5">
            <span className="opacity-70 font-bold tabular-nums">{numMatch[1]}</span>
            <span>{renderInline(body)}</span>
          </div>
        );
      }
      return <div key={i}>{renderInline(line)}</div>;
    });

export const AssistantScreen: React.FC<AssistantScreenProps> = ({
  context,
  vibro,
  soundProfile = '1',
  autoPrompt,
  onAutoPromptUsed,
  agent,
  appLang = 'ru',
  onOpenScreen,
}) => {
  const [pending, setPending] = useState<{ text: string; resolve: (ok: boolean) => void } | null>(null);
  const confirm = (text: string) => new Promise<boolean>((resolve) => setPending({ text, resolve }));
  const answerPending = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const [messages, setMessages] = useState<AssistantMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingRoute, setStreamingRoute] = useState<{ label: string; route: 'fast' | 'deep' } | null>(null);
  const [happyBurst, setHappyBurst] = useState(false);
  const [available, setAvailable] = useState(assistantAvailable);
  const [mode, setMode] = useState<AssistantMode>(() => {
    try {
      const m = localStorage.getItem('asosh_assistant_mode');
      return m === 'brief' || m === 'tutor' ? m : 'auto';
    } catch {
      return 'auto';
    }
  });

  const [voiceOn, setVoiceOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('asosh_asoshik_voice') === '1';
    } catch {
      return false;
    }
  });
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const stopListening = useRef<() => void>(() => {});
  const recording = useRef<Recording | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [error, setError] = useState('');
  const [used, setUsed] = useState(usedToday);
  const [photo, setPhoto] = useState<{ full: string; thumb: string } | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);

  const online = useOnline();
  const listEnd = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachWrap = useRef<HTMLDivElement>(null);

  const geminiMic = geminiVoiceAvailable() && micSupported();
  const showMic = geminiMic || voiceInputSupported();
  const showVoiceToggle = geminiVoiceAvailable() || voiceOutputSupported();
  const langName = (LANGS.find((l) => l.id === appLang)?.ru || 'Русский').toLowerCase();
  const left = Math.max(0, DAILY_LIMIT - used);

  useEffect(() => {
    fetchAssistantStatus().then((ok) => setAvailable(ok));
  }, []);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, streamingText]);

  useEffect(() => {
    if (!attachMenu) return;
    const close = (e: PointerEvent) => {
      if (!attachWrap.current?.contains(e.target as Node)) setAttachMenu(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [attachMenu]);

  useEffect(
    () => () => {
      stopVoice();
      recording.current?.cancel();
      abortRef.current?.abort();
    },
    []
  );

  const triggerHappy = () => {
    setHappyBurst(true);
    setTimeout(() => setHappyBurst(false), 2600);
  };

  const changeMode = (next: AssistantMode) => {
    setMode(next);
    try {
      localStorage.setItem('asosh_assistant_mode', next);
    } catch {
      // ignore
    }
  };

  const toggleVoice = () => {
    unlockAudio();
    const next = !voiceOn;
    setVoiceOn(next);
    try {
      localStorage.setItem('asosh_asoshik_voice', next ? '1' : '0');
    } catch {
      // ignore
    }
    if (!next) {
      stopVoice();
      setSpeaking(false);
    }
  };

  const finishRecording = async () => {
    const rec = recording.current;
    recording.current = null;
    setListening(false);
    if (!rec) return;
    const wav = await rec.stop();
    if (!wav) {
      setError('Запись слишком короткая — нажми микрофон и говори, потом нажми ещё раз');
      return;
    }
    setTranscribing(true);
    try {
      const text = await transcribe(wav, langName);
      if (!text) setError('Не расслышал, попробуй ещё раз');
      else send(text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTranscribing(false);
    }
  };

  const micOn = async () => {
    unlockAudio();
    stopVoice();
    setSpeaking(false);
    setError('');
    if (geminiMic) {
      if (recording.current) {
        finishRecording();
        return;
      }
      try {
        recording.current = await startRecording(() => finishRecording());
        setListening(true);
        if (vibro && navigator.vibrate) navigator.vibrate(20);
      } catch (e) {
        const name = (e as Error).name;
        setError(name === 'NotAllowedError' || name === 'SecurityError' ? 'Разреши доступ к микрофону в настройках телефона' : 'Не получилось включить микрофон');
      }
      return;
    }
    if (listening) {
      stopListening.current();
      return;
    }
    setListening(true);
    stopListening.current = listenOnce(
      voiceLang(appLang),
      (text) => setInput(text),
      (err) => {
        setListening(false);
        if (err) setError(err);
      }
    );
  };

  const pickPhoto = async (file?: File) => {
    setAttachMenu(false);
    if (!file) return;
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      if (file.size > 8 * 1024 * 1024) {
        setError('PDF слишком большой — до 8 МБ. Сфотографируй нужную страницу.');
        return;
      }
      const full = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).replace(/^data:[^;]*;/, 'data:application/pdf;'));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      }).catch(() => '');
      if (!full) {
        setError('Не получилось открыть файл. Попробуй другой.');
        return;
      }
      setPhoto({ full, thumb: PDF_THUMB });
      setError('');
      return;
    }
    if (file.type && !file.type.startsWith('image/')) {
      setError('Асошик понимает фото и PDF. Этот файл не подойдёт.');
      return;
    }
    try {
      const [full, thumb] = await Promise.all([compressImage(file, 1400, 0.82), compressImage(file, 360, 0.6)]);
      setPhoto({ full, thumb });
      setError('');
    } catch {
      setError('Не получилось открыть фото. Попробуй другое.');
    }
  };

  const send = async (text: string, photoOverride?: { full: string; thumb: string }, forceRoute?: 'fast' | 'deep') => {
    const usePhoto = photoOverride || photo;
    const q = (text.trim() || (usePhoto ? 'Проверь задание на фото: если есть моё решение — найди ошибки, иначе реши по шагам' : '')).slice(0, 600);
    if (!q || busy) return;
    setError('');
    setInput('');
    const sentPhoto = usePhoto;
    setPhoto(null);

    const next: AssistantMessage[] = [
      ...messages,
      { role: 'user', text: q, at: Date.now(), ...(sentPhoto ? { image: sentPhoto.thumb } : {}) },
    ];
    setMessages(next);
    saveHistory(next);
    setBusy(true);
    setStreamingText('');
    setStreamingRoute(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const answer = await askAssistantStream(next, context, sentPhoto?.full, agent ? agent(confirm) : undefined, {
        modePreference: mode,
        forceRoute,
        signal: ctrl.signal,
        onMeta: (meta) => setStreamingRoute({ label: meta.label, route: meta.route }),
        onDelta: (partial) => setStreamingText(partial),
      });

      const withAnswer: AssistantMessage[] = [
        ...next,
        {
          role: 'model',
          text: answer.text,
          at: Date.now(),
          ...(sentPhoto ? { hadPhoto: true } : {}),
          ...(answer.actions.length ? { actions: answer.actions } : {}),
          ...(answer.widgets.length ? { widgets: answer.widgets } : {}),
          ...(answer.routeLabel ? { routeLabel: answer.routeLabel, routeKind: answer.routeKind } : {}),
        },
      ];
      setMessages(withAnswer);
      saveHistory(withAnswer);
      triggerHappy();
      if (vibro && navigator.vibrate) navigator.vibrate(15);
      if (voiceOn && answer.text) {
        setSpeaking(true);
        speakAnswer(answer.text, voiceLang(appLang), () => setSpeaking(false));
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        const partial = streamingText.trim();
        if (partial) {
          const stoppedMsg: AssistantMessage[] = [
            ...next,
            {
              role: 'model',
              text: `${partial}\n\n_(остановлено)_`,
              at: Date.now(),
              ...(streamingRoute ? { routeLabel: streamingRoute.label, routeKind: streamingRoute.route } : {}),
            },
          ];
          setMessages(stoppedMsg);
          saveHistory(stoppedMsg);
        }
      } else {
        setError((err as Error).message);
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStreamingText('');
      setStreamingRoute(null);
      setUsed(usedToday());
    }
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const updateWidgetInMessage = (msgIdx: number, wIdx: number, updated: AssistantWidget) => {
    setMessages((prev) => {
      const next = prev.map((m, mi) =>
        mi !== msgIdx || !m.widgets
          ? m
          : { ...m, widgets: m.widgets.map((w, wi) => (wi === wIdx ? updated : w)) }
      );
      saveHistory(next);
      return next;
    });
  };

  const autoSent = useRef(false);
  useEffect(() => {
    if (!autoPrompt || autoSent.current) return;
    autoSent.current = true;
    onAutoPromptUsed?.();
    if (!available) return;
    send(autoPrompt.text, autoPrompt.photo ? { full: autoPrompt.photo, thumb: autoPrompt.photo } : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt]);

  const clear = () => {
    abortRef.current?.abort();
    setMessages([]);
    clearSessionMemory();
    setError('');
  };

  const currentMood: AssistantMood = listening || transcribing
    ? 'listening'
    : busy && streamingRoute?.label.includes('фото')
    ? 'checking'
    : busy
    ? 'thinking'
    : happyBurst
    ? 'happy'
    : 'idle';

  return (
    <div className="card screen-enter asoshik-screen asoshik-glass flex flex-col">
      {/* Живая Liquid Glass шапка */}
      <div className="asoshik-header">
        <AsoshikAvatar size={50} mood={currentMood} thinking={busy} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-lg font-black text-white leading-tight truncate">{ASSISTANT_NAME}</div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clear}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/65 cursor-pointer"
                title="Очистить диалог"
                aria-label="Очистить диалог"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-[11px] font-semibold text-white/70 truncate tabular-nums">
            {busy
              ? streamingRoute?.label || 'думает…'
              : !available
              ? 'скоро появится'
              : online
              ? `школьный помощник · осталось ${left} из ${DAILY_LIMIT}`
              : 'нет интернета'}
          </div>
          <div className="asoshik-modes mt-2" role="group" aria-label="Режим ответов">
            {MODE_LABELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => changeMode(m.id)}
                className={`asoshik-mode-btn ${mode === m.id ? 'active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Лента сообщений */}
      <div className="asoshik-list">
        {messages.length === 0 && (
          <div className="text-center py-4 space-y-3">
            <div className="text-sm font-bold text-white/90">
              Привет! Я {ASSISTANT_NAME}
              <br />
              <span className="text-white/65 font-normal text-xs leading-relaxed">
                Знаю расписание, время до звонка, оценки и домашку. Могу проверить решение по фото, собрать портфель, запустить Помодоро и сделать тест.
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="asoshik-chip"
                  disabled={!available || busy}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="asoshik-bubble user">
                {m.image && <img src={m.image} alt="Фото задания" className="asoshik-photo" />}
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-2">
              <AsoshikAvatar size={26} />
              <div className="max-w-[88%] flex-1 min-w-0 space-y-2">
                <div className="asoshik-bubble bot">
                  {m.routeLabel && (
                    <div className="text-[10px] font-semibold text-white/50 mb-1">{m.routeLabel}</div>
                  )}
                  <div className="space-y-1">{renderText(m.text)}</div>
                  {m.actions && m.actions.length > 0 && (
                    <div className="asoshik-actions">
                      {m.actions.map((a, k) => (
                        <div key={k}>{a}</div>
                      ))}
                    </div>
                  )}
                  {m.hadPhoto && !busy && (
                    <div className="mt-2.5 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        className="asoshik-wbtn accent"
                        onClick={() => send('Сделай мини-тест из 3 похожих вопросов по заданию с фото, чтобы я закрепил тему')}
                      >
                        Закрепить тестом (3 вопроса)
                      </button>
                    </div>
                  )}
                </div>

                {m.widgets && m.widgets.length > 0 && (
                  <div className="space-y-2">
                    {m.widgets.map((w, wi) => (
                      <AssistantWidgetCard
                        key={w.id || wi}
                        widget={w}
                        soundProfile={soundProfile}
                        vibro={vibro}
                        onUpdateWidget={(upd) => updateWidgetInMessage(i, wi, upd)}
                        onOpenScreen={onOpenScreen}
                        onAskFollowup={(q) => send(q)}
                        onHappy={triggerHappy}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {pending && (
          <div className="asoshik-confirm">
            <div className="text-sm font-bold">{pending.text}</div>
            <div className="flex gap-2 mt-2">
              <button type="button" className="btn green flex-1 justify-center !py-2 text-sm min-h-[44px]" onClick={() => answerPending(true)}>
                Опубликовать
              </button>
              <button type="button" className="btn darkBtn flex-1 justify-center !py-2 text-sm min-h-[44px]" onClick={() => answerPending(false)}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {busy && !pending && (
          <div className="flex items-end gap-2">
            <AsoshikAvatar size={26} mood={currentMood} thinking />
            {streamingText ? (
              <div className="asoshik-bubble bot max-w-[88%]">
                {streamingRoute?.label && (
                  <div className="text-[10px] font-semibold text-white/50 mb-1">{streamingRoute.label}</div>
                )}
                <div className="space-y-1">
                  {renderText(streamingText)}
                  <span className="asoshik-caret" aria-hidden="true" />
                </div>
              </div>
            ) : (
              <div className="asoshik-bubble bot asoshik-typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        )}

        {error && <div className="text-xs font-bold text-amber-300 text-center px-2">{error}</div>}
        <div ref={listEnd} />
      </div>

      {/* Превью фото + быстрые сценарии проверки */}
      {photo && (
        <div className="asoshik-attach-wrap mb-2">
          <div className="asoshik-attach !mb-0">
            <img src={photo.thumb} alt="Фото к вопросу" />
            <span>
              {photo.thumb === PDF_THUMB
                ? 'Файл прикреплён. Напиши задание или сразу отправь.'
                : 'Фото прикреплено. Выбери режим ниже или задай свой вопрос.'}
            </span>
            <button type="button" onClick={() => setPhoto(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Убрать фото">
              <X className="w-4 h-4" />
            </button>
          </div>
          {photo.thumb !== PDF_THUMB && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button
                type="button"
                className="asoshik-wbtn accent"
                onClick={() => send('Проверь моё решение на фото по шагам и укажи, где первая ошибка', photo, 'deep')}
              >
                Проверить на ошибки
              </button>
              <button
                type="button"
                className="asoshik-wbtn"
                onClick={() => send('Реши задание на фото подробно по шагам', photo, 'deep')}
              >
                Решить по шагам
              </button>
            </div>
          )}
        </div>
      )}

      {/* Нижняя панель ввода (высота кнопок >= 44px) */}
      <form
        className="asoshik-input"
        onSubmit={(e) => {
          e.preventDefault();
          unlockAudio();
          send(input);
        }}
      >
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />

        <div className="relative" ref={attachWrap}>
          <button
            type="button"
            className="asoshik-cam"
            onClick={() => setAttachMenu((v) => !v)}
            disabled={!available || busy || left === 0}
            aria-label="Прикрепить фото задания"
            aria-expanded={attachMenu}
            title="Фото или PDF"
          >
            <Camera className="w-4 h-4" />
          </button>
          {attachMenu && (
            <div className="asoshik-attach-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => cameraRef.current?.click()}>
                <Camera className="w-4 h-4" /> Сфотографировать
              </button>
              <button type="button" role="menuitem" onClick={() => galleryRef.current?.click()}>
                <ImageIcon className="w-4 h-4" /> Из галереи
              </button>
              <button type="button" role="menuitem" onClick={() => fileRef.current?.click()}>
                <FileText className="w-4 h-4" /> Файл (фото или PDF)
              </button>
            </div>
          )}
        </div>

        {showMic && (
          <button
            type="button"
            className={`asoshik-cam ${listening ? 'asoshik-mic-on' : ''} ${transcribing ? 'asoshik-mic-busy' : ''}`}
            onClick={micOn}
            disabled={!available || busy || transcribing || left === 0}
            aria-label={listening ? 'Остановить запись' : 'Сказать голосом'}
            title={listening ? 'Слушаю… нажми, чтобы отправить' : 'Сказать голосом'}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={available ? (photo ? 'Что сделать с фото? (можно пусто)' : `Спроси ${ASSISTANT_NAME}а…`) : `${ASSISTANT_NAME} пока не подключён`}
          disabled={!available || left === 0}
          maxLength={600}
          className="text-sm min-h-[44px]"
        />

        {busy ? (
          <button
            type="button"
            onClick={stopGeneration}
            className="asoshik-send stop"
            aria-label="Остановить ответ"
            title="Остановить"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!available || (!input.trim() && !photo) || left === 0}
            className="asoshik-send"
            aria-label="Отправить"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>

      {(listening || transcribing) && (
        <div className="text-[11px] font-bold text-rose-300 text-center mt-1.5">
          {listening ? 'Слушаю… нажми микрофон ещё раз, чтобы отправить' : 'Распознаю речь…'}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5 text-[10.5px] text-white/55">
        {showVoiceToggle && (
          <button type="button" onClick={toggleVoice} className="font-bold text-cyan-300 flex items-center gap-1 cursor-pointer min-h-[28px]">
            {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{voiceOn ? 'Озвучка вкл' : 'Озвучивать'}</span>
            {speaking && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  stopVoice();
                  setSpeaking(false);
                }}
                className="underline ml-1"
              >
                стоп
              </span>
            )}
          </button>
        )}
        <span>ИИ может ошибаться · Не передавайте личные данные</span>
      </div>
    </div>
  );
};
