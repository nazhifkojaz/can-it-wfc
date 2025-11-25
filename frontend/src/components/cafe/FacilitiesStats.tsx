import React from 'react';
import { Cigarette, Home } from 'lucide-react';
import { FacilityStats } from '../../types';
import styles from './FacilitiesStats.module.css';

interface FacilitiesStatsProps {
  stats: FacilityStats;
}

const FacilitiesStats: React.FC<FacilitiesStatsProps> = ({ stats }) => {
  const renderFacilityBar = (
    icon: React.ReactNode,
    label: string,
    data: { yes: number; no: number; unknown: number; yes_percentage: number; no_percentage: number; unknown_percentage: number }
  ) => {
    const total = data.yes + data.no + data.unknown;

    if (total === 0) {
      return null;
    }

    return (
      <div className={styles.facilityItem}>
        <div className={styles.facilityHeader}>
          <div className={styles.facilityLabel}>
            {icon}
            <span>{label}</span>
          </div>
          <div className={styles.facilityTotal}>
            {total} {total === 1 ? 'response' : 'responses'}
          </div>
        </div>

        <div className={styles.facilityBar}>
          {data.yes > 0 && (
            <div
              className={`${styles.barSegment} ${styles.barYes}`}
              style={{ width: `${data.yes_percentage}%` }}
              title={`Yes: ${data.yes} (${data.yes_percentage}%)`}
            />
          )}
          {data.no > 0 && (
            <div
              className={`${styles.barSegment} ${styles.barNo}`}
              style={{ width: `${data.no_percentage}%` }}
              title={`No: ${data.no} (${data.no_percentage}%)`}
            />
          )}
          {data.unknown > 0 && (
            <div
              className={`${styles.barSegment} ${styles.barUnknown}`}
              style={{ width: `${data.unknown_percentage}%` }}
              title={`Don't know: ${data.unknown} (${data.unknown_percentage}%)`}
            />
          )}
        </div>

        <div className={styles.facilityLegend}>
          {data.yes > 0 && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotYes}`} />
              <span>Yes: {data.yes} ({data.yes_percentage}%)</span>
            </div>
          )}
          {data.no > 0 && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotNo}`} />
              <span>No: {data.no} ({data.no_percentage}%)</span>
            </div>
          )}
          {data.unknown > 0 && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendDot} ${styles.legendDotUnknown}`} />
              <span>Don't know: {data.unknown} ({data.unknown_percentage}%)</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.facilitiesStats}>
      <h3 className={styles.title}>Facilities</h3>

      {renderFacilityBar(
        <Cigarette size={18} />,
        'Smoking Area',
        stats.smoking_area
      )}

      {renderFacilityBar(
        <Home size={18} />,
        'Prayer Room',
        stats.prayer_room
      )}
    </div>
  );
};

export default FacilitiesStats;
