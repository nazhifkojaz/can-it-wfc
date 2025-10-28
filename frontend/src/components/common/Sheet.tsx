import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './common.module.css';

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
    <div className={styles.sheetOverlay} onClick={handleOverlayClick}>
      <div
        className={styles.sheetContainer}
        style={{ maxHeight }}
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {showHandle && (
          <div className={styles.sheetHandleContainer}>
            <div className={styles.sheetHandle} />
          </div>
        )}

        {(title || showCloseButton) && (
          <div className={styles.sheetHeader}>
            {title && (
              <h2 id="sheet-title" className={styles.sheetTitle}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                className={styles.sheetCloseButton}
                onClick={onClose}
                aria-label="Close sheet"
              >
                <ChevronDown size={24} />
              </button>
            )}
          </div>
        )}

        <div className={styles.sheetBody}>{children}</div>
      </div>
    </div>
  );
};

export default Sheet;
