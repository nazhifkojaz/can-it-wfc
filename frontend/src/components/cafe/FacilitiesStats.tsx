import React from 'react';
import { Cigarette, Home, Building2, TreePine } from 'lucide-react';
import { FacilityStats, FacilityOption } from '../../types';
import styles from './FacilitiesStats.module.css';

interface FacilitiesStatsProps {
  stats: FacilityStats;
}

interface FacilityRow {
  key: keyof FacilityStats;
  label: string;
  icon: React.ReactNode;
}

const FACILITY_ROWS: FacilityRow[] = [
  { key: 'smoking_area', label: 'Smoking area', icon: <Cigarette size={18} /> },
  { key: 'prayer_room', label: 'Prayer room', icon: <Home size={18} /> },
  { key: 'indoor_seating', label: 'Indoor seating', icon: <Building2 size={18} /> },
  { key: 'outdoor_seating', label: 'Outdoor seating', icon: <TreePine size={18} /> },
];

const FacilitiesStats: React.FC<FacilitiesStatsProps> = ({ stats }) => {
  const totalReviewers = stats.smoking_area?.total_reviewers || 0;

  if (totalReviewers === 0) {
    return null;
  }

  return (
    <div className={styles.facilitiesStats}>
      <h3 className={styles.title}>Facilities</h3>

      <div className={styles.facilityList}>
        {FACILITY_ROWS.map((row) => {
          const data: FacilityOption | undefined = stats[row.key];
          if (!data) return null;

          return (
            <div key={row.key} className={styles.facilityRow}>
              <div className={styles.facilityLabel}>
                {row.icon}
                <span>{row.label}</span>
              </div>
              <div className={styles.facilityMentions}>
                {data.mentions}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.facilityFooter}>
        (from {totalReviewers} {totalReviewers === 1 ? 'reviewer' : 'reviewers'})
      </div>
    </div>
  );
};

export default FacilitiesStats;
