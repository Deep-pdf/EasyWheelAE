# Changelog

All notable changes to the EasyWheel project will be documented in this file.

## [1.0.0] - 2026-08-05

This is the first stable release of EasyWheel, introducing a production-ready radial hotkey trigger utility for After Effects and web browsers.

### Added
- **First-Run Wizard**: Standalone initial setup wizard that automatically scans, deploys, and verifies extension connection statuses (Host, After Effects CEP, and Chrome/Edge Browser).
- **Silent Auto-Deployment**: The host application automatically detects Adobe CEP directories and silently installs the `EasyWheelAE` extension on startup if missing.
- **Tauri WiX/NSIS Installers**: Native Windows MSI (`.msi`) and NSIS Setup (`.exe`) packaging configurations to compile compact, optimized, runtime-ready installers.
- **Centralised Versioning**: Exposes `get_app_version` Tauri command to dynamically sync and display version `1.0.0` in Settings UI panels.
- **Performance Diagnostics**: Measures and prints startup initialization time, overlay window presentation latency, and command execution durations in milliseconds.

### Changed
- **AppData Path Alignment**: Relocated all configuration files (`easywheel.json`, `settings.json`, `profiles.json`) from `EasyWheelAE` to the clean `%APPDATA%/EasyWheel/` namespace.
- **CEP Bridge Extension**: Recompiled CEP script bundle to search for configuration and socket ports inside `%APPDATA%/EasyWheel/`.
- **Harden Startup Recovery**: Added double recovery fallback logic to load from split settings files if the main unified config is corrupted or missing.
- **Socket Bind Loops**: Wrapped TCP listeners in a 5-second retry loop to prevent silent socket connection failures when ports are busy.

### Fixed
- **Overlay Rendering Offset**: Removed the CEP `-90°` offset to match standard clockwise sector mapping starting at East (0° = Right) up to North-East (7 = 315°).
