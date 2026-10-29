import os
import bpy, math, mathutils, bmesh

def load(src, merge=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src, merge_vertices=merge)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    mesh = max(meshes, key=lambda o: len(o.data.vertices))
    for o in meshes:
        if o != mesh and o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o)
    arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
    return mesh, arm

def setup_render(res=900, samples=24, bg=(0.93, 0.94, 0.925)):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"; scene.cycles.samples = samples; scene.cycles.device = "CPU"
    scene.cycles.use_denoising = True
    scene.render.resolution_x = res; scene.render.resolution_y = res
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("w"); scene.world = world
    world.use_nodes = True
    bgn = world.node_tree.nodes["Background"]; bgn.inputs[0].default_value = (*bg, 1); bgn.inputs[1].default_value = 0.6
    for name, loc, rot, energy, size in [("key", (1.2, -2.2, 2.4), (55, 0, 28), 120, 1.5), ("fill", (-2.0, -1.5, 1.6), (70, 0, -50), 40, 2.0), ("rim", (0.5, 2.0, 2.0), (-60, 0, 170), 60, 1.0)]:
        l = bpy.data.lights.new(name, "AREA"); l.energy = energy; l.size = size
        o = bpy.data.objects.new(name, l); scene.collection.objects.link(o)
        o.location = loc; o.rotation_euler = tuple(math.radians(a) for a in rot)
    cam = bpy.data.cameras.new("cam"); cam.lens = 85
    co = bpy.data.objects.new("cam", cam); scene.collection.objects.link(co); scene.camera = co
    return scene, co

def aim(cam, loc, tgt, lens=85):
    cam.location = loc; cam.data.lens = lens
    d = mathutils.Vector(tgt) - mathutils.Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

