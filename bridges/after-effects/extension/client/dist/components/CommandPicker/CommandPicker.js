"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandPicker = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const CategorySidebar_1 = require("../CategorySidebar/CategorySidebar");
const CommandCard_1 = require("./CommandCard");
const MockCommandRegistry_1 = require("../../services/MockCommandRegistry");
const CommandPicker = ({ isOpen, onClose, onSelectCommand, selectedCommandId }) => {
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)('All');
    const [focusedIndex, setFocusedIndex] = (0, react_1.useState)(-1);
    const searchInputRef = (0, react_1.useRef)(null);
    const listContainerRef = (0, react_1.useRef)(null);
    // Filter commands based on search and category
    const filteredCommands = MockCommandRegistry_1.MockCommandRegistry.search(searchQuery, selectedCategory);
    // Reset focus index when results change
    (0, react_1.useEffect)(() => {
        setFocusedIndex(-1);
    }, [searchQuery, selectedCategory]);
    // Focus input on mount
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            setSearchQuery('');
            setSelectedCategory('All');
        }
    }, [isOpen]);
    // Keyboard navigation within the picker
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => {
                const next = prev + 1;
                return next < filteredCommands.length ? next : prev;
            });
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => {
                const next = prev - 1;
                return next >= 0 ? next : -1;
            });
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < filteredCommands.length) {
                onSelectCommand(filteredCommands[focusedIndex]);
            }
            else if (filteredCommands.length > 0) {
                onSelectCommand(filteredCommands[0]);
            }
        }
    };
    // Scroll focused card into view
    (0, react_1.useEffect)(() => {
        if (focusedIndex >= 0 && listContainerRef.current) {
            const children = listContainerRef.current.children;
            if (children[focusedIndex]) {
                children[focusedIndex].scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    }, [focusedIndex]);
    if (!isOpen)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "picker-inline-container", onKeyDown: handleKeyDown, children: [(0, jsx_runtime_1.jsxs)("div", { className: "picker-header", children: [(0, jsx_runtime_1.jsxs)("div", { className: "search-box-wrapper", children: [(0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", className: "search-icon", children: (0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" }) }), (0, jsx_runtime_1.jsx)("input", { ref: searchInputRef, type: "text", className: "picker-search-input", placeholder: "Search command name, category, or description...", value: searchQuery, onChange: e => setSearchQuery(e.target.value) })] }), (0, jsx_runtime_1.jsx)("button", { className: "picker-close-btn", onClick: onClose, title: "Close picker (Esc)", children: "\u2715" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "picker-body", children: [(0, jsx_runtime_1.jsx)(CategorySidebar_1.CategorySidebar, { selectedCategory: selectedCategory, onSelectCategory: setSelectedCategory }), (0, jsx_runtime_1.jsxs)("div", { className: "picker-results-pane", children: [(0, jsx_runtime_1.jsxs)("div", { className: "results-count", children: ["Found ", filteredCommands.length, " commands"] }), (0, jsx_runtime_1.jsx)("div", { className: "picker-scroll-list", ref: listContainerRef, children: filteredCommands.length > 0 ? (filteredCommands.map((command, idx) => ((0, jsx_runtime_1.jsx)(CommandCard_1.CommandCard, { command: command, isSelected: command.id === selectedCommandId || idx === focusedIndex, onSelect: () => onSelectCommand(command) }, command.id)))) : ((0, jsx_runtime_1.jsx)("div", { className: "no-results-msg", children: "No commands match your filter criteria." })) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "picker-footer", children: (0, jsx_runtime_1.jsx)("span", { className: "kb-help", children: "Press \u2191\u2193 to navigate, Enter to select, Esc to close." }) })] }));
};
exports.CommandPicker = CommandPicker;
