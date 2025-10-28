import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import styles from './common.module.css';

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
    <div className={`${styles.errorStateContainer} ${fullScreen ? styles.fullscreen : ''}`}>
      <div className={styles.errorStateIcon}>
        <AlertCircle size={64} />
      </div>
      <h3 className={styles.errorStateTitle}>{title}</h3>
      <p className={styles.errorStateMessage}>{message}</p>
      {onRetry && (
        <button className={styles.errorStateRetry} onClick={onRetry}>
          <RefreshCw size={20} />
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
