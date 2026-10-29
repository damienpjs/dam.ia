import os
import bpy, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
src, tex, out, res = sys.argv[sys.argv.index("--")+1:][:4]
res = int(res)
mesh, arm = load(src)
arm.data.pose_position = "REST"
scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 16; scene.cycles.use_denoising = False
scene.cycles.filter_width = 0.8
scene.render.resolution_x = res; scene.render.resolution_y = res
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)
mat = emission_bake_material("emit", tex, mesh.data.uv_layers[0].name, bpy.data.images.new("dummy", 8, 8))
mesh.data.materials.clear(); mesh.data.materials.append(mat)
cam = bpy.data.cameras.new("c"); cam.type = "ORTHO"; cam.ortho_scale = FACE_S
co = bpy.data.objects.new("c", cam); scene.collection.objects.link(co); scene.camera = co
co.location = (FACE_CX, -1.0, FACE_CZ); co.rotation_euler = (math.radians(90), 0, 0)
cam.clip_start = 0.5; cam.clip_end = 1.2
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
