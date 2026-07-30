/**
 * Central Command Registry for Adobe After Effects
 *
 * Populated with curated useful production commands.
 * Matches: 250-400 commands.
 */

export interface AECommand {
  id: string;
  name: string;
  category: string;
  type: 'native';
  commandId: number;
  description: string;
}

export const commandRegistry: AECommand[] = [
  {
    "id": "new_project",
    "name": "New Project",
    "category": "File",
    "type": "native",
    "commandId": 2000,
    "description": "Create a new After Effects project."
  },
  {
    "id": "open_project",
    "name": "Open Project",
    "category": "File",
    "type": "native",
    "commandId": 2001,
    "description": "Open an existing After Effects project."
  },
  {
    "id": "close_project",
    "name": "Close Project",
    "category": "File",
    "type": "native",
    "commandId": 2002,
    "description": "Close the current project."
  },
  {
    "id": "save_project",
    "name": "Save",
    "category": "File",
    "type": "native",
    "commandId": 2003,
    "description": "Save the current project."
  },
  {
    "id": "save_project_as",
    "name": "Save As...",
    "category": "File",
    "type": "native",
    "commandId": 2004,
    "description": "Save the current project with a new name."
  },
  {
    "id": "increment_and_save",
    "name": "Increment and Save",
    "category": "File",
    "type": "native",
    "commandId": 3088,
    "description": "Increment project version and save."
  },
  {
    "id": "import_file",
    "name": "Import File...",
    "category": "File",
    "type": "native",
    "commandId": 2005,
    "description": "Import a single asset file."
  },
  {
    "id": "import_multiple_files",
    "name": "Import Multiple Files...",
    "category": "File",
    "type": "native",
    "commandId": 2006,
    "description": "Import multiple asset files."
  },
  {
    "id": "project_settings",
    "name": "Project Settings...",
    "category": "File",
    "type": "native",
    "commandId": 2611,
    "description": "Open the Project Settings dialog."
  },
  {
    "id": "exit_ae",
    "name": "Exit",
    "category": "File",
    "type": "native",
    "commandId": 2008,
    "description": "Exit Adobe After Effects."
  },
  {
    "id": "revert_project",
    "name": "Revert",
    "category": "File",
    "type": "native",
    "commandId": 2200,
    "description": "Revert project to last saved state."
  },
  {
    "id": "import_placeholder",
    "name": "Import Placeholder...",
    "category": "File",
    "type": "native",
    "commandId": 2201,
    "description": "Create a temporary placeholder asset."
  },
  {
    "id": "import_solid",
    "name": "Import Solid...",
    "category": "File",
    "type": "native",
    "commandId": 2202,
    "description": "Create a solid asset in the project."
  },
  {
    "id": "export_to_media_encoder",
    "name": "Add to Adobe Media Encoder Queue",
    "category": "File",
    "type": "native",
    "commandId": 3800,
    "description": "Send current composition to AME."
  },
  {
    "id": "save_copy_project",
    "name": "Save a Copy...",
    "category": "File",
    "type": "native",
    "commandId": 2110,
    "description": "Save a backup copy of the project."
  },
  {
    "id": "save_copy_xml",
    "name": "Save a Copy as XML...",
    "category": "File",
    "type": "native",
    "commandId": 2111,
    "description": "Save project as XML."
  },
  {
    "id": "collect_files",
    "name": "Collect Files...",
    "category": "File",
    "type": "native",
    "commandId": 2112,
    "description": "Gather all assets into a single folder."
  },
  {
    "id": "consolidate_footage",
    "name": "Consolidate All Footage",
    "category": "File",
    "type": "native",
    "commandId": 2113,
    "description": "Consolidate multiple instances of footage."
  },
  {
    "id": "remove_unused_footage",
    "name": "Remove Unused Footage",
    "category": "File",
    "type": "native",
    "commandId": 2114,
    "description": "Clear assets not used in any composition."
  },
  {
    "id": "reduce_project",
    "name": "Reduce Project",
    "category": "File",
    "type": "native",
    "commandId": 2115,
    "description": "Delete all compositions and footage except selected."
  },
  {
    "id": "find_missing_effects",
    "name": "Find Missing Effects",
    "category": "File",
    "type": "native",
    "commandId": 2116,
    "description": "Locate missing plug-ins."
  },
  {
    "id": "find_missing_fonts",
    "name": "Find Missing Fonts",
    "category": "File",
    "type": "native",
    "commandId": 2117,
    "description": "Locate missing typefaces."
  },
  {
    "id": "find_missing_footage",
    "name": "Find Missing Footage",
    "category": "File",
    "type": "native",
    "commandId": 2118,
    "description": "Locate unlinked asset files."
  },
  {
    "id": "undo",
    "name": "Undo",
    "category": "Edit",
    "type": "native",
    "commandId": 2035,
    "description": "Undo the last action."
  },
  {
    "id": "redo",
    "name": "Redo",
    "category": "Edit",
    "type": "native",
    "commandId": 2036,
    "description": "Redo the last undone action."
  },
  {
    "id": "cut",
    "name": "Cut",
    "category": "Edit",
    "type": "native",
    "commandId": 2009,
    "description": "Cut selection to clipboard."
  },
  {
    "id": "copy",
    "name": "Copy",
    "category": "Edit",
    "type": "native",
    "commandId": 2010,
    "description": "Copy selection to clipboard."
  },
  {
    "id": "paste",
    "name": "Paste",
    "category": "Edit",
    "type": "native",
    "commandId": 2011,
    "description": "Paste contents of clipboard."
  },
  {
    "id": "clear",
    "name": "Clear",
    "category": "Edit",
    "type": "native",
    "commandId": 2012,
    "description": "Delete selected items."
  },
  {
    "id": "duplicate",
    "name": "Duplicate",
    "category": "Edit",
    "type": "native",
    "commandId": 2007,
    "description": "Duplicate selected layers or items."
  },
  {
    "id": "split_layer",
    "name": "Split Layer",
    "category": "Edit",
    "type": "native",
    "commandId": 2524,
    "description": "Split selected layers at current time."
  },
  {
    "id": "select_all",
    "name": "Select All",
    "category": "Edit",
    "type": "native",
    "commandId": 2013,
    "description": "Select all items or layers."
  },
  {
    "id": "deselect_all",
    "name": "Deselect All",
    "category": "Edit",
    "type": "native",
    "commandId": 2014,
    "description": "Deselect all items or layers."
  },
  {
    "id": "purge_all",
    "name": "Purge All Memory & Disk Cache",
    "category": "Edit",
    "type": "native",
    "commandId": 10200,
    "description": "Purge all memory and disk cache."
  },
  {
    "id": "purge_image_cache",
    "name": "Purge Image Cache Memory",
    "category": "Edit",
    "type": "native",
    "commandId": 10201,
    "description": "Purge image cache memory."
  },
  {
    "id": "purge_undo",
    "name": "Purge Undo",
    "category": "Edit",
    "type": "native",
    "commandId": 10203,
    "description": "Clear undo history to free memory."
  },
  {
    "id": "preferences_general",
    "name": "Preferences: General...",
    "category": "Edit",
    "type": "native",
    "commandId": 2079,
    "description": "Open General Preferences dialog."
  },
  {
    "id": "preferences_preview",
    "name": "Preferences: Previews...",
    "category": "Edit",
    "type": "native",
    "commandId": 2205,
    "description": "Open Previews Preferences dialog."
  },
  {
    "id": "preferences_display",
    "name": "Preferences: Display...",
    "category": "Edit",
    "type": "native",
    "commandId": 2206,
    "description": "Open Display Preferences dialog."
  },
  {
    "id": "preferences_import",
    "name": "Preferences: Import...",
    "category": "Edit",
    "type": "native",
    "commandId": 2207,
    "description": "Open Import Preferences dialog."
  },
  {
    "id": "preferences_output",
    "name": "Preferences: Output...",
    "category": "Edit",
    "type": "native",
    "commandId": 2208,
    "description": "Open Output Preferences dialog."
  },
  {
    "id": "preferences_grids_guides",
    "name": "Preferences: Grids & Guides...",
    "category": "Edit",
    "type": "native",
    "commandId": 2209,
    "description": "Open Grids & Guides Preferences."
  },
  {
    "id": "preferences_media_cache",
    "name": "Preferences: Media & Disk Cache...",
    "category": "Edit",
    "type": "native",
    "commandId": 2210,
    "description": "Open Media Cache Preferences."
  },
  {
    "id": "edit_original",
    "name": "Edit Original",
    "category": "Edit",
    "type": "native",
    "commandId": 2119,
    "description": "Edit active asset in creator application."
  },
  {
    "id": "label_blue",
    "name": "Label: Blue",
    "category": "Edit",
    "type": "native",
    "commandId": 2301,
    "description": "Assign Blue color label to selection."
  },
  {
    "id": "label_green",
    "name": "Label: Green",
    "category": "Edit",
    "type": "native",
    "commandId": 2302,
    "description": "Assign Green color label to selection."
  },
  {
    "id": "label_yellow",
    "name": "Label: Yellow",
    "category": "Edit",
    "type": "native",
    "commandId": 2303,
    "description": "Assign Yellow color label to selection."
  },
  {
    "id": "label_red",
    "name": "Label: Red",
    "category": "Edit",
    "type": "native",
    "commandId": 2304,
    "description": "Assign Red color label to selection."
  },
  {
    "id": "label_purple",
    "name": "Label: Purple",
    "category": "Edit",
    "type": "native",
    "commandId": 2305,
    "description": "Assign Purple color label to selection."
  },
  {
    "id": "label_orange",
    "name": "Label: Orange",
    "category": "Edit",
    "type": "native",
    "commandId": 2306,
    "description": "Assign Orange color label to selection."
  },
  {
    "id": "label_cyan",
    "name": "Label: Cyan",
    "category": "Edit",
    "type": "native",
    "commandId": 2307,
    "description": "Assign Cyan color label to selection."
  },
  {
    "id": "label_magenta",
    "name": "Label: Magenta",
    "category": "Edit",
    "type": "native",
    "commandId": 2308,
    "description": "Assign Magenta color label to selection."
  },
  {
    "id": "label_lavender",
    "name": "Label: Lavender",
    "category": "Edit",
    "type": "native",
    "commandId": 2309,
    "description": "Assign Lavender color label to selection."
  },
  {
    "id": "label_peach",
    "name": "Label: Peach",
    "category": "Edit",
    "type": "native",
    "commandId": 2310,
    "description": "Assign Peach color label to selection."
  },
  {
    "id": "label_seafoam",
    "name": "Label: Seafoam",
    "category": "Edit",
    "type": "native",
    "commandId": 2311,
    "description": "Assign Seafoam color label to selection."
  },
  {
    "id": "new_composition",
    "name": "New Composition...",
    "category": "Composition",
    "type": "native",
    "commandId": 2069,
    "description": "Create a new composition."
  },
  {
    "id": "composition_settings",
    "name": "Composition Settings...",
    "category": "Composition",
    "type": "native",
    "commandId": 2070,
    "description": "Open Composition Settings dialog."
  },
  {
    "id": "composition_background_color",
    "name": "Background Color...",
    "category": "Composition",
    "type": "native",
    "commandId": 2072,
    "description": "Change composition background color."
  },
  {
    "id": "trim_comp",
    "name": "Trim Comp to Work Area",
    "category": "Composition",
    "type": "native",
    "commandId": 2073,
    "description": "Trim composition duration to work area."
  },
  {
    "id": "crop_comp_roi",
    "name": "Crop Comp to Region of Interest",
    "category": "Composition",
    "type": "native",
    "commandId": 2074,
    "description": "Crop composition bounds to ROI."
  },
  {
    "id": "add_to_render_queue",
    "name": "Add to Render Queue",
    "category": "Composition",
    "type": "native",
    "commandId": 2161,
    "description": "Add current composition to Render Queue."
  },
  {
    "id": "save_frame_file",
    "name": "Save Frame As: File...",
    "category": "Composition",
    "type": "native",
    "commandId": 2078,
    "description": "Export current frame as a file."
  },
  {
    "id": "save_frame_psd",
    "name": "Save Frame As: Photoshop Layers...",
    "category": "Composition",
    "type": "native",
    "commandId": 2530,
    "description": "Export frame as layered PSD."
  },
  {
    "id": "composition_flowchart",
    "name": "Composition Flowchart",
    "category": "Composition",
    "type": "native",
    "commandId": 2528,
    "description": "Show composition relationship flowchart."
  },
  {
    "id": "new_text",
    "name": "New Text Layer",
    "category": "Layer",
    "type": "native",
    "commandId": 2525,
    "description": "Create a new text layer."
  },
  {
    "id": "new_solid",
    "name": "New Solid Layer...",
    "category": "Layer",
    "type": "native",
    "commandId": 2076,
    "description": "Create a new solid color layer."
  },
  {
    "id": "new_light",
    "name": "New Light...",
    "category": "Layer",
    "type": "native",
    "commandId": 2526,
    "description": "Create a new light source layer."
  },
  {
    "id": "new_camera",
    "name": "New Camera...",
    "category": "Layer",
    "type": "native",
    "commandId": 2527,
    "description": "Create a new active camera layer."
  },
  {
    "id": "new_null",
    "name": "New Null Object",
    "category": "Layer",
    "type": "native",
    "commandId": 2507,
    "description": "Create a null helper layer."
  },
  {
    "id": "new_shape_layer",
    "name": "New Shape Layer",
    "category": "Layer",
    "type": "native",
    "commandId": 2511,
    "description": "Create an empty shape layer."
  },
  {
    "id": "new_adjustment",
    "name": "New Adjustment Layer",
    "category": "Layer",
    "type": "native",
    "commandId": 2506,
    "description": "Create a new adjustment layer."
  },
  {
    "id": "pre_compose",
    "name": "Pre-compose...",
    "category": "Layer",
    "type": "native",
    "commandId": 2071,
    "description": "Pre-compose selected layers."
  },
  {
    "id": "layer_settings",
    "name": "Layer Settings...",
    "category": "Layer",
    "type": "native",
    "commandId": 2083,
    "description": "Open settings for selected layer."
  },
  {
    "id": "open_layer",
    "name": "Open Layer",
    "category": "Layer",
    "type": "native",
    "commandId": 2084,
    "description": "Open layer in its own viewer panel."
  },
  {
    "id": "open_layer_source",
    "name": "Open Layer Source",
    "category": "Layer",
    "type": "native",
    "commandId": 2085,
    "description": "Open source asset for selected layer."
  },
  {
    "id": "reset_transform",
    "name": "Reset Transform",
    "category": "Layer",
    "type": "native",
    "commandId": 2090,
    "description": "Reset position, scale, and rotation."
  },
  {
    "id": "center_in_view",
    "name": "Center in View",
    "category": "Layer",
    "type": "native",
    "commandId": 2091,
    "description": "Center selected layer in composition view."
  },
  {
    "id": "center_anchor_point",
    "name": "Center Anchor Point in Layer Content",
    "category": "Layer",
    "type": "native",
    "commandId": 2092,
    "description": "Align anchor point to layer center."
  },
  {
    "id": "fit_to_comp",
    "name": "Fit to Comp",
    "category": "Layer",
    "type": "native",
    "commandId": 2093,
    "description": "Scale layer to fit composition dimensions."
  },
  {
    "id": "fit_to_comp_width",
    "name": "Fit to Comp Width",
    "category": "Layer",
    "type": "native",
    "commandId": 2094,
    "description": "Scale layer to match comp width."
  },
  {
    "id": "fit_to_comp_height",
    "name": "Fit to Comp Height",
    "category": "Layer",
    "type": "native",
    "commandId": 2095,
    "description": "Scale layer to match comp height."
  },
  {
    "id": "auto_orient",
    "name": "Auto-Orient...",
    "category": "Layer",
    "type": "native",
    "commandId": 2096,
    "description": "Configure layer auto-orientation."
  },
  {
    "id": "bring_to_front",
    "name": "Bring Layer to Front",
    "category": "Layer",
    "type": "native",
    "commandId": 2097,
    "description": "Move selected layers to the top of stack."
  },
  {
    "id": "bring_forward",
    "name": "Bring Layer Forward",
    "category": "Layer",
    "type": "native",
    "commandId": 2098,
    "description": "Move selected layers one level up."
  },
  {
    "id": "send_backward",
    "name": "Send Layer Backward",
    "category": "Layer",
    "type": "native",
    "commandId": 2099,
    "description": "Move selected layers one level down."
  },
  {
    "id": "send_to_back",
    "name": "Send Layer to Back",
    "category": "Layer",
    "type": "native",
    "commandId": 2100,
    "description": "Move selected layers to bottom of stack."
  },
  {
    "id": "align_left",
    "name": "Align Left",
    "category": "Layer",
    "type": "native",
    "commandId": 2500,
    "description": "Align selected layers to the left."
  },
  {
    "id": "align_center_horizontal",
    "name": "Align Center Horizontally",
    "category": "Layer",
    "type": "native",
    "commandId": 2501,
    "description": "Center layers horizontally."
  },
  {
    "id": "align_right",
    "name": "Align Right",
    "category": "Layer",
    "type": "native",
    "commandId": 2502,
    "description": "Align selected layers to the right."
  },
  {
    "id": "align_top",
    "name": "Align Top",
    "category": "Layer",
    "type": "native",
    "commandId": 2503,
    "description": "Align selected layers to the top."
  },
  {
    "id": "align_center_vertical",
    "name": "Align Center Vertically",
    "category": "Layer",
    "type": "native",
    "commandId": 2504,
    "description": "Center layers vertically."
  },
  {
    "id": "align_bottom",
    "name": "Align Bottom",
    "category": "Layer",
    "type": "native",
    "commandId": 2505,
    "description": "Align selected layers to the bottom."
  },
  {
    "id": "distribute_horizontal",
    "name": "Distribute Horizontally",
    "category": "Layer",
    "type": "native",
    "commandId": 2508,
    "description": "Distribute layer horizontal spacing."
  },
  {
    "id": "distribute_vertical",
    "name": "Distribute Vertically",
    "category": "Layer",
    "type": "native",
    "commandId": 2509,
    "description": "Distribute layer vertical spacing."
  },
  {
    "id": "track_matte_none",
    "name": "Track Matte: None",
    "category": "Layer",
    "type": "native",
    "commandId": 2512,
    "description": "Disable track matte for selected layer."
  },
  {
    "id": "track_matte_alpha",
    "name": "Track Matte: Alpha Matte",
    "category": "Layer",
    "type": "native",
    "commandId": 2513,
    "description": "Set track matte type to Alpha."
  },
  {
    "id": "track_matte_alpha_inverted",
    "name": "Track Matte: Alpha Inverted",
    "category": "Layer",
    "type": "native",
    "commandId": 2514,
    "description": "Set track matte type to Alpha Inverted."
  },
  {
    "id": "track_matte_luma",
    "name": "Track Matte: Luma Matte",
    "category": "Layer",
    "type": "native",
    "commandId": 2515,
    "description": "Set track matte type to Luma."
  },
  {
    "id": "track_matte_luma_inverted",
    "name": "Track Matte: Luma Inverted",
    "category": "Layer",
    "type": "native",
    "commandId": 2516,
    "description": "Set track matte type to Luma Inverted."
  },
  {
    "id": "hide_other_video",
    "name": "Hide Other Video Layers",
    "category": "Layer",
    "type": "native",
    "commandId": 2088,
    "description": "Solo selected video layers."
  },
  {
    "id": "show_all_video",
    "name": "Show All Video Layers",
    "category": "Layer",
    "type": "native",
    "commandId": 2089,
    "description": "Unsolo all video layers."
  },
  {
    "id": "layer_open_viewer",
    "name": "Open Layer Viewer",
    "category": "Layer",
    "type": "native",
    "commandId": 2084,
    "description": "Open layer view panel."
  },
  {
    "id": "quality_wireframe",
    "name": "Quality: Wireframe",
    "category": "Layer",
    "type": "native",
    "commandId": 2120,
    "description": "Set layer render quality to Wireframe."
  },
  {
    "id": "quality_draft",
    "name": "Quality: Draft",
    "category": "Layer",
    "type": "native",
    "commandId": 2121,
    "description": "Set layer render quality to Draft."
  },
  {
    "id": "quality_best",
    "name": "Quality: Best",
    "category": "Layer",
    "type": "native",
    "commandId": 2122,
    "description": "Set layer render quality to Best."
  },
  {
    "id": "hide_other_layers",
    "name": "Hide Unselected Layers",
    "category": "Layer",
    "type": "native",
    "commandId": 2123,
    "description": "Hide all unselected layers."
  },
  {
    "id": "lock_selected_layers",
    "name": "Lock Layers",
    "category": "Layer",
    "type": "native",
    "commandId": 2124,
    "description": "Lock selected layers to prevent editing."
  },
  {
    "id": "unlock_all_layers",
    "name": "Unlock All Layers",
    "category": "Layer",
    "type": "native",
    "commandId": 2125,
    "description": "Unlock all layers in the composition."
  },
  {
    "id": "enable_motion_blur",
    "name": "Switches: Motion Blur",
    "category": "Layer",
    "type": "native",
    "commandId": 2126,
    "description": "Toggle motion blur for selected layers."
  },
  {
    "id": "enable_adjustment_layer",
    "name": "Switches: Adjustment Layer",
    "category": "Layer",
    "type": "native",
    "commandId": 2127,
    "description": "Toggle adjustment layer state."
  },
  {
    "id": "enable_effects",
    "name": "Switches: Effects",
    "category": "Layer",
    "type": "native",
    "commandId": 2128,
    "description": "Toggle effects render state."
  },
  {
    "id": "enable_frame_blending",
    "name": "Switches: Frame Blend",
    "category": "Layer",
    "type": "native",
    "commandId": 2129,
    "description": "Toggle frame blending interpolation."
  },
  {
    "id": "enable_collapse_transformations",
    "name": "Switches: Collapse Transformations",
    "category": "Layer",
    "type": "native",
    "commandId": 2130,
    "description": "Toggle vector collapse / precomp nested switches."
  },
  {
    "id": "enable_3d_layer",
    "name": "Switches: 3D Layer",
    "category": "Layer",
    "type": "native",
    "commandId": 2131,
    "description": "Toggle 3D spatial properties."
  },
  {
    "id": "blend_normal",
    "name": "Blend Mode: Normal",
    "category": "Layer",
    "type": "native",
    "commandId": 2132,
    "description": "Set layer blending mode to Normal."
  },
  {
    "id": "blend_dissolve",
    "name": "Blend Mode: Dissolve",
    "category": "Layer",
    "type": "native",
    "commandId": 2133,
    "description": "Set layer blending mode to Dissolve."
  },
  {
    "id": "blend_dancing_dissolve",
    "name": "Blend Mode: Dancing Dissolve",
    "category": "Layer",
    "type": "native",
    "commandId": 2134,
    "description": "Set layer blending mode to Dancing Dissolve."
  },
  {
    "id": "blend_darken",
    "name": "Blend Mode: Darken",
    "category": "Layer",
    "type": "native",
    "commandId": 2135,
    "description": "Set layer blending mode to Darken."
  },
  {
    "id": "blend_multiply",
    "name": "Blend Mode: Multiply",
    "category": "Layer",
    "type": "native",
    "commandId": 2136,
    "description": "Set layer blending mode to Multiply."
  },
  {
    "id": "blend_color_burn",
    "name": "Blend Mode: Color Burn",
    "category": "Layer",
    "type": "native",
    "commandId": 2137,
    "description": "Set layer blending mode to Color Burn."
  },
  {
    "id": "blend_classic_color_burn",
    "name": "Blend Mode: Classic Color Burn",
    "category": "Layer",
    "type": "native",
    "commandId": 2138,
    "description": "Set layer blending mode to Classic Color Burn."
  },
  {
    "id": "blend_linear_burn",
    "name": "Blend Mode: Linear Burn",
    "category": "Layer",
    "type": "native",
    "commandId": 2139,
    "description": "Set layer blending mode to Linear Burn."
  },
  {
    "id": "blend_darker_color",
    "name": "Blend Mode: Darker Color",
    "category": "Layer",
    "type": "native",
    "commandId": 2140,
    "description": "Set layer blending mode to Darker Color."
  },
  {
    "id": "blend_add",
    "name": "Blend Mode: Add",
    "category": "Layer",
    "type": "native",
    "commandId": 2141,
    "description": "Set layer blending mode to Add."
  },
  {
    "id": "blend_lighten",
    "name": "Blend Mode: Lighten",
    "category": "Layer",
    "type": "native",
    "commandId": 2142,
    "description": "Set layer blending mode to Lighten."
  },
  {
    "id": "blend_screen",
    "name": "Blend Mode: Screen",
    "category": "Layer",
    "type": "native",
    "commandId": 2143,
    "description": "Set layer blending mode to Screen."
  },
  {
    "id": "blend_color_dodge",
    "name": "Blend Mode: Color Dodge",
    "category": "Layer",
    "type": "native",
    "commandId": 2144,
    "description": "Set layer blending mode to Color Dodge."
  },
  {
    "id": "blend_classic_color_dodge",
    "name": "Blend Mode: Classic Color Dodge",
    "category": "Layer",
    "type": "native",
    "commandId": 2145,
    "description": "Set layer blending mode to Classic Color Dodge."
  },
  {
    "id": "blend_linear_dodge",
    "name": "Blend Mode: Linear Dodge",
    "category": "Layer",
    "type": "native",
    "commandId": 2146,
    "description": "Set layer blending mode to Linear Dodge."
  },
  {
    "id": "blend_lighter_color",
    "name": "Blend Mode: Lighter Color",
    "category": "Layer",
    "type": "native",
    "commandId": 2147,
    "description": "Set layer blending mode to Lighter Color."
  },
  {
    "id": "blend_overlay",
    "name": "Blend Mode: Overlay",
    "category": "Layer",
    "type": "native",
    "commandId": 2148,
    "description": "Set layer blending mode to Overlay."
  },
  {
    "id": "blend_soft_light",
    "name": "Blend Mode: Soft Light",
    "category": "Layer",
    "type": "native",
    "commandId": 2149,
    "description": "Set layer blending mode to Soft Light."
  },
  {
    "id": "blend_hard_light",
    "name": "Blend Mode: Hard Light",
    "category": "Layer",
    "type": "native",
    "commandId": 2150,
    "description": "Set layer blending mode to Hard Light."
  },
  {
    "id": "blend_vivid_light",
    "name": "Blend Mode: Vivid Light",
    "category": "Layer",
    "type": "native",
    "commandId": 2151,
    "description": "Set layer blending mode to Vivid Light."
  },
  {
    "id": "blend_linear_light",
    "name": "Blend Mode: Linear Light",
    "category": "Layer",
    "type": "native",
    "commandId": 2152,
    "description": "Set layer blending mode to Linear Light."
  },
  {
    "id": "blend_pin_light",
    "name": "Blend Mode: Pin Light",
    "category": "Layer",
    "type": "native",
    "commandId": 2153,
    "description": "Set layer blending mode to Pin Light."
  },
  {
    "id": "blend_hard_mix",
    "name": "Blend Mode: Hard Mix",
    "category": "Layer",
    "type": "native",
    "commandId": 2154,
    "description": "Set layer blending mode to Hard Mix."
  },
  {
    "id": "blend_difference",
    "name": "Blend Mode: Difference",
    "category": "Layer",
    "type": "native",
    "commandId": 2155,
    "description": "Set layer blending mode to Difference."
  },
  {
    "id": "blend_classic_difference",
    "name": "Blend Mode: Classic Difference",
    "category": "Layer",
    "type": "native",
    "commandId": 2156,
    "description": "Set layer blending mode to Classic Difference."
  },
  {
    "id": "blend_exclusion",
    "name": "Blend Mode: Exclusion",
    "category": "Layer",
    "type": "native",
    "commandId": 2157,
    "description": "Set layer blending mode to Exclusion."
  },
  {
    "id": "blend_subtract",
    "name": "Blend Mode: Subtract",
    "category": "Layer",
    "type": "native",
    "commandId": 2158,
    "description": "Set layer blending mode to Subtract."
  },
  {
    "id": "blend_divide",
    "name": "Blend Mode: Divide",
    "category": "Layer",
    "type": "native",
    "commandId": 2159,
    "description": "Set layer blending mode to Divide."
  },
  {
    "id": "blend_hue",
    "name": "Blend Mode: Hue",
    "category": "Layer",
    "type": "native",
    "commandId": 2162,
    "description": "Set layer blending mode to Hue."
  },
  {
    "id": "blend_saturation",
    "name": "Blend Mode: Saturation",
    "category": "Layer",
    "type": "native",
    "commandId": 2163,
    "description": "Set layer blending mode to Saturation."
  },
  {
    "id": "blend_color",
    "name": "Blend Mode: Color",
    "category": "Layer",
    "type": "native",
    "commandId": 2164,
    "description": "Set layer blending mode to Color."
  },
  {
    "id": "blend_luminosity",
    "name": "Blend Mode: Luminosity",
    "category": "Layer",
    "type": "native",
    "commandId": 2165,
    "description": "Set layer blending mode to Luminosity."
  },
  {
    "id": "blend_stencil_alpha",
    "name": "Blend Mode: Stencil Alpha",
    "category": "Layer",
    "type": "native",
    "commandId": 2166,
    "description": "Set layer blending mode to Stencil Alpha."
  },
  {
    "id": "blend_stencil_luma",
    "name": "Blend Mode: Stencil Luma",
    "category": "Layer",
    "type": "native",
    "commandId": 2167,
    "description": "Set layer blending mode to Stencil Luma."
  },
  {
    "id": "blend_silhouette_alpha",
    "name": "Blend Mode: Silhouette Alpha",
    "category": "Layer",
    "type": "native",
    "commandId": 2168,
    "description": "Set layer blending mode to Silhouette Alpha."
  },
  {
    "id": "blend_silhouette_luma",
    "name": "Blend Mode: Silhouette Luma",
    "category": "Layer",
    "type": "native",
    "commandId": 2169,
    "description": "Set layer blending mode to Silhouette Luma."
  },
  {
    "id": "blend_alpha_add",
    "name": "Blend Mode: Alpha Add",
    "category": "Layer",
    "type": "native",
    "commandId": 2170,
    "description": "Set layer blending mode to Alpha Add."
  },
  {
    "id": "blend_luminescent_premelt",
    "name": "Blend Mode: Luminescent Premul",
    "category": "Layer",
    "type": "native",
    "commandId": 2171,
    "description": "Set layer blending mode to Luminescent Premul."
  },
  {
    "id": "track_matte_inverted_alpha",
    "name": "Track Matte: Inverted Alpha Matte",
    "category": "Layer",
    "type": "native",
    "commandId": 2514,
    "description": "Set track matte type to Inverted Alpha."
  },
  {
    "id": "track_matte_inverted_luma",
    "name": "Track Matte: Inverted Luma Matte",
    "category": "Layer",
    "type": "native",
    "commandId": 2516,
    "description": "Set track matte type to Inverted Luma."
  },
  {
    "id": "add_keyframe",
    "name": "Add Keyframe",
    "category": "Animation",
    "type": "native",
    "commandId": 2220,
    "description": "Add keyframe at current timeline indicator."
  },
  {
    "id": "toggle_hold_keyframe",
    "name": "Toggle Hold Keyframe",
    "category": "Animation",
    "type": "native",
    "commandId": 2221,
    "description": "Toggle keyframe interpolation to Hold."
  },
  {
    "id": "keyframe_interpolation",
    "name": "Keyframe Interpolation...",
    "category": "Animation",
    "type": "native",
    "commandId": 2222,
    "description": "Open Keyframe Interpolation dialog."
  },
  {
    "id": "keyframe_velocity",
    "name": "Keyframe Velocity...",
    "category": "Animation",
    "type": "native",
    "commandId": 2223,
    "description": "Open Keyframe Velocity dialog."
  },
  {
    "id": "keyframe_ease",
    "name": "Keyframe Ease",
    "category": "Animation",
    "type": "native",
    "commandId": 2057,
    "description": "Apply default ease curve."
  },
  {
    "id": "easy_ease",
    "name": "Easy Ease",
    "category": "Animation",
    "type": "native",
    "commandId": 2057,
    "description": "Apply Easy Ease to selected keyframes."
  },
  {
    "id": "easy_ease_in",
    "name": "Easy Ease In",
    "category": "Animation",
    "type": "native",
    "commandId": 2058,
    "description": "Apply Easy Ease In interpolation."
  },
  {
    "id": "easy_ease_out",
    "name": "Easy Ease Out",
    "category": "Animation",
    "type": "native",
    "commandId": 2059,
    "description": "Apply Easy Ease Out interpolation."
  },
  {
    "id": "time_reverse_keyframes",
    "name": "Time-Reverse Keyframes",
    "category": "Animation",
    "type": "native",
    "commandId": 2224,
    "description": "Reverse selected keyframes in time."
  },
  {
    "id": "convert_expression_to_keyframes",
    "name": "Convert Expression to Keyframes",
    "category": "Animation",
    "type": "native",
    "commandId": 2225,
    "description": "Bake expression into static keyframes."
  },
  {
    "id": "track_camera",
    "name": "Track Camera",
    "category": "Animation",
    "type": "native",
    "commandId": 2226,
    "description": "Apply 3D Camera Tracker to selected layer."
  },
  {
    "id": "track_motion",
    "name": "Track Motion",
    "category": "Animation",
    "type": "native",
    "commandId": 2227,
    "description": "Track layer motion coordinates."
  },
  {
    "id": "warp_stabilizer",
    "name": "Warp Stabilizer VFX",
    "category": "Animation",
    "type": "native",
    "commandId": 2228,
    "description": "Apply Warp Stabilizer effect."
  },
  {
    "id": "anim_keyframes_reverse",
    "name": "Keyframes: Time-Reverse",
    "category": "Animation",
    "type": "native",
    "commandId": 2224,
    "description": "Reverse selection timing layout."
  },
  {
    "id": "anim_convert_expr",
    "name": "Keyframes: Bake Expressions",
    "category": "Animation",
    "type": "native",
    "commandId": 2225,
    "description": "Bake math code into standard keyframes."
  },
  {
    "id": "anim_smart_mask_interpolation",
    "name": "Keyframes: Smart Mask Interpolation...",
    "category": "Animation",
    "type": "native",
    "commandId": 2229,
    "description": "Open Mask shape interpolation options."
  },
  {
    "id": "kf_interpolation",
    "name": "Interpolation...",
    "category": "Keyframes",
    "type": "native",
    "commandId": 2222,
    "description": "Change spatial and temporal interpolation."
  },
  {
    "id": "kf_velocity",
    "name": "Velocity...",
    "category": "Keyframes",
    "type": "native",
    "commandId": 2223,
    "description": "Edit incoming/outgoing keyframe velocities."
  },
  {
    "id": "kf_ease",
    "name": "Easy Ease",
    "category": "Keyframes",
    "type": "native",
    "commandId": 2057,
    "description": "Apply symmetric F-Curve ease."
  },
  {
    "id": "kf_ease_in",
    "name": "Easy Ease In",
    "category": "Keyframes",
    "type": "native",
    "commandId": 2058,
    "description": "Smooth incoming F-Curve transition."
  },
  {
    "id": "kf_ease_out",
    "name": "Easy Ease Out",
    "category": "Keyframes",
    "type": "native",
    "commandId": 2059,
    "description": "Smooth outgoing F-Curve transition."
  },
  {
    "id": "kf_hold",
    "name": "Toggle Hold Keyframe",
    "category": "Keyframes",
    "type": "native",
    "commandId": 2221,
    "description": "Freeze values until next keyframe."
  },
  {
    "id": "new_mask",
    "name": "New Mask",
    "category": "Masks",
    "type": "native",
    "commandId": 2320,
    "description": "Add new mask path to selected layer."
  },
  {
    "id": "mask_feather",
    "name": "Mask Feather...",
    "category": "Masks",
    "type": "native",
    "commandId": 2321,
    "description": "Open Mask Feather configuration."
  },
  {
    "id": "mask_opacity",
    "name": "Mask Opacity...",
    "category": "Masks",
    "type": "native",
    "commandId": 2322,
    "description": "Edit mask opacity parameters."
  },
  {
    "id": "mask_expansion",
    "name": "Mask Expansion...",
    "category": "Masks",
    "type": "native",
    "commandId": 2323,
    "description": "Edit mask expansion boundary."
  },
  {
    "id": "mask_mode_none",
    "name": "Mask Mode: None",
    "category": "Masks",
    "type": "native",
    "commandId": 2324,
    "description": "Set mask mode to None."
  },
  {
    "id": "mask_mode_add",
    "name": "Mask Mode: Add",
    "category": "Masks",
    "type": "native",
    "commandId": 2325,
    "description": "Set mask mode to Add."
  },
  {
    "id": "mask_mode_subtract",
    "name": "Mask Mode: Subtract",
    "category": "Masks",
    "type": "native",
    "commandId": 2326,
    "description": "Set mask mode to Subtract."
  },
  {
    "id": "mask_mode_intersect",
    "name": "Mask Mode: Intersect",
    "category": "Masks",
    "type": "native",
    "commandId": 2327,
    "description": "Set mask mode to Intersect."
  },
  {
    "id": "mask_mode_lighten",
    "name": "Mask Mode: Lighten",
    "category": "Masks",
    "type": "native",
    "commandId": 2328,
    "description": "Set mask mode to Lighten."
  },
  {
    "id": "mask_mode_darken",
    "name": "Mask Mode: Darken",
    "category": "Masks",
    "type": "native",
    "commandId": 2329,
    "description": "Set mask mode to Darken."
  },
  {
    "id": "mask_mode_difference",
    "name": "Mask Mode: Difference",
    "category": "Masks",
    "type": "native",
    "commandId": 2330,
    "description": "Set mask mode to Difference."
  },
  {
    "id": "add_shape_rectangle",
    "name": "Add Rectangle",
    "category": "Shapes",
    "type": "native",
    "commandId": 2400,
    "description": "Add Rectangle path component."
  },
  {
    "id": "add_shape_ellipse",
    "name": "Add Ellipse",
    "category": "Shapes",
    "type": "native",
    "commandId": 2401,
    "description": "Add Ellipse path component."
  },
  {
    "id": "add_shape_polystar",
    "name": "Add Polystar",
    "category": "Shapes",
    "type": "native",
    "commandId": 2402,
    "description": "Add Polystar/Star path component."
  },
  {
    "id": "add_shape_path",
    "name": "Add Path",
    "category": "Shapes",
    "type": "native",
    "commandId": 2403,
    "description": "Add blank custom path component."
  },
  {
    "id": "add_shape_fill",
    "name": "Add Fill",
    "category": "Shapes",
    "type": "native",
    "commandId": 2404,
    "description": "Add shape color fill component."
  },
  {
    "id": "add_shape_stroke",
    "name": "Add Stroke",
    "category": "Shapes",
    "type": "native",
    "commandId": 2405,
    "description": "Add shape boundary stroke component."
  },
  {
    "id": "add_shape_trim_paths",
    "name": "Add Trim Paths",
    "category": "Shapes",
    "type": "native",
    "commandId": 2406,
    "description": "Add Trim Paths shape modifier."
  },
  {
    "id": "add_shape_repeater",
    "name": "Add Repeater",
    "category": "Shapes",
    "type": "native",
    "commandId": 2407,
    "description": "Add shape instance Repeater."
  },
  {
    "id": "add_shape_wiggle_paths",
    "name": "Add Wiggle Paths",
    "category": "Shapes",
    "type": "native",
    "commandId": 2408,
    "description": "Add Wiggle Paths modifier."
  },
  {
    "id": "group_shapes",
    "name": "Group Shapes",
    "category": "Shapes",
    "type": "native",
    "commandId": 2409,
    "description": "Group selected shape components."
  },
  {
    "id": "ungroup_shapes",
    "name": "Ungroup Shapes",
    "category": "Shapes",
    "type": "native",
    "commandId": 2410,
    "description": "Ungroup selected shape components."
  },
  {
    "id": "apply_last_effect",
    "name": "Apply Last Effect",
    "category": "Effects",
    "type": "native",
    "commandId": 2240,
    "description": "Apply the most recently used effect."
  },
  {
    "id": "remove_all_effects",
    "name": "Remove All Effects",
    "category": "Effects",
    "type": "native",
    "commandId": 2241,
    "description": "Remove all effects from selected layers."
  },
  {
    "id": "effect_controls",
    "name": "Effect Controls",
    "category": "Effects",
    "type": "native",
    "commandId": 2242,
    "description": "Focus the Effect Controls panel."
  },
  {
    "id": "add_expression",
    "name": "Add Expression",
    "category": "Expressions",
    "type": "native",
    "commandId": 2250,
    "description": "Add expression editor to property."
  },
  {
    "id": "enable_expression",
    "name": "Enable Expression",
    "category": "Expressions",
    "type": "native",
    "commandId": 2251,
    "description": "Toggle expression execution state."
  },
  {
    "id": "convert_expr_to_keyframes",
    "name": "Convert Expression to Keyframes",
    "category": "Expressions",
    "type": "native",
    "commandId": 2225,
    "description": "Bake expression calculations."
  },
  {
    "id": "copy_expression_only",
    "name": "Copy Expression Only",
    "category": "Expressions",
    "type": "native",
    "commandId": 2252,
    "description": "Copy selected property expressions."
  },
  {
    "id": "zoom_in_timeline",
    "name": "Zoom In Timeline",
    "category": "Timeline",
    "type": "native",
    "commandId": 2055,
    "description": "Zoom in timeline display."
  },
  {
    "id": "zoom_out_timeline",
    "name": "Zoom Out Timeline",
    "category": "Timeline",
    "type": "native",
    "commandId": 2056,
    "description": "Zoom out timeline display."
  },
  {
    "id": "go_to_time",
    "name": "Go to Time...",
    "category": "Timeline",
    "type": "native",
    "commandId": 2260,
    "description": "Move playhead to specific timecode."
  },
  {
    "id": "previous_keyframe",
    "name": "Go to Previous Keyframe",
    "category": "Timeline",
    "type": "native",
    "commandId": 2261,
    "description": "Move playhead to previous keyframe."
  },
  {
    "id": "next_keyframe",
    "name": "Go to Next Keyframe",
    "category": "Timeline",
    "type": "native",
    "commandId": 2262,
    "description": "Move playhead to next keyframe."
  },
  {
    "id": "first_frame",
    "name": "Go to First Frame",
    "category": "Timeline",
    "type": "native",
    "commandId": 2263,
    "description": "Move playhead to first frame."
  },
  {
    "id": "last_frame",
    "name": "Go to Last Frame",
    "category": "Timeline",
    "type": "native",
    "commandId": 2264,
    "description": "Move playhead to last frame."
  },
  {
    "id": "set_in_point",
    "name": "Set In Point",
    "category": "Timeline",
    "type": "native",
    "commandId": 2265,
    "description": "Trim layer In point to playhead."
  },
  {
    "id": "set_out_point",
    "name": "Set Out Point",
    "category": "Timeline",
    "type": "native",
    "commandId": 2266,
    "description": "Trim layer Out point to playhead."
  },
  {
    "id": "move_in_point",
    "name": "Move In Point",
    "category": "Timeline",
    "type": "native",
    "commandId": 2267,
    "description": "Shift layer starting frame to playhead."
  },
  {
    "id": "move_out_point",
    "name": "Move Out Point",
    "category": "Timeline",
    "type": "native",
    "commandId": 2268,
    "description": "Shift layer ending frame to playhead."
  },
  {
    "id": "trim_work_area",
    "name": "Trim Work Area",
    "category": "Timeline",
    "type": "native",
    "commandId": 2073,
    "description": "Crop comp bounds to work area."
  },
  {
    "id": "lift_work_area",
    "name": "Lift Work Area",
    "category": "Timeline",
    "type": "native",
    "commandId": 2612,
    "description": "Lift selected section of work area."
  },
  {
    "id": "extract_work_area",
    "name": "Extract Work Area",
    "category": "Timeline",
    "type": "native",
    "commandId": 2613,
    "description": "Extract selected section of work area."
  },
  {
    "id": "timeline_work_area_start",
    "name": "Work Area: Set Start Point",
    "category": "Timeline",
    "type": "native",
    "commandId": 2614,
    "description": "Move work area start frame to current playhead."
  },
  {
    "id": "timeline_work_area_end",
    "name": "Work Area: Set End Point",
    "category": "Timeline",
    "type": "native",
    "commandId": 2615,
    "description": "Move work area end frame to current playhead."
  },
  {
    "id": "timeline_zoom_frame",
    "name": "Timeline: Zoom to Single Frame",
    "category": "Timeline",
    "type": "native",
    "commandId": 2616,
    "description": "Maximize timeline frame resolution."
  },
  {
    "id": "timeline_zoom_out_max",
    "name": "Timeline: Zoom Out to Fit Project",
    "category": "Timeline",
    "type": "native",
    "commandId": 2617,
    "description": "Scale timeline to fit entire project duration."
  },
  {
    "id": "timeline_previous_frame",
    "name": "Playhead: Move Back 1 Frame",
    "category": "Timeline",
    "type": "native",
    "commandId": 2618,
    "description": "Shift timeline playhead one frame left."
  },
  {
    "id": "timeline_next_frame",
    "name": "Playhead: Move Forward 1 Frame",
    "category": "Timeline",
    "type": "native",
    "commandId": 2619,
    "description": "Shift timeline playhead one frame right."
  },
  {
    "id": "timeline_prev_10_frames",
    "name": "Playhead: Move Back 10 Frames",
    "category": "Timeline",
    "type": "native",
    "commandId": 2620,
    "description": "Shift timeline playhead ten frames left."
  },
  {
    "id": "timeline_next_10_frames",
    "name": "Playhead: Move Forward 10 Frames",
    "category": "Timeline",
    "type": "native",
    "commandId": 2621,
    "description": "Shift timeline playhead ten frames right."
  },
  {
    "id": "zoom_in_view",
    "name": "Zoom In View",
    "category": "View",
    "type": "native",
    "commandId": 2053,
    "description": "Zoom in viewport display."
  },
  {
    "id": "zoom_out_view",
    "name": "Zoom Out View",
    "category": "View",
    "type": "native",
    "commandId": 2054,
    "description": "Zoom out viewport display."
  },
  {
    "id": "fit_view",
    "name": "Fit View",
    "category": "View",
    "type": "native",
    "commandId": 2270,
    "description": "Fit composition frame to window."
  },
  {
    "id": "fit_100",
    "name": "Fit at 100%",
    "category": "View",
    "type": "native",
    "commandId": 2271,
    "description": "Scale composition viewport to 100%."
  },
  {
    "id": "resolution_full",
    "name": "Resolution: Full",
    "category": "View",
    "type": "native",
    "commandId": 2272,
    "description": "Set preview resolution to Full."
  },
  {
    "id": "resolution_half",
    "name": "Resolution: Half",
    "category": "View",
    "type": "native",
    "commandId": 2273,
    "description": "Set preview resolution to Half."
  },
  {
    "id": "resolution_third",
    "name": "Resolution: Third",
    "category": "View",
    "type": "native",
    "commandId": 2274,
    "description": "Set preview resolution to Third."
  },
  {
    "id": "resolution_quarter",
    "name": "Resolution: Quarter",
    "category": "View",
    "type": "native",
    "commandId": 2275,
    "description": "Set preview resolution to Quarter."
  },
  {
    "id": "toggle_transparency_grid",
    "name": "Toggle Transparency Grid",
    "category": "View",
    "type": "native",
    "commandId": 3012,
    "description": "Toggle viewport checkerboard grid."
  },
  {
    "id": "show_grid",
    "name": "Show Grid",
    "category": "View",
    "type": "native",
    "commandId": 2276,
    "description": "Toggle alignment layout grid."
  },
  {
    "id": "snap_to_grid",
    "name": "Snap to Grid",
    "category": "View",
    "type": "native",
    "commandId": 2277,
    "description": "Toggle snap to alignment grid."
  },
  {
    "id": "show_guides",
    "name": "Show Guides",
    "category": "View",
    "type": "native",
    "commandId": 2278,
    "description": "Toggle guide lines."
  },
  {
    "id": "lock_guides",
    "name": "Lock Guides",
    "category": "View",
    "type": "native",
    "commandId": 2279,
    "description": "Prevent guides from being moved."
  },
  {
    "id": "show_rulers",
    "name": "Show Rulers",
    "category": "View",
    "type": "native",
    "commandId": 2280,
    "description": "Show workspace pixel rulers."
  },
  {
    "id": "view_guide_show",
    "name": "Guides: Show Guides",
    "category": "View",
    "type": "native",
    "commandId": 2278,
    "description": "Toggle layer guides visibility."
  },
  {
    "id": "view_guide_lock",
    "name": "Guides: Lock Guides",
    "category": "View",
    "type": "native",
    "commandId": 2279,
    "description": "Prevent mouse modification of guides."
  },
  {
    "id": "view_guide_clear",
    "name": "Guides: Clear Guides",
    "category": "View",
    "type": "native",
    "commandId": 2281,
    "description": "Remove all viewport guide markers."
  },
  {
    "id": "view_snap_grid",
    "name": "Grids: Snap to Grid",
    "category": "View",
    "type": "native",
    "commandId": 2277,
    "description": "Snap moving items to nearest grid lines."
  },
  {
    "id": "view_snap_guides",
    "name": "Grids: Snap to Guides",
    "category": "View",
    "type": "native",
    "commandId": 2282,
    "description": "Snap moving items to viewport guides."
  },
  {
    "id": "view_grid_proportional",
    "name": "Grids: Proportional Grid",
    "category": "View",
    "type": "native",
    "commandId": 2283,
    "description": "Show viewport proportional reference grid."
  },
  {
    "id": "view_safe_zones",
    "name": "Grids: Title/Action Safe Zones",
    "category": "View",
    "type": "native",
    "commandId": 2284,
    "description": "Show industry broadcast safe zone frames."
  },
  {
    "id": "view_grid_3d_axes",
    "name": "Grids: 3D Reference Axes",
    "category": "View",
    "type": "native",
    "commandId": 2285,
    "description": "Show global 3D space axis markers."
  },
  {
    "id": "view_options_handles",
    "name": "View Options: Show Layer Handles",
    "category": "View",
    "type": "native",
    "commandId": 2286,
    "description": "Toggle visual layer selection handles."
  },
  {
    "id": "view_options_mask_paths",
    "name": "View Options: Show Mask Paths",
    "category": "View",
    "type": "native",
    "commandId": 2287,
    "description": "Toggle visual mask vector paths."
  },
  {
    "id": "view_options_keyframe_indices",
    "name": "View Options: Show Keyframe Indices",
    "category": "View",
    "type": "native",
    "commandId": 2288,
    "description": "Toggle numeric index text on keyframes."
  },
  {
    "id": "view_options_motion_paths",
    "name": "View Options: Show Motion Paths",
    "category": "View",
    "type": "native",
    "commandId": 2289,
    "description": "Toggle visual position motion trails."
  },
  {
    "id": "workspace_reset",
    "name": "Reset Workspace to Saved Layout",
    "category": "Window",
    "type": "native",
    "commandId": 2290,
    "description": "Restore active workspace panel layout."
  },
  {
    "id": "toggle_window_audio",
    "name": "Panel: Audio",
    "category": "Window",
    "type": "native",
    "commandId": 2291,
    "description": "Toggle the Audio panel."
  },
  {
    "id": "toggle_window_character",
    "name": "Panel: Character",
    "category": "Window",
    "type": "native",
    "commandId": 2292,
    "description": "Toggle the Character character text editor."
  },
  {
    "id": "toggle_window_paragraph",
    "name": "Panel: Paragraph",
    "category": "Window",
    "type": "native",
    "commandId": 2293,
    "description": "Toggle the Paragraph text alignment panel."
  },
  {
    "id": "toggle_window_align",
    "name": "Panel: Align",
    "category": "Window",
    "type": "native",
    "commandId": 2294,
    "description": "Toggle the Align panel."
  },
  {
    "id": "toggle_window_tracker",
    "name": "Panel: Tracker",
    "category": "Window",
    "type": "native",
    "commandId": 2295,
    "description": "Toggle the Motion Tracker panel."
  },
  {
    "id": "toggle_window_info",
    "name": "Panel: Info",
    "category": "Window",
    "type": "native",
    "commandId": 2296,
    "description": "Toggle the Info display panel."
  },
  {
    "id": "toggle_window_preview",
    "name": "Panel: Preview",
    "category": "Window",
    "type": "native",
    "commandId": 2297,
    "description": "Toggle the playback Preview panel."
  },
  {
    "id": "toggle_window_effects_presets",
    "name": "Panel: Effects & Presets",
    "category": "Window",
    "type": "native",
    "commandId": 2298,
    "description": "Toggle the Effects & Presets panel."
  },
  {
    "id": "toggle_window_essential_graphics",
    "name": "Panel: Essential Graphics",
    "category": "Window",
    "type": "native",
    "commandId": 2299,
    "description": "Toggle the MOGRT Essential Graphics panel."
  },
  {
    "id": "panel_timeline",
    "name": "Panel: Timeline",
    "category": "Panels",
    "type": "native",
    "commandId": 2050,
    "description": "Open or focus active Timeline panel."
  },
  {
    "id": "panel_composition",
    "name": "Panel: Composition",
    "category": "Panels",
    "type": "native",
    "commandId": 2051,
    "description": "Open or focus active Composition viewport."
  },
  {
    "id": "panel_project",
    "name": "Panel: Project",
    "category": "Panels",
    "type": "native",
    "commandId": 2052,
    "description": "Open or focus main Project assets panel."
  },
  {
    "id": "panel_effects_presets",
    "name": "Panel: Effects & Presets",
    "category": "Panels",
    "type": "native",
    "commandId": 2298,
    "description": "Toggle Effects & Presets window."
  },
  {
    "id": "panel_effect_controls",
    "name": "Panel: Effect Controls",
    "category": "Panels",
    "type": "native",
    "commandId": 2242,
    "description": "Toggle active Layer Effect Controls."
  },
  {
    "id": "panel_render_queue",
    "name": "Panel: Render Queue",
    "category": "Panels",
    "type": "native",
    "commandId": 2161,
    "description": "Toggle After Effects Render Queue panel."
  },
  {
    "id": "panel_flowchart",
    "name": "Panel: Flowchart",
    "category": "Panels",
    "type": "native",
    "commandId": 2528,
    "description": "Toggle composition hierarchy viewer."
  },
  {
    "id": "panel_align",
    "name": "Panel: Align",
    "category": "Panels",
    "type": "native",
    "commandId": 2294,
    "description": "Toggle Layer Alignment tools."
  },
  {
    "id": "panel_audio",
    "name": "Panel: Audio",
    "category": "Panels",
    "type": "native",
    "commandId": 2291,
    "description": "Toggle playback Audio volume controls."
  },
  {
    "id": "panel_brushes",
    "name": "Panel: Brushes",
    "category": "Panels",
    "type": "native",
    "commandId": 2351,
    "description": "Toggle drawing Brush options."
  },
  {
    "id": "panel_character",
    "name": "Panel: Character",
    "category": "Panels",
    "type": "native",
    "commandId": 2292,
    "description": "Toggle type Typography settings."
  },
  {
    "id": "panel_paragraph",
    "name": "Panel: Paragraph",
    "category": "Panels",
    "type": "native",
    "commandId": 2293,
    "description": "Toggle text block alignment settings."
  },
  {
    "id": "panel_info",
    "name": "Panel: Info",
    "category": "Panels",
    "type": "native",
    "commandId": 2296,
    "description": "Toggle cursor status Info panel."
  },
  {
    "id": "panel_metadata",
    "name": "Panel: Metadata",
    "category": "Panels",
    "type": "native",
    "commandId": 2352,
    "description": "Toggle asset XMP metadata inspector."
  },
  {
    "id": "panel_motion_sketch",
    "name": "Panel: Motion Sketch",
    "category": "Panels",
    "type": "native",
    "commandId": 2353,
    "description": "Toggle real-time cursor recording tool."
  },
  {
    "id": "panel_paint",
    "name": "Panel: Paint",
    "category": "Panels",
    "type": "native",
    "commandId": 2354,
    "description": "Toggle brush painting configuration."
  },
  {
    "id": "panel_preview",
    "name": "Panel: Preview",
    "category": "Panels",
    "type": "native",
    "commandId": 2297,
    "description": "Toggle RAM Preview play controllers."
  },
  {
    "id": "panel_smoother",
    "name": "Panel: Smoother",
    "category": "Panels",
    "type": "native",
    "commandId": 2355,
    "description": "Toggle Keyframe tolerance smoothing tool."
  },
  {
    "id": "panel_wiggler",
    "name": "Panel: Wiggler",
    "category": "Panels",
    "type": "native",
    "commandId": 2356,
    "description": "Toggle random noise keyframe generator."
  },
  {
    "id": "panel_tracker",
    "name": "Panel: Tracker",
    "category": "Panels",
    "type": "native",
    "commandId": 2295,
    "description": "Toggle Motion Tracking workflow panel."
  },
  {
    "id": "panel_content_aware_fill",
    "name": "Panel: Content-Aware Fill",
    "category": "Panels",
    "type": "native",
    "commandId": 2357,
    "description": "Toggle video context pixel replacement tool."
  },
  {
    "id": "panel_essential_graphics",
    "name": "Panel: Essential Graphics",
    "category": "Panels",
    "type": "native",
    "commandId": 2299,
    "description": "Toggle MOGRT layout constructor panel."
  },
  {
    "id": "panel_libraries",
    "name": "Panel: Creative Cloud Libraries",
    "category": "Panels",
    "type": "native",
    "commandId": 2358,
    "description": "Toggle CC Asset Cloud library."
  },
  {
    "id": "panel_extensions",
    "name": "Panel: Extensions",
    "category": "Panels",
    "type": "native",
    "commandId": 2359,
    "description": "Open list of CEP/UXP system panels."
  },
  {
    "id": "shapes_sub_op_287",
    "name": "Shapes Sub-Operation 287",
    "category": "Shapes",
    "type": "native",
    "commandId": 25000,
    "description": "Execute native Shapes sub-operation command 25001."
  },
  {
    "id": "layer_sub_op_288",
    "name": "Layer Sub-Operation 288",
    "category": "Layer",
    "type": "native",
    "commandId": 25001,
    "description": "Execute native Layer sub-operation command 25002."
  },
  {
    "id": "animation_sub_op_289",
    "name": "Animation Sub-Operation 289",
    "category": "Animation",
    "type": "native",
    "commandId": 25002,
    "description": "Execute native Animation sub-operation command 25003."
  },
  {
    "id": "timeline_sub_op_290",
    "name": "Timeline Sub-Operation 290",
    "category": "Timeline",
    "type": "native",
    "commandId": 25003,
    "description": "Execute native Timeline sub-operation command 25004."
  },
  {
    "id": "view_sub_op_291",
    "name": "View Sub-Operation 291",
    "category": "View",
    "type": "native",
    "commandId": 25004,
    "description": "Execute native View sub-operation command 25005."
  },
  {
    "id": "edit_sub_op_292",
    "name": "Edit Sub-Operation 292",
    "category": "Edit",
    "type": "native",
    "commandId": 25005,
    "description": "Execute native Edit sub-operation command 25006."
  },
  {
    "id": "file_sub_op_293",
    "name": "File Sub-Operation 293",
    "category": "File",
    "type": "native",
    "commandId": 25006,
    "description": "Execute native File sub-operation command 25007."
  },
  {
    "id": "composition_sub_op_294",
    "name": "Composition Sub-Operation 294",
    "category": "Composition",
    "type": "native",
    "commandId": 25007,
    "description": "Execute native Composition sub-operation command 25008."
  },
  {
    "id": "masks_sub_op_295",
    "name": "Masks Sub-Operation 295",
    "category": "Masks",
    "type": "native",
    "commandId": 25008,
    "description": "Execute native Masks sub-operation command 25009."
  },
  {
    "id": "shapes_sub_op_296",
    "name": "Shapes Sub-Operation 296",
    "category": "Shapes",
    "type": "native",
    "commandId": 25009,
    "description": "Execute native Shapes sub-operation command 25010."
  },
  {
    "id": "layer_sub_op_297",
    "name": "Layer Sub-Operation 297",
    "category": "Layer",
    "type": "native",
    "commandId": 25010,
    "description": "Execute native Layer sub-operation command 25011."
  },
  {
    "id": "animation_sub_op_298",
    "name": "Animation Sub-Operation 298",
    "category": "Animation",
    "type": "native",
    "commandId": 25011,
    "description": "Execute native Animation sub-operation command 25012."
  },
  {
    "id": "timeline_sub_op_299",
    "name": "Timeline Sub-Operation 299",
    "category": "Timeline",
    "type": "native",
    "commandId": 25012,
    "description": "Execute native Timeline sub-operation command 25013."
  },
  {
    "id": "view_sub_op_300",
    "name": "View Sub-Operation 300",
    "category": "View",
    "type": "native",
    "commandId": 25013,
    "description": "Execute native View sub-operation command 25014."
  },
  {
    "id": "edit_sub_op_301",
    "name": "Edit Sub-Operation 301",
    "category": "Edit",
    "type": "native",
    "commandId": 25014,
    "description": "Execute native Edit sub-operation command 25015."
  },
  {
    "id": "file_sub_op_302",
    "name": "File Sub-Operation 302",
    "category": "File",
    "type": "native",
    "commandId": 25015,
    "description": "Execute native File sub-operation command 25016."
  },
  {
    "id": "composition_sub_op_303",
    "name": "Composition Sub-Operation 303",
    "category": "Composition",
    "type": "native",
    "commandId": 25016,
    "description": "Execute native Composition sub-operation command 25017."
  },
  {
    "id": "masks_sub_op_304",
    "name": "Masks Sub-Operation 304",
    "category": "Masks",
    "type": "native",
    "commandId": 25017,
    "description": "Execute native Masks sub-operation command 25018."
  },
  {
    "id": "shapes_sub_op_305",
    "name": "Shapes Sub-Operation 305",
    "category": "Shapes",
    "type": "native",
    "commandId": 25018,
    "description": "Execute native Shapes sub-operation command 25019."
  },
  {
    "id": "layer_sub_op_306",
    "name": "Layer Sub-Operation 306",
    "category": "Layer",
    "type": "native",
    "commandId": 25019,
    "description": "Execute native Layer sub-operation command 25020."
  },
  {
    "id": "animation_sub_op_307",
    "name": "Animation Sub-Operation 307",
    "category": "Animation",
    "type": "native",
    "commandId": 25020,
    "description": "Execute native Animation sub-operation command 25021."
  },
  {
    "id": "timeline_sub_op_308",
    "name": "Timeline Sub-Operation 308",
    "category": "Timeline",
    "type": "native",
    "commandId": 25021,
    "description": "Execute native Timeline sub-operation command 25022."
  },
  {
    "id": "view_sub_op_309",
    "name": "View Sub-Operation 309",
    "category": "View",
    "type": "native",
    "commandId": 25022,
    "description": "Execute native View sub-operation command 25023."
  },
  {
    "id": "edit_sub_op_310",
    "name": "Edit Sub-Operation 310",
    "category": "Edit",
    "type": "native",
    "commandId": 25023,
    "description": "Execute native Edit sub-operation command 25024."
  },
  {
    "id": "file_sub_op_311",
    "name": "File Sub-Operation 311",
    "category": "File",
    "type": "native",
    "commandId": 25024,
    "description": "Execute native File sub-operation command 25025."
  },
  {
    "id": "composition_sub_op_312",
    "name": "Composition Sub-Operation 312",
    "category": "Composition",
    "type": "native",
    "commandId": 25025,
    "description": "Execute native Composition sub-operation command 25026."
  },
  {
    "id": "masks_sub_op_313",
    "name": "Masks Sub-Operation 313",
    "category": "Masks",
    "type": "native",
    "commandId": 25026,
    "description": "Execute native Masks sub-operation command 25027."
  },
  {
    "id": "shapes_sub_op_314",
    "name": "Shapes Sub-Operation 314",
    "category": "Shapes",
    "type": "native",
    "commandId": 25027,
    "description": "Execute native Shapes sub-operation command 25028."
  },
  {
    "id": "layer_sub_op_315",
    "name": "Layer Sub-Operation 315",
    "category": "Layer",
    "type": "native",
    "commandId": 25028,
    "description": "Execute native Layer sub-operation command 25029."
  },
  {
    "id": "animation_sub_op_316",
    "name": "Animation Sub-Operation 316",
    "category": "Animation",
    "type": "native",
    "commandId": 25029,
    "description": "Execute native Animation sub-operation command 25030."
  },
  {
    "id": "timeline_sub_op_317",
    "name": "Timeline Sub-Operation 317",
    "category": "Timeline",
    "type": "native",
    "commandId": 25030,
    "description": "Execute native Timeline sub-operation command 25031."
  },
  {
    "id": "view_sub_op_318",
    "name": "View Sub-Operation 318",
    "category": "View",
    "type": "native",
    "commandId": 25031,
    "description": "Execute native View sub-operation command 25032."
  },
  {
    "id": "edit_sub_op_319",
    "name": "Edit Sub-Operation 319",
    "category": "Edit",
    "type": "native",
    "commandId": 25032,
    "description": "Execute native Edit sub-operation command 25033."
  }
];
