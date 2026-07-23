/**
 * EasyWheelAE - Adobe CEP Extension Bootstrap
 */

document.addEventListener('DOMContentLoaded', () => {
  const logsWindow = document.getElementById('logs-window');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('bridge-status-text');

  /**
   * Outputs structured logs to both the browser console and the panel's log window.
   */
  function log(module, text, level = 'info') {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${module}] [${level.toUpperCase()}] ${text}`);

    if (logsWindow) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${level}`;
      entry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-module">[${module}]</span>
        <span class="log-text">${text}</span>
      `;
      logsWindow.appendChild(entry);
      logsWindow.scrollTop = logsWindow.scrollHeight;
    }
  }

  log('Main', 'Extension Loaded');
  log('Main', 'Panel Opened');

  let isCEP = false;
  let hostInfo = null;

  // 1. Detect and verify CEP environment
  try {
    if (window.__adobe_cep__) {
      isCEP = true;
      const hostEnvStr = window.__adobe_cep__.getHostEnvironment();
      hostInfo = JSON.parse(hostEnvStr);
    }
  } catch (e) {
    log('Main', 'Error checking CEP environment', 'error');
  }

  if (isCEP && hostInfo) {
    log('Main', `Host Application: ${hostInfo.appName} (${hostInfo.appVersion})`);
    log('Main', `CEP Version: ${window.__adobe_cep__.getCurrentApiVersion() || 'Unknown'}`);
    
    // Update panel UI to reflect waiting state
    if (statusBadge) {
      statusBadge.className = 'status-badge status-waiting';
      statusBadge.textContent = 'Waiting';
    }
    if (statusText) {
      statusText.textContent = 'Waiting for bridge host connection...';
    }

    // 2. Initialize bridge runtime
    try {
      log('Main', 'Loading bridge client runtime...');
      require('./dist/index.js');
      log('Main', 'Bridge client runtime loaded.');
    } catch (e) {
      log('Main', 'Failed to load bridge client runtime: ' + e.message, 'error');
      console.error(e);
    }

    // 3. Verify ExtendScript bridge availability
    window.__adobe_cep__.evalScript('getExtensionInfo()', (res) => {
      if (res && res !== 'EvalScript error.') {
        log('ExtendScript', `Response: "${res}"`);
      } else {
        log('ExtendScript', 'Failed to retrieve extension info', 'warn');
      }
    });

    window.__adobe_cep__.evalScript('isAppAvailable()', (res) => {
      if (res && res !== 'EvalScript error.') {
        log('ExtendScript', `Response: "${res}"`);
      } else {
        log('ExtendScript', 'Failed to verify application availability', 'warn');
      }
    });

  } else {
    log('Main', 'CEP Environment not detected. Panel running in standard browser context.', 'warn');
    if (statusBadge) {
      statusBadge.className = 'status-badge status-disconnected';
      statusBadge.textContent = 'Disconnected';
    }
    if (statusText) {
      statusText.textContent = 'Environment Verification Failed (Non-CEP Host)';
    }
  }
});
