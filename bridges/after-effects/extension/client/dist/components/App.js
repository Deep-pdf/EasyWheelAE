"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Header_1 = require("./Header/Header");
const StatusBar_1 = require("./StatusBar/StatusBar");
const WheelPreview_1 = require("./WheelPreview/WheelPreview");
const CommandPicker_1 = require("./CommandPicker/CommandPicker");
const connection_manager_1 = require("../bridge/connection_manager");
const App = () => {
    const [profile, setProfile] = (0, react_1.useState)(null);
    const [syncedProfile, setSyncedProfile] = (0, react_1.useState)(null);
    const [availableCommands, setAvailableCommands] = (0, react_1.useState)([]);
    const [categories, setCategories] = (0, react_1.useState)(['All', 'Favorites']);
    const [registryVersion, setRegistryVersion] = (0, react_1.useState)('1.2.0');
    const [selectedSectorIndex, setSelectedSectorIndex] = (0, react_1.useState)(null);
    const [isPickerOpen, setIsPickerOpen] = (0, react_1.useState)(false);
    const [connectionStatus, setConnectionStatus] = (0, react_1.useState)('Disconnected');
    const [lastModifiedStr, setLastModifiedStr] = (0, react_1.useState)('Never');
    const [hasPendingChanges, setHasPendingChanges] = (0, react_1.useState)(false);
    const [conflictProfile, setConflictProfile] = (0, react_1.useState)(null);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    // Poll connection manager status
    (0, react_1.useEffect)(() => {
        const updateStatus = () => {
            const status = connection_manager_1.connectionManager.getStatus();
            setConnectionStatus(status);
        };
        updateStatus();
        const interval = setInterval(updateStatus, 1000);
        return () => clearInterval(interval);
    }, []);
    // Listen for sync messages from connection manager
    (0, react_1.useEffect)(() => {
        const handleMessage = (msg) => {
            console.log('[AE Panel] Received message type:', msg.type);
            if (msg.type === 'PROFILE_DATA') {
                const p = msg.profile;
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
            }
            else if (msg.type === 'PROFILE_UPDATED') {
                const p = msg.profile;
                if (isSaving) {
                    // Confirming our own save
                    setProfile(p);
                    setSyncedProfile(p);
                    setLastModifiedStr(p.lastModified || new Date().toLocaleTimeString());
                    setHasPendingChanges(false);
                    setIsSaving(false);
                }
                else if (hasPendingChanges) {
                    // Conflict: another client updated the profile while we have unsaved changes
                    console.warn('[AE Panel] Conflict detected!');
                    setConflictProfile(p);
                }
                else {
                    // Auto-sync other client's changes
                    setProfile(p);
                    setSyncedProfile(p);
                    setLastModifiedStr(p.lastModified || new Date().toLocaleTimeString());
                }
            }
            else if (msg.type === 'COMMAND_REGISTRY_UPDATED') {
                // Request fresh data from Host
                connection_manager_1.connectionManager.send({
                    type: 'GET_PROFILE',
                    application: 'After Effects'
                });
            }
        };
        connection_manager_1.connectionManager.addMessageListener(handleMessage);
        return () => connection_manager_1.connectionManager.removeMessageListener(handleMessage);
    }, [isSaving, hasPendingChanges]);
    // Request profile on reconnection
    (0, react_1.useEffect)(() => {
        if (connectionStatus === 'Connected') {
            connection_manager_1.connectionManager.send({
                type: 'GET_PROFILE',
                application: 'After Effects'
            });
        }
        else {
            // Clear profile when disconnected so waiting screen is shown
            setProfile(null);
            setSyncedProfile(null);
            setHasPendingChanges(false);
            setConflictProfile(null);
        }
    }, [connectionStatus]);
    // Global keyboard navigation
    (0, react_1.useEffect)(() => {
        const handleGlobalKeyDown = (e) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }
            if (isPickerOpen || !profile)
                return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSectorIndex(prev => {
                    if (prev === null)
                        return 0;
                    return (prev + 1) % 8;
                });
            }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSectorIndex(prev => {
                    if (prev === null)
                        return 7;
                    return (prev - 1 + 8) % 8;
                });
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedSectorIndex !== null) {
                    setIsPickerOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedSectorIndex, isPickerOpen, profile]);
    const handleSelectSector = (index) => {
        setSelectedSectorIndex(index);
    };
    const handleAssignCommand = (command) => {
        if (selectedSectorIndex === null || !profile)
            return;
        const updatedSectors = profile.sectors.map((sec, idx) => {
            if (idx === selectedSectorIndex) {
                return { ...sec, assignedCommandId: command.id };
            }
            return sec;
        });
        setProfile(prev => {
            if (!prev)
                return null;
            return { ...prev, sectors: updatedSectors };
        });
        setHasPendingChanges(true);
        setIsPickerOpen(false);
    };
    const handleClearCommand = () => {
        if (selectedSectorIndex === null || !profile)
            return;
        const updatedSectors = profile.sectors.map((sec, idx) => {
            if (idx === selectedSectorIndex) {
                return { ...sec, assignedCommandId: null };
            }
            return sec;
        });
        setProfile(prev => {
            if (!prev)
                return null;
            return { ...prev, sectors: updatedSectors };
        });
        setHasPendingChanges(true);
    };
    const handleResetSector = () => {
        if (selectedSectorIndex === null || !profile || !syncedProfile)
            return;
        const originalSec = syncedProfile.sectors[selectedSectorIndex];
        const updatedSectors = profile.sectors.map((sec, idx) => {
            if (idx === selectedSectorIndex) {
                return { ...sec, assignedCommandId: originalSec.assignedCommandId };
            }
            return sec;
        });
        setProfile(prev => {
            if (!prev)
                return null;
            return { ...prev, sectors: updatedSectors };
        });
        const diff = updatedSectors.some((sec, idx) => sec.assignedCommandId !== syncedProfile.sectors[idx].assignedCommandId);
        setHasPendingChanges(diff);
    };
    const handleSaveChanges = () => {
        if (!profile)
            return;
        setIsSaving(true);
        connection_manager_1.connectionManager.send({
            type: 'UPDATE_PROFILE',
            application: 'after_effects',
            profile: profile
        });
    };
    const handleDiscardChanges = () => {
        if (!syncedProfile)
            return;
        setProfile(syncedProfile);
        setHasPendingChanges(false);
    };
    const handleResolveReload = () => {
        if (!conflictProfile)
            return;
        setProfile(conflictProfile);
        setSyncedProfile(conflictProfile);
        setLastModifiedStr(conflictProfile.lastModified || new Date().toLocaleTimeString());
        setConflictProfile(null);
        setHasPendingChanges(false);
    };
    const handleResolveKeepMine = () => {
        if (!conflictProfile || !profile)
            return;
        setProfile(prev => {
            if (!prev)
                return null;
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "panel-layout", children: [(0, jsx_runtime_1.jsx)(Header_1.Header, { connectionStatus: connectionStatus, profileName: profile ? profile.name : 'Waiting for profile...', version: "1.0.0" }), (0, jsx_runtime_1.jsx)("main", { className: "panel-main-content", style: { position: 'relative' }, children: showWaiting ? ((0, jsx_runtime_1.jsxs)("div", { className: "waiting-overlay", children: [(0, jsx_runtime_1.jsx)("div", { className: "waiting-spinner" }), (0, jsx_runtime_1.jsx)("div", { className: "waiting-text", children: "Waiting for EasyWheel Host..." })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "panel-left-pane", children: [conflictProfile && ((0, jsx_runtime_1.jsxs)("div", { className: "conflict-banner", children: [(0, jsx_runtime_1.jsx)("div", { className: "conflict-text", children: "Configuration changed on another client." }), (0, jsx_runtime_1.jsxs)("div", { className: "conflict-actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "conflict-btn btn-primary", onClick: handleResolveReload, children: "Reload" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "conflict-btn btn-secondary", onClick: handleResolveKeepMine, children: "Keep Mine" })] })] })), (0, jsx_runtime_1.jsxs)("details", { className: "profile-info-details", children: [(0, jsx_runtime_1.jsxs)("summary", { className: "section-title", children: [(0, jsx_runtime_1.jsx)("span", { children: "Profile Info" }), (0, jsx_runtime_1.jsxs)("span", { className: "summary-stats", children: ["(", profile.name, " \u2022 ", assignedCount, "/", profile.sectorCount, ")"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-grid", children: [(0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Profile Name" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val", children: profile.name })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Application" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val", children: profile.application })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Number of Sectors" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val", children: profile.sectorCount })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Assigned Commands" }), (0, jsx_runtime_1.jsxs)("span", { className: "profile-meta-val highlight-val", children: [assignedCount, " / ", profile.sectorCount] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Unsaved Changes" }), (0, jsx_runtime_1.jsx)("span", { className: `profile-meta-val ${hasPendingChanges ? 'highlight-val' : 'muted-val'}`, children: hasPendingChanges ? 'Yes' : 'No' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Version" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val", children: profile.version })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Last Modified By" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val muted-val", children: profile.lastModifiedBy || 'Host' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Last Synced" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val muted-val", children: lastModifiedStr })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "profile-btn btn-primary", onClick: handleSaveChanges, disabled: !hasPendingChanges, children: "Save Changes" }), hasPendingChanges && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "profile-btn btn-secondary", onClick: handleDiscardChanges, children: "Discard" }))] })] }), isPickerOpen ? ((0, jsx_runtime_1.jsx)(CommandPicker_1.CommandPicker, { isOpen: isPickerOpen, onClose: () => setIsPickerOpen(false), onSelectCommand: handleAssignCommand, selectedCommandId: selectedSector?.assignedCommandId || null, commands: availableCommands, categories: categories })) : ((0, jsx_runtime_1.jsx)(WheelPreview_1.WheelPreview, { sectors: profile.sectors, selectedSectorIndex: selectedSectorIndex, onSelectSector: handleSelectSector, commands: availableCommands, onAssignClick: () => setIsPickerOpen(true), onClearClick: handleClearCommand, onResetClick: handleResetSector }))] })) }), (0, jsx_runtime_1.jsx)(StatusBar_1.StatusBar, { connectionStatus: connectionStatus, bridgeVersion: "1.0.0", registryVersion: registryVersion, profileVersion: profile ? `v${profile.version}` : 'v0', lastRefresh: lastModifiedStr, hasUnsavedChanges: hasPendingChanges })] }));
};
exports.App = App;
