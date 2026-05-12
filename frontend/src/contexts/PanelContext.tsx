import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { trackPanelOpened } from '../lib/analytics';

type Panel = 'discover' | 'profile' | 'userProfile';
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
      const validPanels: Panel[] = ['discover', 'profile', 'userProfile'];

      const [panelType, ...dataParts] = hash.split(':');
      const encodedData = dataParts.join(':');

      if (validPanels.includes(panelType as Panel)) {
        setActivePanel(panelType as Panel);

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
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const showPanel = (panel: Panel, data?: PanelData) => {
    if (activePanel !== panel) {
      const analyticsPanel: 'discover' | 'profile' | 'user_profile' =
        panel === 'userProfile' ? 'user_profile' :
        panel as 'discover' | 'profile';

      trackPanelOpened({ panel: analyticsPanel });
    }

    if (panel === 'userProfile' && data?.username) {
      window.location.hash = `${panel}:${encodeURIComponent(data.username)}`;
    } else {
      window.location.hash = panel;
    }
  };

  const hidePanel = () => {
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
