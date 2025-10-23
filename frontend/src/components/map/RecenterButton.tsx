import React from 'react';
import { MapPin } from 'lucide-react';

interface RecenterButtonProps {
  onClick: () => void;
}

const RecenterButton: React.FC<RecenterButtonProps> = ({ onClick }) => {
  return (
    <button
      className="recenter-button"
      onClick={onClick}
      aria-label="Center on my location"
      title="Center on my location"
    >
      <MapPin size={20} />

      <style>{`
        .recenter-button {
          position: absolute;
          bottom: 100px;
          right: 16px;
          z-index: 1000;

          display: flex;
          align-items: center;
          justify-content: center;

          width: 44px;
          height: 44px;

          background: white;
          border: none;
          border-radius: 50%;
          padding: 0;

          color: var(--primary, #007bff);

          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .recenter-button:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        .recenter-button:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .recenter-button {
            bottom: 80px;
            right: 12px;
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </button>
  );
};

export default RecenterButton;
