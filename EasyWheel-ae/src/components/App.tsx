import React, { useState, useEffect } from 'react';
import { Header } from './Header/Header';
import { StatusBar } from './StatusBar/StatusBar';
import { WheelPreview } from './WheelPreview/WheelPreview';
import { CommandPicker } from './CommandPicker/CommandPicker';
import { Profile } from '../types/Profile';
import { Sector } from '../types/Sector';
import { Command } from '../types/Command';
import { MockCommandRegistry } from '../services/MockCommandRegistry';
import { connectionManager } from '../bridge/connection_manager';

const INITIAL_SECTORS: Sector[] = Array.from({ length: 8 }, (_, i) => ({
  number: i + 1,
  assignedCommandId: i === 0 ? 'pre_compose' : i === 1 ? 'easy_ease' : null
}));

const INITIAL_PROFILE: Profile = {
  name: 'AE Default Profile',
  application: 'Adobe After Effects',
  sectorCount: 8,
  sectors: INITIAL_SECTORS,
  lastModified: new Date().toLocaleTimeString()
};

export const App: React.FC = () => {
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [selectedSectorIndex, setSelectedSectorIndex] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastModifiedStr, setLastModifiedStr] = useState(INITIAL_PROFILE.lastModified);

  // Poll connection manager status
  useEffect(() => {
    const updateStatus = () => {
      const status = connectionManager.getStatus();
      setConnectionStatus(status);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses inside inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (isPickerOpen) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSectorIndex(prev => {
          if (prev === null) return 0;
          return (prev + 1) % 8;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSectorIndex(prev => {
          if (prev === null) return 7;
          return (prev - 1 + 8) % 8;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSectorIndex !== null) {
          setIsPickerOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedSectorIndex, isPickerOpen]);

  const handleSelectSector = (index: number) => {
    setSelectedSectorIndex(index);
  };

  const handleAssignCommand = (command: Command) => {
    if (selectedSectorIndex === null) return;

    const updatedSectors = profile.sectors.map((sec, idx) => {
      if (idx === selectedSectorIndex) {
        return { ...sec, assignedCommandId: command.id };
      }
      return sec;
    });

    const now = new Date().toLocaleTimeString();
    setProfile(prev => ({
      ...prev,
      sectors: updatedSectors
    }));
    setLastModifiedStr(now);
    setIsPickerOpen(false);
  };

  const handleClearCommand = () => {
    if (selectedSectorIndex === null) return;

    const updatedSectors = profile.sectors.map((sec, idx) => {
      if (idx === selectedSectorIndex) {
        return { ...sec, assignedCommandId: null };
      }
      return sec;
    });

    const now = new Date().toLocaleTimeString();
    setProfile(prev => ({
      ...prev,
      sectors: updatedSectors
    }));
    setLastModifiedStr(now);
  };

  const handleResetSector = () => {
    if (selectedSectorIndex === null) return;

    // Reset to mock default value
    const defaultSec = INITIAL_PROFILE.sectors[selectedSectorIndex];
    const updatedSectors = profile.sectors.map((sec, idx) => {
      if (idx === selectedSectorIndex) {
        return { ...sec, assignedCommandId: defaultSec.assignedCommandId };
      }
      return sec;
    });

    const now = new Date().toLocaleTimeString();
    setProfile(prev => ({
      ...prev,
      sectors: updatedSectors
    }));
    setLastModifiedStr(now);
  };

  const handleRefresh = () => {
    setProfile({
      ...INITIAL_PROFILE,
      lastModified: new Date().toLocaleTimeString()
    });
    setLastModifiedStr(new Date().toLocaleTimeString());
    setSelectedSectorIndex(null);
  };

  // Get currently selected command details
  const selectedSector = selectedSectorIndex !== null ? profile.sectors[selectedSectorIndex] : null;

  const assignedCount = profile.sectors.filter(sec => sec.assignedCommandId !== null).length;

  return (
    <div className="panel-layout">
      <Header
        connectionStatus={connectionStatus}
        profileName={profile.name}
        version="1.0.0"
      />

      <main className="panel-main-content">
        <div className="panel-left-pane">
          <details className="profile-info-details">
            <summary className="section-title">
              <span>Profile Info</span>
              <span className="summary-stats">({profile.name} • {assignedCount}/{profile.sectorCount})</span>
            </summary>
            <div className="profile-meta-grid">
              <div className="profile-meta-row">
                <span className="profile-meta-lbl">Profile Name</span>
                <span className="profile-meta-val">{profile.name}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-lbl">Application</span>
                <span className="profile-meta-val">{profile.application}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-lbl">Number of Sectors</span>
                <span className="profile-meta-val">{profile.sectorCount}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-lbl">Assigned Commands</span>
                <span className="profile-meta-val highlight-val">{assignedCount} / {profile.sectorCount}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-lbl">Last Modified</span>
                <span className="profile-meta-val muted-val">{lastModifiedStr}</span>
              </div>
            </div>
            <div className="profile-actions">
              <button type="button" className="profile-btn btn-secondary" onClick={handleRefresh}>
                Refresh
              </button>
              <button type="button" className="profile-btn btn-secondary" disabled title="Import (Disabled - Phase 2)">
                Import
              </button>
              <button type="button" className="profile-btn btn-secondary" disabled title="Export (Disabled - Phase 2)">
                Export
              </button>
            </div>
          </details>

          {isPickerOpen ? (
            <CommandPicker
              isOpen={isPickerOpen}
              onClose={() => setIsPickerOpen(false)}
              onSelectCommand={handleAssignCommand}
              selectedCommandId={selectedSector?.assignedCommandId || null}
            />
          ) : (
            <WheelPreview
              sectors={profile.sectors}
              selectedSectorIndex={selectedSectorIndex}
              onSelectSector={handleSelectSector}
              commands={MockCommandRegistry.getAll()}
              onAssignClick={() => setIsPickerOpen(true)}
              onClearClick={handleClearCommand}
              onResetClick={handleResetSector}
            />
          )}
        </div>
      </main>

      <StatusBar
        connectionStatus={connectionStatus}
        bridgeVersion="1.0.0"
        registryVersion="1.2.0"
        lastRefresh={lastModifiedStr}
      />

      {/* CommandPicker is now rendered inline above */}
    </div>
  );
};
