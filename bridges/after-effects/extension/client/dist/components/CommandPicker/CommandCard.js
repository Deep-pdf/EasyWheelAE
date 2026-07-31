"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandCard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const CommandCard = ({ command, isSelected, onSelect }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: `command-card ${isSelected ? 'selected' : ''}`, onClick: onSelect, children: [(0, jsx_runtime_1.jsx)("div", { className: "card-icon-area", children: (0, jsx_runtime_1.jsx)("div", { className: "adobe-icon-placeholder", "data-category": command.category.toLowerCase(), children: command.name.substring(0, 2).toUpperCase() }) }), (0, jsx_runtime_1.jsxs)("div", { className: "card-info-area", children: [(0, jsx_runtime_1.jsxs)("div", { className: "card-header-line", children: [(0, jsx_runtime_1.jsx)("span", { className: "card-command-name", children: command.name }), (0, jsx_runtime_1.jsx)("span", { className: "card-command-category", children: command.category })] }), (0, jsx_runtime_1.jsx)("div", { className: "card-description", children: command.description })] })] }));
};
exports.CommandCard = CommandCard;
