# EasyWheel Blender Bridge — README

## Overview

The EasyWheel Blender Bridge connects Blender to the EasyWheel Host, enabling
the EasyWheel radial wheel to execute Blender operations while Blender is the
foreground application.

```
EasyWheel Host (Rust/Tauri)  →  ws://127.0.0.1:23437  →  Blender Add-on  →  bpy
```

## File Structure

```
bridges/blender/addon/
    __init__.py      — Blender add-on entry point; registers bpy.app.timers callback
    _ws_client.py    — Minimal RFC 6455 WebSocket client (stdlib only, no pip required)
    connection.py    — Background thread; owns the socket; fills INCOMING / drains OUTGOING
    dispatcher.py    — Maps command IDs to bpy operations (main thread only)
    operators.py     — Blender UI panel (3D Viewport N-panel) and reconnect operator
    README.md        — This file
```

## Requirements

- Blender 3.0 or later (Python 3.10+)
- EasyWheel Host must be running before or after Blender — the add-on reconnects automatically

## Installation

1. Zip the entire `addon/` directory:
   ```powershell
   # From the bridges/blender/ directory
   Compress-Archive -Path "addon\*" -DestinationPath "easywheelblender.zip"
   ```

2. In Blender: **Edit → Preferences → Add-ons → Install**
   Select `easywheelblender.zip` and click **Install Add-on**.

3. Enable the add-on by checking the checkbox next to **"Interface: EasyWheel Blender Bridge"**.

## Verifying the Connection

Open **Window → Toggle System Console** (Windows) to see connection logs:

```
[EasyWheelBlender] Network thread started.
[EasyWheelBlender] Connection: CONNECTING
[EasyWheelBlender] Connection: HANDSHAKE
[EasyWheelBlender] Connected to EasyWheel Host on port 23437.
[EasyWheelBlender] Connection: CONNECTED
```

The **EasyWheel** panel in the 3D Viewport N-panel also shows the current state.

## Supported Commands (Phase 3)

| Command ID                  | What it does                                      |
|-----------------------------|---------------------------------------------------|
| `blender.test_connection`   | Prints a confirmation message to the console      |
| `blender.add_cube`          | Adds a cube mesh at the world origin              |
| `blender.delete_selected`   | Deletes the selected object(s)                    |
| `blender.duplicate`         | Duplicates the selected object(s)                 |
| `blender.frame_selected`    | Frames selected in the active 3D viewport         |

The legacy action ID `"duplicate"` (from profiles saved before the `blender.*`
prefix was introduced) is also accepted and maps to `blender.duplicate`.

## Default Wheel Assignments (New Installs)

| Sector | Action                   |
|--------|--------------------------|
| 0      | `blender.add_cube`       |
| 1      | `blender.duplicate`      |
| 2      | `blender.delete_selected`|
| 3      | `blender.frame_selected` |
| 7      | EasyWheel Settings       |

Existing users can re-assign sectors in the EasyWheel Settings UI.

## Threading Model

```
Blender main thread                   Background network thread
      │                                         │
      │  bpy.app.timers (_poll_queue, 50 ms)    │
      │                                         │
      │  ← INCOMING.get_nowait() ←──────────────┤ INCOMING.put_nowait(request)
      │                                         │
      │  dispatcher.dispatch(request)           │
      │  → bpy.ops.*()                          │
      │                                         │
      │  OUTGOING.put_nowait(response) ─────────→ OUTGOING.get_nowait()
      │                                         │ ws.send_text(response_json)
```

**Rule**: `bpy` is never imported or called from `connection.py`.
**Rule**: `_ws_client.py` and `connection.py` never touch `bpy`.

## Error Codes

| Error code            | Meaning                                           |
|-----------------------|---------------------------------------------------|
| `unknown_command`     | The command ID is not registered in dispatcher.py |
| `no_selection`        | The operation requires selected objects           |
| `context_unavailable` | No 3D View open (needed for viewport operations)  |
| `execution_error`     | A Python exception occurred (see console)         |

## Adding a New Command

1. In `dispatcher.py`, add a handler:
   ```python
   @_register("blender.my_command")
   def _cmd_my_command(params: dict) -> dict:
       bpy.ops.something.do_it()
       return {"success": True, "message": "Done."}
   ```

2. In `blender_provider.rs`, add `"blender.my_command"` to `SUPPORTED_ACTIONS`.

3. No other files need to change.

## Troubleshooting

| Symptom                          | Likely cause                    | Fix                                               |
|----------------------------------|---------------------------------|---------------------------------------------------|
| Status stays CONNECTING          | Host not running                | Start EasyWheel Host                             |
| Status stays HANDSHAKE           | Host version mismatch           | Update Host or add-on                            |
| "Not connected" in EasyWheel     | Add-on not enabled              | Enable in Blender Preferences → Add-ons          |
| Command times out                | Blender frozen or busy          | Check Blender is responsive                      |
| `context_unavailable` for frame  | No 3D View open                 | Open a 3D Viewport                               |
| Old commands still firing        | Stale user config               | Re-assign sectors in EasyWheel Settings          |
