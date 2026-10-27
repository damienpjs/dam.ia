"""Painted eyes of the face sheet, shared by the Blender scripts and the image
scripts (no bpy here)."""

# Painted eyes on the face sheet (fractions of the sheet, v up): centre, half
# width, half heights up and down. Same values as EYES in
# src/lib/character/face-shader.ts.
EYES = {
    "R": dict(c=(0.3486, 0.6602), a=0.0723, bu=0.0498, bl=0.0505),
    "L": dict(c=(0.6348, 0.6602), a=0.0733, bu=0.0498, bl=0.0505),
}
