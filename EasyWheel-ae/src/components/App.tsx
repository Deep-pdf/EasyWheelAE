import React, { useState, useEffect } from 'react';
import { Header } from './Header/Header';
import { StatusBar } from './StatusBar/StatusBar';
import { WheelPreview } from './WheelPreview/WheelPreview';
import { CommandPicker } from './CommandPicker/CommandPicker';
import { Profile } from '../types/Profile';
import { Command } from '../types/Command';
import { connectionManager } from '../bridge/connection_manager';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [syncedProfile, setSyncedProfile] = useState<Profile | null>(null);
  const [availableCommands, setAvailableCommands] = useState<Command[]>([]);
  const [categories, setCategories] = useState<string[]>(['All', 'Favorites']);
  const [registryVersion, setRegistryVersion] = useState<string>('1.2.0');
  const [selectedSectorIndex, setSelectedSectorIndex] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [lastModifiedStr, setLastModifiedStr] = useState<string>('Never');
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  const [conflictProfile, setConflictProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

  // Listen for sync messages from connection manager
  useEffect(() => {
    const handleMessage = (msg: any) => {
      console.log('[AE Panel] Received message type:', msg.type);
      if (msg.type === 'PROFILE_DATA') {
        const p: Profile = msg.profile;
        setProfile(p);
        setSyncedProfile(p);
        setLastModifiedStr(p.lastModified || new Date().toLocaleTimeString());
        setAvailableCommands(msg.availableCommands || []);
        if (msg.categories) {
          setCategories(['All', 'Favorites', ...msg.categories]);
        }
        if (msg.registryVersion) {
          setRegistryVersion(msg.registryVersion);
        }
        setHasPendingChanges(false);
        setConflictProfile(null);
        setIsSaving(false);
      } else if (msg.type === 'PROFILE_UPDATED') {
        const p: Profile = msg.profile;
        if (isSaving) {
          // Confirming our own save
          setProfile(p);
          setSyncedProfile(p);
          setLastModifiedStr(p.lastModified || new Date().toLocaleTimeString());
          setHasPendingChanges(false);
          setIsSaving(false);
        } else if (hasPendingChanges) {
          // Conflict: another client updated the profile while we have unsaved changes
          console.warn('[AE Panel] Conflict detected!');
          setConflictProfile(p);
        } else {
          // Auto-sync other client's changes
          setProfile(p);
          setSyncedProfile(p);
          setLastModifiedStr(p.lastModified || new Date().toLocaleTimeString());
        }
      } else if (msg.type === 'COMMAND_REGISTRY_UPDATED') {
        // Request fresh data from Host
        connectionManager.send({
          type: 'GET_PROFILE',
          application: 'After Effects'
        });
      }
    };

    connectionManager.addMessageListener(handleMessage);
    return () => connectionManager.removeMessageListener(handleMessage);
  }, [isSaving, hasPendingChanges]);

  // Request profile on reconnection
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      connectionManager.send({
        type: 'GET_PROFILE',
        application: 'After Effects'
      });
    } else {
      // Clear profile when disconnected so waiting screen is shown
      setProfile(null);
      setSyncedProfile(null);
      setHasPendingChanges(false);
      setConflictProfile(null);
    }
  }, [connectionStatus]);

  // Global keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (isPickerOpen || !profile) return;

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
  }, [selectedSectorIndex, isPickerOpen, profile]);

  const handleSelectSector = (index: number) => {
    setSelectedSectorIndex(index);
  };

  const handleAssignCommand = (command: Command) => {
    if (selectedSectorIndex === null || !profile) return;

    const updatedSectors = profile.sectors.map((sec, idx) => {
      if (idx === selectedSectorIndex) {
        return { ...sec, assignedCommandId: command.id };
      }
      return sec;
    });

    setProfile(prev => {
      if (!prev) return null;
      return { ...prev, sectors: updatedSectors };
    });
    setHasPendingChanges(true);
    setIsPickerOpen(false);
  };

  const handleClearCommand = () => {
    if (selectedSectorIndex === null || !profile) return;

    const updatedSectors = profile.sectors.map((sec, idx) => {
      if (idx === selectedSectorIndex) {
        return { ...sec, assignedCommandId: null };
      }
      return sec;
    });

    setProfile(prev => {
      if (!prev) return null;
      return { ...prev, sectors: updatedSectors };
    });
    setHasPendingChanges(true);
  };

  const handleResetSector = () => {
    if (selectedSectorIndex === null || !profile || !syncedProfile) return;

    const originalSec = syncedProfile.sectors[selectedSectorIndex];
    const updatedSectors = profile.sectors.map((sec, idx) => {
      if (idx === selectedSectorIndex) {
        return { ...sec, assignedCommandId: originalSec.assignedCommandId };
      }
      return sec;
    });

    setProfile(prev => {
      if (!prev) return null;
      return { ...prev, sectors: updatedSectors };
    });

    const diff = updatedSectors.some((sec, idx) => sec.assignedCommandId !== syncedProfile.sectors[idx].assignedCommandId);
    setHasPendingChanges(diff);
  };

  const handleSaveChanges = () => {
    if (!profile) return;
    setIsSaving(true);
    connectionManager.send({
      type: 'UPDATE_PROFILE',
      application: 'after_effects',
      profile: profile
    });
  };

  const handleDiscardChanges = () => {
    if (!syncedProfile) return;
    setProfile(syncedProfile);
    setHasPendingChanges(false);
  };

  const handleResolveReload = () => {
    if (!conflictProfile) return;
    setProfile(conflictProfile);
    setSyncedProfile(conflictProfile);
    setLastModifiedStr(conflictProfile.lastModified || new Date().toLocaleTimeString());
    setConflictProfile(null);
    setHasPendingChanges(false);
  };

  const handleResolveKeepMine = () => {
    if (!conflictProfile || !profile) return;
    setProfile(prev => {
      if (!prev) return null;
      return { ...prev, version: conflictProfile.version };
    });
    setSyncedProfile(conflictProfile);
    setConflictProfile(null);
    setHasPendingChanges(true);
  };

  const selectedSector = (selectedSectorIndex !== null && profile) ? profile.sectors[selectedSectorIndex] : null;
  const assignedCount = profile ? profile.sectors.filter(sec => sec.assignedCommandId !== null).length : 0;

  const isConnected = connectionStatus === 'Connected';
  const showWaiting = !isConnected || !profile;

  return (
    <div className="panel-layout">
      <Header
        connectionStatus={connectionStatus}
        profileName={profile ? profile.name : 'Waiting for profile...'}
        version="1.0.0"
      />

      <main className="panel-main-content" style={{ position: 'relative' }}>
        {showWaiting ? (
          <div className="waiting-overlay">
            <div className="waiting-spinner"></div>
            <div className="waiting-text">Waiting for EasyWheel Host...</div>
          </div>
        ) : (
          <div className="panel-left-pane">
            {conflictProfile && (
              <div className="conflict-banner">
                <div className="conflict-text">Configuration changed on another client.</div>
                <div className="conflict-actions">
                  <button type="button" className="conflict-btn btn-primary" onClick={handleResolveReload}>
                    Reload
                  </button>
                  <button type="button" className="conflict-btn btn-secondary" onClick={handleResolveKeepMine}>
                    Keep Mine
                  </button>
                </div>
              </div>
            )}

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
                  <span className="profile-meta-lbl">Unsaved Changes</span>
                  <span className={`profile-meta-val ${hasPendingChanges ? 'highlight-val' : 'muted-val'}`}>
                    {hasPendingChanges ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-lbl">Version</span>
                  <span className="profile-meta-val">{profile.version}</span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-lbl">Last Modified By</span>
                  <span className="profile-meta-val muted-val">{profile.lastModifiedBy || 'Host'}</span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-lbl">Last Synced</span>
                  <span className="profile-meta-val muted-val">{lastModifiedStr}</span>
                </div>
              </div>
              <div className="profile-actions">
                <button
                  type="button"
                  className="profile-btn btn-primary"
                  onClick={handleSaveChanges}
                  disabled={!hasPendingChanges}
                >
                  Save Changes
                </button>
                {hasPendingChanges && (
                  <button
                    type="button"
                    className="profile-btn btn-secondary"
                    onClick={handleDiscardChanges}
                  >
                    Discard
                  </button>
                )}
              </div>
            </details>

            {isPickerOpen ? (
              <CommandPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelectCommand={handleAssignCommand}
                selectedCommandId={selectedSector?.assignedCommandId || null}
                commands={availableCommands}
                categories={categories}
              />
            ) : (
              <WheelPreview
                sectors={profile.sectors}
                selectedSectorIndex={selectedSectorIndex}
                onSelectSector={handleSelectSector}
                commands={availableCommands}
                onAssignClick={() => setIsPickerOpen(true)}
                onClearClick={handleClearCommand}
                onResetClick={handleResetSector}
              />
            )}
          </div>
        )}
      </main>

      <StatusBar
        connectionStatus={connectionStatus}
        bridgeVersion="1.0.0"
        registryVersion={registryVersion}
        profileVersion={profile ? `v${profile.version}` : 'v0'}
        lastRefresh={lastModifiedStr}
        hasUnsavedChanges={hasPendingChanges}
      />
    </div>
  );
};
