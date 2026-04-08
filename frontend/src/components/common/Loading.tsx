import React from 'react';
import styles from './common.module.css';

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
  const sizeClass = {
    sm: styles.spinnerSm,
    md: styles.spinnerMd,
    lg: styles.spinnerLg,
  }[size];

  return (
    <div className={`${styles.loadingContainer} ${fullScreen ? styles.fullscreen : ''}`} data-testid="loading-container">
      <div className={`${styles.spinner} ${sizeClass}`} data-testid="spinner" />
      {message && <p className={styles.loadingMessage}>{message}</p>}
    </div>
  );
};

export default Loading;
