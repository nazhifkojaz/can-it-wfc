import { SlidersHorizontal } from 'lucide-react';
import styles from './FilterPanelTrigger.module.css';

interface FilterPanelTriggerProps {
  activeCount: number;
  onClick: () => void;
}

export function FilterPanelTrigger({ activeCount, onClick }: FilterPanelTriggerProps) {
  return (
    <button
      className={`${styles.trigger} ${activeCount > 0 ? styles.triggerActive : ''}`}
      onClick={onClick}
      aria-label={`Filters${activeCount > 0 ? ` (${activeCount} active)` : ''}`}
    >
      <SlidersHorizontal size={16} />
      <span>Filters</span>
      {activeCount > 0 && (
        <span className={styles.badge}>{activeCount}</span>
      )}
    </button>
  );
}
