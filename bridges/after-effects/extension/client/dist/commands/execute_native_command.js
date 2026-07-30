"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeNativeCommand = void 0;
const logger_1 = require("../bridge/logger");
const jsx_executor_1 = require("../bridge/jsx_executor");
function getMenuNameForId(id) {
    const map = {
        2525: "Text",
        2076: "Solid...",
        2526: "Light...",
        2527: "Camera...",
        2507: "Null Object",
        2511: "Shape Layer",
        2506: "Adjustment Layer",
        2524: "Split Layer",
        2007: "Duplicate",
        2035: "Undo",
        2036: "Redo",
        2009: "Cut",
        2010: "Copy",
        2011: "Paste",
        2012: "Clear",
        2013: "Select All",
        2014: "Deselect All",
        2000: "New Project",
        2001: "Open Project...",
        2002: "Close",
        2003: "Save",
        2004: "Save As...",
        2005: "File...",
        2006: "Multiple Files...",
        2611: "Project Settings...",
        2008: "Exit",
        2200: "Revert",
        2069: "New Composition...",
        2070: "Composition Settings...",
        2073: "Trim Comp to Work Area",
        2074: "Crop Comp to Region of Interest",
        2161: "Add to Render Queue",
        2220: "Add Keyframe",
        2221: "Toggle Hold Keyframe",
        2222: "Keyframe Interpolation...",
        2223: "Keyframe Velocity...",
        2058: "Easy Ease In",
        2059: "Easy Ease Out",
        2224: "Time-Reverse Keyframes",
        2225: "Convert Expression to Keyframes",
        2226: "Track Camera",
        2227: "Track Motion",
        2228: "Warp Stabilizer VFX",
        2320: "New Mask",
        2321: "Mask Feather...",
        2322: "Mask Opacity...",
        2323: "Mask Expansion...",
    };
    return map[id] || null;
}
/**
 * Command handler to execute native After Effects menu commands by their numeric ID.
 */
exports.executeNativeCommand = {
    id: 'execute_native_command',
    execute: async (parameters, _profile) => {
        const commandId = parameters.commandId;
        if (typeof commandId !== 'number') {
            logger_1.Logger.error('execute_native_command', 'Failed to execute: missing or invalid commandId parameter.');
            return {
                success: false,
                message: 'Invalid command ID.',
                errorCode: 'invalid_command_id'
            };
        }
        logger_1.Logger.info('execute_native_command', `Executing command ID ${commandId}...`);
        let script = '';
        // Check if the command is one of our special custom actions
        switch (commandId) {
            case 2071: // Pre-compose
                script = 'EasyWheel.execute("pre_compose")';
                break;
            case 2057: // Easy Ease
                script = 'EasyWheel.execute("easy_ease")';
                break;
            case 2406: // Trim Paths (from our registry)
                script = 'EasyWheel.execute("trim_paths")';
                break;
            case 2410: // Parent / Parent Picker (from our registry)
                script = 'EasyWheel.execute("parent")';
                break;
            case 2507: // Null Object (from our registry)
                script = 'EasyWheel.execute("null_object")';
                break;
            case 2007: // Duplicate
                script = 'EasyWheel.execute("duplicate_layer")';
                break;
            case 2525: // New Text Layer (Robust API execution)
                script = `try {
          app.activate();
          var comp = app.project.activeItem;
          if (comp && comp instanceof CompItem) {
            app.beginUndoGroup("EasyWheel: New Text Layer");
            comp.layers.addText("");
            app.endUndoGroup();
            "OK";
          } else {
            "ERROR: No active composition";
          }
        } catch(e) {
          "ERROR: " + (e.message || String(e));
        }`;
                break;
            case 2511: // New Shape Layer (Robust API execution)
                script = `try {
          app.activate();
          var comp = app.project.activeItem;
          if (comp && comp instanceof CompItem) {
            app.beginUndoGroup("EasyWheel: New Shape Layer");
            comp.layers.addShape();
            app.endUndoGroup();
            "OK";
          } else {
            "ERROR: No active composition";
          }
        } catch(e) {
          "ERROR: " + (e.message || String(e));
        }`;
                break;
            case 2506: // New Adjustment Layer (Robust API execution)
                script = `try {
          app.activate();
          var comp = app.project.activeItem;
          if (comp && comp instanceof CompItem) {
            app.beginUndoGroup("EasyWheel: New Adjustment Layer");
            var layer = comp.layers.addSolid([0,0,0], "Adjustment Layer", comp.width, comp.height, comp.pixelAspect, comp.duration);
            layer.adjustmentLayer = true;
            app.endUndoGroup();
            "OK";
          } else {
            "ERROR: No active composition";
          }
        } catch(e) {
          "ERROR: " + (e.message || String(e));
        }`;
                break;
            default:
                // Try to map known hardcoded command IDs to their menu names for dynamic lookup
                const menuName = getMenuNameForId(commandId);
                if (menuName) {
                    script = `try {
            app.activate();
            var dynamicId = app.findMenuCommandId("${menuName}");
            if (dynamicId && dynamicId !== 0) {
              app.executeCommand(dynamicId);
              "OK";
            } else {
              app.executeCommand(${commandId});
              "OK";
            }
          } catch(e) {
            "ERROR: " + (e.message || String(e));
          }`;
                }
                else {
                    // For all other standard Adobe menu commands, bring After Effects to the front and execute
                    script = `try { app.activate(); app.executeCommand(${commandId}); "OK"; } catch(e) { "ERROR: " + (e.message || String(e)); }`;
                }
                break;
        }
        const res = await jsx_executor_1.jsxExecutor.execute(script);
        // In our bootstrap.jsx, custom commands return "OK" on success or "ERROR: <reason>" on failure.
        // Standard app.executeCommand returns undefined, so we appended "OK" at the end of the statement.
        const success = res.success && (res.result === 'OK' || res.result === undefined || res.result === 'undefined' || res.result === '');
        const isError = res.result && typeof res.result === 'string' && res.result.indexOf('ERROR:') === 0;
        const errorMsg = isError ? res.result.substring(6).trim() : (res.message || 'Execution failed.');
        return {
            success: success && !isError,
            message: (success && !isError) ? `Command ID ${commandId} executed successfully.` : errorMsg
        };
    }
};
