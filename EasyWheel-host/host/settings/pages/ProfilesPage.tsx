import React, { useState, useMemo } from 'react';
import { useConfig } from '../context/ConfigContext';
import { PageLayout } from '../components/layout/PageLayout';
import { WheelEditor } from '../components/wheel/WheelEditor';
import { ActionPicker } from '../components/actions/ActionPicker';
import { RunningAppsDialog } from '../components/profiles/RunningAppsDialog';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { Profile, RunningApp, ConfiguredCommand } from '../types';
import { getSectorCommand, getCommandDisplayName, getCommandDescription } from '../utils/commandHelper';

export function ProfilesPage(): React.JSX.Element {
  const { config, addProfile, updateProfile, deleteProfile } = useConfig();
  const [selectedProfileName, setSelectedProfileName] = useState<string>('Desktop');
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  
  // Modals state
  const [isActionPickerOpen, setIsActionPickerOpen] = useState(false);
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
        <div className="w-80 bg-zinc-950/20 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Profiles</span>
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
                  className={`w-full flex flex-col text-left px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-800 border-zinc-700/60 shadow-sm'
                      : 'bg-zinc-900/10 border-transparent hover:bg-zinc-900/40 hover:border-zinc-800/40 text-zinc-300'
                  }`}
                >
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-full">
                    {p.executable}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Profile Details and Visual Editor */}
        <div className="flex-1 bg-zinc-950/10 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Profile Name & Exe editing */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start border-b border-zinc-800 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Profile Name</label>
                <input
                  type="text"
                  value={activeProfile.name}
                  onChange={(e) => updateProfile(activeProfile.name, { name: e.target.value })}
                  disabled={activeProfile.name.toLowerCase() === 'desktop'}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 transition-all font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Target Executable(s)</label>
                <input
                  type="text"
                  value={activeProfile.executable}
                  onChange={(e) => updateProfile(activeProfile.name, { executable: e.target.value })}
                  disabled={activeProfile.name.toLowerCase() === 'desktop'}
                  placeholder="e.g. Photoshop.exe, photoshop_render.exe"
                  className="px-3 py-2 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:opacity-50 transition-all font-mono"
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

          {/* Interactive Area: Wheel left, Assignments panel right */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Visual interactive wheel */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">Interactive Wheel Layout</span>
              <WheelEditor
                config={config}
                profile={activeProfile}
                selectedSector={selectedSector}
                onSelectSector={handleSelectSector}
              />
            </div>

            {/* Sector Assignment Panel */}
            <div className="bg-zinc-950/20 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5 text-left h-full">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sector Details</span>
              
              {selectedSector !== null ? (
                <div className="flex flex-col justify-between flex-1 gap-5">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                      <div>
                        <span className="text-xs text-zinc-400 font-medium">Sector Location</span>
                        <h4 className="font-semibold text-zinc-100 mt-0.5 text-sm">Sector {selectedSector}</h4>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono bg-zinc-800 px-2 py-1 rounded">
                        Angle: {selectedSector * (360 / config.global.sector_count)}°
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs text-zinc-400 font-medium">Assigned Shortcut Action</span>
                      {assignedAction ? (
                        <div className="bg-zinc-900/40 p-4 border border-zinc-800 rounded-lg flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-200 text-sm">{assignedAction.display_name}</span>
                            <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">
                              {assignedAction.category}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">{assignedAction.description}</p>
                          <span className="text-[10px] text-zinc-600 font-mono mt-3 select-all">
                            ID: {assignedAction.id}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-4 text-center text-zinc-500 text-xs">
                          No shortcut assigned. Releasing on this sector will perform no action.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buttons for action picker */}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsActionPickerOpen(true)}
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
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-zinc-500 text-sm gap-2">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <span>Hover and click any sector slice on the left wheel layout to configure its action binding.</span>
                </div>
              )}
            </div>
          </div>
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
          <div className="p-4 bg-zinc-950/20 border border-zinc-800 rounded-lg flex flex-col gap-3">
            <div>
              <h4 className="font-semibold text-zinc-200 text-sm">Option 1: From Running Applications</h4>
              <p className="text-xs text-zinc-400 mt-1">
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
          <form onSubmit={handleCreateManualProfile} className="p-4 bg-zinc-950/20 border border-zinc-800 rounded-lg flex flex-col gap-4">
            <div>
              <h4 className="font-semibold text-zinc-200 text-sm">Option 2: Direct Configuration</h4>
              <p className="text-xs text-zinc-400 mt-1">
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
                <label className="text-xs text-zinc-400">Profile Name</label>
                <input
                  type="text"
                  value={customProfileName}
                  onChange={(e) => setCustomProfileName(e.target.value)}
                  placeholder="e.g. Adobe Premiere Pro"
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all duration-150"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Executable Name</label>
                <input
                  type="text"
                  value={customProfileExe}
                  onChange={(e) => setCustomProfileExe(e.target.value)}
                  placeholder="e.g. Premiere.exe"
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-brand-primary rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all duration-150 font-mono"
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
