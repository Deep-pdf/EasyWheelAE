# __init__.py — EasyWheel Blender Bridge add-on entry point.
#
# Threading model (enforced here)
# ───────────────────────────────
#   Network I/O: runs in a daemon background thread (connection.py).
#     Owns the WebSocket socket exclusively.
#     Writes parsed CommandRequest dicts to  INCOMING queue.
#     Reads  CommandResponse dicts from      OUTGOING queue.
#
#   Blender main thread: runs bpy.app.timers callback (_poll_queue).
#     Drains  INCOMING — dispatches each request via dispatcher.dispatch().
#     Fills   OUTGOING — puts the CommandResponse for the network thread to send.
#
# bpy is NEVER imported or called from connection.py.

import queue
import traceback

import bpy

from . import connection, dispatcher, operators

bl_info = {
    "name":        "EasyWheel Blender Bridge",
    "author":      "EasyWheelAE",
    "version":     (1, 0, 0),
    "blender":     (3, 0, 0),
    "location":    "View3D > Sidebar > EasyWheel",
    "description": (
        "Connects Blender to the EasyWheel Host for wheel-based command "
        "execution while Blender is the foreground application."
    ),
    "category": "Interface",
}

# Timer interval: 50 ms matches the host's 50 ms read timeout so that
# commands dispatched by the host result in responses within ~100 ms.
_TIMER_INTERVAL = 0.05


def _poll_queue() -> float:
    """
    Called by bpy.app.timers on Blender's main thread every _TIMER_INTERVAL s.

    Drains the INCOMING queue and dispatches each CommandRequest.
    Puts the resulting CommandResponse onto the OUTGOING queue for the
    network thread to send.

    Returns _TIMER_INTERVAL to reschedule the timer, keeping it persistent
    for the lifetime of the add-on.  The timer is unregistered explicitly in
    unregister(), not by returning None here.
    """
    while True:
        try:
            request = connection.INCOMING.get_nowait()
        except queue.Empty:
            break

        request_id = (
            request.get("requestId", "unknown")
            if isinstance(request, dict)
            else "unknown"
        )

        try:
            response = dispatcher.dispatch(request)
        except Exception:
            tb = traceback.format_exc()
            print(f"[EasyWheelBlender] Unexpected error in _poll_queue:\n{tb}")
            response = {
                "version":       1,
                "requestId":     request_id,
                "success":       False,
                "errorCode":     "internal_error",
                "message":       "Unexpected error in EasyWheel dispatcher.",
                "executionTime": 0,
            }

        connection.OUTGOING.put_nowait(response)

    return _TIMER_INTERVAL


def register() -> None:
    operators.register()
    connection.start()
    if not bpy.app.timers.is_registered(_poll_queue):
        bpy.app.timers.register(
            _poll_queue,
            first_interval=_TIMER_INTERVAL,
            persistent=True,
        )
    print("[EasyWheelBlender] Add-on registered.")


def unregister() -> None:
    if bpy.app.timers.is_registered(_poll_queue):
        bpy.app.timers.unregister(_poll_queue)
    connection.stop()
    operators.unregister()
    print("[EasyWheelBlender] Add-on unregistered.")
