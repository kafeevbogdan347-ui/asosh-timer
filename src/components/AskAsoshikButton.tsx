import React from 'react';
import { AsoshikAvatar } from '../screens/AssistantScreen';

interface Props {
  onClick: () => void;
  label?: string;
  className?: string;
}

// Маленькая кнопка «Асошик» с SVG-логотипом для карточек в разных разделах
export const AskAsoshikButton: React.FC<Props> = ({ onClick, label = 'Асошик', className = '' }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`asoshik-mini ${className}`}
    title="Спросить Асошика"
  >
    <AsoshikAvatar size={15} /> {label}
  </button>
);
