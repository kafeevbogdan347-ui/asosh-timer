import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WHATS_NEW, updatesLink } from '../data/whatsNew';
import { AsoshikAvatar } from '../screens/AssistantScreen';

interface WhatsNewModalProps {
  onClose: () => void;
}

// Окно «Что нового»: последнее обновление раскрыто, старые — по кнопке
export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onClose }) => {
  const [showOld, setShowOld] = useState(false);
  const releases = showOld ? WHATS_NEW : WHATS_NEW.slice(0, 1);

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-[420px] max-h-[85dvh] overflow-y-auto bg-slate-900/95 border border-white/20 rounded-3xl p-5 shadow-2xl text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xl font-black text-cyan-300">🎁 Что нового</div>
            <div className="text-[11px] text-white/60 font-bold">АСОШ Таймер обновился</div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white/70 cursor-pointer" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        {releases.map((r, ri) => (
          <div key={r.date} className={ri > 0 ? 'mt-5 pt-4 border-t border-white/10' : ''}>
            <div className="flex items-baseline gap-2 mb-2">
              {r.version && <span className="text-sm font-black text-white">{r.version}</span>}
              <span className={r.version ? 'text-[11px] text-white/50 font-bold' : 'text-sm font-black text-white'}>{r.date}</span>
              {ri === 0 && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950">НОВОЕ</span>}
            </div>
            <div className="space-y-2">
              {r.items.map((it) => (
                <div key={it.title} className="flex gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-2xl leading-none shrink-0 w-8 text-center flex items-center justify-center">
                    {it.icon === '🫧' ? <AsoshikAvatar size={28} /> : it.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black">{it.title}</div>
                    <div className="text-xs text-white/70 leading-relaxed mt-0.5">{it.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {WHATS_NEW.length > 1 && (
          <button type="button" onClick={() => setShowOld(!showOld)} className="w-full mt-3 text-xs font-bold text-white/60 hover:text-white/90 py-2 cursor-pointer">
            {showOld ? 'Скрыть прошлые обновления' : 'Прошлые обновления'}
          </button>
        )}
        {WHATS_NEW[0].version && (
          <a
            href={updatesLink(WHATS_NEW[0].version)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn darkBtn w-full mt-2 cursor-pointer"
          >
            📰 Подробнее об обновлении
          </a>
        )}
        <button type="button" onClick={onClose} className="btn w-full mt-2 cursor-pointer">
          Круто, понятно!
        </button>
      </div>
    </div>
  );
};
