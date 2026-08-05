# EasyWheelAE

A professional commercial desktop application suite for Adobe After Effects, delivering a radial command wheel activated by a global hotkey.

---

## Architecture

EasyWheelAE consists of two separate applications that communicate over a custom local WebSocket IPC protocol:

| Application | Technology | Role |
|---|---|---|
| **EasyWheel Host** | Tauri v2 · Rust · React · TypeScript | Windows background service — system tray, global hotkey, radial overlay, and setting dashboard. Runs the WebSocket server. |
| **EasyWheel AE** | Adobe CEP Extension | After Effects panel client — runs a WebSocket client, receives commands, and executes them via ExtendScript (`evalScript`). |
| **Browser Extension** | Web Extension (MV3) · JavaScript | Browser integration client — service worker WebSocket client tracking open tabs and handling window/tab activation. |

The applications are decoupled. EasyWheel Host runs two local WebSocket servers:
- Port `23435` for the After Effects CEP extension.
- Port `23436` for the Browser Extension.

When a user triggers a "Browser Shortcut" action, the Host queries the Browser Extension for any matching open tabs. If a match is found, the extension activates the tab and the Host natively focuses the browser window. If no match is found, the Host opens the configured URL in a new tab.

### Radial Wheel Sector Geometry

The radial wheel consists of 8 sectors indexed from `0` to `7` advancing clockwise. The index alignment matches standard unit circle angles:
- **Sector 0**: East (Right / 0°)
- **Sector 1**: South-East (Bottom-Right / 45°)
- **Sector 2**: South (Bottom / 90°)
- **Sector 3**: South-West (Bottom-Left / 135°)
- **Sector 4**: West (Left / 180°)
- **Sector 5**: North-West (Top-Left / 225°)
- **Sector 6**: North (Top / 270°)
- **Sector 7**: North-East (Top-Right / 315°)

This geometry is synchronized identically across:
1. The mathematical tracking and mouse vector engine (`geometry_manager.rs`).
2. The Settings visual layout editor (`WheelEditor.tsx`).
3. The hardware-accelerated radial overlay UI renderer (`WheelRenderer.tsx`).
4. The After Effects panel visual wheel preview (`WheelPreview.tsx`).

---

## Core Features

- **System Tray & Global Hotkeys**: Runs as a background service with a tray icon. Intercepts custom hotkeys via a global keyboard hook to trigger the overlay instantly.
- **Dynamic Radial Overlay**: Shows a transparent, hardware-accelerated radial command wheel centered on the mouse cursor with smooth CSS transitions.
- **Context-Aware Profiles**: Detects active foreground applications and automatically switches the active radial layout profile.
- **Extensible Action Providers**:
  - **Windows Provider**: Launch applications, trigger keyboard shortcuts, run shell scripts, open folders/URLs.
  - **Adobe Providers**: Out-of-the-box hooks for After Effects commands.
- **Premium Settings Panel**: A comprehensive dashboard featuring:
  - **General Settings**: App startup, tray controls, and hotkey configuration.
  - **Appearance Settings**: Custom HSL color theme pickers, sizes, and radius fine-tuning.
  - **Profile Management**: Sector assignments, action bindings, and custom profiles.
- **ExtendScript Command Library**: Out-of-the-box support for:
  - **Pre-Compose**: Groups selected layers into a new composition.
  - **Easy Ease**: Applies Ease interpolation to selected keyframes.
  - **Trim Paths**: Adds Trim Paths modifier to shape layers.
  - **Graph Editor**: Toggles the graph editor panel in the timeline.
  - **Duplicate Layer**: Duplicates selected layers.
  - **Null Object**: Creates a new null object layer.
  - **Parent Layers**: Parents selected layers to the top-most selected layer.

---

## Repository Structure

```
EasyWheelAE/
│
├── EasyWheel-host/               # Tauri v2 desktop application
│   │
│   ├── host/                     # React + TypeScript frontend settings & overlay
│   │   ├── components/           # Shared UI components
│   │   ├── ipc/                  # Frontend-to-backend communication contracts
│   │   ├── overlay/              # Radial wheel and overlay window
│   │   ├── styles/               # CSS styling (vanilla CSS + Tailwind)
│   │   └── ...
│   │
│   ├── src-tauri/                # Rust backend
│   │   ├── src/
│   │   │   ├── ae_bridge/        # WebSocket server & client tracking
│   │   │   ├── ipc/              # Custom IPC protocol and data structures
│   │   │   ├── lib.rs            # Orchestration & Tauri command registration
│   │   │   └── main.rs           # Binary entry point
│   │   └── ...
│   │
│   └── package.json              # Host app node dependencies
│
├── EasyWheel-ae/                 # After Effects TypeScript Bridge Client
│   ├── src/
│   │   ├── bridge/               # Connection manager, WebSocket client, command dispatcher
│   │   ├── commands/             # Native AE ExtendScript commands (easy ease, parent, null, etc.)
│   │   └── index.ts              # Registry & initialization entry point
│   ├── tsconfig.json             # Compiles client code to the CEP extension directory
│   └── package.json              # TypeScript compilation dependencies
│
├── extensions/
│   ├── browser/                  # Web Extension (Chrome, Edge, Brave, Opera, etc.)
│   │   ├── manifest.json         # Extension manifest with permissions (tabs, windows, alarms)
│   │   └── background.js         # MV3 service worker handling socket updates and tab focus
│   │
│   └── after-effects/            # Adobe Common Extensibility Platform (CEP) Extension
│       ├── CSXS/
│       │   └── manifest.xml      # Panel extension metadata configuration
│       ├── client/
│       │   ├── index.html        # Panel UI (dark theme layout)
│       │   ├── index.css         # Panel styles matching native After Effects panels
│       │   ├── index.js          # CEP environment verification & bootstrap loader
│       │   └── dist/             # Compiled bridge client runtime (outputs from EasyWheel-ae)
│       ├── jsx/
│       │   └── bootstrap.jsx     # ExtendScript engine executor
│       ├── icons/                # Extension panel menu icons
│       └── installer/            # CEP development and deployment scripts (install, enable_debug)
```

