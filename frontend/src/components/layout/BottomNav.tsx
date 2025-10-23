import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map, ClipboardList, Star, User } from 'lucide-react';
import './BottomNav.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      path: '/map',
      label: 'Map',
      icon: <Map size={24} />,
    },
    {
      path: '/visits',
      label: 'Visits',
      icon: <ClipboardList size={24} />,
    },
    {
      path: '/favorites',
      label: 'Favorites',
      icon: <Star size={24} />,
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: <User size={24} />,
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${active ? 'active' : ''}`}
          >
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;