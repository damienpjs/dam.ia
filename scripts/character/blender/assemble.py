"""Assemble the founder v3: the Ship or Die male body and its demo_shirt outfit
(male.skin.demo_shirt, male.outfit.demo_shirt, rig) with the portfolio head
(founder_head material: drawn eyes, face UVs, 10 shape keys) grafted on the neck.

python assemble.py -- male_slim.blend founder_v2.blend out.blend
"""
import bpy, sys, os
import numpy as np
from mathutils import Vector

SOD, FOUNDER, OUT = sys.argv[sys.argv.index("--") + 1:][:3]

# --- the founder head, from the portfolio build ------------------------------
bpy.ops.wm.open_mainfile(filepath=FOUNDER)
src = max([o for o in bpy.data.objects if o.type == "MESH"], key=lambda o: len(o.data.vertices))
farm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
f_head_bone = farm.matrix_world @ farm.data.bones["mixamorig:Head"].head_local
hi = [i for i, m in enumerate(src.data.materials) if m.name == "founder_head"][0]
import bmesh
bm = bmesh.new(); bm.from_mesh(src.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != hi], context="FACES")
bm.to_mesh(src.data); bm.free()
src.modifiers.clear(); src.parent = None
src.data.materials.clear()
if "old" in src.data.uv_layers: src.data.uv_layers.remove(src.data.uv_layers["old"])
src.vertex_groups.clear()
src.name = src.data.name = "founder.head"
# keep world-space positions, shape keys included
mw = src.matrix_world.copy()
src.data.transform(mw, shape_keys=True); src.matrix_world.identity()
tmp = os.path.join(os.path.dirname(OUT), "_head_only.blend")
bpy.data.libraries.write(tmp, {src}, fake_user=True)
print("founder head", len(src.data.vertices), "verts, keys", [k.name for k in src.data.shape_keys.key_blocks] if src.data.shape_keys else [])

# --- the Ship or Die body -------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=SOD)
for n in ("male.base", "male.head.01"):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
rig = bpy.data.objects["rig"]
s_head_bone = rig.matrix_world @ rig.data.bones["mixamorig:Head"].head_local
with bpy.data.libraries.load(tmp) as (src_lib, dst):
    dst.objects = ["founder.head"]
head = dst.objects[0]
bpy.context.scene.collection.objects.link(head)
os.remove(tmp)
delta = s_head_bone - f_head_bone
head.data.transform(__import__("mathutils").Matrix.Translation(delta), shape_keys=True)
print("head moved by", tuple(round(c, 4) for c in delta))

# weights from the Ship or Die head cut, which sits at the same place
cut = bpy.data.objects["male.headcut.demo_shirt"]
for g in cut.vertex_groups:
    head.vertex_groups.new(name=g.name)
dt = head.modifiers.new("dt", "DATA_TRANSFER")
dt.object = cut; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"; dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
bpy.context.view_layer.objects.active = head; head.select_set(True)
# shape keys forbid applying a modifier: apply on a copy of the basis and copy the groups back
me_eval = head.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
idx = {g.index: g.name for g in head.vertex_groups}
W = [[(idx[g.group], g.weight) for g in v.groups] for v in me_eval.vertices]
head.modifiers.remove(dt)
for i, ws in enumerate(W):
    for name, w in ws:
        if w > 1e-4: head.vertex_groups[name].add([i], w, "REPLACE")
print("weights transferred to", sum(1 for ws in W if ws), "verts")
head.parent = rig
head.matrix_parent_inverse = rig.matrix_world.inverted()
mod = head.modifiers.new("Armature", "ARMATURE"); mod.object = rig
bpy.data.objects.remove(cut, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved", OUT)
