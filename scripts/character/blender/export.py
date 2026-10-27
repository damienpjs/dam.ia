"""Export the rebuilt founder to glTF for the web.

python export.py -- founder_v2.blend body_color.png head_color.png normal.png mr.png out.glb
"""
import bpy, sys
args = sys.argv[sys.argv.index("--") + 1:]
BLEND, BODY_COLOR, HEAD_COLOR, NORMAL, MR, OUT = args[:6]
bpy.ops.wm.open_mainfile(filepath=BLEND)
mesh = max([o for o in bpy.data.objects if o.type == "MESH"], key=lambda o: len(o.data.vertices))
me = mesh.data

# UV sets: TEXCOORD_0 = atlas, TEXCOORD_1 = face sheet
me.uv_layers.remove(me.uv_layers["old"])
me.uv_layers["atlas"].active = True
me.uv_layers["atlas"].active_render = True
for a in list(me.color_attributes):
    me.color_attributes.remove(a)

def image(path, name, non_color=False):
    im = bpy.data.images.load(path); im.name = name
    if non_color: im.colorspace_settings.name = "Non-Color"
    return im

def material(mat, color, normal=None, mr=None, roughness=0.6):
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = color
    nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
    if normal:
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = normal
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(n.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if mr:
        m = nt.nodes.new("ShaderNodeTexImage"); m.image = mr
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(m.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"]); nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    else:
        bsdf.inputs["Roughness"].default_value = roughness; bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Specular IOR Level"].default_value = 0.35

material(bpy.data.materials["founder_body"], image(BODY_COLOR, "founder_body_color"), image(NORMAL, "founder_body_normal", True), image(MR, "founder_body_mr", True))
material(bpy.data.materials["founder_head"], image(HEAD_COLOR, "founder_head_color"), roughness=0.62)

for k in me.shape_keys.key_blocks:
    k.value = 0
arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
arm.data.pose_position = "POSE"
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True); arm.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB", use_selection=True,
    export_animations=True, export_skins=True, export_morph=True, export_morph_normal=False,
    export_texcoords=True, export_normals=True, export_tangents=False, export_attributes=False,
    export_image_format="AUTO", export_yup=True, export_apply=False,
)
print("exported", OUT)
