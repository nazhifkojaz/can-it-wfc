import React, { ReactNode } from 'react';
import styles from './FacilityToggle.module.css';

interface FacilityToggleProps {
  label: string;
  icon: ReactNode;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  disabled?: boolean;
}

const FacilityToggle: React.FC<FacilityToggleProps> = ({ label, icon, value, onChange, disabled = false }) => (
  <div className={styles.toggleField}>
    <label className={styles.toggleLabel}>
      {icon}
      {label}
    </label>
    <div className={styles.toggleButtons}>
      <button
        type="button"
        className={`${styles.toggleButton} ${value === true ? styles.toggleActive : ''}`}
        onClick={() => !disabled && onChange(true)}
        disabled={disabled}
      >
        Yes
      </button>
      <button
        type="button"
        className={`${styles.toggleButton} ${value === false ? styles.toggleActive : ''}`}
        onClick={() => !disabled && onChange(false)}
        disabled={disabled}
      >
        No
      </button>
      <button
        type="button"
        className={`${styles.toggleButton} ${value === null ? styles.toggleActive : ''}`}
        onClick={() => !disabled && onChange(null)}
        disabled={disabled}
      >
        Don't Know
      </button>
    </div>
  </div>
);

export default FacilityToggle;
