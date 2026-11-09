import React from 'react';

interface Props {
  onClick: () => void;
  label?: string;
  className?: string;
}

// Маленькая кнопка «🫧 Асошик» для карточек в разных разделах
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
    🫧 {label}
  </button>
);
