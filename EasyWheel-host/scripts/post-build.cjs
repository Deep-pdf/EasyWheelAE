const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Resolve Directories
const hostDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(hostDir, '..');
const installerDir = path.join(repoRoot, 'Installer');

console.log('[Post-Build] Initialising distribution packing...');
console.log(`[Post-Build] Host path: ${hostDir}`);
console.log(`[Post-Build] Repository root: ${repoRoot}`);
console.log(`[Post-Build] Installer destination: ${installerDir}`);

// 2. Read central version from package.json
let version = '1.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(hostDir, 'package.json'), 'utf8'));
  version = packageJson.version || '1.0.0';
} catch (e) {
  console.warn('[Post-Build] Warning: Failed to read version from package.json, defaulting to 1.0.0');
}

// 3. Create target directory
if (!fs.existsSync(installerDir)) {
  fs.mkdirSync(installerDir, { recursive: true });
}

// 4. Clean only build-generated outputs (Preserves user docs)
const filesToClean = [
  'EasyWheel_Setup.exe',
  'Browser Extension',
  'README_FIRST.txt',
  'VERSION.txt',
  'LICENSE'
];
filesToClean.forEach(f => {
  const targetPath = path.join(installerDir, f);
  if (fs.existsSync(targetPath)) {
    console.log(`[Post-Build] Cleaning old artifact: ${f}`);
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
});

// 5. Find and copy the latest setup installer
const nsisDir = path.join(hostDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
let sourceInstaller = '';
if (fs.existsSync(nsisDir)) {
  const files = fs.readdirSync(nsisDir);
  const setupFile = files.find(f => f.startsWith('EasyWheel_') && f.endsWith('-setup.exe'));
  if (setupFile) {
    sourceInstaller = path.join(nsisDir, setupFile);
  }
}

if (sourceInstaller && fs.existsSync(sourceInstaller)) {
  const destInstaller = path.join(installerDir, 'EasyWheel_Setup.exe');
  console.log(`[Post-Build] Copying installer: ${path.basename(sourceInstaller)} -> EasyWheel_Setup.exe`);
  fs.copyFileSync(sourceInstaller, destInstaller);
} else {
  console.error(`[Post-Build] Error: Production setup installer executable not found under ${nsisDir}`);
  process.exit(1);
}

// 6. Copy Browser Extension folder recursively
const browserSrc = path.join(repoRoot, 'extensions', 'browser');
const browserDest = path.join(installerDir, 'Browser Extension');
if (fs.existsSync(browserSrc)) {
  console.log('[Post-Build] Copying Browser Extension files recursively...');
  copyFolderSync(browserSrc, browserDest);
} else {
  console.warn(`[Post-Build] Warning: Browser extension source directory not found at ${browserSrc}`);
}

// 7. Copy License file
const licenseSrc = path.join(repoRoot, 'LICENSE');
const licenseDest = path.join(installerDir, 'LICENSE');
if (fs.existsSync(licenseSrc)) {
  console.log('[Post-Build] Copying LICENSE...');
  fs.copyFileSync(licenseSrc, licenseDest);
}

// 8. Generate README_FIRST.txt
const readmeContent = `========================================================================
EASYWHEEL v${version} DISTRIBUTION GUIDE
========================================================================

Welcome to EasyWheel! Follow these steps to configure your workspace.

1. CORE APPLICATION INSTALLATION
   - Run "EasyWheel_Setup.exe".
   - Follow the wizard setup to install the background service.
   - EasyWheel installs to Program Files and launches automatically in the tray.

2. AFTER EFFECTS CEP PANEL
   - The installer automatically deploys the CEP extension folder.
   - Open Adobe After Effects.
   - Go to: Window -> Extensions -> EasyWheelAE to activate the panel.
   - EasyWheel will automatically connect and sync profiles.

3. BROWSER EXTENSION (OPTIONAL)
   - Open your web browser (Chrome, Edge, Brave, or Opera).
   - Navigate to the Extension Management page (chrome://extensions/).
   - Turn on "Developer Mode" (top-right corner).
   - Click "Load unpacked" (top-left corner).
   - Select the "Browser Extension" folder contained in this directory.
   - The browser extension will automatically connect to the Host bridge.

4. TRIGGER THE WHEEL
   - Press Alt + F1 system-wide to show the radial command wheel.

========================================================================
`;
fs.writeFileSync(path.join(installerDir, 'README_FIRST.txt'), readmeContent, 'utf8');
console.log('[Post-Build] Generated README_FIRST.txt');

// 9. Generate VERSION.txt
let gitCommit = 'Unknown';
try {
  gitCommit = execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
} catch (e) {
  // Graceful fallback
}
const buildDate = new Date().toISOString();
const versionContent = `Version: ${version}
Build Date: ${buildDate}
Git Commit: ${gitCommit}
`;
fs.writeFileSync(path.join(installerDir, 'VERSION.txt'), versionContent, 'utf8');
console.log('[Post-Build] Generated VERSION.txt');

console.log('[Post-Build] Release distribution bundle prepared successfully!');

// Helper recursive folder copier
function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}
