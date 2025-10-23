import React from 'react';
import BottomNav from './BottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ 
  children, 
  showBottomNav = true 
}) => {
  return (
    <div className="mobile-layout">
      <main className="mobile-content">
        {children}
      </main>
      
      {/* Always show bottom nav when showBottomNav is true */}
      {showBottomNav && <BottomNav />}

      <style>{`
        .mobile-layout {
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mobile-content {
          flex: 1;
          overflow: hidden;
          padding-bottom: ${showBottomNav ? 'var(--bottom-nav-height)' : '0'};
          position: relative;
        }

        /* Desktop adjustments */
        @media (min-width: 1024px) {
          .mobile-content {
            padding-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileLayout;