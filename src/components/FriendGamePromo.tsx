import React, { useState, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  Copy,
  Heart,
  Sparkles,
  Flame,
  Check,
  Bot,
  Gamepad2,
  Share2,
} from 'lucide-react';
import { playSound, doVibro } from '../utils/audio';

interface FriendGamePromoProps {
  onShowToast?: (msg: string) => void;
  compact?: boolean;
}

export const FriendGamePromo: React.FC<FriendGamePromoProps> = ({
  onShowToast,
  compact = false,
}) => {
  const GAME_URL = 'https://dmitri-pajet.itch.io/detective-ai-game';

  const [copied, setCopied] = useState(false);
  const [likes, setLikes] = useState<number>(() => {
    const saved = localStorage.getItem('asosh_detective_game_likes');
    return saved ? Number(saved) : 128;
  });
  const [hasLiked, setHasLiked] = useState<boolean>(() => {
    return !!localStorage.getItem('asosh_detective_game_user_liked');
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(GAME_URL).then(() => {
      setCopied(true);
      if (onShowToast) onShowToast('Ссылка на игру скопирована в буфер обмена!');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      if (onShowToast) onShowToast('Ссылка: https://dmitri-pajet.itch.io/detective-ai-game');
    });
  };

  const handleLike = () => {
    if (hasLiked) {
      if (onShowToast) onShowToast('Вы уже поставили респект игре друга!');
      return;
    }
    const newLikes = likes + 1;
    setLikes(newLikes);
    setHasLiked(true);
    localStorage.setItem('asosh_detective_game_likes', String(newLikes));
    localStorage.setItem('asosh_detective_game_user_liked', 'true');
    doVibro(true, 40);
    if (onShowToast) onShowToast('🔥 +1 Респект игре Dmitri Pajet!');
  };

  const handleShare = () => {
    const shareText = `🔍 Оцени крутую игру моего друга «Detective AI Game» на itch.io! Играй тут: ${GAME_URL}`;
    if (navigator.share) {
      navigator.share({
        title: 'Detective AI Game',
        text: shareText,
        url: GAME_URL,
      }).catch(() => handleCopyLink());
    } else {
      handleCopyLink();
    }
  };

  if (compact) {
    return (
      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 rounded-2xl border border-amber-400/40 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl shrink-0">
              🕵️‍♂️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-300 truncate">Detective AI Game</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold shrink-0">
                  itch.io
                </span>
              </div>
              <p className="text-[11px] text-white/70 truncate">Игра от друга • Детективное расследование с ИИ</p>
            </div>
          </div>

          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shrink-0 transition-transform active:scale-95 shadow-md"
          >
            <span>Играть</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 rounded-3xl border-2 border-amber-400/40 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* Top Tag & Author */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>ПРОЕКТ ОТ ДРУГА ШКОЛЫ</span>
          </span>
          <span className="bg-white/10 text-white/70 text-xs font-mono px-2 py-0.5 rounded-full">
            Dmitri Pajet
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              hasLiked
                ? 'bg-rose-500/30 text-rose-300 border border-rose-400/50'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
            }`}
            title="Поставить респект игре"
          >
            <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'text-rose-400 fill-rose-400' : 'text-rose-400'}`} />
            <span>{likes}</span>
          </button>
        </div>
      </div>

      {/* Main Title and Pitch */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500/30 via-slate-800 to-indigo-900/40 border-2 border-amber-400/60 flex items-center justify-center text-4xl sm:text-5xl shadow-xl shrink-0">
          🕵️‍♂️
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Detective AI Game
            </h3>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
              AI Powered
            </span>
          </div>

          <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed font-medium">
            Погрузись в захватывающее расследование с искусственным интеллектом! Опрашивай подозреваемых, сопоставляй улики и раскрой запутанное преступление.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/70 font-mono">
              🔍 Детектив
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/70 font-mono">
              🤖 Нейросеть в сюжете
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/70 font-mono">
              🧩 Квест & Головоломка
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/70 font-mono">
              🎮 Браузер & ПК
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="pt-2 flex flex-wrap gap-2">
        <a
          href={GAME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn flex-1 min-w-[160px] py-2.5 px-4 font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all transform active:scale-98"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Играть на itch.io</span>
          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="btn flex-1 min-w-[130px] py-2.5 px-3 font-bold bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/15 flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 font-black">Скопировано!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-amber-300" />
              <span>Скопировать ссылку</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="btn py-2.5 px-3 font-bold bg-white/5 hover:bg-white/10 text-white/90 rounded-2xl border border-white/10 flex items-center justify-center gap-1 text-xs transition-colors cursor-pointer"
          title="Поделиться с друзьями"
        >
          <Share2 className="w-4 h-4 text-cyan-300" />
          <span className="hidden sm:inline">Поделиться</span>
        </button>
      </div>

      {/* Footer info notice */}
      <div className="pt-1 text-[11px] text-white/50 flex items-center justify-between border-t border-white/10 font-mono">
        <span>Разработчик: Dmitri Pajet</span>
        <span className="text-amber-400/80">Работает в РФ без VPN 🇷🇺</span>
      </div>
    </div>
  );
};
