import React from 'react';
import { TimeOfDayInsight } from '../../../types/insights';
import styles from './insights.module.css';

interface Props {
  timeOfDay: TimeOfDayInsight;
}

const BUCKETS = ['morning', 'afternoon', 'evening'] as const;

const LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

const TimeOfDayChart: React.FC<Props> = ({ timeOfDay }) => {
  const { distribution, wfc_by_bucket } = timeOfDay;

  return (
    <div className={styles.section}>
      <h4 className={styles.subTitle}>When people work here</h4>
      <div className={styles.timeBars}>
        {BUCKETS.map((bucket) => {
          const share = distribution[bucket] ?? 0;
          const pct = Math.round(share * 100);
          const wfc = wfc_by_bucket?.[bucket];
          return (
            <div key={bucket} className={styles.timeBarRow}>
              <span className={styles.timeBarLabel}>{LABELS[bucket]}</span>
              <div className={styles.timeBarTrack}>
                <div
                  className={styles.timeBarFill}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={styles.timeBarPct}>{pct}%</span>
              {wfc !== undefined && (
                <span className={styles.timeBarWfc}>WFC {wfc.toFixed(1)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeOfDayChart;
