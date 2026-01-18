import React from 'react';
import { Activity, User } from 'lucide-react';
import { usePanel } from '../../contexts/PanelContext';
import './BottomNav.css';

interface NavItem {
  panel: 'activity' | 'profile';
  label: string;
  icon: React.ReactNode;
}

const BottomNav: React.FC = () => {
  const { activePanel, showPanel } = usePanel();

  const navItems: NavItem[] = [
    {
      panel: 'activity',
      label: 'Activity',
      icon: <Activity size={24} />,
    },
    {
      panel: 'profile',
      label: 'Profile',
      icon: <User size={24} />,
    },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = activePanel === item.panel;
        return (
          <button
            key={item.panel}
            onClick={() => showPanel(item.panel)}
            className={`nav-item ${active ? 'active' : ''}`}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
