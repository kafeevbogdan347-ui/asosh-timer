import React from 'react';
import { createPortal } from 'react-dom';
import { ScreenId, LanguageType, SoundProfileType } from '../types';
import { DICT } from '../data/constants';
import { playSound, doVibro } from '../utils/audio';
import { AsoshikAvatar } from '../screens/AssistantScreen';

interface NavBarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  activeHwCount?: number;
  siteClosed?: boolean;
}

const ONLINE_NAV_IDS = new Set<ScreenId>(['assistant', 'homework']);

export const NavBar: React.FC<NavBarProps> = ({
  currentScreen,
  onNavigate,
  lang,
  soundProfile,
  vibro,
  activeHwCount = 0,
  siteClosed = false,
}) => {
  const d = DICT[lang] || DICT.ru;

  const hideOnScreens: ScreenId[] = ['onboarding', 'select', 'letters', 'about', 'maintenance', 'board'];
  if (hideOnScreens.includes(currentScreen)) return null;

  const navItems: { id: ScreenId; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'main', icon: '🏠', label: d.main },
    { id: 'today', icon: '⏱', label: d.now },
    { id: 'schedule', icon: '📅', label: d.schedule },
    { id: 'homework', icon: '📘', label: d.hw, badge: activeHwCount },
    { id: 'games', icon: '🎮', label: d.games },
    { id: 'settings', icon: '⚙️', label: d.settings },
    { id: 'assistant', icon: <AsoshikAvatar size={22} />, label: 'Асошик' },
  ];

  const handleClick = (id: ScreenId) => {
    playSound('nav', soundProfile);
    doVibro(vibro, 12);
    onNavigate(id);
  };

  // Панель рисуем прямо в body: так её не сдвигают стили экранов при прокрутке
  return createPortal(
    <nav className="nav-bar">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        const isLockedOnline = siteClosed && ONLINE_NAV_IDS.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className={`${isActive ? 'active' : ''} relative`}
            onClick={() => handleClick(item.id)}
          >
            <span className={isLockedOnline ? 'opacity-55 grayscale-[40%]' : ''}>{item.icon}</span>
            <b
              className={`truncate max-w-full px-1 ${
                isLockedOnline ? 'line-through decoration-rose-400 decoration-2 text-rose-300/80' : ''
              }`}
            >
              {item.label}
            </b>
            {isLockedOnline ? (
              <span
                className="absolute top-0.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow"
                title="Временно недоступно"
              >
                ✕
              </span>
            ) : item.badge && item.badge > 0 ? (
              <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>,
    document.body
  );
};
