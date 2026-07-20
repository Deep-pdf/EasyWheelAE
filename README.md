# EasyWheelAE

A professional commercial desktop application suite for Adobe After Effects, delivering a radial command wheel activated by a global hotkey.

---

## Architecture

EasyWheelAE consists of two separate applications that communicate over a defined IPC protocol:

| Application | Technology | Role |
|---|---|---|
| **EasyWheel Host** | Tauri v2 · Rust · React · TypeScript | Windows background service — tray, hotkey, overlay |
| **EasyWheel AE** | Adobe CEP / UXP | After Effects extension — receives and executes commands |

The two applications are intentionally decoupled. EasyWheel Host never imports AE APIs, and EasyWheel AE never imports Tauri APIs. All communication is mediated by the IPC protocol defined in `host/ipc/`.

---

## Core Features (Host Application)

- **System Tray & Global Hotkeys**: Runs as a background service with a tray icon. Intercepts custom hotkeys via a global keyboard hook to trigger the overlay instantly.
- **Dynamic Radial Overlay**: Shows a transparent, hardware-accelerated radial command wheel centered on the mouse cursor with smooth CSS transitions.
- **Context-Aware Profiles**: Detects active foreground applications and automatically switches the active radial layout profile.
- **Extensible Action Providers**:
  - **Windows Provider**: Launch applications, trigger keyboard shortcuts, run shell scripts, open folders/URLs.
  - **Adobe Providers**: Out-of-the-box hooks for After Effects and Photoshop commands.
- **Premium Settings Panel**: A comprehensive dashboard featuring:
  - **General Settings**: App startup, tray controls, and hotkey configuration.
  - **Appearance Settings**: Custom HSL color theme pickers, sizes, and radius fine-tuning.
  - **Profile Management**: Sector assignments, action bindings, and custom profiles.

---

## Repository Structure

```
EasyWheelAE/
│
├── EasyWheel-host/               # Tauri v2 desktop application
│   │
│   ├── host/                     # React + TypeScript frontend
│   │   ├── assets/
│   │   │   ├── icons/            # SVG action icons for wheel slices
│   │   │   ├── fonts/            # Self-hosted typefaces
│   │   │   ├── images/           # Static images
│   │   │   └── animations/       # Lottie or CSS animation assets
│   │   ├── components/           # Shared UI components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── ipc/
│   │   │   ├── protocol.ts       # Typed Tauri command wrappers
│   │   │   └── events.ts         # Typed backend-to-frontend event contracts
│   │   ├── overlay/
│   │   │   ├── Wheel.tsx         # Radial wheel container
│   │   │   ├── WheelSlice.tsx    # Individual wheel segment
│   │   │   └── OverlayWindow.tsx # Transparent overlay window host
│   │   ├── services/
│   │   │   ├── Logger.ts         # Structured logging
│   │   │   ├── WindowManager.ts  # Tauri window lifecycle
│   │   │   ├── HotkeyService.ts  # Global hotkey registration
│   │   │   └── IPCService.ts     # IPC abstraction layer
│   │   ├── styles/
│   │   │   └── global.css        # Global viewport reset
│   │   ├── types/
│   │   │   ├── Action.ts         # Invocable AE command descriptor
│   │   │   ├── Direction.ts      # Radial wheel direction
│   │   │   └── Settings.ts       # Persistent user configuration schema
│   │   ├── utils/
│   │   │   ├── geometry.ts       # SVG and spatial geometry helpers
│   │   │   ├── math.ts           # Pure numeric utilities
│   │   │   └── helpers.ts        # General-purpose cross-cutting utilities
│   │   ├── App.tsx               # Root application component
│   │   ├── main.tsx              # React entry point
│   │   └── vite-env.d.ts         # Vite client type reference
│   │
│   ├── src-tauri/                # Rust backend
│   │   ├── capabilities/         # Tauri permission capability sets
│   │   ├── icons/                # Application icons for all platforms
│   │   ├── src/
│   │   │   ├── lib.rs            # Tauri builder and command registration
│   │   │   └── main.rs           # Binary entry point
│   │   ├── build.rs              # Tauri build script
│   │   ├── Cargo.toml            # Rust manifest and dependencies
│   │   └── tauri.conf.json       # Tauri application configuration
│   │
│   ├── public/                   # Static assets served at root URL
│   ├── index.html                # HTML entry point
│   ├── package.json              # Node.js manifest
│   ├── tsconfig.json             # TypeScript project configuration
│   ├── tsconfig.node.json        # TypeScript config for Vite config file
│   └── vite.config.ts            # Vite bundler configuration
│
└── EasyWheel-ae/                 # Adobe extension (Phase 4+, not started)
```

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI component model |
| TypeScript | 5.8 | Static typing with strict mode |
| Vite | 7 | Development server and production bundler |
| CSS | Vanilla | Styling — no CSS framework dependency |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Rust | stable | Core application logic, system APIs |
| Tauri | 2 | Native window management, IPC bridge, packaging |
| Serde | 1 | JSON serialisation for IPC payloads |

---

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (stable toolchain)
- [Node.js](https://nodejs.org/) 20+
- [Tauri v2 system dependencies](https://tauri.app/start/prerequisites/) (WebView2 on Windows)

### Install

```bash
cd EasyWheel-host
npm install
```

### Run in development mode

```bash
npm run tauri dev
```

### Build production bundle

```bash
npm run tauri build
```

### Type-check only

```bash
npx tsc --noEmit
```

---

## Development Phases

| Phase | Status | Scope |
|---|---|---|
| **Phase 1** | ✅ Complete | Clean production foundation — project structure, architecture, scaffolding |
| **Phase 2** | ✅ Complete | System tray, global hotkey, overlay window, mouse tracking |
| **Phase 3** | ✅ Complete | Radial wheel UI, slice rendering, action dispatch |
| **Phase 4** | 🔲 Planned  | EasyWheel AE extension, IPC integration with After Effects |
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

## License

Proprietary — All rights reserved. This software is not open source.
