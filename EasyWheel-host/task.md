# Phase 6 — Task List

## Rust Backend
- [x] Cargo.toml — add tlhelp32 winapi feature
- [x] action_manager.rs — Mutex<Option<>> rebuild support
- [x] config_manager.rs — add update_and_save()
- [x] commands.rs — 5 new commands + RunningApp + validate_config
- [x] tray.rs — Reload Configuration menu item
- [x] lib.rs — register new commands
- [x] tauri.conf.json — update window dimensions
- [x] capabilities/default.json — update permissions

## Frontend Setup
- [x] npm install tailwindcss @tailwindcss/vite
- [x] vite.config.ts — add Tailwind plugin
- [x] host/styles/settings.css — design tokens + Tailwind

## Types & IPC
- [x] host/settings/types.ts
- [x] host/ipc/settings.ts
- [x] host/settings/context/ConfigContext.tsx

## UI Primitives
- [x] components/ui/Button.tsx
- [x] components/ui/Modal.tsx
- [x] components/ui/SearchBar.tsx
- [x] components/ui/HotkeyRecorder.tsx
- [x] components/ui/ColorPicker.tsx
- [x] components/ui/Slider.tsx
- [x] components/ui/ValidationMessage.tsx

## Wheel Components
- [x] components/wheel/WheelEditor.tsx
- [x] components/wheel/WheelPreview.tsx

## Profile / Action Components
- [x] components/actions/ActionPicker.tsx
- [x] components/profiles/RunningAppsDialog.tsx

## Layout
- [x] components/layout/Sidebar.tsx
- [x] components/layout/PageLayout.tsx

## Pages
- [x] pages/GeneralPage.tsx
- [x] pages/ProfilesPage.tsx
- [x] pages/ActionsPage.tsx
- [x] pages/AppearancePage.tsx
- [x] pages/AboutPage.tsx

## Assembly
- [x] settings/SettingsApp.tsx
- [x] host/App.tsx (update)
- [x] host/styles/global.css (verified)

## Verify
- [x] cargo build passes
- [x] npm run tauri build / dev builds successfully
