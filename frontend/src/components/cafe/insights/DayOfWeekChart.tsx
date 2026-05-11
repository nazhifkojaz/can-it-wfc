import React from 'react';
import { DayKey, DayOfWeekInsight, DayOfWeekLabel } from '../../../types/insights';
import styles from './insights.module.css';

interface Props {
  dayOfWeek: DayOfWeekInsight;
}

const HEADLINES: Record<DayOfWeekLabel, string> = {
  weekday_heavy: 'Mostly a weekday spot',
  weekend_heavy: 'Busy on weekends',
  balanced: 'Active throughout the week',
};

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_INITIALS: Record<DayKey, string> = {
  mon: 'M',
  tue: 'T',
  wed: 'W',
  thu: 'T',
  fri: 'F',
  sat: 'S',
  sun: 'S',
};

const DayOfWeekChart: React.FC<Props> = ({ dayOfWeek }) => {
  const { weekday_share, weekend_share, by_day, label } = dayOfWeek;

  return (
    <div className={styles.section}>
      <h4 className={styles.subTitle}>{HEADLINES[label]}</h4>

      {by_day ? (
        <div className={styles.dowDetailed}>
          {(() => {
            const maxShare = Math.max(...DAY_ORDER.map(d => by_day[d] ?? 0));
            return DAY_ORDER.map((day) => {
              const share = by_day[day] ?? 0;
              const isWeekend = day === 'sat' || day === 'sun';
              const barPct = maxShare > 0 ? Math.max((share / maxShare) * 100, 2) : 2;
              return (
                <div key={day} className={styles.dowDayCol}>
                  <div className={styles.dowDayBarTrack}>
                    <div
                      className={`${styles.dowDayBarFill} ${isWeekend ? styles.dowDayBarWeekend : ''}`}
                      style={{ height: `${barPct}%` }}
                    />
                  </div>
                  <span className={styles.dowDayLabel}>{DAY_INITIALS[day]}</span>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className={styles.timeBars}>
          <div className={styles.timeBarRow}>
            <span className={styles.timeBarLabel}>Mon–Fri</span>
            <div className={styles.timeBarTrack}>
              <div
                className={styles.timeBarFill}
                style={{ width: `${Math.round(weekday_share * 100)}%` }}
              />
            </div>
            <span className={styles.timeBarPct}>
              {Math.round(weekday_share * 100)}%
            </span>
          </div>
          <div className={styles.timeBarRow}>
            <span className={styles.timeBarLabel}>Sat–Sun</span>
            <div className={styles.timeBarTrack}>
              <div
                className={styles.timeBarFill}
                style={{ width: `${Math.round(weekend_share * 100)}%` }}
              />
            </div>
            <span className={styles.timeBarPct}>
              {Math.round(weekend_share * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayOfWeekChart;
