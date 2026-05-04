import React, { ReactNode } from 'react';
import styles from './FacilityCheckbox.module.css';

interface FacilityCheckboxProps {
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const FacilityCheckbox: React.FC<FacilityCheckboxProps> = ({
  label,
  icon,
  checked,
  onChange,
  disabled = false,
}) => (
  <button
    type="button"
    className={`${styles.checkboxButton} ${checked ? styles.checkboxActive : ''}`}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    aria-pressed={checked}
  >
    <span className={styles.checkboxIcon}>{icon}</span>
    <span className={styles.checkboxLabel}>{label}</span>
    <span className={styles.checkboxIndicator}>
      {checked ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" stroke="currentColor" strokeWidth="2" />
          <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </span>
  </button>
);

export default FacilityCheckbox;
