import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { trackPanelOpened } from '../lib/analytics';

type Panel = 'activity' | 'profile' | 'userProfile';
type PanelData = { username: string } | null;

interface PanelContextType {
  activePanel: Panel | null;
  showPanel: (panel: Panel, data?: PanelData) => void;
  hidePanel: () => void;
  panelData: PanelData;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export const PanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [panelData, setPanelData] = useState<PanelData>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      const validPanels: Panel[] = ['activity', 'profile', 'userProfile'];

      // Check if hash contains encoded data (e.g., userProfile:username)
      const [panelType, ...dataParts] = hash.split(':');
      const encodedData = dataParts.join(':'); // Rejoin in case username contains ':'

      if (validPanels.includes(panelType as Panel)) {
        const newPanel = panelType as Panel;

        // Track panel opened when changing via hash (but not on initial load)
        if (activePanel !== newPanel) {
          const analyticsPanel: 'activity' | 'profile' | 'user_profile' =
            newPanel === 'userProfile' ? 'user_profile' :
            newPanel as 'activity' | 'profile';

          trackPanelOpened({ panel: analyticsPanel });
        }

        setActivePanel(newPanel);

        // For userProfile, extract username from hash
        if (panelType === 'userProfile' && encodedData) {
          setPanelData({ username: decodeURIComponent(encodedData) });
        } else {
          setPanelData(null);
        }
      } else {
        setActivePanel(null);
        setPanelData(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [activePanel]);

  const showPanel = (panel: Panel, data?: PanelData) => {
    // Only track if opening a different panel
    if (activePanel !== panel) {
      // Map panel types to analytics panel types
      const analyticsPanel: 'activity' | 'profile' | 'user_profile' =
        panel === 'userProfile' ? 'user_profile' :
        panel as 'activity' | 'profile';

      trackPanelOpened({ panel: analyticsPanel });
    }

    setPanelData(data || null);

    // For userProfile, encode username in hash for persistence on refresh
    if (panel === 'userProfile' && data?.username) {
      window.location.hash = `${panel}:${encodeURIComponent(data.username)}`;
    } else {
      window.location.hash = panel;
    }
  };

  const hidePanel = () => {
    setPanelData(null);
    window.location.hash = '';
  };

  return (
    <PanelContext.Provider value={{ activePanel, showPanel, hidePanel, panelData }}>
      {children}
    </PanelContext.Provider>
  );
};

export const usePanel = () => {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error('usePanel must be used within a PanelProvider');
  }
  return context;
};