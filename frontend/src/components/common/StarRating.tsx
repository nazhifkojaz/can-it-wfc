import React from 'react';
import { Star } from 'lucide-react';
import styles from './StarRating.module.css';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, disabled = false }) => (
  <div className={styles.starContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`${styles.starButton} ${star <= value ? styles.starActive : ''}`}
        onClick={() => !disabled && onChange?.(star)}
        aria-label={`Rate ${star} stars`}
        disabled={disabled}
      >
        <Star size={24} fill={star <= value ? 'currentColor' : 'none'} />
      </button>
    ))}
  </div>
);

export default StarRating;
