import React, { useState, useMemo } from 'react';
import { useConfig } from '../context/ConfigContext';
import { PageLayout } from '../components/layout/PageLayout';
import { WheelEditor } from '../components/wheel/WheelEditor';
import { ActionPicker } from '../components/actions/ActionPicker';
import { CommandPicker } from '../components/actions/CommandPicker';
import { RunningAppsDialog } from '../components/profiles/RunningAppsDialog';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { Profile, RunningApp, ConfiguredCommand } from '../types';
import { getSectorCommand, getCommandDisplayName, getCommandDescription } from '../utils/commandHelper';

export function ProfilesPage(): React.JSX.Element {
  const { config, addProfile, updateProfile, deleteProfile, dirty, saveChanges, saving } = useConfig();
  const [selectedProfileName, setSelectedProfileName] = useState<string>('Desktop');
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  
  // Modals state
  const [isActionPickerOpen, setIsActionPickerOpen] = useState(false);
  const [isCommandPickerOpen, setIsCommandPickerOpen] = useState(false);
  const [isRunningAppsOpen, setIsRunningAppsOpen] = useState(false);
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  
  // Custom manual profile inputs
  const [customProfileName, setCustomProfileName] = useState('');
  const [customProfileExe, setCustomProfileExe] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  // Search profile list
  const [profileSearch, setProfileSearch] = useState('');

  // Selected Profile object lookup
  const activeProfile = useMemo(() => {
    if (!config) return null;
    return config.profiles.find(
      (p) => p.name.toLowerCase() === selectedProfileName.toLowerCase()
    ) || config.profiles[0];
  }, [config, selectedProfileName]);



  // Currently assigned command for selected sector
  const currentCommand = useMemo(() => {
    if (!activeProfile || selectedSector === null) return null;
    return getSectorCommand(activeProfile.sector_assignments, selectedSector);
  }, [activeProfile, selectedSector]);

  // Compute display name, description, and category for the assigned sector command
  const assignedAction = useMemo(() => {
    if (!currentCommand || !config) return null;
    const legacy = config.action_library.find((a) => a.id === currentCommand.command);
    return {
      id: currentCommand.command,
      display_name: getCommandDisplayName(currentCommand, config),
      description: getCommandDescription(currentCommand, config),
      category: legacy ? legacy.category : 'Custom',
    };
  }, [currentCommand, config]);

  const filteredProfiles = useMemo(() => {
    if (!config) return [];
    return config.profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(profileSearch.toLowerCase()) ||
        p.executable.toLowerCase().includes(profileSearch.toLowerCase())
    );
  }, [config, profileSearch]);

  if (!config || !activeProfile) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Loading profiles...
      </div>
    );
  }

  const handleSelectSector = (sector: number) => {
    setSelectedSector(sector);
  };

  const handleActionSelect = (cmd: ConfiguredCommand) => {
    if (selectedSector === null) return;
    
    const updatedAssignments = {
      ...activeProfile.sector_assignments,
      [selectedSector.toString()]: cmd,
    };

    updateProfile(activeProfile.name, {
      sector_assignments: updatedAssignments,
    });
  };

  const handleCommandSelect = (cmdId: string) => {
    if (selectedSector === null) return;

    const updatedAssignments = {
      ...activeProfile.sector_assignments,
      [selectedSector.toString()]: cmdId,
    };

    updateProfile(activeProfile.name, {
      sector_assignments: updatedAssignments,
    });
  };

  const handleClearSector = () => {
    if (selectedSector === null) return;
    
    const updatedAssignments = { ...activeProfile.sector_assignments };
    delete updatedAssignments[selectedSector.toString()];

    updateProfile(activeProfile.name, {
      sector_assignments: updatedAssignments,
    });
  };

  // Option 1: Select from Running App
  const handleSelectRunningApp = (app: RunningApp) => {
    const newProf: Profile = {
      name: app.name,
      executable: app.executable,
      sector_assignments: {},
    };
    if (addProfile(newProf)) {
      setSelectedProfileName(app.name);
      setSelectedSector(null);
      setIsRunningAppsOpen(false);
      setIsNewProfileModalOpen(false);
    }
  };

  // Option 2: Custom Profile create
  const handleCreateManualProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    const name = customProfileName.trim();
    const exe = customProfileExe.trim();

    if (!name || !exe) {
      setManualError('Both Profile Name and Executable fields are required.');
      return;
    }

    const newProf: Profile = {
      name,
      executable: exe,
      sector_assignments: {},
    };

    if (addProfile(newProf)) {
      setSelectedProfileName(name);
      setSelectedSector(null);
      setCustomProfileName('');
      setCustomProfileExe('');
      setIsNewProfileModalOpen(false);
    } else {
      setManualError(`Profile creation failed. Name might already exist.`);
    }
  };

  const handleDuplicateProfile = () => {
    const name = `${activeProfile.name} Copy`;
    const newProf: Profile = {
      name,
      executable: activeProfile.executable,
      sector_assignments: { ...activeProfile.sector_assignments },
    };
    if (addProfile(newProf)) {
      setSelectedProfileName(name);
      setSelectedSector(null);
    }
  };

  const handleDeleteProfile = () => {
    if (activeProfile.name.toLowerCase() === 'desktop') return;
    
    const index = config.profiles.findIndex((p) => p.name === activeProfile.name);
    let nextProfile = 'Desktop';
    
    // Choose adjacent profile
    if (index > 0 && config.profiles[index - 1]) {
      nextProfile = config.profiles[index - 1].name;
    }

    deleteProfile(activeProfile.name);
    setSelectedProfileName(nextProfile);
    setSelectedSector(null);
  };

  return (
    <PageLayout
      title="Application Profiles"
      description="Bind distinct overlay configurations and action shortcuts to specific foreground programs."
    >
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left Side: Profiles List */}
        <div
          className="w-64 rounded-xl p-4 flex flex-col gap-4 flex-shrink-0"
          style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Profiles</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewProfileModalOpen(true)}
              className="gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Profile
            </Button>
          </div>

          <SearchBar
            value={profileSearch}
            onChange={setProfileSearch}
            placeholder="Search profiles..."
          />

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredProfiles.map((p) => {
              const isSelected = p.name.toLowerCase() === activeProfile.name.toLowerCase();
              return (
                <button
                  key={p.name}
                  onClick={() => {
                    setSelectedProfileName(p.name);
                    setSelectedSector(null);
                  }}
                  className={`w-full flex flex-col text-left px-3 py-2.5 rounded-lg border ew-transition cursor-pointer`}
                  style={{
                    background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                    border: isSelected ? '1px solid var(--color-border-strong)' : '1px solid transparent',
                    color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--color-surface-hover)';
                      e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                      e.currentTarget.style.color = 'var(--color-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                    }
                  }}
                >
                  <span className="font-semibold text-sm" style={{ color: isSelected ? 'var(--color-text)' : undefined }}>{p.name}</span>
                  <span className="text-[10px] font-mono mt-0.5 truncate max-w-full" style={{ color: 'var(--color-text-muted)' }}>
                    {p.executable}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Profile Details and Visual Editor */}
        <div
          className="flex-1 rounded-xl p-6 flex flex-col gap-6 overflow-y-auto"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* Profile Name & Exe editing */}
          <div
            className="flex flex-col md:flex-row gap-4 justify-between items-start pb-5"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Profile Name</label>
                <input
                  type="text"
                  value={activeProfile.name}
                  onChange={(e) => updateProfile(activeProfile.name, { name: e.target.value })}
                  disabled={activeProfile.name.toLowerCase() === 'desktop'}
                  className="px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none disabled:opacity-50 transition-all"
                  style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Target Executable(s)</label>
                <input
                  type="text"
                  value={activeProfile.executable}
                  onChange={(e) => updateProfile(activeProfile.name, { executable: e.target.value })}
                  disabled={activeProfile.name.toLowerCase() === 'desktop'}
                  placeholder="e.g. Photoshop.exe, photoshop_render.exe"
                  className="px-3 py-2 rounded-lg text-sm font-mono focus:outline-none disabled:opacity-50 transition-all"
                  style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                />
              </div>
            </div>

            {/* Profile actions (Duplicate / Delete) */}
            <div className="flex gap-2 flex-shrink-0 md:self-end mt-4 md:mt-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDuplicateProfile}
                title="Duplicate entire profile"
              >
                Duplicate
              </Button>
              {activeProfile.name.toLowerCase() !== 'desktop' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteProfile}
                  title="Permanently remove profile"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Interactive Area: Unified Wheel Editor & Sector Details */}
          <div
            className="flex-grow rounded-xl p-6 flex flex-col lg:flex-row gap-8 items-stretch min-h-0 ew-card"
            style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
          >
            {/* Left Column: Interactive Wheel Layout */}
            <div className="flex-[1.3] flex flex-col min-w-0">
              <div className="w-full flex justify-between items-center mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider ew-card-title" style={{ color: 'var(--color-text-muted)' }}>
                  Interactive Wheel Layout
                </span>
                <div className="flex gap-3 text-xs text-zinc-500 font-mono">
                  <span>Sectors: {config.global.sector_count}</span>
                  {selectedSector !== null && <span>Selected: Sector {selectedSector}</span>}
                </div>
              </div>
              
              <div className="w-full flex-grow flex items-center justify-center min-h-[300px]">
                <WheelEditor
                  config={config}
                  profile={activeProfile}
                  selectedSector={selectedSector}
                  onSelectSector={handleSelectSector}
                />
              </div>
            </div>

            {/* Vertical divider line */}
            <div className="hidden lg:block w-px self-stretch" style={{ background: 'var(--color-border)' }} />

            {/* Right Column: Sector Details */}
            <div className="flex-1 flex flex-col justify-between text-left min-w-0">
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider ew-card-title" style={{ color: 'var(--color-text-muted)' }}>
                    Sector Details
                  </span>
                  {selectedSector !== null && (
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    >
                      Angle: {selectedSector * (360 / config.global.sector_count)}°
                    </span>
                  )}
                </div>

                {selectedSector !== null ? (
                  <div className="space-y-4">
                    <div
                      className="flex justify-between items-center p-3 rounded-lg"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      <div>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Sector Location</span>
                        <h4 className="font-semibold mt-0.5 text-sm" style={{ color: 'var(--color-text)' }}>Sector {selectedSector}</h4>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Assigned Shortcut Action</span>
                      {assignedAction ? (
                        <div
                          className="p-4 rounded-lg flex flex-col gap-1"
                          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{assignedAction.display_name}</span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)' }}
                            >
                              {assignedAction.category}
                            </span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{assignedAction.description}</p>
                          <span className="text-[10px] font-mono mt-3 select-all" style={{ color: 'var(--color-text-faint)' }}>
                            ID: {assignedAction.id}
                          </span>
                        </div>
                      ) : (
                        <div
                          className="rounded-lg p-4 text-center text-xs"
                          style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                        >
                          No shortcut assigned. Releasing on this sector will perform no action.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center py-12 text-center text-zinc-500 text-sm gap-3">
                    <svg className="w-8 h-8 text-zinc-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-faint)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="text-xs px-4" style={{ color: 'var(--color-text-muted)' }}>
                      Hover and click any sector slice on the left wheel layout to configure its action binding.
                    </span>
                  </div>
                )}
              </div>

              {selectedSector !== null && (
                <div className="flex gap-2 mt-6">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (activeProfile.name === 'Adobe After Effects') {
                        setIsCommandPickerOpen(true);
                      } else {
                        setIsActionPickerOpen(true);
                      }
                    }}
                    className="flex-1"
                  >
                    {assignedAction ? 'Change Action' : 'Assign Action'}
                  </Button>
                  {assignedAction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSector}
                      className="text-red-400 hover:text-red-300"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Explicit Save button at bottom of profile details */}
          {dirty && (
            <div className="flex justify-end pt-4 border-t border-zinc-800" style={{ borderTop: '1px solid var(--color-border)' }}>
              <Button
                variant="primary"
                disabled={saving}
                onClick={saveChanges}
                className="w-full md:w-auto"
              >
                {saving ? 'Saving changes...' : 'Save Configuration'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Profile Choice Modal */}
      <Modal
        isOpen={isNewProfileModalOpen}
        onClose={() => setIsNewProfileModalOpen(false)}
        title="Add New Application Profile"
      >
        <div className="flex flex-col gap-6 text-left">
          {/* Option 1: running processes */}
          <div
            className="p-4 rounded-lg flex flex-col gap-3"
            style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Option 1: From Running Applications</h4>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Scan active desktop windows and automatically configure executable metadata.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsRunningAppsOpen(true)}
              className="w-full"
            >
              Select Active App
            </Button>
          </div>

          {/* Option 2: custom text inputs */}
          <form
            onSubmit={handleCreateManualProfile}
            className="p-4 rounded-lg flex flex-col gap-4"
            style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Option 2: Direct Configuration</h4>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Specify manual executable details and profile title.
              </p>
            </div>

            {manualError && (
              <div className="text-xs text-red-400 font-medium">
                {manualError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Profile Name</label>
                <input
                  type="text"
                  value={customProfileName}
                  onChange={(e) => setCustomProfileName(e.target.value)}
                  placeholder="e.g. Adobe Premiere Pro"
                  className="px-3 py-1.5 rounded-lg text-sm focus:outline-none transition-all duration-150"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Executable Name</label>
                <input
                  type="text"
                  value={customProfileExe}
                  onChange={(e) => setCustomProfileExe(e.target.value)}
                  placeholder="e.g. Premiere.exe"
                  className="px-3 py-1.5 rounded-lg text-sm font-mono focus:outline-none transition-all duration-150"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
            >
              Create Manual Profile
            </Button>
          </form>
        </div>
      </Modal>

      {/* Action Picker Sub-Modal */}
      <ActionPicker
        isOpen={isActionPickerOpen}
        onClose={() => setIsActionPickerOpen(false)}
        onSelectCommand={handleActionSelect}
        currentCommand={currentCommand}
        activeProfileName={activeProfile.name}
        actionLibrary={config.action_library}
      />

      {/* Searchable After Effects Command Picker */}
      <CommandPicker
        isOpen={isCommandPickerOpen}
        onClose={() => setIsCommandPickerOpen(false)}
        onSelectCommand={handleCommandSelect}
        currentCommandId={currentCommand ? currentCommand.command : null}
      />

      {/* Running App selector Modal */}
      <RunningAppsDialog
        isOpen={isRunningAppsOpen}
        onClose={() => setIsRunningAppsOpen(false)}
        onSelectApp={handleSelectRunningApp}
      />
    </PageLayout>
  );
}
