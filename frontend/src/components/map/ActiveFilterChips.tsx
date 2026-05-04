import { X } from 'lucide-react';
import { CafeFilters } from '../../types/filters';
import { getActiveChips } from '../../lib/filterEncoding';
import styles from './ActiveFilterChips.module.css';

interface ActiveFilterChipsProps {
  filters: CafeFilters;
  onClear: (key: keyof CafeFilters) => void;
}

export function ActiveFilterChips({ filters, onClear }: ActiveFilterChipsProps) {
  const chips = getActiveChips(filters);
  if (chips.length === 0) return null;

  return (
    <div className={styles.strip}>
      {chips.map(chip => (
        <button
          key={chip.key}
          className={styles.chip}
          onClick={() => onClear(chip.key)}
          aria-label={`Remove filter: ${chip.label}`}
        >
          {chip.label}
          <X size={12} />
        </button>
      ))}
    </div>
  );
}
