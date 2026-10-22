import React from 'react';
import { ScreenId, LanguageType, SoundProfileType } from '../types';
import { DICT } from '../data/constants';
import { playSound, doVibro } from '../utils/audio';

interface NavBarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  activeHwCount?: number;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentScreen,
  onNavigate,
  lang,
  soundProfile,
  vibro,
  activeHwCount = 0,
}) => {
  const d = DICT[lang] || DICT.ru;

  const hideOnScreens: ScreenId[] = ['onboarding', 'select', 'letters', 'about', 'maintenance'];
  if (hideOnScreens.includes(currentScreen)) return null;

  const navItems: { id: ScreenId; icon: string; label: string; badge?: number }[] = [
    { id: 'main', icon: '🏠', label: d.main },
    { id: 'today', icon: '⏱', label: d.now },
    { id: 'schedule', icon: '📅', label: d.schedule },
    { id: 'homework', icon: '📘', label: d.hw, badge: activeHwCount },
    { id: 'games', icon: '🎮', label: d.games },
    { id: 'settings', icon: '⚙️', label: d.settings },
  ];

  const handleClick = (id: ScreenId) => {
    playSound('nav', soundProfile);
    doVibro(vibro, 12);
    onNavigate(id);
  };

  return (
    <nav className="nav-bar">
      {navItems.map((item) => {
        const isActive不易 = currentScreen === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`${isActive不易 ? 'active' : ''} relative`}
            onClick={() => handleClick(item.id)}
          >
            <span>{item.icon}</span>
            <b className="truncate max-w-full px-1">{item.label}</b>
            {item.badge && item.badge > 0 ? (
              <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] flex items-center justify-center">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
