import React from 'react';
import { GoogleDeltaInsight } from '../../../types/insights';
import styles from './insights.module.css';

interface Props {
  delta: GoogleDeltaInsight;
}

const GoogleDelta: React.FC<Props> = ({ delta }) => {
  const absDelta = Math.abs(delta.delta);
  const roughlyEqual = absDelta < 0.3;

  return (
    <div className={styles.section}>
      <p className={styles.deltaText}>
        {roughlyEqual ? (
          <>
            People on this platform rate this{' '}
            <strong>{delta.wfc.toFixed(1)}</strong> — roughly the same as Google&apos;s{' '}
            <strong>{delta.google.toFixed(1)}</strong>
          </>
        ) : delta.delta > 0 ? (
          <>
            People on this platform rate this{' '}
            <strong>{delta.wfc.toFixed(1)}</strong> — <strong>+{absDelta.toFixed(1)} points</strong> above Google&apos;s{' '}
            <strong>{delta.google.toFixed(1)}</strong>
          </>
        ) : (
          <>
            People on this platform rate this{' '}
            <strong>{delta.wfc.toFixed(1)}</strong> — <strong>{absDelta.toFixed(1)} points</strong> below Google&apos;s{' '}
            <strong>{delta.google.toFixed(1)}</strong>
          </>
        )}
      </p>
    </div>
  );
};

export default GoogleDelta;
