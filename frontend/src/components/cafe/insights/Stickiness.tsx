import React from 'react';
import { Repeat } from 'lucide-react';
import { StickinessInsight, StickinessLabel } from '../../../types/insights';
import styles from './insights.module.css';

interface Props {
  stickiness: StickinessInsight;
}

const HEADLINES: Record<StickinessLabel, string> = {
  beloved: 'Beloved by regulars',
  has_regulars: 'Has its regulars',
  discovery_phase: 'Newly discovered',
  steady_mix: 'Steady mix',
};

const CADENCE_MAX_FOR_DISPLAY = 21;

const buildSubline = (s: StickinessInsight): string => {
  const parts: string[] = [];

  if (s.label === 'beloved' || s.label === 'has_regulars') {
    parts.push(`${s.active_regulars} of ${s.unique_visitors} visitors come back`);
  } else if (s.label === 'discovery_phase') {
    parts.push('Most visits are first-time — too early to call');
  } else {
    parts.push('Roughly half repeat, half new');
  }

  if (
    (s.label === 'beloved' || s.label === 'has_regulars') &&
    s.cadence_days !== undefined &&
    s.cadence_days <= CADENCE_MAX_FOR_DISPLAY
  ) {
    parts.push(`typical regular returns every ~${s.cadence_days} days`);
  }

  return parts.join(' · ');
};

const Stickiness: React.FC<Props> = ({ stickiness }) => {
  return (
    <div className={styles.section}>
      <div className={styles.stickinessRow}>
        <Repeat size={16} className={styles.stickinessIcon} />
        <div className={styles.stickinessContent}>
          <div className={styles.stickinessHeadline}>
            {HEADLINES[stickiness.label]}
          </div>
          <div className={styles.stickinessSubline}>
            {buildSubline(stickiness)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stickiness;
