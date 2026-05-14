import React from 'react';
import { usePanel } from '../../contexts/PanelContext';
import DiscoverPanel from '../discover/DiscoverPanel';
import ProfilePanel from './ProfilePanel';
import UserProfilePanel from './UserProfilePanel';
import './PanelManager.css';

const PanelManager: React.FC = () => {
  const { activePanel } = usePanel();

  if (!activePanel) {
    return null;
  }

  return (
    <div className="panel-manager">
      {activePanel === 'discover' && <DiscoverPanel />}
      {activePanel === 'profile' && <ProfilePanel />}
      {activePanel === 'userProfile' && <UserProfilePanel />}
    </div>
  );
};

export default PanelManager;