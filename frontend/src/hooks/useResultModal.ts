import { useState, useCallback, ReactNode } from 'react';
import { ResultType } from '../components/common/ResultModal';
import { extractApiError } from '../utils/errorUtils';

interface ShowResultModalOptions {
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
  showSuccess: (title: string, message: string, options?: Partial<Pick<ShowResultModalOptions, 'autoCloseDelay'>>) => void;
  showError: (title: string, error: unknown, options?: Partial<Pick<ShowResultModalOptions, 'details'>>) => void;
}

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

  const showSuccess = useCallback((title: string, message: string, options?: Partial<Pick<ShowResultModalOptions, 'autoCloseDelay'>>) => {
    showResultModal({
      type: 'success',
      title,
      message,
      autoClose: true,
      autoCloseDelay: options?.autoCloseDelay ?? 2000,
    });
  }, [showResultModal]);

  const showError = useCallback((title: string, error: unknown, options?: Partial<Pick<ShowResultModalOptions, 'details'>>) => {
    showResultModal({
      type: 'error',
      title,
      message: extractApiError(error).message,
      details: options?.details,
    });
  }, [showResultModal]);

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
    showSuccess,
    showError,
  };
};
