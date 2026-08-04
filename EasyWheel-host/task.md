# Phase 6.5 — Task List

## Backend integration
- [x] Rename configuration file from `config.json` to `easywheel.json` in `config_manager.rs`
- [x] Add backward compatibility migration path from legacy `config.json` to `easywheel.json`
- [x] Implement subscription list (`SUBSCRIBERS`) inside `ConfigManager`
- [x] Invoke subscribers during configuration load, save, and reload
- [x] Subscribe `ActionManager::rebuild` to flush active caches on config change
- [x] Add `ACTIVE_KEYS` static to `HotkeyManager` and dynamic lookup during hook event dispatch
- [x] Subscribe `HotkeyManager::update_keys` to reload keyboard hooks on config change
- [x] Enhance `validate_config` in `commands.rs` to validate hex colors, modifier/trigger keys, minimum sector count, and duplicate executables mapped across profiles
- [x] EasyWheel Host Backend (Rust)
  - [x] Create `command_registry.rs` to load and cache `command_registry.json`
  - [x] Register `command_registry` in `lib.rs`
  - [x] Implement `get_command_registry` Tauri command in `commands.rs`
  - [x] Update `AfterEffectsProvider` to lookup commands dynamically in `after_effects_provider.rs`

## Frontend integration
- [x] Implement debounced auto-save (400ms) within `ConfigContext.tsx`
- [x] Enforce window title changes depending on dirty state (`EasyWheel — Settings *` when modified)
- [x] Execute `install.bat` to deploy the latest extension bundle.
- [x] Verify the extension files are updated in Adobe CEP directory.
- [x] Fix sector mapping misalignment by removing the visual -90° rotation in WheelPreview.tsx to match Host and Overlay.
- [ ] Restart After Effects and verify the panel transitions to CONNECTED.
- [ ] Test bidirectional syncing of sector assignments between the Host and the After Effects CEP panel.
- [ ] Test the radial wheel overlay's dynamic labels and highlights.
- [x] Propagate dynamic configuration values (`wheel_radius`, `dead_zone_radius`, `sector_count`, `highlight_color`, `default_color`) to the overlay `GeometryState`
- [x] Update `Overlay.tsx` to read dynamic geometry and colors from `GeometryState` and pass them as props to `WheelRenderer`
- [x] Refactor `WheelRenderer.tsx` to accept dynamic geometries and colors as props instead of hardcoded constants

## Verification
- [x] Verify frontend TSC and Vite builds successfully without errors
- [x] Verify backend cargo check passes successfully without warnings or errors
