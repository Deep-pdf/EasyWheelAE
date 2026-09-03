# operators.py — Blender operators and UI panels for EasyWheel Blender Bridge.
#
# Phase 3: A sidebar panel in the 3D Viewport N-panel that displays the current
# connection status and a one-click reconnect button.

import bpy
from . import connection


class EASYWHEELBLENDER_OT_reconnect(bpy.types.Operator):
    """Disconnect and reconnect to the EasyWheel Host."""
    bl_idname   = "easywheelblender.reconnect"
    bl_label    = "Reconnect"
    bl_description = "Stop and restart the connection to EasyWheel Host"

    def execute(self, context):
        connection.stop()
        connection.start()
        self.report({'INFO'}, "EasyWheel: reconnecting to host...")
        return {'FINISHED'}


class EASYWHEELBLENDER_PT_panel(bpy.types.Panel):
    """Displays EasyWheel connection status in the 3D Viewport N-panel."""
    bl_label       = "EasyWheel"
    bl_idname      = "EASYWHEELBLENDER_PT_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category    = 'EasyWheel'

    def draw(self, context):
        layout = self.layout
        state  = connection.get_state()

        col = layout.column(align=True)
        col.label(text=f"Status: {state}", icon='CHECKMARK' if state == "CONNECTED" else 'ERROR')
        col.separator()
        col.operator("easywheelblender.reconnect", icon='FILE_REFRESH')


_CLASSES = [
    EASYWHEELBLENDER_OT_reconnect,
    EASYWHEELBLENDER_PT_panel,
]


def register() -> None:
    for cls in _CLASSES:
        bpy.utils.register_class(cls)


def unregister() -> None:
    for cls in reversed(_CLASSES):
        bpy.utils.unregister_class(cls)
