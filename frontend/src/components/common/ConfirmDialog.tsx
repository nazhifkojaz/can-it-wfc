import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="">
      <div className={styles.container}>
        {/* Icon */}
        <div className={`${styles.iconContainer} ${styles[variant]}`}>
          <AlertTriangle size={48} />
        </div>

        {/* Title */}
        <h2 className={styles.title}>{title}</h2>

        {/* Message */}
        <p className={styles.message}>{message}</p>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`${styles.confirmButton} ${styles[variant]}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
