import React from 'react';

interface PanicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black z-[999999] cursor-crosshair select-none"
      onClick={onClose}
    >
      {/* Subtle invisible/faint exit triggers in top corners */}
      <button
        type="button"
        className="absolute top-3 left-3 w-14 h-14 text-red-500 opacity-5 hover:opacity-40 flex items-center justify-center text-3xl font-black transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ✖
      </button>
      <button
        type="button"
        className="absolute top-3 right-3 w-14 h-14 text-red-500 opacity-5 hover:opacity-40 flex items-center justify-center text-3xl font-black transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ✖
      </button>
    </div>
  );
};
