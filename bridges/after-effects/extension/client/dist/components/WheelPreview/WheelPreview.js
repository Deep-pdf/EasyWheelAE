"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WheelPreview = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}
function annularSectorPath(cx, cy, innerR, outerR, startAngle, endAngle) {
    const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
    const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
    const largeArc = 0;
    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
        "Z",
    ].join(" ");
}
const WheelPreview = ({ sectors, selectedSectorIndex, onSelectSector, commands, onAssignClick, onClearClick }) => {
    const [hoveredSector, setHoveredSector] = (0, react_1.useState)(null);
    const size = 160;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 72;
    const innerR = 24;
    const sectorSpan = 360 / 8;
    const sectorGap = 1.5;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "wheel-preview-container", children: [(0, jsx_runtime_1.jsx)("div", { className: "wheel-svg-wrapper", children: (0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}`, className: "wheel-svg", children: [sectors.map((sector, i) => {
                            // Offset by -90 so Sector 0 (index 0) is at 12 o'clock (pointing straight up)
                            const centre = i * sectorSpan - 90;
                            const startAngle = centre - sectorSpan / 2 + sectorGap;
                            const endAngle = centre + sectorSpan / 2 - sectorGap;
                            const isSelected = selectedSectorIndex === i;
                            const isHovered = hoveredSector === i;
                            const assignedCmd = commands.find(cmd => cmd.id === sector.assignedCommandId);
                            const displayName = assignedCmd ? assignedCmd.name : 'Empty';
                            const labelR = (innerR + outerR) / 2;
                            const labelPos = polarToCartesian(cx, cy, labelR, centre);
                            return ((0, jsx_runtime_1.jsxs)("g", { className: `wheel-sector-group ${isSelected ? 'selected' : ''}`, onMouseEnter: () => setHoveredSector(i), onMouseLeave: () => setHoveredSector(null), onClick: () => onSelectSector(i), children: [(0, jsx_runtime_1.jsx)("path", { d: annularSectorPath(cx, cy, innerR + 1, outerR, startAngle, endAngle), className: "wheel-sector-path", style: {
                                            fill: isSelected
                                                ? 'var(--accent-color)'
                                                : isHovered
                                                    ? 'rgba(255, 255, 255, 0.12)'
                                                    : 'rgba(255, 255, 255, 0.03)',
                                            stroke: isSelected ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.08)',
                                            strokeWidth: isSelected ? 1.5 : 1,
                                        } }), (0, jsx_runtime_1.jsx)("text", { x: 0, y: 0, textAnchor: "middle", dominantBaseline: "central", transform: `translate(${labelPos.x}, ${labelPos.y}) rotate(${centre > 90 && centre < 270 ? centre + 180 : centre})`, className: `sector-label-text ${isSelected ? 'selected' : ''} ${displayName === 'Empty' ? 'empty' : ''}`, children: displayName.length > 9 ? `${displayName.substring(0, 7)}...` : displayName }), (0, jsx_runtime_1.jsx)("text", { x: polarToCartesian(cx, cy, innerR + 8, centre).x, y: polarToCartesian(cx, cy, innerR + 8, centre).y, textAnchor: "middle", dominantBaseline: "central", className: `sector-number-text ${isSelected ? 'selected' : ''}`, children: i + 1 })] }, i));
                        }), (0, jsx_runtime_1.jsx)("circle", { cx: cx, cy: cy, r: outerR, className: "wheel-outer-ring" }), (0, jsx_runtime_1.jsx)("circle", { cx: cx, cy: cy, r: innerR, className: "wheel-inner-ring" }), (0, jsx_runtime_1.jsx)("circle", { cx: cx, cy: cy, r: 2.5, className: "wheel-center-dot" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "wheel-selection-info", children: ["Selected: ", selectedSectorIndex !== null ? `Sector ${selectedSectorIndex + 1}` : 'None'] }), selectedSectorIndex !== null && ((0, jsx_runtime_1.jsxs)("div", { className: "wheel-preview-actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "preview-btn btn-primary", onClick: onAssignClick, children: "Assign" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "preview-btn btn-danger", onClick: onClearClick, disabled: !sectors[selectedSectorIndex]?.assignedCommandId, children: "Delete" })] }))] }));
};
exports.WheelPreview = WheelPreview;
