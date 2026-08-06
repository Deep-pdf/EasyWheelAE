/**
 * EasyWheelAE — After Effects ExtendScript Bootstrap
 *
 * Loaded by the CEP panel via CSXS ScriptPath.
 * All functions called by evalScript must be defined at global scope.
 * EasyWheel.execute(commandName) is the single entry point.
 */

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function getActiveComp() {
  var item = app.project.activeItem;
  if (!item || !(item instanceof CompItem)) {
    return null;
  }
  return item;
}

function getSelectedLayers(comp) {
  return comp.selectedLayers;
}

// ---------------------------------------------------------------------------
// Extension info helpers (called by index.js on panel load)
// ---------------------------------------------------------------------------

function getExtensionInfo() {
  return "Extension Loaded";
}

function isAppAvailable() {
  try {
    if (app && app.name) {
      return "Application Available (" + app.name + " " + app.version + ")";
    }
  } catch (_) {}
  return "Application Available";
}

// ---------------------------------------------------------------------------
// EasyWheel command namespace
// ---------------------------------------------------------------------------

var EasyWheel = {

  /**
   * Main entry point. Dispatches to the correct handler.
   * Returns "OK" on success, "ERROR: <reason>" on failure.
   */
  execute: function(commandName) {
    try {
      if (commandName === "pre_compose")    { return EasyWheel.preCompose(); }
      if (commandName === "easy_ease")      { return EasyWheel.easyEase(); }
      if (commandName === "trim_paths")     { return EasyWheel.trimPaths(); }
      if (commandName === "graph_editor")   { return EasyWheel.graphEditor(); }
      if (commandName === "duplicate_layer"){ return EasyWheel.duplicateLayer(); }
      if (commandName === "null_object")    { return EasyWheel.nullObject(); }
      if (commandName === "parent")         { return EasyWheel.parent(); }
      return "ERROR: Unknown command: " + commandName;
    } catch (e) {
      return "ERROR: " + (e.message || String(e));
    }
  },

  // -------------------------------------------------------------------------
  // Pre-Compose
  // Pre-composes all currently selected layers into a new composition.
  // -------------------------------------------------------------------------
  preCompose: function() {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    var selected = getSelectedLayers(comp);
    if (!selected || selected.length === 0) {
      return "ERROR: No layers selected — select at least one layer first";
    }

    // Collect layer indices (1-based, as required by precompose)
    var indices = [];
    for (var i = 0; i < selected.length; i++) {
      indices.push(selected[i].index);
    }

    app.beginUndoGroup("EasyWheel: Pre-Compose");
    try {
      comp.layers.precompose(indices, "Pre-Comp 1", true);
      app.endUndoGroup();
      return "OK";
    } catch (e) {
      app.endUndoGroup();
      return "ERROR: " + (e.message || String(e));
    }
  },

  // -------------------------------------------------------------------------
  // Easy Ease
  // Applies Easy Ease to all selected keyframes via the AE menu command.
  // -------------------------------------------------------------------------
  easyEase: function() {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    app.beginUndoGroup("EasyWheel: Easy Ease");
    try {
      // Find and execute the Easy Ease menu command (Animation > Keyframe Assistant > Easy Ease)
      var cmdId = app.findMenuCommandId("Easy Ease");
      if (cmdId && cmdId > 0) {
        app.executeCommand(cmdId);
      } else {
        // Fallback: apply keyframe interpolation directly on selected properties
        var layers = comp.selectedLayers;
        for (var li = 0; li < layers.length; li++) {
          var layer = layers[li];
          EasyWheel._applyEasyEaseToLayer(layer);
        }
      }
      app.endUndoGroup();
      return "OK";
    } catch (e) {
      app.endUndoGroup();
      return "ERROR: " + (e.message || String(e));
    }
  },

  _applyEasyEaseToLayer: function(layer) {
    for (var pi = 1; pi <= layer.numProperties; pi++) {
      try {
        var prop = layer.property(pi);
        if (prop && prop.numKeys > 0) {
          for (var ki = 1; ki <= prop.numKeys; ki++) {
            if (prop.keySelected(ki)) {
              prop.setTemporalEaseAtKey(
                ki,
                [new KeyframeEase(0, 33.33)],
                [new KeyframeEase(0, 33.33)]
              );
            }
          }
        }
      } catch (_) {}
    }
  },

  // -------------------------------------------------------------------------
  // Trim Paths
  // Adds a Trim Paths modifier to each selected shape layer.
  // -------------------------------------------------------------------------
  trimPaths: function() {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    var selected = getSelectedLayers(comp);
    if (!selected || selected.length === 0) {
      return "ERROR: No layers selected — select a shape layer first";
    }

    var added = 0;
    app.beginUndoGroup("EasyWheel: Add Trim Paths");
    try {
      for (var i = 0; i < selected.length; i++) {
        var layer = selected[i];
        if (layer instanceof ShapeLayer) {
          var contents = layer.property("ADBE Root Vectors Group");
          if (contents) {
            contents.addProperty("ADBE Vector Filter - Trim");
            added++;
          }
        }
      }
      app.endUndoGroup();
      if (added === 0) {
        return "ERROR: No shape layers selected — Trim Paths requires a shape layer";
      }
      return "OK";
    } catch (e) {
      app.endUndoGroup();
      return "ERROR: " + (e.message || String(e));
    }
  },

  // -------------------------------------------------------------------------
  // Graph Editor
  // Toggles the Graph Editor panel in the Timeline.
  // -------------------------------------------------------------------------
  graphEditor: function() {
    try {
      // Command ID 2372 is the Graph Editor toggle in After Effects.
      // findMenuCommandId is the safest cross-version approach.
      var cmdId = app.findMenuCommandId("Graph Editor");
      if (cmdId && cmdId > 0) {
        app.executeCommand(cmdId);
      } else {
        // Known constant fallback
        app.executeCommand(2372);
      }
      return "OK";
    } catch (e) {
      return "ERROR: " + (e.message || String(e));
    }
  },

  // -------------------------------------------------------------------------
  // Duplicate Layer
  // Duplicates all currently selected layers.
  // -------------------------------------------------------------------------
  duplicateLayer: function() {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    var selected = getSelectedLayers(comp);
    if (!selected || selected.length === 0) {
      return "ERROR: No layers selected — select at least one layer first";
    }

    app.beginUndoGroup("EasyWheel: Duplicate Layer");
    try {
      // Duplicate in reverse order so indices stay valid
      for (var i = selected.length - 1; i >= 0; i--) {
        selected[i].duplicate();
      }
      app.endUndoGroup();
      return "OK";
    } catch (e) {
      app.endUndoGroup();
      return "ERROR: " + (e.message || String(e));
    }
  },

  // -------------------------------------------------------------------------
  // Null Object
  // Creates a new null object layer in the active composition.
  // -------------------------------------------------------------------------
  nullObject: function() {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    app.beginUndoGroup("EasyWheel: Create Null Object");
    try {
      var nullLayer = comp.layers.addNull();
      nullLayer.name = "Null 1";
      app.endUndoGroup();
      return "OK";
    } catch (e) {
      app.endUndoGroup();
      return "ERROR: " + (e.message || String(e));
    }
  },

  // -------------------------------------------------------------------------
  // Parent Layers
  // Parents all selected layers to the top-most selected layer.
  // -------------------------------------------------------------------------
  parent: function() {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    var selected = getSelectedLayers(comp);
    if (!selected || selected.length < 2) {
      return "ERROR: Select at least 2 layers — the top selected layer will become the parent";
    }

    app.beginUndoGroup("EasyWheel: Parent Layers");
    try {
      var parentLayer = selected[0];
      // Find the top-most selected layer in index (which actually has the lowest index number in AE)
      for (var i = 1; i < selected.length; i++) {
        if (selected[i].index < parentLayer.index) {
          parentLayer = selected[i];
        }
      }

      for (var i = 0; i < selected.length; i++) {
        var layer = selected[i];
        if (layer !== parentLayer) {
          layer.parent = parentLayer;
        }
      }
      app.endUndoGroup();
      return "OK";
    } catch (e) {
      app.endUndoGroup();
      return "ERROR: " + (e.message || String(e));
    }
  }

};
