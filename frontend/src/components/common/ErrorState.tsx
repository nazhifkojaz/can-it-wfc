import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { theme } from '../../config/theme';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  fullScreen = false,
}) => {
  return (
    <>
      <style>{`
        .error-state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: ${theme.spacing['3xl']} ${theme.spacing.lg};
          text-align: center;
        }

        .error-state-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: ${theme.colors.background.primary};
        }

        .error-state-icon {
          color: ${theme.colors.error};
          margin-bottom: ${theme.spacing.lg};
        }

        .error-state-title {
          font-size: ${theme.typography.fontSize.xl};
          font-weight: ${theme.typography.fontWeight.semibold};
          color: ${theme.colors.text.primary};
          margin: 0 0 ${theme.spacing.sm} 0;
        }

        .error-state-message {
          font-size: ${theme.typography.fontSize.base};
          color: ${theme.colors.text.secondary};
          margin: 0 0 ${theme.spacing.lg} 0;
          max-width: 400px;
        }

        .error-state-retry {
          background-color: ${theme.colors.primary};
          color: ${theme.colors.white};
          border: none;
          border-radius: ${theme.borderRadius.lg};
          padding: ${theme.spacing.md} ${theme.spacing.xl};
          font-size: ${theme.typography.fontSize.base};
          font-weight: ${theme.typography.fontWeight.medium};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: ${theme.spacing.sm};
          transition: background-color ${theme.transitions.fast};
        }

        .error-state-retry:hover {
          background-color: ${theme.colors.primaryHover};
        }

        .error-state-retry:active {
          transform: scale(0.98);
        }
      `}</style>

      <div className={`error-state-container ${fullScreen ? 'fullscreen' : ''}`}>
        <div className="error-state-icon">
          <AlertCircle size={64} />
        </div>
        <h3 className="error-state-title">{title}</h3>
        <p className="error-state-message">{message}</p>
        {onRetry && (
          <button className="error-state-retry" onClick={onRetry}>
            <RefreshCw size={20} />
            Try Again
          </button>
        )}
      </div>
    </>
  );
};

export default ErrorState;
