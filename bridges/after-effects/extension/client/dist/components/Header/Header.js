"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const Header = ({ connectionStatus, profileName, version, onSettingsClick }) => {
    const getStatusClass = (status) => {
        switch (status.toLowerCase()) {
            case 'connected': return 'status-connected';
            case 'waiting': return 'status-waiting';
            case 'disconnected': return 'status-disconnected';
            default: return 'status-disconnected';
        }
    };
    return ((0, jsx_runtime_1.jsxs)("header", { className: "panel-header", children: [(0, jsx_runtime_1.jsxs)("div", { className: "header-top", children: [(0, jsx_runtime_1.jsxs)("div", { className: "brand", children: [(0, jsx_runtime_1.jsx)("span", { className: "brand-logo", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 100 100", className: "logo-svg-small", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "currentColor", strokeWidth: "10" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "18", fill: "currentColor" })] }) }), (0, jsx_runtime_1.jsx)("span", { className: "brand-name", children: "EasyWheel" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "header-right", children: [(0, jsx_runtime_1.jsxs)("span", { className: "version-tag", children: ["v", version] }), (0, jsx_runtime_1.jsx)("button", { className: "settings-btn", onClick: onSettingsClick, title: "Settings (Placeholder)", children: (0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", className: "icon-svg", children: (0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.04,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" }) }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "header-meta", children: [(0, jsx_runtime_1.jsx)("div", { className: "meta-left", children: (0, jsx_runtime_1.jsx)("span", { className: "app-name", children: "Adobe After Effects" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "meta-right", children: [(0, jsx_runtime_1.jsx)("span", { className: "meta-label", children: "Profile:" }), (0, jsx_runtime_1.jsx)("span", { className: "meta-value", children: profileName }), (0, jsx_runtime_1.jsx)("span", { className: `status-indicator ${getStatusClass(connectionStatus)}` })] })] })] }));
};
exports.Header = Header;
