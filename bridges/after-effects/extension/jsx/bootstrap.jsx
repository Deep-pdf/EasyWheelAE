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
      if (commandName === "align_left")              { return EasyWheel.alignLayers("left"); }
      if (commandName === "align_center_horizontal") { return EasyWheel.alignLayers("center_horizontal"); }
      if (commandName === "align_right")             { return EasyWheel.alignLayers("right"); }
      if (commandName === "align_top")               { return EasyWheel.alignLayers("top"); }
      if (commandName === "align_center_vertical")   { return EasyWheel.alignLayers("center_vertical"); }
      if (commandName === "align_bottom")            { return EasyWheel.alignLayers("bottom"); }
      if (commandName === "distribute_horizontal")    { return EasyWheel.distributeLayers("horizontal"); }
      if (commandName === "distribute_vertical")      { return EasyWheel.distributeLayers("vertical"); }
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
  },

  // -------------------------------------------------------------------------
  // Align and Distribute Helpers
  // -------------------------------------------------------------------------
  _getLayerCompBounds: function(layer, comp) {
    var r = null;
    try {
      r = layer.sourceRectAtTime(comp.time, false);
    } catch (e) {
      // Fallback if sourceRectAtTime is not supported (e.g. camera, light)
    }
    
    var anchorVal = layer.anchorPoint ? layer.anchorPoint.value : [0,0,0];
    if (!r || (r.width === 0 && r.height === 0)) {
      var p = layer.toComp(anchorVal);
      return {
        left: p[0],
        right: p[0],
        top: p[1],
        bottom: p[1],
        width: 0,
        height: 0,
        centerX: p[0],
        centerY: p[1]
      };
    }
    
    var corners = [
      layer.toComp([r.left, r.top]),
      layer.toComp([r.left + r.width, r.top]),
      layer.toComp([r.left, r.top + r.height]),
      layer.toComp([r.left + r.width, r.top + r.height])
    ];
    var minX = corners[0][0];
    var maxX = corners[0][0];
    var minY = corners[0][1];
    var maxY = corners[0][1];
    for (var i = 1; i < 4; i++) {
      if (corners[i][0] < minX) minX = corners[i][0];
      if (corners[i][0] > maxX) maxX = corners[i][0];
      if (corners[i][1] < minY) minY = corners[i][1];
      if (corners[i][1] > maxY) maxY = corners[i][1];
    }
    return {
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: minX + (maxX - minX) / 2,
      centerY: minY + (maxY - minY) / 2
    };
  },

  _setLayerCompPosition: function(layer, targetCompPos) {
    var parentSpacePos;
    if (layer.parent) {
      parentSpacePos = layer.parent.fromComp(targetCompPos);
    } else {
      parentSpacePos = targetCompPos;
    }
    if (layer.position) {
      layer.position.setValue(parentSpacePos);
    }
  },

  alignLayers: function(alignType) {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    var selected = getSelectedLayers(comp);
    if (!selected || selected.length === 0) {
      return "ERROR: No layers selected";
    }

    app.beginUndoGroup("EasyWheel: Align Layers");
    try {
      var layerBounds = [];
      var selLeft = Infinity, selRight = -Infinity;
      var selTop = Infinity, selBottom = -Infinity;

      for (var i = 0; i < selected.length; i++) {
        var b = EasyWheel._getLayerCompBounds(selected[i], comp);
        layerBounds.push(b);
        if (b.left < selLeft) selLeft = b.left;
        if (b.right > selRight) selRight = b.right;
        if (b.top < selTop) selTop = b.top;
        if (b.bottom > selBottom) selBottom = b.bottom;
      }

      var alignToComp = (selected.length === 1);
      
      var targetLeft = alignToComp ? 0 : selLeft;
      var targetCenterX = alignToComp ? comp.width / 2 : selLeft + (selRight - selLeft) / 2;
      var targetRight = alignToComp ? comp.width : selRight;
      var targetTop = alignToComp ? 0 : selTop;
      var targetCenterY = alignToComp ? comp.height / 2 : selTop + (selBottom - selTop) / 2;
      var targetBottom = alignToComp ? comp.height : selBottom;

      for (var i = 0; i < selected.length; i++) {
        var layer = selected[i];
        var b = layerBounds[i];
        var currAnchor = layer.toComp(layer.anchorPoint ? layer.anchorPoint.value : [0,0,0]);
        var dx = 0;
        var dy = 0;

        if (alignType === "left") {
          dx = targetLeft - b.left;
        } else if (alignType === "center_horizontal") {
          dx = targetCenterX - b.centerX;
        } else if (alignType === "right") {
          dx = targetRight - b.right;
        } else if (alignType === "top") {
          dy = targetTop - b.top;
        } else if (alignType === "center_vertical") {
          dy = targetCenterY - b.centerY;
        } else if (alignType === "bottom") {
          dy = targetBottom - b.bottom;
        }

        if (dx !== 0 || dy !== 0) {
          var targetAnchor = [currAnchor[0] + dx, currAnchor[1] + dy, currAnchor[2]];
          EasyWheel._setLayerCompPosition(layer, targetAnchor);
        }
      }
      app.endUndoGroup();
      return "OK";
    } catch (e) {
      app.endUndoGroup();
      return "ERROR: " + (e.message || String(e));
    }
  },

  distributeLayers: function(distributeType) {
    var comp = getActiveComp();
    if (!comp) { return "ERROR: No active composition"; }

    var selected = getSelectedLayers(comp);
    if (!selected || selected.length < 3) {
      return "ERROR: Select at least 3 layers to distribute";
    }

    app.beginUndoGroup("EasyWheel: Distribute Layers");
    try {
      var items = [];
      for (var i = 0; i < selected.length; i++) {
        var layer = selected[i];
        var b = EasyWheel._getLayerCompBounds(layer, comp);
        items.push({
          layer: layer,
          bounds: b,
          currAnchor: layer.toComp(layer.anchorPoint ? layer.anchorPoint.value : [0,0,0])
        });
      }

      if (distributeType === "horizontal") {
        // Sort by centerX
        items.sort(function(a, b) {
          return a.bounds.centerX - b.bounds.centerX;
        });
        var n = items.length;
        var minCenter = items[0].bounds.centerX;
        var maxCenter = items[n - 1].bounds.centerX;
        var step = (maxCenter - minCenter) / (n - 1);

        for (var i = 0; i < n; i++) {
          var item = items[i];
          var targetCenterX = minCenter + i * step;
          var dx = targetCenterX - item.bounds.centerX;
          if (dx !== 0) {
            var targetAnchor = [item.currAnchor[0] + dx, item.currAnchor[1], item.currAnchor[2]];
            EasyWheel._setLayerCompPosition(item.layer, targetAnchor);
          }
        }
      } else if (distributeType === "vertical") {
        // Sort by centerY
        items.sort(function(a, b) {
          return a.bounds.centerY - b.bounds.centerY;
        });
        var n = items.length;
        var minCenter = items[0].bounds.centerY;
        var maxCenter = items[n - 1].bounds.centerY;
        var step = (maxCenter - minCenter) / (n - 1);

        for (var i = 0; i < n; i++) {
          var item = items[i];
          var targetCenterY = minCenter + i * step;
          var dy = targetCenterY - item.bounds.centerY;
          if (dy !== 0) {
            var targetAnchor = [item.currAnchor[0], item.currAnchor[1] + dy, item.currAnchor[2]];
            EasyWheel._setLayerCompPosition(item.layer, targetAnchor);
          }
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
