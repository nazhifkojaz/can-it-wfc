import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { theme } from '../../config/theme';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const sizeStyles = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '600px' },
    lg: { maxWidth: '800px' },
    full: { maxWidth: '100%', margin: theme.spacing.md },
  };

  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: ${theme.colors.background.overlay};
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: ${theme.zIndex.modal};
          padding: ${theme.spacing.md};
          animation: fadeIn ${theme.transitions.base} ease-out;
        }

        .modal-content {
          background: ${theme.colors.white};
          border-radius: ${theme.borderRadius.xl};
          box-shadow: ${theme.shadows['2xl']};
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp ${theme.transitions.base} ease-out;
        }

        .modal-header {
          padding: ${theme.spacing.lg};
          border-bottom: 1px solid ${theme.colors.border.light};
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title {
          font-size: ${theme.typography.fontSize.xl};
          font-weight: ${theme.typography.fontWeight.semibold};
          color: ${theme.colors.text.primary};
          margin: 0;
        }

        .modal-close-button {
          background: none;
          border: none;
          padding: ${theme.spacing.sm};
          cursor: pointer;
          color: ${theme.colors.text.secondary};
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: ${theme.borderRadius.md};
          transition: all ${theme.transitions.fast};
        }

        .modal-close-button:hover {
          background-color: ${theme.colors.gray[100]};
          color: ${theme.colors.text.primary};
        }

        .modal-body {
          padding: ${theme.spacing.lg};
          overflow-y: auto;
          flex: 1;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .modal-overlay {
            padding: 0;
          }

          .modal-content {
            max-height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>

      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div
          className="modal-content"
          style={sizeStyles[size]}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {(title || showCloseButton) && (
            <div className="modal-header">
              {title && (
                <h2 id="modal-title" className="modal-title">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  className="modal-close-button"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              )}
            </div>
          )}
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </>
  );
};

export default Modal;
