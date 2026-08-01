"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Header_1 = require("./Header/Header");
const StatusBar_1 = require("./StatusBar/StatusBar");
const WheelPreview_1 = require("./WheelPreview/WheelPreview");
const CommandPicker_1 = require("./CommandPicker/CommandPicker");
const MockCommandRegistry_1 = require("../services/MockCommandRegistry");
const connection_manager_1 = require("../bridge/connection_manager");
const INITIAL_SECTORS = Array.from({ length: 8 }, (_, i) => ({
    number: i + 1,
    assignedCommandId: i === 0 ? 'pre_compose' : i === 1 ? 'easy_ease' : null
}));
const INITIAL_PROFILE = {
    name: 'AE Default Profile',
    application: 'Adobe After Effects',
    sectorCount: 8,
    sectors: INITIAL_SECTORS,
    lastModified: new Date().toLocaleTimeString()
};
const App = () => {
    const [profile, setProfile] = (0, react_1.useState)(INITIAL_PROFILE);
    const [selectedSectorIndex, setSelectedSectorIndex] = (0, react_1.useState)(null);
    const [isPickerOpen, setIsPickerOpen] = (0, react_1.useState)(false);
    const [connectionStatus, setConnectionStatus] = (0, react_1.useState)('Disconnected');
    const [lastModifiedStr, setLastModifiedStr] = (0, react_1.useState)(INITIAL_PROFILE.lastModified);
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
    // Global keyboard navigation
    (0, react_1.useEffect)(() => {
        const handleGlobalKeyDown = (e) => {
            // Ignore keypresses inside inputs
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }
            if (isPickerOpen)
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
    }, [selectedSectorIndex, isPickerOpen]);
    const handleSelectSector = (index) => {
        setSelectedSectorIndex(index);
    };
    const handleAssignCommand = (command) => {
        if (selectedSectorIndex === null)
            return;
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
        if (selectedSectorIndex === null)
            return;
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
        if (selectedSectorIndex === null)
            return;
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "panel-layout", children: [(0, jsx_runtime_1.jsx)(Header_1.Header, { connectionStatus: connectionStatus, profileName: profile.name, version: "1.0.0" }), (0, jsx_runtime_1.jsx)("main", { className: "panel-main-content", children: (0, jsx_runtime_1.jsxs)("div", { className: "panel-left-pane", children: [(0, jsx_runtime_1.jsxs)("details", { className: "profile-info-details", children: [(0, jsx_runtime_1.jsxs)("summary", { className: "section-title", children: [(0, jsx_runtime_1.jsx)("span", { children: "Profile Info" }), (0, jsx_runtime_1.jsxs)("span", { className: "summary-stats", children: ["(", profile.name, " \u2022 ", assignedCount, "/", profile.sectorCount, ")"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-grid", children: [(0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Profile Name" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val", children: profile.name })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Application" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val", children: profile.application })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Number of Sectors" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val", children: profile.sectorCount })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Assigned Commands" }), (0, jsx_runtime_1.jsxs)("span", { className: "profile-meta-val highlight-val", children: [assignedCount, " / ", profile.sectorCount] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-meta-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "profile-meta-lbl", children: "Last Modified" }), (0, jsx_runtime_1.jsx)("span", { className: "profile-meta-val muted-val", children: lastModifiedStr })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "profile-actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "profile-btn btn-secondary", onClick: handleRefresh, children: "Refresh" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "profile-btn btn-secondary", disabled: true, title: "Import (Disabled - Phase 2)", children: "Import" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "profile-btn btn-secondary", disabled: true, title: "Export (Disabled - Phase 2)", children: "Export" })] })] }), isPickerOpen ? ((0, jsx_runtime_1.jsx)(CommandPicker_1.CommandPicker, { isOpen: isPickerOpen, onClose: () => setIsPickerOpen(false), onSelectCommand: handleAssignCommand, selectedCommandId: selectedSector?.assignedCommandId || null })) : ((0, jsx_runtime_1.jsx)(WheelPreview_1.WheelPreview, { sectors: profile.sectors, selectedSectorIndex: selectedSectorIndex, onSelectSector: handleSelectSector, commands: MockCommandRegistry_1.MockCommandRegistry.getAll(), onAssignClick: () => setIsPickerOpen(true), onClearClick: handleClearCommand, onResetClick: handleResetSector }))] }) }), (0, jsx_runtime_1.jsx)(StatusBar_1.StatusBar, { connectionStatus: connectionStatus, bridgeVersion: "1.0.0", registryVersion: "1.2.0", lastRefresh: lastModifiedStr })] }));
};
exports.App = App;
