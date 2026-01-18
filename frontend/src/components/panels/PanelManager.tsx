import React from 'react';
import { usePanel } from '../../contexts/PanelContext';
import ActivityPanel from './ActivityPanel';
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
      {activePanel === 'activity' && <ActivityPanel />}
      {activePanel === 'profile' && <ProfilePanel />}
      {activePanel === 'userProfile' && <UserProfilePanel />}
    </div>
  );
};

export default PanelManager;