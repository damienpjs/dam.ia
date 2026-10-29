"""Founder v3: Ship or Die body and demo_shirt outfit, portfolio head, finger
bones, relaxed hands, exported for the web.

python build_v3.py -- founder_v3.blend head_color.png out.glb
(founder_v3.blend comes from assemble.py)
"""
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fingers import find_chains, add_finger_bones, relax_hands, ease_wrists, heat_weight_hands, subdivide, add_twist_bones, twist_to_twist_bone, add_hand_shape_clips, centreline_chains
from cloth import close_sleeve_notches, fit_outfit_weights, hide_feet, seal_sleeves
from collide import clear_hands
from watch import remove_strap, build_watch
from colliders import fit_colliders
from hand_graft import graft_hands

ARGS = sys.argv[sys.argv.index("--") + 1:]
BLEND, HEAD_COLOR, OUT = ARGS[:3]
HAND = ARGS[3] if len(ARGS) > 3 else None          # generated hand (Hunyuan glb), optional
bpy.ops.wm.open_mainfile(filepath=BLEND)
rig = bpy.data.objects["rig"]
skin = bpy.data.objects["male.skin.demo_shirt"]
outfit = bpy.data.objects["male.outfit.demo_shirt"]
head = bpy.data.objects["founder.head"]
rig.data.pose_position = "REST"
bpy.context.view_layer.update()

# --- hands: the body is subdivided once, then the generated hands are grafted --
subdivide(skin)
if HAND:
    graft_hands(skin, rig, HAND, texture_png=os.path.join(os.path.dirname(os.path.abspath(OUT)), "founder_hands_color.png"), head_png=HEAD_COLOR)

# --- fingers -----------------------------------------------------------------
chains = {side: find_chains(skin, rig, side) for side in ("Left", "Right")}
if HAND:
    chains = {side: centreline_chains(skin, side, chains[side]) for side in chains}
add_finger_bones(rig, chains)
heat_weight_hands(skin, rig)
add_twist_bones(rig, skin)
fit_outfit_weights(outfit, skin)
hide_feet(skin)
seal_sleeves(skin, rig)
close_sleeve_notches(outfit, rig)
watch = build_watch(skin, rig, remove_strap(outfit, rig))
fit_colliders(rig, [skin, outfit, head])
rig.data.pose_position = "POSE"

# --- clips: Ship or Die's own, renamed for the site ---------------------------
keep = {"male__IDLE": "IDLE", "male__WALKING": "WALKING"}
for a in list(bpy.data.actions):
    if a.name not in keep: bpy.data.actions.remove(a)
for old, new in keep.items():
    bpy.data.actions[old].name = new
acts = [bpy.data.actions["IDLE"], bpy.data.actions["WALKING"]]
twist_to_twist_bone(rig, acts)
ease_wrists(rig, acts, float(os.environ.get("WRIST_KEEP", "0.35")))
# no damping of the hand keys here: this rig's rest hands face forward, and the
# clips' 96 to 116 degree hand turn is what brings the palms back to the thighs
rig.animation_data_create()
for a in acts:
    rig.animation_data.action = a
    if a.slots: rig.animation_data.action_slot = a.slots[0]
    relax_hands(rig, chains, [a])
    a.use_fake_user = True
clear_hands(rig, skin, outfit, acts)
add_hand_shape_clips(rig, chains)
rig.animation_data.action = acts[0]
if acts[0].slots: rig.animation_data.action_slot = acts[0].slots[0]

# --- materials, named as the site expects ------------------------------------
skin.data.materials[0].name = "founder_body"
# arms and hands shade like the head: one albedo tone, roughness 0.62, no metal,
# no game normal map (its ridge ended at the graft and lit the two skins differently)
for mat in skin.data.materials:
    b = mat.node_tree.nodes["Principled BSDF"]
    for name, value in (("Metallic", 0.0), ("Roughness", 0.62)):
        for link in list(b.inputs[name].links): mat.node_tree.links.remove(link)
        b.inputs[name].default_value = value
    for link in list(b.inputs["Normal"].links): mat.node_tree.links.remove(link)
outfit.data.materials[0].name = "founder_outfit"
# open shirt front, sleeves and the watch strap show their inside: draw both faces
outfit.data.materials[0].use_backface_culling = False
for img in bpy.data.images:
    if img.size[0] > 2048:
        img.scale(2048, 2048)
    # retoned or resized in memory: repack, or the exporter writes the image as it was loaded
    if img.is_dirty or img.packed_file:
        img.pack()
m = bpy.data.materials.new("founder_head"); m.use_nodes = True; nt = m.node_tree
bsdf = nt.nodes["Principled BSDF"]
t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(HEAD_COLOR)
uv = nt.nodes.new("ShaderNodeUVMap"); uv.uv_map = "atlas"
nt.links.new(uv.outputs[0], t.inputs[0]); nt.links.new(t.outputs[0], bsdf.inputs["Base Color"])
bsdf.inputs["Roughness"].default_value = 0.62
head.data.materials.clear(); head.data.materials.append(m)
for a in list(head.data.color_attributes):
    head.data.color_attributes.remove(a)          # bake helpers, not needed on the web
# TEXCOORD_0 = atlas, TEXCOORD_1 = face sheet
head.data.uv_layers["atlas"].active = True
head.data.uv_layers["atlas"].active_render = True

bpy.ops.wm.save_as_mainfile(filepath=OUT.replace(".glb", ".blend"))
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB", use_selection=False,
    export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
    export_morph=True, export_morph_normal=False, export_skins=True, export_all_influences=False,
    export_image_format="AUTO", export_texcoords=True, export_extras=True, export_normals=True, export_yup=True,
)
print("exported", OUT)
