import React from 'react';
import { theme } from '../../config/theme';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  fullScreen = false,
  message,
}) => {
  const sizeMap = {
    sm: '24px',
    md: '40px',
    lg: '60px',
  };

  const spinnerSize = sizeMap[size];

  return (
    <>
      <style>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: ${theme.spacing.md};
        }

        .loading-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: ${theme.colors.background.primary};
          z-index: ${theme.zIndex.fixed};
        }

        .spinner {
          width: ${spinnerSize};
          height: ${spinnerSize};
          border: 3px solid ${theme.colors.gray[200]};
          border-top-color: ${theme.colors.primary};
          border-radius: ${theme.borderRadius.full};
          animation: spin 0.8s linear infinite;
        }

        .loading-message {
          color: ${theme.colors.text.secondary};
          font-size: ${theme.typography.fontSize.sm};
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className={`loading-container ${fullScreen ? 'fullscreen' : ''}`}>
        <div className="spinner" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </>
  );
};

export default Loading;
