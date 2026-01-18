import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type Panel = 'activity' | 'profile' | 'visits' | 'favorites' | 'userProfile';

interface PanelContextType {
  activePanel: Panel | null;
  showPanel: (panel: Panel, data?: any) => void;
  hidePanel: () => void;
  panelData: any; // For passing data to panels (e.g., username for userProfile)
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export const PanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [panelData, setPanelData] = useState<any>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      const validPanels: Panel[] = ['activity', 'profile', 'visits', 'favorites', 'userProfile'];

      // Check if hash contains encoded data (e.g., userProfile:username)
      const [panelType, ...dataParts] = hash.split(':');
      const encodedData = dataParts.join(':'); // Rejoin in case username contains ':'

      if (validPanels.includes(panelType as Panel)) {
        setActivePanel(panelType as Panel);

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
  }, []);

  const showPanel = (panel: Panel, data?: any) => {
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