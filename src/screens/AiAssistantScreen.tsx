import React, { useState, useEffect, useRef } from 'react';
import { LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import { askSchoolAI, AIChatMessage } from '../services/aiService';
import {
  Bot,
  Send,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX,
  PlusCircle,
  Lightbulb,
  Camera,
  Image as ImageIcon,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Bell,
  Clock,
  CloudSnow,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface AiAssistantScreenProps {
  cls: string;
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onBack: () => void;
  onShowToast: (msg: string) => void;
  onAddHomeworkTask?: (sub: string, text: string) => void;
  // Live Diary Context parameters
  studentName?: string;
  shift?: string;
  subGroup?: number;
  currentLessonText?: string;
  nextLessonText?: string;
  bellTimeText?: string;
  remainSec?: number;
  todayLessons?: Array<[string, string] | string>;
  tomorrowLessons?: Array<[string, string] | string>;
  homeworkList?: any[];
  lessonUpdates?: any[];
  weatherTemp?: number;
  weatherCondition?: string;
  frostStatus?: string;
}

const STORAGE_KEY = 'asosh_ai_assistant_chat_v2';

const QUICK_PROMPTS = [
  {
    icon: '📅',
    category: 'Календарь 2026',
    prompt: 'Какое сегодня число, какой день недели и какой сейчас год для записи в тетради?',
  },
  {
    icon: '📸',
    category: 'Фото / Зрение',
    prompt: 'Прикрепи фото задачи из учебника, конспекта или доски, и я подробно решу её по шагам!',
    isActionPhoto: true,
  },
  {
    icon: '🔔',
    category: 'Урок & Звонок',
    prompt: 'Какой у меня сейчас урок, когда следующий звонок и сколько минут осталось?',
  },
  {
    icon: '📝',
    category: 'Домашка',
    prompt: 'Что мне сейчас задано по домашке и какие дедлайны горят?',
  },
  {
    icon: '❄️',
    category: 'Аргаяш & Мороз',
    prompt: 'Какая сейчас погода в Аргаяше и при скольки градусах будет актировка для моего класса?',
  },
  {
    icon: '🏫',
    category: 'АСОШ №2',
    prompt: 'Расскажи про школу АСОШ №2: на каких этажах какие кабинеты и какое расписание звонков?',
  },
  {
    icon: '📐',
    category: 'Математика',
    prompt: 'Реши квадратное уравнение 2x² - 5x + 2 = 0 по шагам с формулой дискриминанта',
  },
];

export const AiAssistantScreen: React.FC<AiAssistantScreenProps> = ({
  cls,
  lang,
  soundProfile,
  vibro,
  onBack,
  onShowToast,
  onAddHomeworkTask,
  studentName = 'Ученик',
  shift = '1',
  subGroup = 1,
  currentLessonText = 'Сейчас урок не идёт / перемена',
  nextLessonText = 'Расписание уроков',
  bellTimeText = 'звонок по графику',
  remainSec = 0,
  todayLessons = [],
  tomorrowLessons = [],
  homeworkList = [],
  lessonUpdates = [],
  weatherTemp = 16,
  weatherCondition = 'Ясно',
  frostStatus = 'Обычный режим занятий',
}) => {
  // Format lessons for clean context
  const cleanTodayLessons = todayLessons
    .map((l) => (Array.isArray(l) ? l[0] : typeof l === 'string' ? l : ''))
    .filter((l) => l && l !== '—');

  const cleanTomorrowLessons = tomorrowLessons
    .map((l) => (Array.isArray(l) ? l[0] : typeof l === 'string' ? l : ''))
    .filter((l) => l && l !== '—');

  const pendingHomework = (homeworkList || [])
    .filter((h) => !h.done)
    .map((h) => ({ sub: h.sub, text: h.text, date: h.date }));

  // Dynamic live calendar date & day of week (Ground truth: 2026)
  const liveNow = new Date();
  const liveYear = liveNow.getFullYear() || 2026;
  const liveDateFormatted = liveNow.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const liveDayOfWeek = liveNow.toLocaleDateString('ru-RU', { weekday: 'long' });

  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    // Default initial greeting with dynamic live date
    return [
      {
        id: 'init-1',
        role: 'assistant',
        text: `Привет, ${studentName || 'ученик'}! 🤖 Я твой школьный ИИ-ассистент **АСОШ №2** (с. Аргаяш) на базе **Gemini 3.8 Flash Vision**.\n\n` +
          `📅 **Сегодня:** **${liveDateFormatted}** (${liveDayOfWeek}), **${liveYear} год** (2026–2027 учебный год)\n\n` +
          `👁️ **Я вижу твой дневник в реальном времени:**\n` +
          `• Твой класс: **${cls || 'АСОШ №2'}**, ${shift} смена\n` +
          `• Текущий урок: **${currentLessonText}** (до звонка: ${bellTimeText})\n` +
          `• Невыполненных ДЗ: **${pendingHomework.length}** шт.\n` +
          `• Погода в Аргаяше: **${weatherTemp}°C**, ${frostStatus}\n\n` +
          `📸 **Теперь можно прикреплять ФОТО!** Сфотографируй доску, тетрадь или задачу из учебника через кнопку скрепки/камеры — я мгновенно распознаю текст и решу по шагам! 🚀`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        engine: 'gemini',
      },
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('ИИ думает...');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Text-to-speech voice controls
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(
    () => localStorage.getItem('asosh_ai_voice_enabled') !== 'false'
  );

  // Cancel speech synthesis on component unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Attached image for multimodal AI vision
  const [attachedImage, setAttachedImage] = useState<{
    data: string;
    mimeType: string;
    fileName?: string;
    sizeKb?: number;
  } | null>(null);

  // Full-size image preview modal
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  // Context drawer toggle
  const [isContextOpen, setIsContextOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save chat to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, attachedImage]);

  // Loading animation message switcher
  useEffect(() => {
    if (!loading) return;
    const stages = attachedImage
      ? [
          '📸 Нейросеть сканирует фото...',
          'Распознаёт условие задачи и текст доски...',
          'Решает по шагам школьной программы...',
          'Формулирует понятное объяснение...',
        ]
      : [
          'ИИ анализирует дневник и вопрос...',
          'Решает по шагам школьной программы...',
          'Формулирует понятный ответ...',
          'Подбирает формулы и примеры...',
        ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % stages.length;
      setLoadingStatus(stages[i]);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading, attachedImage]);

  // Clipboard paste support (Ctrl+V with image)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            onShowToast('📸 Изображение вставлено из буфера обмена!');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast('Пожалуйста, выберите файл изображения');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        setAttachedImage({
          data: result,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name || 'Снимок задания',
          sizeKb: Math.round(file.size / 1024),
        });
        playSound('click', soundProfile);
        doVibro(vibro, 20);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    playSound('click', soundProfile);
    setAttachedImage(null);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if ((!query && !attachedImage) || loading) return;

    playSound('click', soundProfile);
    doVibro(vibro, 15);

    const imageToSend = attachedImage;
    const userMsgText = query || (imageToSend ? 'Посмотри на это фото: реши задачу или объясни условие по шагам.' : '');

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      text: userMsgText,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      image: imageToSend?.data,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue('');
    setAttachedImage(null);
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Build history for conversational context (only text turns)
      const history = nextMessages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // Build real-time diary context object with strict 2026 calendar data
      const appContext = {
        studentName,
        cls,
        shift,
        subGroup,
        currentYear: liveYear,
        currentDateFormatted: liveDateFormatted,
        currentDayOfWeek: liveDayOfWeek,
        dayName: liveDayOfWeek,
        currentLesson: currentLessonText,
        nextLesson: nextLessonText,
        bellTimeText,
        remainSec,
        todaySchedule: cleanTodayLessons,
        tomorrowSchedule: cleanTomorrowLessons,
        pendingHomework,
        lessonUpdates: lessonUpdates.map((u) => `${u.subject}: ${u.teacher || ''} (${u.room || ''})`),
        weatherTemp,
        weatherCondition,
        frostStatus,
      };

      const res = await askSchoolAI(
        userMsgText,
        cls,
        history,
        imageToSend ? { data: imageToSend.data, mimeType: imageToSend.mimeType } : null,
        appContext
      );

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        text: res.reply,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        engine: res.engine || 'gemini',
        isError: res.isError,
      };

      setMessages((prev) => [...prev, aiMsg]);
      playSound('bell', soundProfile);
      doVibro(vibro, 25);
    } catch (err) {
      const errorMsg: AIChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: 'Не удалось получить ответ от сервера. Проверь подключение к интернету или попробуй ещё раз.',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Очистить историю диалога с ИИ-помощником?')) {
      playSound('click', soundProfile);
      doVibro(vibro, 20);
      const defaultMsg: AIChatMessage = {
        id: `init-${Date.now()}`,
        role: 'assistant',
        text: `История очищена! 🧹 Чем могу помочь по учебе для ${cls ? `${cls} класса` : 'АСОШ №2'}?`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        engine: 'gemini',
      };
      setMessages([defaultMsg]);
      localStorage.removeItem(STORAGE_KEY);
      onShowToast('История переписки очищена');
    }
  };

  const handleCopy = (text: string, id: string) => {
    playSound('click', soundProfile);
    doVibro(vibro, 10);
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Ответ скопирован в буфер обмена 📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMsgId(null);
    playSound('click', soundProfile);
    doVibro(vibro, 10);
    onShowToast('Озвучка выключена 🔇');
  };

  const toggleVoiceEnabled = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('asosh_ai_voice_enabled', String(next));
    playSound('click', soundProfile);
    doVibro(vibro, 15);
    if (!next) {
      handleStopSpeech();
      onShowToast('Голосовая озвучка отключена 🔇');
    } else {
      onShowToast('Голосовая озвучка включена 🔊');
    }
  };

  const handleSpeak = (text: string, msgId?: string) => {
    if (!('speechSynthesis' in window)) {
      onShowToast('Синтез речи не поддерживается на этом устройстве');
      return;
    }

    // If currently speaking this message or speaking in general, stop it!
    if (isSpeaking) {
      handleStopSpeech();
      if (speakingMsgId === msgId) {
        return;
      }
    }

    if (!voiceEnabled) {
      setVoiceEnabled(true);
      localStorage.setItem('asosh_ai_voice_enabled', 'true');
    }

    playSound('click', soundProfile);
    doVibro(vibro, 15);
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[*_#`$]/g, '')
      .replace(/•/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setSpeakingMsgId(msgId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
    onShowToast('Озвучивание ответа (нажмите «Остановить», чтобы выключить) 🔊');
  };

  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          if (trimmed.startsWith('### ')) {
            return (
              <h5 key={idx} className="text-xs font-black text-amber-300 mt-2 mb-1 flex items-center gap-1">
                <span>📌</span>
                <span>{trimmed.replace('### ', '')}</span>
              </h5>
            );
          }

          if (trimmed.startsWith('## ')) {
            return (
              <h4 key={idx} className="text-sm font-black text-cyan-300 mt-2.5 mb-1 pb-0.5 border-b border-white/10">
                {trimmed.replace('## ', '')}
              </h4>
            );
          }

          if (trimmed.startsWith('# ')) {
            return (
              <h3 key={idx} className="text-sm font-black text-white mt-3 mb-1">
                {trimmed.replace('# ', '')}
              </h3>
            );
          }

          if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2 text-white/90">
                <span className="text-cyan-400 font-bold shrink-0">•</span>
                <span>{renderInlineStyles(trimmed.slice(2))}</span>
              </div>
            );
          }

          if (/^\d+\.\s/.test(trimmed)) {
            const num = trimmed.match(/^(\d+\.)\s/)?.[1] || '1.';
            const textContent = trimmed.replace(/^\d+\.\s/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1.5 text-white/90">
                <span className="font-bold text-amber-400 shrink-0 font-mono text-[11px]">{num}</span>
                <span>{renderInlineStyles(textContent)}</span>
              </div>
            );
          }

          return (
            <p key={idx} className="text-white/90">
              {renderInlineStyles(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-black text-cyan-200">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="text-amber-200/90 italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 font-mono text-[11px] border border-cyan-500/20">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return (
          <span key={i} className="font-mono text-emerald-300 font-semibold px-1 py-0.2 rounded bg-emerald-950/40 border border-emerald-500/20">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] max-h-[880px] p-2 sm:p-3 max-w-4xl mx-auto">
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Full-size Image Preview Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden border border-cyan-400/40 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center font-bold text-base transition-colors"
            >
              ✕
            </button>
            <img
              src={previewModalImg}
              alt="Увеличенное фото задачи"
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl mx-auto"
            />
            <div className="text-center text-xs text-white/70 mt-2 font-mono">
              Фото распознано нейросетью Gemini 3.8 Flash Vision
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/15 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Bot className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black text-white tracking-wide">
                ИИ-Помощник АСОШ №2
              </h3>
              <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[9px] font-mono font-bold">
                Vision
              </span>
            </div>
            <p className="text-[10px] text-white/60">
              {cls ? `${cls} класс` : 'АСОШ №2'} • с. Аргаяш • Видит весь дневник
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Stop Speech button when speaking */}
          {isSpeaking && (
            <button
              type="button"
              onClick={handleStopSpeech}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 border border-rose-400/50 text-xs font-bold transition-all shadow-sm animate-pulse cursor-pointer shrink-0"
              title="Остановить озвучку прямо сейчас"
            >
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Стоп озвучки</span>
            </button>
          )}

          {/* Global Voice Toggle */}
          <button
            type="button"
            onClick={toggleVoiceEnabled}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border shrink-0 ${
              voiceEnabled
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/30'
                : 'bg-white/10 text-white/40 border-white/15 hover:bg-white/15'
            }`}
            title={voiceEnabled ? 'Голосовая озвучка включена (нажмите, чтобы выключить)' : 'Голосовая озвучка выключена (нажмите, чтобы включить)'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-cyan-300" /> : <VolumeX className="w-4 h-4 text-white/50" />}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Сфотографировать задачу или доску"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Фото задачи</span>
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-white/70 flex items-center justify-center transition-colors cursor-pointer"
            title="Очистить переписку"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time All-Seeing AI Context Drawer */}
      <div className="mb-2 shrink-0 bg-slate-900/80 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setIsContextOpen(!isContextOpen)}
          className="w-full px-3 py-2 flex items-center justify-between text-left cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-xs truncate">
              <span className="font-black text-cyan-300">ИИ подключён к дневнику: </span>
              <span className="text-white/80 font-medium">{studentName} ({cls || 'АСОШ №2'})</span>
              <span className="text-white/40 mx-1.5">•</span>
              <span className="text-emerald-300 font-mono text-[11px] truncate">
                {currentLessonText.slice(0, 30)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold shrink-0 ml-2">
            <span>{isContextOpen ? 'Скрыть данные' : 'Что видит ИИ'}</span>
            {isContextOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        </button>

        {isContextOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-400/30 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Календарь (2026)</span>
              </div>
              <p className="text-white font-bold text-[11px] truncate">{liveDateFormatted}</p>
              <p className="text-[10px] text-cyan-200 capitalize truncate">{liveDayOfWeek}, 2026 год</p>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Сейчас на уроке</span>
              </div>
              <p className="text-white font-medium text-[11px] line-clamp-1">{currentLessonText}</p>
              <p className="text-[10px] text-white/60">До звонка: <b className="text-amber-300 font-mono">{bellTimeText}</b></p>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                <Bell className="w-3.5 h-3.5" />
                <span>Следующий урок</span>
              </div>
              <p className="text-white font-medium text-[11px] line-clamp-1">{nextLessonText}</p>
              <p className="text-[10px] text-white/60">Смена: {shift} (подгруппа {subGroup})</p>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Домашние задания</span>
              </div>
              <p className="text-white font-bold text-[11px]">{pendingHomework.length} невыполненных</p>
              <p className="text-[10px] text-white/60">
                {pendingHomework.length > 0 ? pendingHomework.map((h) => h.sub).slice(0, 2).join(', ') : 'Все сделаны!'}
              </p>
            </div>

            <div className="p-2 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <CloudSnow className="w-3.5 h-3.5" />
                <span>Аргаяш & Погода</span>
              </div>
              <p className="text-white font-bold text-[11px]">{weatherTemp}°C, {weatherCondition}</p>
              <p className="text-[10px] text-cyan-200/80 line-clamp-1">{frostStatus}</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 custom-scrollbar">
        {/* Quick Prompts Carousel */}
        {messages.length <= 2 && (
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 mb-3">
            <div className="flex items-center justify-between text-[11px] text-white/70 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Быстрые вопросы и возможности:
              </span>
              <span className="text-[10px] text-cyan-300">Нажми на карточку</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (qp.isActionPhoto) {
                      fileInputRef.current?.click();
                    } else {
                      handleSend(qp.prompt);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-white/8 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 mb-1">
                    <span className="text-sm">{qp.icon}</span>
                    <span>{qp.category}</span>
                  </div>
                  <p className="text-[11px] text-white/80 line-clamp-2 group-hover:text-white transition-colors">
                    {qp.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Items */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                }`}
              >
                {isUser ? '👤' : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 shadow-md transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 border border-amber-400/40 text-white rounded-tr-sm ml-4'
                    : 'bg-slate-900/90 border border-cyan-500/30 text-white rounded-tl-sm mr-4'
                }`}
              >
                {/* Assistant Header Tag */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/10 text-[10px] text-white/60">
                    <span className="font-bold text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      ИИ-Помощник АСОШ №2 (Аргаяш)
                    </span>
                    <span className="font-mono text-[9px]">{msg.time}</span>
                  </div>
                )}

                {/* Attached Photo in Message */}
                {msg.image && (
                  <div className="mb-2">
                    <div
                      onClick={() => setPreviewModalImg(msg.image || null)}
                      className="relative group cursor-pointer inline-block rounded-xl overflow-hidden border border-amber-400/40 shadow-md max-w-[240px] sm:max-w-xs"
                    >
                      <img
                        src={msg.image}
                        alt="Фото к вопросу"
                        className="max-h-48 w-auto object-cover rounded-xl group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-2 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Увеличить
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content */}
                {isUser ? (
                  <div className="text-xs text-white leading-relaxed font-medium whitespace-pre-wrap">
                    {msg.text}
                  </div>
                ) : (
                  <div>{renderFormattedText(msg.text)}</div>
                )}

                {/* Assistant Action Buttons */}
                {!isUser && !msg.isError && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-1.5 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white/80 transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Скопировано</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSpeak(msg.text, msg.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                        isSpeaking && speakingMsgId === msg.id
                          ? 'bg-rose-500/30 border-rose-400/60 text-rose-200 animate-pulse'
                          : 'bg-white/10 hover:bg-white/20 border-white/10 text-white/80'
                      }`}
                      title={isSpeaking && speakingMsgId === msg.id ? 'Нажмите, чтобы выключить озвучку' : 'Озвучить голосом'}
                    >
                      {isSpeaking && speakingMsgId === msg.id ? (
                        <>
                          <VolumeX className="w-3 h-3 text-rose-300" />
                          <span className="text-rose-200 font-bold">Выключить озвучку</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-cyan-400" />
                          <span>Озвучить</span>
                        </>
                      )}
                    </button>

                    {onAddHomeworkTask && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddHomeworkTask('ИИ-Заметка', msg.text.slice(0, 120) + '...');
                          onShowToast('Добавлено в список домашних заданий 📘');
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-[10px] font-bold text-cyan-300 transition-colors cursor-pointer border border-cyan-400/30"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>В домашку</span>
                      </button>
                    )}
                  </div>
                )}

                {/* User Time */}
                {isUser && (
                  <div className="text-[9px] text-amber-200/60 text-right mt-1 font-mono">
                    {msg.time}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-xl bg-cyan-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl p-3 bg-slate-900/90 border border-cyan-500/40 text-white rounded-tl-sm mr-6 shadow-md flex items-center gap-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-xs text-cyan-200 font-medium">{loadingStatus}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="pt-2 border-t border-white/15 shrink-0 space-y-2">
        {/* Attached Image Thumbnail Preview Bar */}
        {attachedImage && (
          <div className="p-2 rounded-2xl bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-between shadow-md animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={attachedImage.data}
                alt="Предпросмотр фото"
                className="w-12 h-12 object-cover rounded-xl border border-cyan-400/50 shrink-0"
              />
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-cyan-300 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    Фото прикреплено для ИИ
                  </span>
                  {attachedImage.sizeKb && (
                    <span className="text-[10px] text-white/50 font-mono">({attachedImage.sizeKb} КБ)</span>
                  )}
                </div>
                <p className="text-[11px] text-white/80 truncate">
                  ИИ решит задачу, прочитает доску или проверит записи
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveImage}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
              title="Удалить фото"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-1.5 sm:gap-2"
        >
          {/* Camera / Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`h-10 px-3 rounded-2xl border flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm ${
              attachedImage
                ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                : 'bg-white/10 hover:bg-white/15 text-white/90 border-white/20'
            }`}
            title="Прикрепить фото задачи из учебника или доски"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Фото</span>
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                attachedImage
                  ? "Добавь комментарий или нажми 'Отправить' для решения по фото..."
                  : "Задай вопрос, прикрепи фото задачи или вставь скриншот (Ctrl+V)..."
              }
              disabled={loading}
              className="w-full bg-slate-900/90 border border-white/20 focus:border-cyan-400 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 outline-none resize-none max-h-28 transition-colors leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={(!inputValue.trim() && !attachedImage) || loading}
            className="h-10 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/25 shrink-0"
          >
            <span>{attachedImage && !inputValue.trim() ? 'Решить фото' : 'Отправить'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-white/50 px-1">
          <span className="flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-400" />
            Enter — отправить, Ctrl+V — вставить фото из буфера
          </span>
          <span className="text-cyan-400 font-bold">АСОШ №2 • с. Аргаяш</span>
        </div>
      </div>
    </div>
  );
};