def shot(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def head_top(mesh):
    deps = bpy.context.evaluated_depsgraph_get()
    ev = mesh.evaluated_get(deps)
    return max((ev.matrix_world @ v.co).z for v in ev.data.vertices)

FACE_CX = 0.0
FACE_CZ = 1.315   # vertical centre of the face sheet (between eyes and mouth), metres
FACE_S = 0.26     # side of the face sheet, metres

def add_face_uv(mesh, name="face"):
    me = mesh.data
    uvl = me.uv_layers.get(name) or me.uv_layers.new(name=name)
    mw = mesh.matrix_world
    for l in me.loops:
        p = mw @ me.vertices[l.vertex_index].co
        uvl.data[l.index].uv = ((p.x - FACE_CX) / FACE_S + 0.5, (p.z - FACE_CZ) / FACE_S + 0.5)
    return uvl

def emission_bake_material(name, image_path_or_img, src_uv, target_img, colorspace="sRGB"):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    tex = nt.nodes.new("ShaderNodeTexImage")
    img = image_path_or_img if isinstance(image_path_or_img, bpy.types.Image) else bpy.data.images.load(image_path_or_img)
    img.colorspace_settings.name = colorspace
    tex.image = img; tex.interpolation = "Cubic"
    uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = src_uv
    nt.links.new(uvn.outputs["UV"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    tgt = nt.nodes.new("ShaderNodeTexImage"); tgt.image = target_img
    nt.nodes.active = tgt
    return mat

def bake_emit(obj, margin=8):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 1
    scene.render.bake.margin = margin; scene.render.bake.margin_type = "EXTEND"
    scene.render.bake.use_selected_to_active = False
    bpy.ops.object.select_all(action="DESELECT"); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="EMIT", margin=margin)

HEAD_VIEW_S = 0.42
HEAD_VIEW_C = (0.0, 0.0, 1.29)
# name: (camera offset from the centre, camera rotation in degrees)
HEAD_VIEWS = {
    "front": ((0, -1, 0), (90, 0, 0)),
    "back": ((0, 1, 0), (90, 0, 180)),
    "left": ((1, 0, 0), (90, 0, 90)),
    "right": ((-1, 0, 0), (90, 0, -90)),
    "top": ((0, 0, 1), (0, 0, 0)),
    "bottom": ((0, 0, -1), (180, 0, 0)),
}

def view_axes(name):
    """World vectors of the image's u and v axes, and the direction towards the camera."""
    loc, rot = HEAD_VIEWS[name]
    m = mathutils.Euler(tuple(math.radians(a) for a in rot)).to_matrix()
    return m.col[0].copy(), m.col[1].copy(), mathutils.Vector(loc)

def push_pull(rgb, mask):
    """Fill the pixels outside mask with a smooth extension of those inside."""
    import numpy as np
    c = rgb * mask[..., None]; w = mask.astype(np.float32)
    levels = []
    while c.shape[0] > 1:
        levels.append((c, w))
        h2, w2 = c.shape[0] // 2, c.shape[1] // 2
        c = c[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2, 3).sum((1, 3))
        w = w[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2).sum((1, 3))
    up = c / np.maximum(w, 1e-6)[..., None]
    for c, w in reversed(levels):
        up = np.repeat(np.repeat(up, 2, 0), 2, 1)[:c.shape[0], :c.shape[1]]
        known = w > 0
        cur = np.where(known[..., None], c / np.maximum(w, 1e-6)[..., None], up)
        up = cur
    return up

# original Hunyuan texture (skin/shirt classification, watch detection)
HEAD_SOURCE_TEX = os.environ.get("SOURCE_TEX", "work/texture.png")

def head_faces(mesh):
    """Faces painted as head: the Head bone's, plus the skin of the neck down
    to the collar, so that the seam with the body hides under the collar
    instead of zigzagging across the neck. Skin is told from the shirt by the
    original texture, then by majority over the neighbours (the atlas leaves
    isolated dark and red flecks)."""
    import numpy as np
    me = mesh.data
    def w(names):
        idx = {mesh.vertex_groups[n].index for n in names if n in mesh.vertex_groups}
        return np.array([sum(g.weight for g in v.groups if g.group in idx) for v in me.vertices])
    wh = w(["mixamorig:Head", "mixamorig:HeadTop_End"]); wn = w(["mixamorig:Neck"])
    head = np.array([wh[list(p.vertices)].mean() > 0.5 for p in me.polygons])
    cand = np.array([(wh + wn)[list(p.vertices)].mean() > 0.5 for p in me.polygons]) & ~head
    img = bpy.data.images.load(HEAD_SOURCE_TEX); W_, H_ = img.size
    px = np.empty(W_ * H_ * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(H_, W_, 4)
    uv = me.uv_layers[0].data
    skin = np.zeros(len(me.polygons))
    for p in me.polygons:
        if not cand[p.index]: continue
        u = np.mean([uv[l].uv[0] for l in p.loop_indices]); v = np.mean([uv[l].uv[1] for l in p.loop_indices])
        r, g, b = px[int(np.clip(v * H_, 0, H_ - 1)), int(np.clip(u * W_, 0, W_ - 1)), :3]
        skin[p.index] = 1.0 if (r > b * 1.25 and r > 0.25) else 0.0
    bpy.data.images.remove(img)
    nb = [[] for _ in me.polygons]
    edge_faces = {}
    for p in me.polygons:
        for ek in p.edge_keys: edge_faces.setdefault(ek, []).append(p.index)
    for fs in edge_faces.values():
        for a in fs:
            nb[a].extend(b for b in fs if b != a)
    s = skin.copy()
    for _ in range(3):
        s = np.array([(s[i] + sum(s[j] if cand[j] else (1.0 if head[j] else 0.0) for j in nb[i])) / (1 + len(nb[i])) if cand[i] else s[i] for i in range(len(s))])
    sel = head | (cand & (s > 0.5))
    # one piece: drop the flecks of skin cut off from the head
    seen = np.zeros(len(sel), bool); best = []
    for f in range(len(sel)):
        if not sel[f] or seen[f]: continue
        comp = [f]; seen[f] = True; k = 0
        while k < len(comp):
            for j in nb[comp[k]]:
                if sel[j] and not seen[j]: seen[j] = True; comp.append(j)
            k += 1
        if len(comp) > len(best): best = comp
    out = np.zeros(len(sel), bool); out[best] = True
    return out
