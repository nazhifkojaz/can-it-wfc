import React, { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import Modal from './Modal';
import styles from './ResultModal.module.css';

export type ResultType = 'success' | 'error' | 'warning' | 'info';

export interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ResultType;
  title: string;
  message: string | ReactNode;
  details?: ReactNode; // Optional: tips, summaries, additional info
  primaryButton?: {
    label: string;
    onClick: () => void;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
  };
  autoClose?: boolean; // Auto-close after delay (success messages)
  autoCloseDelay?: number; // Delay in ms (default: 3000)
}

const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  primaryButton,
  secondaryButton,
  autoClose = false,
  autoCloseDelay = 3000,
}) => {
  // Auto-close effect
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // Icon mapping
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={48} />;
      case 'error':
        return <XCircle size={48} />;
      case 'warning':
        return <AlertTriangle size={48} />;
      case 'info':
        return <Info size={48} />;
      default:
        return <Info size={48} />;
    }
  };

  // Default button labels
  const defaultPrimaryLabel = type === 'error' ? 'Try Again' : 'Okay';
  const finalPrimaryButton = primaryButton || {
    label: defaultPrimaryLabel,
    onClick: onClose,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
      <div className={styles.resultPanel}>
        <div className={`${styles.icon} ${styles[`icon--${type}`]}`}>
          {getIcon()}
        </div>

        <h3 className={styles.title}>{title}</h3>

        <div className={styles.message}>
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        {details && <div className={styles.details}>{details}</div>}

        <div className={styles.actions}>
          {secondaryButton && (
            <button
              className={styles.buttonSecondary}
              onClick={secondaryButton.onClick}
            >
              {secondaryButton.label}
            </button>
          )}
          <button
            className={styles.buttonPrimary}
            onClick={finalPrimaryButton.onClick}
          >
            {finalPrimaryButton.label}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ResultModal;
