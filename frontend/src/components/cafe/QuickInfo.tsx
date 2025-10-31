import React from 'react';
import { DollarSign, Users, Coffee } from 'lucide-react';
import { formatPriceRange } from '../../utils';
import styles from './QuickInfo.module.css';

interface QuickInfoProps {
  priceRange?: 1 | 2 | 3 | 4;
  visitors: number;
  visits: number;
}

const QuickInfo: React.FC<QuickInfoProps> = ({ priceRange, visitors, visits }) => {
  return (
    <div className={styles.container}>
      <div className={styles.infoItem}>
        <DollarSign size={18} className={styles.icon} />
        <div className={styles.infoContent}>
          <div className={styles.infoValue}>
            {priceRange ? formatPriceRange(priceRange) : 'N/A'}
          </div>
          <div className={styles.infoLabel}>Price Range</div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.infoItem}>
        <Users size={18} className={styles.icon} />
        <div className={styles.infoContent}>
          <div className={styles.infoValue}>{visitors.toLocaleString()}</div>
          <div className={styles.infoLabel}>Visitors</div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.infoItem}>
        <Coffee size={18} className={styles.icon} />
        <div className={styles.infoContent}>
          <div className={styles.infoValue}>{visits.toLocaleString()}</div>
          <div className={styles.infoLabel}>Visits</div>
        </div>
      </div>
    </div>
  );
};

export default QuickInfo;
