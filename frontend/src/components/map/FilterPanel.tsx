import { X, RotateCcw } from 'lucide-react';
import { CafeFilters } from '../../types/filters';
import { PRICE_RANGE_LABELS } from '../../config/constants';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  filters: CafeFilters;
  setFilter: <K extends keyof CafeFilters>(key: K, value: CafeFilters[K]) => void;
  resetAll: () => void;
  onApply: (filters: CafeFilters) => void;
  onClose: () => void;
}

const MIN_REVIEWS_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 3, label: '3+' },
  { value: 5, label: '5+' },
  { value: 10, label: '10+' },
];

const PRICE_OPTIONS = Object.entries(PRICE_RANGE_LABELS).map(([v, l]) => ({ value: Number(v), label: l }));

export function FilterPanel({
  filters,
  setFilter,
  resetAll,
  onApply,
  onClose,
}: FilterPanelProps) {
  const togglePrice = (p: number) => {
    const current = filters.price ?? [];
    const next = current.includes(p) ? current.filter(v => v !== p) : [...current, p];
    setFilter('price', next.length > 0 ? next : undefined);
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-label="Filter cafes">
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Filters</span>
          <div className={styles.headerActions}>
            <button className={styles.resetBtn} onClick={resetAll}>
              <RotateCcw size={14} />
              Reset
            </button>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close filters">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Rating Filters */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Rating Minimums</h3>
            <RatingRow
              label="WiFi Quality"
              value={filters.min_wifi}
              onChange={v => setFilter('min_wifi', v)}
            />
            <RatingRow
              label="Power Outlets"
              value={filters.min_power}
              onChange={v => setFilter('min_power', v)}
            />
            <RatingRow
              label="Seating Comfort"
              value={filters.min_seating}
              onChange={v => setFilter('min_seating', v)}
            />
            <RatingRow
              label="Overall WFC"
              value={filters.min_wfc}
              onChange={v => setFilter('min_wfc', v)}
            />
            <RatingRow
              label="Max Noise"
              value={filters.max_noise}
              onChange={v => setFilter('max_noise', v)}
              hint="lower = quieter"
            />
          </section>

          <div className={styles.divider} />

          {/* Price Range */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Price Range</h3>
            <div className={styles.pillRow}>
              {PRICE_OPTIONS.map(opt => {
                const selected = filters.price?.includes(opt.value) ?? false;
                return (
                  <button
                    key={opt.value}
                    className={`${styles.pill} ${selected ? styles.pillSelected : ''}`}
                    onClick={() => togglePrice(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          <div className={styles.divider} />

          {/* Min Reviews */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Min Reviews</h3>
            <div className={styles.pillRow}>
              {MIN_REVIEWS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.pill} ${filters.min_reviews === opt.value ? styles.pillSelected : ''}`}
                  onClick={() => setFilter('min_reviews', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <div className={styles.divider} />

          {/* Options */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Options</h3>
            <Toggle
              label="Hide Closed Cafes"
              checked={filters.hide_closed}
              onChange={v => setFilter('hide_closed', v)}
            />
            <Toggle
              label="Verified Only"
              checked={filters.verified}
              onChange={v => setFilter('verified', v)}
            />
            <Toggle
              label="Include Unregistered Cafes"
              checked={filters.include_unregistered}
              onChange={v => setFilter('include_unregistered', v)}
            />
          </section>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.applyBtn} onClick={() => { onApply(filters); onClose(); }}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value?: number;
  onChange: (v?: number) => void;
  hint?: string;
}) {
  return (
    <div className={styles.filterRow}>
      <div className={styles.filterLabelGroup}>
        <span className={styles.filterLabel}>{label}</span>
        {hint && <span className={styles.filterHint}>({hint})</span>}
      </div>
      <div className={styles.ratingBtns}>
        <button
          className={styles.clearRating}
          onClick={() => onChange(undefined)}
          aria-label={`Clear ${label} filter`}
          style={{ visibility: value !== undefined ? 'visible' : 'hidden' }}
        >
          <X size={12} />
        </button>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            className={`${styles.ratingBtn} ${value === n ? styles.ratingBtnActive : ''}`}
            onClick={() => onChange(value === n ? undefined : n)}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <div
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <span className={styles.toggleThumb} />
      </div>
    </label>
  );
}
