"""Orthographic, unlit renders of the original head from six directions.

They replace Hunyuan's fragmented atlas as colour source for the head: each
head face is later painted from the views that see it best, so the head
texture is continuous across the new UV seams.

python head_views.py -- raw.glb texture.png out_dir res
"""
import bpy, sys, math, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

src, tex, out, res = sys.argv[sys.argv.index("--") + 1:][:4]
res = int(res)
os.makedirs(out, exist_ok=True)
mesh, arm = load(src, merge=True)
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
# head faces only: the shoulders and the collar would hide the neck and the chin
import bmesh, numpy as np
me = mesh.data
keep = head_faces(mesh)
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep[f.index]], context="FACES")
bm.to_mesh(me); bm.free()
scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 16; scene.cycles.use_denoising = False
scene.cycles.filter_width = 0.8
scene.render.resolution_x = res; scene.render.resolution_y = res
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)
mat = emission_bake_material("emit", tex, mesh.data.uv_layers[0].name, bpy.data.images.new("dummy", 8, 8))
mesh.data.materials.clear(); mesh.data.materials.append(mat)
cam = bpy.data.cameras.new("c"); cam.type = "ORTHO"; cam.ortho_scale = HEAD_VIEW_S
co = bpy.data.objects.new("c", cam); scene.collection.objects.link(co); scene.camera = co
cam.clip_start = 0.01; cam.clip_end = 2.0
C = HEAD_VIEW_C
for name, (loc, rot) in HEAD_VIEWS.items():
    co.location = (C[0] + loc[0], C[1] + loc[1], C[2] + loc[2])
    co.rotation_euler = tuple(math.radians(a) for a in rot)
    scene.render.filepath = os.path.join(out, f"view_{name}.png")
    bpy.ops.render.render(write_still=True)
print("views done")
