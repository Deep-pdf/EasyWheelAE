"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const StatusBar = ({ connectionStatus, bridgeVersion, registryVersion, profileVersion, lastRefresh, hasUnsavedChanges }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "panel-status-bar", children: [(0, jsx_runtime_1.jsxs)("div", { className: "status-left", children: [(0, jsx_runtime_1.jsx)("span", { className: `status-dot ${connectionStatus.toLowerCase() === 'connected' ? 'connected' : 'disconnected'}` }), (0, jsx_runtime_1.jsx)("span", { className: "status-text", children: connectionStatus }), hasUnsavedChanges && ((0, jsx_runtime_1.jsx)("span", { className: "unsaved-badge", children: "Unsaved Changes" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "status-right", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Profile: ", profileVersion] }), (0, jsx_runtime_1.jsx)("span", { className: "status-sep", children: "|" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Bridge: v", bridgeVersion] }), (0, jsx_runtime_1.jsx)("span", { className: "status-sep", children: "|" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Registry: v", registryVersion] }), (0, jsx_runtime_1.jsx)("span", { className: "status-sep", children: "|" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Synced: ", lastRefresh] })] })] }));
};
exports.StatusBar = StatusBar;