---

## Technology Stack

### Frontend (Host & Extension)
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI component model |
| TypeScript | 5.8 | Static typing with strict mode |
| Vite | 7 | Development server and production bundler |
| CSS | Vanilla / Tailwind | Styling — clean aesthetics |

### Backend (Host)
| Technology | Version | Purpose |
|---|---|---|
| Rust | stable | Core application logic, system APIs |
| Tauri | 2 | Native window management, IPC bridge, packaging |
| Serde | 1 | JSON serialisation for IPC payloads |
| Tungstenite | 0.21+ | WebSocket server library for communication with AE CEP |

---

## Development & Installation

### 1. EasyWheel Host (Desktop Service)

#### Prerequisites
- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) 20+
- [Tauri v2 system dependencies](https://tauri.app/start/prerequisites/) (WebView2 on Windows)

#### Install & Run
```bash
cd EasyWheel-host
npm install
npm run tauri dev
```

#### Build Production Bundle
```bash
npm run tauri build
```

---

### 2. EasyWheel AE (After Effects Extension)

#### Prerequisites
- Adobe After Effects 2021 (v18.x) or newer.

#### Setup for Development (Registry & CEP)
1. Run the debug helper script as Administrator to allow unsigned panels inside After Effects:
   ```cmd
   cd extensions/after-effects/installer
   enable_debug.bat
   ```
2. Install the extension files into the Adobe CEP extensions directory:
   ```cmd
   install.bat
   ```
3. Open After Effects, and launch the extension via **Window** -> **Extensions (Legacy)** -> **EasyWheelAE**.

#### Developing ExtendScript & Bridge Commands
1. Navigate to the `EasyWheel-ae` folder.
2. Install Node dependencies:
   ```bash
   cd EasyWheel-ae
   npm install
   ```
3. Start the compiler in watch mode to automatically compile code changes into the CEP extension directory:
   ```bash
   npm run watch
   ```
4. While After Effects is running, open a Chromium browser and navigate to `http://localhost:8088` to inspect the panel console.

---

### 3. EasyWheel Browser Extension (Chrome/Edge/Brave/Opera)

#### Prerequisites
- A Chromium-based browser (Chrome, Edge, Brave, Opera, etc.)

#### Installation
1. Open your browser and navigate to the extensions management page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. Enable **Developer mode** using the toggle switch (typically in the top-right or top-left corner).
3. Click the **Load unpacked** button.
4. Select the `extensions/browser/` folder from this repository.
5. The extension will automatically load and connect to the Host app on port `23436`.
6. To verify connectivity, look at the service worker console log (click the **service worker** link on the extension card). You should see `[EasyWheel] Connected`.

---

## Development Phases

| Phase | Status | Scope |
|---|---|---|
| **Phase 1** | ✅ Complete | Clean production foundation — project structure, architecture, scaffolding |
| **Phase 2** | ✅ Complete | System tray, global hotkey, overlay window, mouse tracking |
| **Phase 3** | ✅ Complete | Radial wheel UI, slice rendering, action dispatch |
| **Phase 4** | ✅ Complete | EasyWheel AE extension, IPC integration with After Effects |
| **Phase 5** | ✅ Complete | Settings UI, persistent configuration, profile and layout managers |
| **Phase 6** | 🔲 Planned  | Installer, code signing, release packaging |

---

## Design Principles

- **SOLID** — each module has a single, well-defined responsibility
- **Clean Architecture** — UI, services, and IPC are in separate layers with no upward dependencies
- **Strict TypeScript** — `strict: true`, `noUnusedLocals`, `noUnusedParameters` enforced
- **No placeholder code** — every file either implements its responsibility or documents the contract it will fulfil
- **Minimal dependencies** — no dependency is added until it is actively needed

---

EasyWheelAE is under active development.

Planned features include:

- [ ] Photoshop support
- [ ] Premiere Pro support
- [ ] Custom radial themes
- [ ] Plugin marketplace
- [ ] Macro recording
- [ ] Community action packs

Suggestions are always welcome!

---

## 🤝 Contributing

Contributions of any size are welcome.

If you'd like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a Pull Request.

For major changes, please open an Issue first so we can discuss the design.

---

## 🐞 Reporting Bugs

Found a bug?

Please open a GitHub Issue and include:

- Operating System
- EasyWheelAE version
- Steps to reproduce
- Expected behavior
- Screenshots or logs (if available)

---

## 💡 Feature Requests

Have an idea?

Open a GitHub Discussion or Issue.

Many of EasyWheelAE's features are inspired by community feedback.

---

## ⭐ Support the Project

If you find EasyWheelAE useful, consider giving the repository a ⭐.

It helps more people discover the project and motivates future development.

---

## 📜 License

This project is licensed under the MIT License.

See the `LICENSE` file for details.

---

## ❤️ Acknowledgements

Built with:

- Rust
- Tauri
- React
- TypeScript
- Adobe CEP
- ExtendScript

Special thanks to everyone who tests, reports bugs, and contributes ideas.

---

Made with ❤️ for creators who love speed.

If EasyWheelAE improves your workflow, don't forget to ⭐ the repository.