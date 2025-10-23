import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ 
  onClick, 
  label = 'Add Visit' 
}) => {
  return (
    <button 
      className="fab" 
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Plus size={28} />

      <style>{`
        .fab {
          position: fixed;
          bottom: calc(var(--bottom-nav-height) + 20px);
          right: 20px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: var(--z-fab);
        }

        .fab:hover {
          background: var(--primary-dark);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5);
        }

        .fab:active {
          transform: scale(0.95);
        }

        /* Desktop: position without bottom nav offset */
        @media (min-width: 1024px) {
          .fab {
            bottom: 20px;
          }
        }

        /* Animation */
        @keyframes fabAppear {
          from {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          to {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        .fab {
          animation: fabAppear 0.3s ease-out;
        }
      `}</style>
    </button>
  );
};

export default FloatingActionButton;