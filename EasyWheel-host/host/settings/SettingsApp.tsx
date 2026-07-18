import React from 'react';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { Sidebar } from './components/layout/Sidebar';
import { GeneralPage } from './pages/GeneralPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { ActionsPage } from './pages/ActionsPage';
import { AppearancePage } from './pages/AppearancePage';
import { AboutPage } from './pages/AboutPage';
import '../styles/settings.css';

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
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-100 select-none">
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
    <ConfigProvider>
      <MainLayout />
    </ConfigProvider>
  );
}
