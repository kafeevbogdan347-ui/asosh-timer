import React, { useEffect, useId, useRef, useState } from 'react';
import { Send, Trash2, Camera, X, Mic, Volume2, VolumeX } from 'lucide-react';
import { compressImage } from '../utils/image';
import {
  AssistantMessage,
  ASSISTANT_NAME,
  DAILY_LIMIT,
  askAssistant,
  assistantAvailable,
  loadHistory,
  saveHistory,
  usedToday,
  AgentHandlers,
} from '../services/assistant';
import { useOnline } from '../utils/useOnline';
import { listenOnce, voiceInputSupported, voiceLang, voiceOutputSupported } from '../utils/voice';
import { geminiVoiceAvailable, micSupported, speakAnswer, startRecording, stopVoice, transcribe, unlockAudio, Recording } from '../services/voiceGemini';
import { LANGS } from '../i18n';

interface AssistantScreenProps {
  context: string; // класс, расписание и домашка — собирает App
  vibro: boolean;
  // Вопрос из другого раздела (кнопка «🫧 Асошик»): отправляется сразу при открытии
  autoPrompt?: { text: string; photo?: string } | null;
  onAutoPromptUsed?: () => void;
  // Действия в приложении. confirm показывает в чате карточку «Опубликовать / Отмена»
  agent?: (confirm: (text: string) => Promise<boolean>) => AgentHandlers;
  appLang?: string; // язык интерфейса, от него зависит голос
}

// Маскот Асошика: градиентная капля с лицом и искоркой. Середина градиента — цвет темы (--accent)
export const AsoshikAvatar: React.FC<{ size?: number; thinking?: boolean }> = ({ size = 40, thinking = false }) => {
  const gid = `asoshik-g-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`asoshik-avatar ${thinking ? 'thinking' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="var(--accent)" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path d="M32 6 C46 6 58 16 58 32 C58 47 47 58 32 58 C17 58 6 48 6 32 C6 17 18 6 32 6Z" fill={`url(#${gid})`} />
      <path d="M18 16 C24 10 34 9 40 12" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" fill="none" strokeLinecap="round" />
      <g className="asoshik-eyes">
        <rect x="21" y="27" width="6" height="10" rx="3" fill="#fff" />
        <rect x="37" y="27" width="6" height="10" rx="3" fill="#fff" />
      </g>
      <path d="M27 43 q5 4 10 0" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path className="asoshik-spark" d="M50 8 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6Z" fill="#fde68a" />
    </svg>
  );
};

const SUGGESTIONS = [
  'Какой у меня следующий урок?',
  'Что задано на завтра?',
  'Что положить в портфель на завтра?',
  'Реши: 3/4 + 2/5',
  'Объясни дроби простыми словами',
  'Как подготовиться к контрольной?',
];

// Если модель всё же прислала LaTeX — превращаем в обычный текст: \frac{3}{20} → 3/20, \cdot → ·
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

// Лёгкая разметка ответа: **жирный** и строки-списки «- »
const renderText = (text: string) =>
  cleanMath(text).split('\n').map((line, i) => {
    const isItem = /^\s*[-*•]\s+/.test(line);
    const body = line.replace(/^\s*[-*•]\s+/, '');
    const parts = body.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
        <b key={j}>{p.slice(2, -2)}</b>
      ) : p.length > 2 && p.startsWith('*') && p.endsWith('*') ? (
        <i key={j}>{p.slice(1, -1)}</i>
      ) : (
        <React.Fragment key={j}>{p}</React.Fragment>
      )
    );
    if (!line.trim()) return <div key={i} className="h-1.5" />;
    return isItem ? (
      <div key={i} className="flex gap-1.5">
        <span className="opacity-60">•</span>
        <span>{parts}</span>
      </div>
    ) : (
      <div key={i}>{parts}</div>
    );
  });

