# dispatcher.py — Command dispatcher for EasyWheel Blender bridge.
#
# THREADING REQUIREMENT
# ─────────────────────
# Every function in this module, including dispatch() and all command handlers,
# MUST be called exclusively from Blender's main thread.
# In this add-on that is enforced by __init__.py: _poll_queue() is registered
# with bpy.app.timers, which runs on the main thread.
#
# Never call bpy from the networking thread (connection.py).

import time
import traceback

import bpy

# ── Command registry ──────────────────────────────────────────────────────────

# Maps command ID string → handler callable.
COMMANDS: dict = {}


def _register(name: str):
    """Decorator that registers a function as a command handler."""
    def decorator(fn):
        COMMANDS[name] = fn
        return fn
    return decorator


# ── Context helpers ───────────────────────────────────────────────────────────

def _find_view3d_context() -> dict | None:
    """
    Finds the first 3D View area and returns a context-override dict, or None.

    Required for viewport operations such as frame_selected that need an
    explicit area/region context.
    """
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == 'VIEW_3D':
                for region in area.regions:
                    if region.type == 'WINDOW':
                        return {
                            "window": window,
                            "screen": window.screen,
                            "area":   area,
                            "region": region,
                        }
    return None


def _ctx_unavailable(command: str, hint: str = "") -> dict:
    """Returns a structured context_unavailable error response."""
    msg = f"No 3D View context available for '{command}'."
    if hint:
        msg += f" {hint}"
    return {"success": False, "errorCode": "context_unavailable", "message": msg}


# ── Phase 3 command handlers ──────────────────────────────────────────────────

@_register("blender.test_connection")
def _cmd_test_connection(params: dict) -> dict:
    """Confirms the bridge is working. Prints a message to the Blender console."""
    print("[EasyWheelBlender] test_connection: bridge is operational.")
    return {
        "success": True,
        "message": "EasyWheel Blender bridge is connected and operational.",
    }


@_register("blender.add_cube")
def _cmd_add_cube(params: dict) -> dict:
    """Adds a default cube mesh at the world origin."""
    bpy.ops.mesh.primitive_cube_add()
    return {"success": True, "message": "Cube added at world origin."}


@_register("blender.delete_selected")
def _cmd_delete_selected(params: dict) -> dict:
    """Deletes all currently selected objects."""
    if not bpy.context.selected_objects:
        return {
            "success":   False,
            "errorCode": "no_selection",
            "message":   "No objects are selected.",
        }
    bpy.ops.object.delete()
    return {"success": True, "message": "Deleted selected object(s)."}


@_register("blender.duplicate")
def _cmd_duplicate(params: dict) -> dict:
    """Duplicates the currently selected object(s)."""
    if not bpy.context.selected_objects:
        return {
            "success":   False,
            "errorCode": "no_selection",
            "message":   "No objects are selected.",
        }
    bpy.ops.object.duplicate()
    return {"success": True, "message": "Duplicated selected object(s)."}


@_register("blender.frame_selected")
def _cmd_frame_selected(params: dict) -> dict:
    """
    Frames the selected object(s) in the active 3D viewport.

    Requires a 3D View to be open.  Returns a structured context_unavailable
    error instead of crashing if no 3D View exists.
    """
    ctx = _find_view3d_context()
    if ctx is None:
        return _ctx_unavailable("frame_selected", "Open a 3D Viewport first.")
    try:
        with bpy.context.temp_override(**ctx):
            bpy.ops.view3d.view_selected()
        return {"success": True, "message": "Framed selected object(s) in 3D viewport."}
    except RuntimeError as exc:
        return _ctx_unavailable("frame_selected", str(exc))


# ── Main dispatch entry point ─────────────────────────────────────────────────

def dispatch(request: dict) -> dict:
    """
    Dispatches a CommandRequest dict to the registered handler.

    Returns a CommandResponse-shaped dict that mirrors the wire format used by
    ipc/response.rs (camelCase keys, version, requestId, success, message,
    executionTime, optional errorCode).

    Called ONLY from Blender's main thread (via bpy.app.timers in __init__.py).
    """
    start_ns   = time.monotonic_ns()
    request_id = request.get("requestId", "unknown")
    command    = request.get("command", "")
    parameters = request.get("parameters") or {}

    def _elapsed_ms() -> int:
        return (time.monotonic_ns() - start_ns) // 1_000_000

    def _make_response(
        success: bool,
        message: str,
        error_code: str | None = None,
    ) -> dict:
        resp: dict = {
            "version":       1,
            "requestId":     request_id,
            "success":       success,
            "message":       message,
            "executionTime": _elapsed_ms(),
        }
        # Omit errorCode entirely when None so the Rust serde Option<String>
        # deserialises cleanly (skip_serializing_if = "Option::is_none").
        if error_code is not None:
            resp["errorCode"] = error_code
        return resp

    handler = COMMANDS.get(command)
    if handler is None:
        print(f"[EasyWheelBlender] Unknown command: '{command}'")
        return _make_response(
            False,
            f"Unknown command: '{command}'",
            "unknown_command",
        )

    try:
        result = handler(parameters)
    except Exception:
        tb = traceback.format_exc()
        print(f"[EasyWheelBlender] Exception in '{command}':\n{tb}")
        return _make_response(
            False,
            "Command raised an exception. See Blender system console.",
            "execution_error",
        )

    return _make_response(
        result.get("success", False),
        result.get("message", ""),
        result.get("errorCode"),  # None if not set — omitted from JSON
    )
