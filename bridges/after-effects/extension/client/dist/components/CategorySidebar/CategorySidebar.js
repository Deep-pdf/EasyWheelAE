"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategorySidebar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const CATEGORIES = [
    'All',
    'Favorites',
    'Layer',
    'Animation',
    'Composition',
    'Timeline',
    'Effects',
    'Masks',
    'Shapes',
    'View',
    'Panels',
    'Utilities'
];
const CategorySidebar = ({ selectedCategory, onSelectCategory }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "category-sidebar", children: [(0, jsx_runtime_1.jsx)("div", { className: "category-sidebar-title", children: "Categories" }), (0, jsx_runtime_1.jsx)("ul", { className: "category-list", children: CATEGORIES.map(category => ((0, jsx_runtime_1.jsx)("li", { className: "category-list-item", children: (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `category-item-btn ${selectedCategory === category ? 'active' : ''}`, onClick: () => onSelectCategory(category), children: [(0, jsx_runtime_1.jsx)("span", { className: "category-name", children: category }), category === 'Favorites' && (0, jsx_runtime_1.jsx)("span", { className: "fav-icon", children: "\u2605" })] }) }, category))) })] }));
};
exports.CategorySidebar = CategorySidebar;
