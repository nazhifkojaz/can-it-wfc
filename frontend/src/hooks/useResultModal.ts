import { useState, useCallback, ReactNode } from 'react';
import { ResultType } from '../components/common/ResultModal';

export interface ShowResultModalOptions {
  type: ResultType;
  title: string;
  message: string | ReactNode;
  details?: ReactNode;
  primaryButton?: {
    label: string;
    onClick: () => void;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
  };
  autoClose?: boolean;
  autoCloseDelay?: number;
  onClose?: () => void;
}

export interface UseResultModalReturn {
  isOpen: boolean;
  type: ResultType;
  title: string;
  message: string | ReactNode;
  details?: ReactNode;
  primaryButton?: {
    label: string;
    onClick: () => void;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
  };
  autoClose: boolean;
  autoCloseDelay: number;
  showResultModal: (options: ShowResultModalOptions) => void;
  closeResultModal: () => void;
}

/**
 * Hook for managing ResultModal state
 *
 * @example
 * const resultModal = useResultModal();
 *
 * // Show success
 * resultModal.showResultModal({
 *   type: 'success',
 *   title: 'Success!',
 *   message: 'Operation completed successfully.',
 * });
 *
 * // Show error with retry
 * resultModal.showResultModal({
 *   type: 'error',
 *   title: 'Failed',
 *   message: error.message,
 *   primaryButton: {
 *     label: 'Try Again',
 *     onClick: () => { retry(); resultModal.closeResultModal(); }
 *   }
 * });
 */
export const useResultModal = (): UseResultModalReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<ResultType>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | ReactNode>('');
  const [details, setDetails] = useState<ReactNode | undefined>();
  const [primaryButton, setPrimaryButton] = useState<{ label: string; onClick: () => void } | undefined>();
  const [secondaryButton, setSecondaryButton] = useState<{ label: string; onClick: () => void } | undefined>();
  const [autoClose, setAutoClose] = useState(false);
  const [autoCloseDelay, setAutoCloseDelay] = useState(3000);
  const [onCloseCallback, setOnCloseCallback] = useState<(() => void) | undefined>();

  const showResultModal = useCallback((options: ShowResultModalOptions) => {
    setType(options.type);
    setTitle(options.title);
    setMessage(options.message);
    setDetails(options.details);
    setPrimaryButton(options.primaryButton);
    setSecondaryButton(options.secondaryButton);
    setAutoClose(options.autoClose || false);
    setAutoCloseDelay(options.autoCloseDelay || 3000);
    setOnCloseCallback(() => options.onClose);
    setIsOpen(true);
  }, []);

  const closeResultModal = useCallback(() => {
    setIsOpen(false);
    if (onCloseCallback) {
      onCloseCallback();
    }
    // Reset state after closing
    setTimeout(() => {
      setType('info');
      setTitle('');
      setMessage('');
      setDetails(undefined);
      setPrimaryButton(undefined);
      setSecondaryButton(undefined);
      setAutoClose(false);
      setAutoCloseDelay(3000);
      setOnCloseCallback(undefined);
    }, 200);
  }, [onCloseCallback]);

  return {
    isOpen,
    type,
    title,
    message,
    details,
    primaryButton,
    secondaryButton,
    autoClose,
    autoCloseDelay,
    showResultModal,
    closeResultModal,
  };
};
