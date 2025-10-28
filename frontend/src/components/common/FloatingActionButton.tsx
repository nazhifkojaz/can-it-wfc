import React from 'react';
import { Plus } from 'lucide-react';
import styles from './common.module.css';

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  label = 'Add Visit'
}) => {
  return (
    <button
      className={styles.fab}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Plus size={28} />
    </button>
  );
};

export default FloatingActionButton;