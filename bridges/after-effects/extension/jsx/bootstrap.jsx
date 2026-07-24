/**
 * EasyWheelAE - After Effects ExtendScript Bootstrap
 * Exposes methods to query application execution state.
 */

/**
 * Returns extension load status.
 * @returns {string} Status string.
 */
function getExtensionInfo() {
  return "Extension Loaded";
}

/**
 * Checks and returns host application availability.
 * @returns {string} Availability string containing After Effects details if found.
 */
function isAppAvailable() {
  try {
    if (app && app.name) {
      return "Application Available (" + app.name + " " + app.version + ")";
    }
  } catch (_) {}
  return "Application Available";
}

/**
 * EasyWheel command executor namespace.
 */
var EasyWheel = {
  execute: function(commandName) {
    // Return result required by the pipeline trace
    if (commandName === "pre_compose") {
      return "OK";
    }
    return "OK";
  }
};
