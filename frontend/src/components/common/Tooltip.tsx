import React, { useState, useRef, useEffect, ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const show = () => {
    clearHideTimer();
    setVisible(true);
  };

  const hide = () => {
    setVisible(false);
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setVisible(false), 2000);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        hide();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearHideTimer();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.tooltipContainer}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={() => {
        show();
        scheduleHide();
      }}
    >
      {children}
      {visible && (
        <div className={styles.tooltip} role="tooltip">
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
