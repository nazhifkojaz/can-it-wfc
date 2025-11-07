import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type Panel = 'visits' | 'favorites' | 'profile';

interface PanelContextType {
  activePanel: Panel | null;
  showPanel: (panel: Panel) => void;
  hidePanel: () => void;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export const PanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<Panel | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === 'visits' || hash === 'favorites' || hash === 'profile') {
        setActivePanel(hash);
      } else {
        setActivePanel(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const showPanel = (panel: Panel) => {
    window.location.hash = panel;
  };

  const hidePanel = () => {
    window.location.hash = '';
  };

  return (
    <PanelContext.Provider value={{ activePanel, showPanel, hidePanel }}>
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