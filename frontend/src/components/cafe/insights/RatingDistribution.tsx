import React from 'react';
import { RatingDistributionInsight } from '../../../types/insights';
import styles from './insights.module.css';

interface Props {
  distribution: RatingDistributionInsight;
}

const buildSentence = (d: RatingDistributionInsight): React.ReactNode => {
  const lowCount = d.distribution['1'] + d.distribution['2'];
  const highCount = d.distribution['4'] + d.distribution['5'];
  const highShare = Math.round(d.top_share * 100);

  if (d.polarized) {
    return (
      <>
        <strong>Polarizing</strong> — {highCount} of {d.n} reviews are 4–5★, {lowCount} are 1–2★
      </>
    );
  }

  if (d.consistency === 'polarizing') {
    return <>Mixed reactions — ratings span the scale</>;
  }

  if (d.consistency === 'mixed') {
    return (
      <>
        Mostly positive — <strong>{highShare}%</strong> rate it 4★ or higher
      </>
    );
  }

  return (
    <>
      <strong>Consistently rated</strong> — {highShare}% rate it 4★ or higher
    </>
  );
};

const RatingDistribution: React.FC<Props> = ({ distribution }) => {
  return (
    <div className={styles.section}>
      <h4 className={styles.subTitle}>How people rate this</h4>
      <p className={styles.distributionText}>
        {buildSentence(distribution)}{' '}
        <span className={styles.muted}>· {distribution.n} reviews</span>
      </p>
    </div>
  );
};

export default RatingDistribution;
