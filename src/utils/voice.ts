// Голос Асошика: распознавание речи и озвучка ответа встроены в браузер (без ключей и лимитов).
// Если браузер или WebView не поддерживает — функции просто ничего не делают, приложение работает как раньше.

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const getRecognition = (): RecognitionCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const voiceInputSupported = () => getRecognition() !== null;
export const voiceOutputSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Слушает одну фразу и отдаёт текст. onEnd вызывается всегда (и при ошибке, и при тишине).
export function listenOnce(lang: string, onText: (text: string) => void, onEnd: (error?: string) => void): () => void {
  const Ctor = getRecognition();
  if (!Ctor) {
    onEnd('Голосовой ввод не поддерживается в этом браузере');
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let gotText = false;
  rec.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript?.trim() || '';
    if (text) {
      gotText = true;
      onText(text);
    }
  };
  rec.onerror = (e) => onEnd(e.error === 'not-allowed' ? 'Разреши доступ к микрофону в настройках' : 'Не расслышал, попробуй ещё раз');
  rec.onend = () => onEnd(gotText ? undefined : 'Не расслышал, попробуй ещё раз');
  try {
    rec.start();
  } catch {
    onEnd('Не получилось включить микрофон');
  }
  return () => {
    try {
      rec.stop();
    } catch {
      // уже остановлен
    }
  };
}

const LANG_CODE: Record<string, string> = { ru: 'ru-RU', ba: 'ru-RU', tj: 'tg-TJ', kk: 'kk-KZ', uz: 'uz-UZ', ky: 'ky-KG', be: 'be-BY', hy: 'hy-AM', az: 'az-AZ' };
export const voiceLang = (appLang: string) => LANG_CODE[appLang] || 'ru-RU';

// Убираем разметку и значки, чтобы озвучка не читала «звёздочки» и «решётки»
const plain = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\$\$?[^$]*\$\$?/g, ' формула ')
    .replace(/\s+/g, ' ')
    .trim();

export function speak(text: string, lang: string, onEnd?: () => void): void {
  if (!voiceOutputSupported()) {
    onEnd?.();
    return;
  }
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(plain(text).slice(0, 1200));
  u.lang = lang;
  u.rate = 1;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (voice) u.voice = voice;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (voiceOutputSupported()) window.speechSynthesis.cancel();
}
