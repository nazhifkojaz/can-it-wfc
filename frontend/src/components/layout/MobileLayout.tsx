import React from 'react';
import BottomNav from './BottomNav';
import styles from './MobileLayout.module.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showBottomNav = true
}) => {
  return (
    <div className={styles.mobileLayout}>
      <main className={`${styles.mobileContent} ${showBottomNav ? styles.withBottomNav : ''}`}>
        {children}
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;