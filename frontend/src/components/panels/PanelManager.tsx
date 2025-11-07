import React from 'react';
import { usePanel } from '../../contexts/PanelContext';
import VisitsPanel from './VisitsPanel';
import FavoritesPanel from './FavoritesPanel';
import ProfilePanel from './ProfilePanel';
import './PanelManager.css';

const PanelManager: React.FC = () => {
  const { activePanel } = usePanel();

  if (!activePanel) {
    return null;
  }

  return (
    <div className="panel-manager">
      {activePanel === 'visits' && <VisitsPanel />}
      {activePanel === 'favorites' && <FavoritesPanel />}
      {activePanel === 'profile' && <ProfilePanel />}
    </div>
  );
};

export default PanelManager;