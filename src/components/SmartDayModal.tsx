import React from 'react';
import { SmartDayData } from '../types';
import { Sparkles, X, RefreshCw, Shirt, Backpack, BookOpen, AlertTriangle, CloudSun, CheckCircle2, Trophy } from 'lucide-react';

interface SmartDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SmartDayData | null;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const SmartDayModal: React.FC<SmartDayModalProps> = ({
  isOpen,
  onClose,
  data,
  onRefresh,
  isLoading,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-purple-400/40 w-full max-w-lg rounded-3xl shadow-2xl p-4 sm:p-5 text-white max-h-[90vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center text-lg shadow-md">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-white">Умный день ИИ</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  {data.engine === 'gemini' ? 'Gemini 3.8 Flash' : 'ИИ-Синтез'}
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Анализ расписания, погоды в Аргаяше и статистики аккаунта
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Urgent Alert Banner if present */}
        {data.urgentAlert && (
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-start gap-2.5 text-amber-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <b className="block text-white mb-0.5">Внимание</b>
              <span>{data.urgentAlert}</span>
            </div>
          </div>
        )}

        {/* Greeting & Headline */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-blue-950/60 border border-purple-400/30">
          <div className="text-sm font-black text-cyan-300 mb-0.5">{data.greeting}</div>
          <div className="text-xs font-bold text-white/90 mb-1.5">{data.headline}</div>
          <p className="text-xs text-purple-100/90 leading-relaxed font-medium">
            {data.summary}
          </p>
        </div>

        {/* Key Factor Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Погода и одежда */}
          <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-400/30 space-y-1">
            <div className="flex items-center gap-1.5 text-sky-300 font-bold text-xs">
              <Shirt className="w-4 h-4 text-sky-400" />
              <span>Погода & Одежда</span>
            </div>
            <p className="text-[11px] text-sky-100/90 leading-snug">
              {data.outfitTip}
            </p>
          </div>

          {/* 2. Портфель и вещи */}
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-400/30 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
              <Backpack className="w-4 h-4 text-emerald-400" />
              <span>В портфель сегодня</span>
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-snug">
              {data.backpackTip}
            </p>
          </div>

          {/* 3. Учёба и ДЗ */}
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-400/30 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Учеба & Домашние задания</span>
            </div>
            <p className="text-[11px] text-amber-100/90 leading-snug">
              {data.studyTip}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-xl bg-white/10 border border-white/15 text-xs text-cyan-200 font-semibold flex items-center gap-1"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <span className="text-white/50 text-[11px]">
            Обновлено: {data.updatedAt}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Генерация...' : 'Пересчитать ИИ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
