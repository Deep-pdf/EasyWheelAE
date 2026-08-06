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
  'EasyWheelAE',
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
const browserSrc = path.join(repoRoot, 'extensions', 'easywheel-browser');
const browserDest = path.join(installerDir, 'Browser Extension');
if (fs.existsSync(browserSrc)) {
  console.log('[Post-Build] Copying Browser Extension files recursively...');
  copyFolderSync(browserSrc, browserDest);
} else {
  console.warn(`[Post-Build] Warning: Browser extension source directory not found at ${browserSrc}`);
}

// 7. Copy After Effects CEP Extension folder recursively
const aeSrc = path.join(repoRoot, 'bridges', 'after-effects', 'extension');
const aeDest = path.join(installerDir, 'EasyWheelAE');
if (fs.existsSync(aeSrc)) {
  console.log('[Post-Build] Copying After Effects Extension files recursively...');
  copyFolderSync(aeSrc, aeDest);
} else {
  console.warn(`[Post-Build] Warning: After Effects extension source directory not found at ${aeSrc}`);
}

// 8. Copy License file
const licenseSrc = path.join(repoRoot, 'LICENSE');
if (!fs.existsSync(licenseSrc)) {
  const fallbackLicense = path.join(hostDir, 'LICENSE');
  if (fs.existsSync(fallbackLicense)) {
    fs.copyFileSync(fallbackLicense, path.join(installerDir, 'LICENSE'));
  } else {
    const licenseText = `MIT License

Copyright (c) 2026 EasyWheelAE

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
    fs.writeFileSync(path.join(installerDir, 'LICENSE'), licenseText, 'utf8');
  }
} else {
  fs.copyFileSync(licenseSrc, path.join(installerDir, 'LICENSE'));
}

// 9. Generate README_FIRST.txt with the user's exact wording
const readmeContent = `EasyWheel has been installed successfully.

Optional Components

1. Browser Extension
Open Chrome
Enable Developer Mode
Load Unpacked
Select
Browser Extension

2. After Effects
If the installer could not install the extension automatically
Copy
EasyWheelAE
to
%APPDATA%\\Adobe\\CEP\\extensions\\
Restart After Effects.
`;
fs.writeFileSync(path.join(installerDir, 'README_FIRST.txt'), readmeContent, 'utf8');
console.log('[Post-Build] Generated README_FIRST.txt');

// 10. Generate VERSION.txt
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
