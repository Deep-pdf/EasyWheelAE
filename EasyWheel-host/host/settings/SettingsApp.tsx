import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { Sidebar } from './components/layout/Sidebar';
import { GeneralPage } from './pages/GeneralPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { ActionsPage } from './pages/ActionsPage';
import { AppearancePage } from './pages/AppearancePage';
import { AboutPage } from './pages/AboutPage';
import '../styles/settings.css';

// ---------------------------------------------------------------------------
// Theme context — shared with GeneralPage theme selector
// ---------------------------------------------------------------------------

export type ThemeValue = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: ThemeValue;
  setTheme: (t: ThemeValue) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [theme, setThemeState] = useState<ThemeValue>(() => {
    try {
      return (localStorage.getItem('ew-theme') as ThemeValue) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const setTheme = (t: ThemeValue) => {
    setThemeState(t);
    try { localStorage.setItem('ew-theme', t); } catch { /* noop */ }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function MainLayout(): React.JSX.Element {
  const { activePage } = useConfig();

  const renderPage = () => {
    switch (activePage) {
      case 'general':
        return <GeneralPage />;
      case 'profiles':
        return <ProfilesPage />;
      case 'actions':
        return <ActionsPage />;
      case 'appearance':
        return <AppearancePage />;
      case 'about':
        return <AboutPage />;
      default:
        return <GeneralPage />;
    }
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden select-none"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* Sidebar Panel */}
      <Sidebar />

      {/* Dynamic Content Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {renderPage()}
      </div>
    </div>
  );
}

export default function SettingsApp(): React.JSX.Element {
  return (
    <ThemeProvider>
      <ConfigProvider>
        <MainLayout />
      </ConfigProvider>
    </ThemeProvider>
  );
}
