import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  RefreshCw,
  Settings,
  ShieldCheck,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Flame,
  MessageSquare,
  Copy,
  Users,
  GraduationCap,
  Lock,
  EyeOff,
  Eye,
  Shield,
  Trash2,
  Ghost,
} from 'lucide-react';
import { ChatMessage, LanguageType, SoundProfileType } from '../types';
import {
  sendFirebaseMessage,
  subscribeToFirebaseMessages,
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  GLOBAL_CHAT_PATH,
} from '../services/firebaseChat';
import { getMyProfile } from '../services/userService';
import { playSound, doVibro } from '../utils/audio';
import { useOnline } from '../utils/useOnline';

interface ChatScreenProps {
  cls: string;
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onBack?: () => void;
  onOpenDevModal?: () => void;
  onOpenProfile?: () => void;
}

const AVATAR_PRESETS = ['🎒', '🚀', '⚡', '👑', '🦊', '🎧', '🥋', '📚', '🌟', '👾', '🔥', '💎'];

export const ChatScreen: React.FC<ChatScreenProps> = ({
  cls,
  soundProfile,
  vibro,
  onOpenDevModal,
  onOpenProfile,
}) => {
  // Mode: 'class' (классный чат) | 'global' (общешкольный)
  const [activeTab, setActiveTab] = useState<'class' | 'global'>('class');
  // В чате класса смена класса СТРОГО ЗАПРЕЩЕНА — комната привязана к классу ученика
  const classRoom = cls || '8А';

  // Firebase Chat States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  // Profile state from user service
  const userProfile = getMyProfile();
  const username = userProfile.username || `Ученик ${cls || 'АСОШ №2'}`;
  const selectedAvatar = userProfile.avatar || '🎒';
  // Фото-аватар в base64 слишком длинный для имени в сообщении
  const chatAvatar = selectedAvatar.startsWith('data:') ? '🎒' : selectedAvatar;
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const online = useOnline();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  // Settings modal fields
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  // Privacy & Incognito States
  const [isIncognito, setIsIncognito] = useState(false);
  const [isSelfDestruct, setIsSelfDestruct] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isInitialLoadRef = useRef(true);

  // Load config on mount
  useEffect(() => {
    const cfg = getActiveFirebaseConfig();
    setConfigUrl(cfg.databaseURL);
    setConfigKey(cfg.apiKey);
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Firebase Realtime subscription for active room
  const currentRoomKey = activeTab === 'global' ? 'global' : classRoom;

  useEffect(() => {
    setLoading(true);
    setErrorStatus(null);
    isInitialLoadRef.current = true;

    let lastSeenId: string | undefined;
    const unsubscribe = subscribeToFirebaseMessages(
      (updatedMessages) => {
        setMessages(updatedMessages);
        setLoading(false);

        const newest = updatedMessages[updatedMessages.length - 1];
        const newestId = newest?.id !== undefined ? String(newest.id) : undefined;
        const hasNewMessage = newestId !== undefined && newestId !== lastSeenId;
        lastSeenId = newestId;

        if (!isInitialLoadRef.current) {
          // Звук только на чужое новое сообщение, а не на своё и не на исчезновение старых
          if (hasNewMessage && newest.userId !== getMyProfile().id) {
            playSound('bell', soundProfile);
            doVibro(vibro, 20);
          }
          if (hasNewMessage) setTimeout(() => scrollToBottom(true), 60);
        } else {
          isInitialLoadRef.current = false;
          setTimeout(() => scrollToBottom(false), 120);
        }
      },
      100,
      currentRoomKey
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeTab, classRoom, currentRoomKey, soundProfile, vibro]);

  // Send message handler (Firebase)
  const handleSendFirebase = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputText;
    const trimmed = rawText.trim();
    if (!trimmed || sending || cooldown) return;
    if (!online) {
      setErrorStatus('Нет интернета — сообщение не отправлено');
      return;
    }

    setSending(true);
    setCooldown(true);
    playSound('click', soundProfile);
    doVibro(vibro, 15);
    setErrorStatus(null);

    const formattedSender = isIncognito
      ? '🎭 Анонимный ученик'
      : `${chatAvatar} ${username}`.trim();

    const res = await sendFirebaseMessage(
      formattedSender,
      trimmed,
      currentRoomKey,
      isIncognito ? 'anonymous' : userProfile.id,
      isIncognito ? '🎭' : chatAvatar,
      { isIncognito, isSelfDestruct }
    );

    if (res.success) {
      setInputText('');
      setTimeout(() => scrollToBottom(true), 50);
    } else {
      setErrorStatus(res.error || 'Ошибка отправки в чат');
    }

    setSending(false);
    setTimeout(() => setCooldown(false), 1000);
  };

  // Universal Send router
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendFirebase();
  };

  // Save custom Firebase settings
  const handleSaveConfig = () => {
    saveCustomFirebaseConfig({
      databaseURL: configUrl.trim(),
      apiKey: configKey.trim(),
    });
    setConfigSavedNotice(true);
    setTimeout(() => {
      setConfigSavedNotice(false);
      setIsConfigOpen(false);
      window.location.reload();
    }, 900);
  };

  const handleCopyText = (content: string, id?: string | number) => {
    // clipboard недоступен на http и в части WebView
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(content).catch(() => {});
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="card screen-enter flex flex-col h-[calc(100vh-140px)] min-h-[520px] max-h-[780px]">
      {/* Top Navigation Mode Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/8 rounded-2xl border border-white/10 mb-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('class')}
          className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap overflow-hidden ${
            activeTab === 'class'
              ? 'bg-cyan-500 text-slate-950 shadow-md scale-[1.01]'
              : 'text-white/80 hover:bg-white/10'
          }`}
        >
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span className="truncate">Чат Класса ({classRoom})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('global')}
          className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all whitespace-nowrap overflow-hidden ${
            activeTab === 'global'
              ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.01]'
              : 'text-white/80 hover:bg-white/10'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="truncate">Вся Школа АСОШ №2</span>
        </button>
      </div>

      {/* Room Subheader */}
      <div className="flex items-center justify-between pb-2 border-b border-white/12 gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-lg shrink-0">
            {activeTab === 'class' ? '🎒' : '🏫'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white truncate">
                {activeTab === 'class'
                  ? `Чат ${classRoom} класса`
                  : 'Общешкольный чат АСОШ №2'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-white/60">
              {activeTab === 'class' ? (
                <span className="text-amber-300 font-bold flex items-center gap-1 truncate">
                  <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span>Приватный чат класса • Смена запрещена</span>
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1 truncate">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse shrink-0" />
                  <span>🇷🇺 Чат школы в РФ • Без VPN 100%</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Room actions: Class locked indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab === 'class' && (
            <div
              className="bg-amber-500/15 border border-amber-400/40 rounded-xl px-2.5 py-1 text-xs font-black text-amber-300 flex items-center gap-1.5 shadow-sm !m-0 !w-auto cursor-default select-none"
              title="Смена класса в чате запрещена. Чат строго привязан к вашему классу."
            >
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{classRoom}</span>
            </div>
          )}

          {localStorage.getItem('asosh_dev_unlocked') === 'true' && (
            <button
              type="button"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-cyan-300 text-xs flex items-center justify-center shrink-0 !m-0 !w-auto"
              title="Настройки подключения базы данных"
              onClick={() => setIsConfigOpen(true)}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* User Profile Bar */}
      <div className="py-1.5 px-2.5 my-1.5 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-purple-950/40 rounded-2xl border border-cyan-400/25 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-lg shrink-0 overflow-hidden">
            {userProfile.avatarType === 'image' && userProfile.avatar?.startsWith('data:') ? (
              <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{selectedAvatar}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[200px] whitespace-nowrap">
                {userProfile.fullName}
              </span>
              <span className="text-[10px] text-cyan-300 font-mono shrink-0 whitespace-nowrap">
                @{username}
              </span>
            </div>
            <span className="text-[10px] text-white/60 block truncate">
              {userProfile.status || `${classRoom} класс АСОШ №2`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-bold text-white shrink-0 !m-0 !w-auto transition-colors"
              title="Открыть мой профиль"
            >
              Профиль
            </button>
          )}
          <div className="bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap shrink-0 !m-0">
            {messages.length} сообщ.
          </div>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-1 custom-scrollbar">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/60 space-y-2 py-12">
            <RefreshCw className="w-7 h-7 animate-spin text-amber-400" />
            <span className="text-xs font-bold text-cyan-200">
              Подключение к комнате {activeTab === 'class' ? classRoom : 'Вся Школа'}...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 bg-white/4 rounded-2xl border border-dashed border-white/12">
            <div className="text-4xl mb-2 animate-bounce">
              {activeTab === 'class' ? '🎒' : '🏫'}
            </div>
            <b className="text-sm text-cyan-200">
              {activeTab === 'class'
                ? `Чат ${classRoom} класса пуст`
                : 'Общешкольный чат готов к общению!'}
            </b>
            <p className="text-xs text-white/60 max-w-xs mt-1">
              Напишите первое сообщение своим одноклассникам!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const myId = userProfile.id;
            const isMe = Boolean(
              (msg.userId && myId && msg.userId === myId) ||
              (!msg.userId && (
                username &&
                !username.startsWith('Ученик') &&
                (msg.username === username || msg.username === `${chatAvatar} ${username}`)
              ))
            );

            return (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  <span className="text-[11px] font-black text-cyan-300/90 flex items-center gap-1">
                    {msg.username || 'Ученик'}
                    {(msg.isIncognito || (msg.username && msg.username.includes('🎭'))) && (
                      <span className="text-[9px] bg-purple-500/25 text-purple-200 border border-purple-400/40 px-1 py-0.2 rounded font-bold flex items-center gap-0.5">
                        <Ghost className="w-2.5 h-2.5" /> Анонимно
                      </span>
                    )}
                    {msg.isSelfDestruct && (
                      <span className="text-[9px] bg-rose-500/25 text-rose-300 border border-rose-400/40 px-1 py-0.2 rounded font-bold">
                        💣 5 мин
                      </span>
                    )}
                    {isMe && (
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 px-1 py-0.2 rounded font-bold">
                        Вы
                      </span>
                    )}
                  </span>
                  {msg.created_at && (
                    <span className="text-[9px] text-white/40 font-mono">
                      {formatMessageTime(msg.created_at)}
                    </span>
                  )}
                </div>

                <div
                  onClick={() => handleCopyText(msg.content, msg.id)}
                  title="Нажмите, чтобы скопировать текст"
                  className={`sensitive-data max-w-[85%] sm:max-w-[75%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm break-words shadow-md cursor-pointer transition-all active:scale-[0.98] ${
                    isMe
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs border border-cyan-400/40'
                      : 'bg-white/10 text-white/95 rounded-bl-xs border border-white/12 backdrop-blur-sm hover:bg-white/15'
                  }`}
                >
                  {msg.content}
                </div>

                {copiedId === msg.id && (
                  <span className="text-[9px] text-emerald-400 font-bold mt-0.5 px-1">
                    ✓ Скопировано
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {!online && (
        <div className="my-1.5 p-2.5 bg-amber-950/70 border border-amber-500/40 rounded-xl text-xs text-amber-200">
          📴 Нет интернета. Показаны последние сохранённые сообщения — новые появятся, когда будет сеть.
        </div>
      )}

      {/* Error Banner */}
      {errorStatus && (
        <div className="my-1.5 p-2.5 bg-rose-950/80 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{errorStatus}</span>
          </div>
          {localStorage.getItem('asosh_dev_unlocked') === 'true' && (
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="text-[10px] font-bold underline text-cyan-300 shrink-0"
            >
              Настройки
            </button>
          )}
        </div>
      )}

      {/* Quick Privacy and Mode Bar */}
      <div className="flex items-center justify-between gap-2 px-1 pt-2 pb-0.5 text-xs text-white/70 shrink-0 border-t border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
          {/* Incognito button */}
          <button
            type="button"
            onClick={() => {
              setIsIncognito(!isIncognito);
              playSound('click', soundProfile);
              doVibro(vibro, 15);
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
              isIncognito
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-1 ring-purple-400'
                : 'bg-white/8 hover:bg-white/15 text-white/70 border border-white/10'
            }`}
            title="Отправить сообщение анонимно (скрыть ФИО и аватар)"
          >
            <span>🎭</span>
            <span>{isIncognito ? 'Аноним: ВКЛ' : 'Инкогнито'}</span>
          </button>

          {/* Self-destruct 5-min button */}
          <button
            type="button"
            onClick={() => {
              setIsSelfDestruct(!isSelfDestruct);
              playSound('click', soundProfile);
              doVibro(vibro, 15);
            }}
            className={`px-2 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer select-none shrink-0 ${
              isSelfDestruct
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30 ring-1 ring-rose-400'
                : 'bg-white/8 hover:bg-white/15 text-white/70 border border-white/10'
            }`}
            title="Пометить сообщение как самоуничтожающееся"
          >
            <span>💣</span>
            <span>{isSelfDestruct ? '5 мин: ВКЛ' : 'Таймер'}</span>
          </button>
        </div>

        {/* 152-ФЗ РФ Privacy Info Button */}
        <button
          type="button"
          onClick={() => setIsPrivacyModalOpen(true)}
          className="px-2.5 py-1 rounded-xl bg-white/8 hover:bg-white/15 text-cyan-300 border border-cyan-400/20 flex items-center gap-1 text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
          title="Политика конфиденциальности чата (152-ФЗ)"
        >
          <Shield className="w-3 h-3 text-cyan-400" />
          <span>152-ФЗ РФ</span>
        </button>
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleFormSubmit}
        className="flex items-center gap-2 pt-1 pb-1 shrink-0 w-full !m-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Сообщение в чат (${activeTab === 'class' ? `${classRoom} класс` : 'Вся Школа'})...`}
          maxLength={400}
          className="flex-1 min-w-0 bg-white/8 border border-white/15 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors placeholder-white/40 shadow-inner !m-0 !w-auto"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || sending || cooldown}
          className="!w-auto !m-0 py-2.5 px-3.5 sm:px-4 rounded-2xl shrink-0 font-black shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950"
        >
          <Send className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Отправить</span>
        </button>
      </form>

      {/* Firebase Settings Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <b className="text-base text-cyan-200">Firebase Realtime DB</b>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="text-white/60 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-950/50 rounded-2xl border border-emerald-400/40 text-[11px] text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>База данных успешно подключена!</span>
                </div>
                <div className="font-mono text-[10px] text-white/70">
                  URL: https://asosh-time-default-rtdb.firebaseio.com
                </div>
                <div className="font-mono text-[10px] text-white/70">
                  Комната: {currentRoomKey}
                </div>
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-bold">
                  Database URL
                </label>
                <input
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-bold">
                  API Key
                </label>
                <input
                  type="text"
                  value={configKey}
                  onChange={(e) => setConfigKey(e.target.value)}
                  className="w-full bg-slate-950 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {configSavedNotice && (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Настройки сохранены! Перезагрузка...</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="btn darkBtn flex-1"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="btn cyan flex-1 font-black"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 152-ФЗ РФ & Privacy Center Modal */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-400/40 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <b className="text-base text-cyan-200">Конфиденциальность 152-ФЗ</b>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyModalOpen(false);
                  setClearedNotice(false);
                }}
                className="text-white/60 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-white/80 leading-relaxed">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <span>🇷🇺</span>
                  <span>Соответствие законодательству РФ</span>
                </div>
                <p>
                  Чат МОУ «АСОШ №2» спроектирован с соблюдением требований Федерального закона № 152-ФЗ «О персональных данных».
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Ghost className="w-3.5 h-3.5 text-purple-400" />
                  <span>Режим «Инкогнито»:</span>
                </div>
                <p className="text-white/70 pl-5">
                  При включении режима ваши ФИО, аватар и ID устройства полностью маскируются. Сообщение публикуется от лица «🎭 Анонимный ученик».
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Изоляция комнат:</span>
                </div>
                <p className="text-white/70 pl-5">
                  Чат вашего класса доступен только ученикам вашего класса, подтвердившим персональный код классного руководителя.
                </p>
              </div>

              {clearedNotice ? (
                <div className="p-3 bg-emerald-950/70 border border-emerald-400/40 rounded-2xl text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Локальный кэш чата успешно очищен на этом устройстве!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setClearedNotice(true);
                    playSound('click', soundProfile);
                    doVibro(vibro, 20);
                  }}
                  className="w-full py-2.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-400/40 rounded-2xl text-rose-200 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Очистить экран переписки на этом устройстве</span>
                </button>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPrivacyModalOpen(false);
                  setClearedNotice(false);
                }}
                className="btn cyan w-full justify-center font-bold"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