export const AssistantScreen: React.FC<AssistantScreenProps> = ({ context, vibro, autoPrompt, onAutoPromptUsed, agent, appLang = 'ru' }) => {
  const [pending, setPending] = useState<{ text: string; resolve: (ok: boolean) => void } | null>(null);
  const confirm = (text: string) => new Promise<boolean>((resolve) => setPending({ text, resolve }));
  const answerPending = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const [messages, setMessages] = useState<AssistantMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // Голос: отвечать вслух и слушать микрофон. Выбор помнится на этом телефоне.
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
  // Запись через Gemini работает везде, где есть микрофон (и в APK); встроенное распознавание — запасной вариант
  const geminiMic = geminiVoiceAvailable() && micSupported();
  const showMic = geminiMic || voiceInputSupported();
  const showVoiceToggle = geminiVoiceAvailable() || voiceOutputSupported();
  const langName = (LANGS.find((l) => l.id === appLang)?.ru || 'Русский').toLowerCase();
  const toggleVoice = () => {
    unlockAudio();
    const next = !voiceOn;
    setVoiceOn(next);
    try {
      localStorage.setItem('asosh_asoshik_voice', next ? '1' : '0');
    } catch {
      // без памяти голос просто не запомнится
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
    // Запасной путь: встроенное распознавание браузера
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
  useEffect(() => () => {
    stopVoice();
    recording.current?.cancel();
  }, []);
  const [error, setError] = useState('');
  const [used, setUsed] = useState(usedToday);
  const online = useOnline();
  const listEnd = useRef<HTMLDivElement>(null);
  const available = assistantAvailable();
  const left = Math.max(0, DAILY_LIMIT - used);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  // Фото к вопросу: для отправки — крупное (читается текст), для истории — маленькое
  const [photo, setPhoto] = useState<{ full: string; thumb: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const [full, thumb] = await Promise.all([compressImage(file, 1400, 0.82), compressImage(file, 360, 0.6)]);
      setPhoto({ full, thumb });
      setError('');
    } catch {
      setError('Не получилось открыть фото. Попробуй другое.');
    }
  };

  const send = async (text: string, photoOverride?: { full: string; thumb: string }) => {
    const usePhoto = photoOverride || photo;
    const q = (text.trim() || (usePhoto ? 'Реши задание на фото' : '')).slice(0, 600);
    if (!q || busy) return;
    setError('');
    setInput('');
    const sentPhoto = usePhoto;
    setPhoto(null);
    const next = [...messages, { role: 'user' as const, text: q, at: Date.now(), ...(sentPhoto ? { image: sentPhoto.thumb } : {}) }];
    setMessages(next);
    saveHistory(next);
    setBusy(true);
    try {
      const answer = await askAssistant(next, context, sentPhoto?.full, agent ? agent(confirm) : undefined);
      const withAnswer = [...next, { role: 'model' as const, text: answer.text, at: Date.now(), ...(answer.actions.length ? { actions: answer.actions } : {}) }];
      setMessages(withAnswer);
      saveHistory(withAnswer);
      if (vibro && navigator.vibrate) navigator.vibrate(15);
      if (voiceOn && answer.text) {
        setSpeaking(true);
        speakAnswer(answer.text, voiceLang(appLang), () => setSpeaking(false));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setUsed(usedToday());
    }
  };

  // Вопрос, пришедший из другого раздела, отправляем один раз
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
    setMessages([]);
    saveHistory([]);
    setError('');
  };

  return (
    <div className="card screen-enter asoshik-screen flex flex-col">
      {/* Шапка */}
      <div className="asoshik-header">
        <AsoshikAvatar size={52} thinking={busy} />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-black text-white leading-tight">{ASSISTANT_NAME}</div>
          <div className="text-[11px] font-bold text-white/70">
            {busy ? 'думает…' : !available ? 'скоро появится' : online ? 'твой школьный помощник' : 'нет интернета'}
          </div>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={clear} className="p-2 rounded-xl hover:bg-white/10 text-white/60 cursor-pointer" title="Очистить диалог">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Сообщения */}
      <div className="asoshik-list">
        {messages.length === 0 && (
          <div className="text-center py-4 space-y-3">
            <div className="text-sm font-bold text-white/85">
              Привет! Я {ASSISTANT_NAME} 👋
              <br />
              <span className="text-white/60 font-normal text-xs">
                Знаю твоё расписание, кабинеты и домашку. Решу задание и объясню по шагам, как оно делается 📝
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="asoshik-chip" disabled={!available || busy} onClick={() => send(s)}>
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
            <div key={i} className="flex items-end gap-1.5">
              <AsoshikAvatar size={26} />
              <div className="asoshik-bubble bot">
                {renderText(m.text)}
                {m.actions && (
                  <div className="asoshik-actions">
                    {m.actions.map((a, k) => (
                      <div key={k}>{a}</div>
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
              <button type="button" className="btn green flex-1 justify-center !py-2 text-sm" onClick={() => answerPending(true)}>
                Опубликовать
              </button>
              <button type="button" className="btn darkBtn flex-1 justify-center !py-2 text-sm" onClick={() => answerPending(false)}>
                Отмена
              </button>
            </div>
          </div>
        )}

        {busy && !pending && (
          <div className="flex items-end gap-1.5">
            <AsoshikAvatar size={26} thinking />
            <div className="asoshik-bubble bot asoshik-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {error && <div className="text-xs font-bold text-amber-300 text-center px-2">{error}</div>}
        <div ref={listEnd} />
      </div>

      {/* Ввод */}
      {photo && (
        <div className="asoshik-attach">
          <img src={photo.thumb} alt="Фото к вопросу" />
          <span>Фото прикреплено. Напиши вопрос или просто отправь — Асошик решит задание с фото.</span>
          <button type="button" onClick={() => setPhoto(null)} aria-label="Убрать фото">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <form
        className="asoshik-input"
        onSubmit={(e) => {
          e.preventDefault();
          unlockAudio();
          send(input);
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="asoshik-cam" onClick={() => fileRef.current?.click()} disabled={!available || busy || left === 0} aria-label="Прикрепить фото задания" title="Фото задания">
          <Camera className="w-4 h-4" />
        </button>
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
          className="text-sm"
        />
        <button type="submit" disabled={!available || busy || (!input.trim() && !photo) || left === 0} className="asoshik-send" aria-label="Отправить">
          <Send className="w-4 h-4" />
        </button>
      </form>
      {(listening || transcribing) && (
        <div className="text-[11px] font-bold text-rose-300 text-center mt-1.5">
          {listening ? '🎙 Слушаю… нажми микрофон ещё раз, чтобы отправить' : '✍️ Распознаю…'}
        </div>
      )}
      {showVoiceToggle && (
        <div className="flex justify-center mt-1.5">
          <button type="button" onClick={toggleVoice} className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer">
            {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {voiceOn ? 'Отвечает голосом' : 'Отвечать голосом'}
            {speaking && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  stopVoice();
                  setSpeaking(false);
                }}
                className="ml-1 underline"
              >
                · стоп
              </span>
            )}
          </button>
        </div>
      )}
      <div className="text-[10px] text-white/50 text-center mt-1.5">
        Осталось вопросов сегодня: {left} из {DAILY_LIMIT} · Ответы даёт ИИ Google Gemini и могут быть с ошибками. Имя не передаётся. Не фотографируй лица и личные данные.
      </div>
    </div>
  );
};
