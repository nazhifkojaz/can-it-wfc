import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { theme } from '../../config/theme';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  showHandle?: boolean;
  snapPoints?: number[]; // Percentage heights: [50, 75, 90]
  closeOnOverlayClick?: boolean;
}

const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  showHandle = true,
  snapPoints = [75],
  closeOnOverlayClick = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  // Prevent body scroll when sheet is open
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

  const handleTouchStart = (event: React.TouchEvent) => {
    startYRef.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    currentYRef.current = event.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;

    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentYRef.current - startYRef.current;

    if (sheetRef.current) {
      if (diff > 100) {
        // Threshold to close
        onClose();
      } else {
        // Snap back
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }

    startYRef.current = 0;
    currentYRef.current = 0;
  };

  const maxHeight = snapPoints.length > 0 ? `${Math.max(...snapPoints)}vh` : '75vh';

  return (
    <>
      <style>{`
        .sheet-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          z-index: ${theme.zIndex.sheet};
          animation: fadeIn ${theme.transitions.base} ease-out;
        }

        .sheet-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: ${theme.colors.white};
          border-top-left-radius: ${theme.borderRadius['2xl']};
          border-top-right-radius: ${theme.borderRadius['2xl']};
          box-shadow: ${theme.shadows['2xl']};
          max-height: ${maxHeight};
          display: flex;
          flex-direction: column;
          z-index: ${theme.zIndex.sheet};
          animation: slideUpSheet ${theme.transitions.base} ease-out;
          transition: transform ${theme.transitions.base} ease-out;
        }

        .sheet-handle-container {
          padding: ${theme.spacing.md} ${theme.spacing.lg};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
        }

        .sheet-handle {
          width: 40px;
          height: 4px;
          background-color: ${theme.colors.gray[300]};
          border-radius: ${theme.borderRadius.full};
        }

        .sheet-header {
          padding: ${theme.spacing.md} ${theme.spacing.lg};
          border-bottom: 1px solid ${theme.colors.border.light};
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sheet-title {
          font-size: ${theme.typography.fontSize.xl};
          font-weight: ${theme.typography.fontWeight.semibold};
          color: ${theme.colors.text.primary};
          margin: 0;
        }

        .sheet-close-button {
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

        .sheet-close-button:hover {
          background-color: ${theme.colors.gray[100]};
          color: ${theme.colors.text.primary};
        }

        .sheet-body {
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

        @keyframes slideUpSheet {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="sheet-overlay" onClick={handleOverlayClick}>
        <div
          className="sheet-container"
          ref={sheetRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'sheet-title' : undefined}
        >
          {showHandle && (
            <div className="sheet-handle-container">
              <div className="sheet-handle" />
            </div>
          )}

          {(title || showCloseButton) && (
            <div className="sheet-header">
              {title && (
                <h2 id="sheet-title" className="sheet-title">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  className="sheet-close-button"
                  onClick={onClose}
                  aria-label="Close sheet"
                >
                  <ChevronDown size={24} />
                </button>
              )}
            </div>
          )}

          <div className="sheet-body">{children}</div>
        </div>
      </div>
    </>
  );
};

export default Sheet;
