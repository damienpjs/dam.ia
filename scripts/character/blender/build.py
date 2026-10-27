"""Rebuild the founder character for dam.ia.

- Hands straightened along the forearms, wrist weights redone, the clips'
  hand rotations damped (hands.py).
- The body keeps Hunyuan's UVs and gets its atlas upscaled (Real-ESRGAN x4,
  then 2048 px, cleaned by fill_atlas.py and fix_flecks.py): same layout.
- The head (and the skin of the neck) gets its own material and its own
  2048 px texture, unwrapped in a few islands, baked from six orthographic
  views of the original head (head_views.py) and, on the front of the face,
  from the upscaled face sheet whose painted eyes were erased: the eyes are
  drawn by the shader in the browser.
- A second UV map ("face") carries face-sheet coordinates for that shader,
  2 sheets away from the front of the head (outwards, see below).
- Shape keys for brows, mouth and jaw, sculpted in face-sheet space.

python build.py -- raw.glb atlas_x4.png sheet_x4.png out_dir views_dir
"""
import bpy, bmesh, sys, os, math, json, heapq
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

args = sys.argv[sys.argv.index("--") + 1:]
SRC, ATLAS_UP, SHEET_UP, OUT, VIEWS = args[:5]
HEAD_RES = int(os.environ.get("HEAD_RES", "2048"))
os.makedirs(OUT, exist_ok=True)

mesh, arm = load(SRC, merge=True)
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
from hands import fix_hands
from hands import damp_hand_keys
fix_hands(mesh, arm, watch_tex=HEAD_SOURCE_TEX)
damp_hand_keys(0.4)
bpy.context.view_layer.update()
me = mesh.data
mw = mesh.matrix_world
inv3 = mw.to_3x3().inverted()

def group_weights(names):
    idx = {mesh.vertex_groups[n].index for n in names if n in mesh.vertex_groups}
    w = np.zeros(len(me.vertices))
    for v in me.vertices:
        w[v.index] = sum(g.weight for g in v.groups if g.group in idx)
    return np.clip(w, 0, 1)

w_head = group_weights(["mixamorig:Head", "mixamorig:HeadTop_End"])
co = np.array([mw @ v.co for v in me.vertices])
nrm = np.array([(mw.to_3x3() @ v.normal).normalized() for v in me.vertices])

# ---------------------------------------------------------------- head faces
head_face = head_faces(mesh)
print("head faces", head_face.sum(), "of", len(me.polygons))


# ---------------------------------------------------------------- UV layers
old = me.uv_layers[0]; old.name = "old"
for l in list(me.uv_layers)[1:]:
    me.uv_layers.remove(l)
atlas = me.uv_layers.new(name="atlas")        # copy of "old"
for i in range(len(me.loops)):
    atlas.data[i].uv = old.data[i].uv
me.uv_layers.active = atlas

# Head layout: the front of the face is a planar projection (the face sheet's
# own coordinates, so it lines up with the sheet and stays seamless); the rest
# of the head is unwrapped around it. The front keeps FACE_DENSITY times the
# texel density of the rest.
FACE_DENSITY = 2.6
front_v = (nrm[:, 1] < -0.42) & (co[:, 2] > 1.17)
F = np.array([head_face[p.index] and all(front_v[i] for i in p.vertices) for p in me.polygons])

bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table()
uvl = bm.loops.layers.uv["atlas"]

def planar(v):
    p = co[v.index]
    return ((p[0] - FACE_CX) / FACE_S + 0.5, (p[2] - FACE_CZ) / FACE_S + 0.5)

def tri_area2(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])

# fill the holes of the front patch: the sides of the nose and the inner eye
# corners face sideways, but cut out as tiny islands they bake with a seam
# around them that shows. Small components of non-front head faces that do not
# reach the rest of the head join the front.
def components(mask):
    seen = set(); out = []
    for f in bm.faces:
        if not mask[f.index] or f.index in seen: continue
        comp = []; stack = [f]; seen.add(f.index)
        while stack:
            g = stack.pop(); comp.append(g.index)
            for e in g.edges:
                for h in e.link_faces:
                    if mask[h.index] and h.index not in seen:
                        seen.add(h.index); stack.append(h)
        out.append(comp)
    return out
holes = 0
for comp in components(head_face & ~F):
    if len(comp) < 80 and all(co[list(me.polygons[i].vertices)][:, 2].min() > 1.2 for i in comp):
        for i in comp: F[i] = True
        holes += len(comp)
print("front holes filled", holes)

# drop front faces that fold over in the projection (signed area flips)
for _ in range(3):
    for f in bm.faces:
        if not F[f.index]: continue
        pts = [planar(v) for v in f.verts]
        if tri_area2(*pts[:3]) <= 1e-9:
            F[f.index] = False
    # keep the biggest connected front patch only
    seen = set(); best = []
    for f in bm.faces:
        if not F[f.index] or f.index in seen: continue
        comp = []; stack = [f]; seen.add(f.index)
        while stack:
            g = stack.pop(); comp.append(g.index)
            for e in g.edges:
                for h in e.link_faces:
                    if F[h.index] and h.index not in seen:
                        seen.add(h.index); stack.append(h)
        if len(comp) > len(best): best = comp
    keep = set(best)
    for i in range(len(F)):
        if F[i] and i not in keep: F[i] = False
print("front faces", int(F.sum()))
for f in bm.faces:
    if F[f.index]:
        for l in f.loops:
            l[uvl].uv = planar(l.vert)

# seams: around the front patch, and from the back of the neck over the crown to the patch
R = head_face & ~F
for e in bm.edges:
    fs = [h.index for h in e.link_faces]
    if any(F[i] for i in fs) and any(R[i] for i in fs): e.seam = True
r_verts = set(v.index for f in bm.faces if R[f.index] for v in f.verts)
f_border = set(v.index for e in bm.edges if e.seam for v in e.verts)
neck_border = set()
for e in bm.edges:
    lf = [h for h in e.link_faces if head_face[h.index]]
    if len(lf) == 1: neck_border.update(v.index for v in e.verts)
start = max(neck_border, key=lambda i: co[i][1] - 3 * abs(co[i][0]))
goal_set = f_border
dist = {start: 0.0}; prev = {}; pq = [(0.0, start)]; goal = None
while pq:
    d, u = heapq.heappop(pq)
    if u in goal_set: goal = u; break
    if d > dist.get(u, 1e9): continue
    for e in bm.verts[u].link_edges:
        w = e.other_vert(bm.verts[u]).index
        if w not in r_verts: continue
        c = (Vector(co[w]) - Vector(co[u])).length * (1 + 60 * abs(co[w][0]))
        if d + c < dist.get(w, 1e9):
            dist[w] = d + c; prev[w] = u; heapq.heappush(pq, (d + c, w))
path = [goal]
while path[-1] != start: path.append(prev[path[-1]])
for a, b in zip(path, path[1:]):
    for e in bm.verts[a].link_edges:
        if e.other_vert(bm.verts[a]).index == b: e.seam = True
print("seam path", len(path))
for f in bm.faces:
    f.select = bool(R[f.index])
bm.to_mesh(me); bm.free()

bpy.context.view_layer.objects.active = mesh; mesh.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_mode(type="FACE")
bpy.ops.uv.unwrap(method="ANGLE_BASED", margin=0.01)
bpy.ops.object.mode_set(mode="OBJECT")
me = mesh.data
atlas = me.uv_layers["atlas"]; old = me.uv_layers["old"]

# relative scale: rest of the head at 1/FACE_DENSITY of the front's density
def density(mask):
    uva = a3 = 0.0
    for p in me.polygons:
        if not mask[p.index]: continue
        a3 += p.area
        l = list(p.loop_indices); pts = [atlas.data[i].uv for i in l]
        for k in range(1, len(pts) - 1):
            uva += abs(tri_area2(pts[0], pts[k], pts[k + 1])) / 2
    return math.sqrt(uva / a3)
dF, dR = density(F), density(R)
k = (dF / FACE_DENSITY) / dR
r_loops = [l for p in me.polygons if R[p.index] for l in p.loop_indices]
for i in r_loops:
    atlas.data[i].uv = atlas.data[i].uv * k
print("density front", dF, "rest", dR, "scale", k)

# pack the head islands: connected components through non-seam edges,
# shelf-packed in the unit square with a global scale found by bisection
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
comp_of = {}; comps = []
for f in bm.faces:
    if not head_face[f.index] or f.index in comp_of: continue
    cid = len(comps); comps.append([]); stack = [f]; comp_of[f.index] = cid
    while stack:
        g = stack.pop(); comps[cid].append(g.index)
        for e in g.edges:
            if e.seam: continue
            for h in e.link_faces:
                if head_face[h.index] and h.index not in comp_of:
                    comp_of[h.index] = cid; stack.append(h)
bm.free()
poly_loops = {p.index: list(p.loop_indices) for p in me.polygons if head_face[p.index]}
islands = []
for c in comps:
    loops = [l for fi in c for l in poly_loops[fi]]
    uv = np.array([atlas.data[l].uv[:] for l in loops])
    mn, mx = uv.min(0), uv.max(0)
    islands.append({"loops": loops, "uv": uv - mn, "size": mx - mn})
islands.sort(key=lambda it: -it["size"][1] * it["size"][0])
print("islands", len(islands), [tuple(np.round(it["size"], 3)) for it in islands[:5]])
MARGIN = 0.008

def shelf(scale, place=False):
    x = y = shelf_h = 0.0
    order = sorted(islands, key=lambda it: -it["size"][1])
    for it in order:
        w, h = it["size"] * scale
        if x + w + MARGIN > 1.0:
            x = 0.0; y += shelf_h + MARGIN; shelf_h = 0.0
        if y + h + MARGIN > 1.0 or w + MARGIN > 1.0:
            return False
        if place:
            it["offset"] = np.array([x + MARGIN, y + MARGIN]); it["scale"] = scale
        x += w + MARGIN; shelf_h = max(shelf_h, h)
    return True

lo, hi = 0.01, 100.0
for _ in range(60):
    mid = (lo + hi) / 2
    if shelf(mid): lo = mid
    else: hi = mid
shelf(lo, place=True)
for it in islands:
    for l, uv in zip(it["loops"], it["uv"]):
        atlas.data[l].uv = uv * it["scale"] + it["offset"]
print("head packed, scale", lo)

# ---------------------------------------------------------------- face UV + mask
front = np.clip((-nrm[:, 1] - 0.45) / 0.15, 0, 1) * np.clip((co[:, 2] - 1.12) / 0.03, 0, 1) * np.clip(w_head * 1.5, 0, 1)
# the sheet is a render of the whole bust: keep it off the vertices where it
# shows the collar or the background (sides of the neck under the jaw)
_sheet = bpy.data.images.load(SHEET_UP); _sw, _sh = _sheet.size
_sp = np.empty(_sw * _sh * 4, dtype=np.float32); _sheet.pixels.foreach_get(_sp); _sp = _sp.reshape(_sh, _sw, 4)
bad = np.zeros(len(co), bool)
for i in np.where(front > 0)[0]:
    u = (co[i][0] - FACE_CX) / FACE_S + 0.5; v = (co[i][2] - FACE_CZ) / FACE_S + 0.5
    px_ = _sp[int(np.clip(v * _sh, 0, _sh - 1)), int(np.clip(u * _sw, 0, _sw - 1))]
    bad[i] = px_[2] > px_[0] * 0.9 or px_[:3].sum() < 0.12
_adj = [[] for _ in me.vertices]
for e in me.edges:
    a_, b_ = e.vertices; _adj[a_].append(b_); _adj[b_].append(a_)
for _ in range(3):
    bad = bad | np.array([any(bad[j] for j in _adj[i]) for i in range(len(co))])
print("sheet: vertices off the head", int((bad & (front > 0)).sum()))
front[bad] = 0
bpy.data.images.remove(_sheet); del _sp
# vertices of the planar front patch keep their sheet coordinates even where
# the mask is 0 (sides of the nose): a pushed vertex inside the patch would
# make a face whose coordinates jump, and the shader would smear on it
in_front_patch = np.zeros(len(co), bool)
for p_ in me.polygons:
    if F[p_.index]: in_front_patch[list(p_.vertices)] = True
face = me.uv_layers.new(name="face")
for l in me.loops:
    i = l.vertex_index; p = co[i]
    u, v = (p[0] - FACE_CX) / FACE_S + 0.5, (p[2] - FACE_CZ) / FACE_S + 0.5
    if front[i] <= 0 and not in_front_patch[i]:
        # off the front: pushed 2 sheets away from the centre, so that a face
        # straddling the border interpolates outwards, never across the eyes
        u += 2.0 if u >= 0.5 else -2.0; v += 2.0 if v >= 0.5 else -2.0
    face.data[l.index].uv = (u, v)
mask = me.color_attributes.new(name="facemask", type="FLOAT_COLOR", domain="POINT")
for i, m in enumerate(front):
    mask.data[i].color = (m, m, m, 1)

# ---------------------------------------------------------------- materials
for a in list(me.color_attributes):
    if a.name != "facemask":
        me.color_attributes.remove(a)
body_mat = bpy.data.materials.new("founder_body"); head_mat = bpy.data.materials.new("founder_head")
me.materials.clear(); me.materials.append(body_mat); me.materials.append(head_mat)
for p in me.polygons:
    p.material_index = 1 if head_face[p.index] else 0

# ---------------------------------------------------------------- head colour bake
scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 1
scene.render.bake.margin = 24; scene.render.bake.margin_type = "EXTEND"; scene.render.bake.use_selected_to_active = False
tmp = mesh.copy(); tmp.data = me.copy(); scene.collection.objects.link(tmp); tmp.modifiers.clear()
bm = bmesh.new(); bm.from_mesh(tmp.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index != 1], context="FACES")
bm.to_mesh(tmp.data); bm.free()
tmp.data.uv_layers.active = tmp.data.uv_layers["atlas"]

def img_node(nt, path, colorspace, uvname):
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path)
    t.image.colorspace_settings.name = colorspace; t.interpolation = "Cubic"; t.extension = "EXTEND"
    u = nt.nodes.new("ShaderNodeUVMap"); u.uv_map = uvname
    nt.links.new(u.outputs["UV"], t.inputs["Vector"]); return t

# The head colour comes from six orthographic renders of the original head
# (head_views.py), not from Hunyuan's atlas, whose fragmented islands leave
# streaks and holes once resampled. Each vertex takes the views that face it,
# weighted by max(0, n.d)^6 and only where the view is not blocked (ears,
# nose); the front of the face then takes the upscaled, eye-erased sheet.
from mathutils.bvhtree import BVHTree
td = tmp.data
# the bake samples the sheet through "face" on every head vertex: the pushed-out coordinates
# that the shader uses to mean "not the front" would smear the sheet across
# the faces at the border of the mask
for l in td.loops:
    p = tmp.matrix_world @ td.vertices[l.vertex_index].co
    td.uv_layers["face"].data[l.index].uv = ((p.x - FACE_CX) / FACE_S + 0.5, (p.z - FACE_CZ) / FACE_S + 0.5)
td.uv_layers.remove(td.uv_layers["old"])
tco = [tmp.matrix_world @ v.co for v in td.vertices]
tn3 = tmp.matrix_world.to_3x3()
tnr = [(tn3 @ v.normal).normalized() for v in td.vertices]
bvh = BVHTree.FromPolygons(tco, [list(p.vertices) for p in td.polygons])
names = list(HEAD_VIEWS)
Cv = Vector(HEAD_VIEW_C)
Wv = np.zeros((len(tco), len(names)))
for k, n in enumerate(names):
    ux, uy, d = view_axes(n)
    d = d.normalized()
    lay = td.uv_layers.new(name="v_" + n)
    for l in td.loops:
        q = tco[l.vertex_index] - Cv
        lay.data[l.index].uv = (q.dot(ux) / HEAD_VIEW_S + 0.5, q.dot(uy) / HEAD_VIEW_S + 0.5)
    for i, (p, nv) in enumerate(zip(tco, tnr)):
        c = nv.dot(d)
        if c <= 0: continue
        hit = bvh.ray_cast(p + d * 1e-3, d, 1.0)
        Wv[i, k] = c ** 6 * (0.0 if hit[0] is not None else 1.0)
empty = Wv.sum(1) < 1e-6
print("views: vertices seen by none", int(empty.sum()))
for i in np.where(empty)[0]:
    Wv[i, int(np.argmax([tnr[i].dot(view_axes(n)[2].normalized()) for n in names]))] = 1.0
Wv /= Wv.sum(1, keepdims=True)
for a_name, cols in (("vwa", Wv[:, :3]), ("vwb", Wv[:, 3:])):
    at = td.color_attributes.new(name=a_name, type="FLOAT_COLOR", domain="POINT")
    for i, c in enumerate(cols):
        at.data[i].color = (*c, 1)

m = bpy.data.materials.new("bake_head"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
o = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
seps = []
for a_name in ("vwa", "vwb"):
    at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = a_name
    sp = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(at.outputs["Color"], sp.inputs["Color"])
    seps += [sp.outputs[0], sp.outputs[1], sp.outputs[2]]
acc = None
for k, n in enumerate(names):
    t = img_node(nt, os.path.join(VIEWS, f"view_{n}.png"), "sRGB", "v_" + n)
    sc = nt.nodes.new("ShaderNodeVectorMath"); sc.operation = "SCALE"
    nt.links.new(t.outputs["Color"], sc.inputs[0]); nt.links.new(seps[k], sc.inputs["Scale"])
    if acc is None: acc = sc.outputs[0]
    else:
        ad = nt.nodes.new("ShaderNodeVectorMath"); ad.operation = "ADD"
        nt.links.new(acc, ad.inputs[0]); nt.links.new(sc.outputs[0], ad.inputs[1]); acc = ad.outputs[0]
f = img_node(nt, SHEET_UP, "sRGB", "face")
attr = nt.nodes.new("ShaderNodeAttribute"); attr.attribute_name = "facemask"
mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
nt.links.new(attr.outputs["Fac"], mix.inputs["Factor"])
nt.links.new(acc, mix.inputs["A"]); nt.links.new(f.outputs["Color"], mix.inputs["B"])
nt.links.new(mix.outputs["Result"], em.inputs["Color"]); nt.links.new(em.outputs["Emission"], o.inputs["Surface"])
target = bpy.data.images.new("founder_head_color", HEAD_RES, HEAD_RES, alpha=False)
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = target; nt.nodes.active = tn
tmp.data.materials.clear(); tmp.data.materials.append(m)
mesh.hide_render = True
bpy.ops.object.select_all(action="DESELECT"); tmp.select_set(True); bpy.context.view_layer.objects.active = tmp
bpy.ops.object.bake(type="EMIT", margin=24)
# Fill every pixel the bake left empty (background, and slivers between
# islands that the margin misses) by push-pull, so that neither filtering nor
# mipmaps ever reach black.
px = np.empty(HEAD_RES * HEAD_RES * 4, dtype=np.float32); target.pixels.foreach_get(px)
px = px.reshape(HEAD_RES, HEAD_RES, 4)
filled = push_pull(px[..., :3], px[..., :3].sum(-1) > 1e-4)
px[..., :3] = filled; px[..., 3] = 1
target.pixels.foreach_set(px.ravel())
target.filepath_raw = os.path.join(OUT, "founder_head_color.png"); target.file_format = "PNG"; target.save()
bpy.data.objects.remove(tmp); mesh.hide_render = False
print("head baked")

# ---------------------------------------------------------------- shape keys
PX = lambda px, py: (Vector(((px / 1024 - 0.5) * FACE_S, 0, FACE_CZ + (0.5 - py / 1024) * FACE_S)))
LM = {
    "brow_R": PX(358, 255), "brow_L": PX(655, 255),
    "brow_in_R": PX(455, 272), "brow_in_L": PX(560, 272),
    "corner_R": PX(388, 622), "corner_L": PX(638, 622),
    "mouth": PX(512, 632), "chin": PX(512, 845),
}
json.dump({k: [v.x, v.z] for k, v in LM.items()}, open(os.path.join(OUT, "landmarks.json"), "w"), indent=1)
P2 = co[:, [0, 2]]

def gauss(center, rx, rz):
    d = ((P2[:, 0] - center.x) / rx) ** 2 + ((P2[:, 1] - center.z) / rz) ** 2
    return np.exp(-d) * front

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

basis = mesh.shape_key_add(name="Basis", from_mix=False)
def add_key(name, disp):
    k = mesh.shape_key_add(name=name, from_mix=False)
    for i, v in enumerate(me.vertices):
        d = disp[i]
        if d[0] or d[1] or d[2]:
            k.data[i].co = v.co + inv3 @ Vector(d)
    print("key", name, int((np.abs(disp).sum(1) > 1e-6).sum()), "verts")

def vec(w, dx=0, dy=0, dz=0):
    return np.stack([w * dx, w * dy, w * dz], 1)

side = {"L": 1, "R": -1}
for s, sg in side.items():
    add_key(f"browUp_{s}", vec(gauss(LM[f"brow_{s}"], 0.032, 0.022), dz=0.0075, dy=-0.0012))
for s, sg in side.items():
    w = gauss(LM[f"brow_{s}"], 0.03, 0.02)
    inner = smoothstep(LM[f"brow_{s}"].x * 1.6, 0, P2[:, 0]) if sg > 0 else smoothstep(LM[f"brow_{s}"].x * 1.6, 0, P2[:, 0])
    add_key(f"browDown_{s}", vec(w * (0.55 + 0.6 * inner), dz=-0.0055, dx=-sg * 0.0018, dy=-0.0006))
w = gauss(LM["brow_in_L"], 0.017, 0.016) + gauss(LM["brow_in_R"], 0.017, 0.016)
add_key("browInnerUp", vec(np.clip(w, 0, 1), dz=0.0075, dy=-0.0008))
smile = np.zeros((len(co), 3))
for s, sg in side.items():
    c = LM[f"corner_{s}"]
    wc = gauss(c, 0.017, 0.013)
    cheek = gauss(c + Vector((sg * 0.006, 0, 0.022)), 0.02, 0.016)
    smile += vec(wc, dx=sg * 0.0032, dy=0.0022, dz=0.0058) + vec(cheek, dz=0.0028, dy=-0.0012)
add_key("mouthSmile", smile)
frown = np.zeros((len(co), 3))
for s, sg in side.items():
    frown += vec(gauss(LM[f"corner_{s}"], 0.017, 0.014), dx=-sg * 0.0008, dz=-0.005, dy=0.0006)
add_key("mouthFrown", frown)
for s, sg in side.items():
    c = LM[f"corner_{s}"]
    add_key(f"smirk_{s}", vec(gauss(c, 0.018, 0.014), dx=sg * 0.003, dy=0.002, dz=0.0062) + vec(gauss(c + Vector((sg * 0.006, 0, 0.022)), 0.02, 0.016), dz=0.003))
mz, cz = LM["mouth"].z, LM["chin"].z
jaw = smoothstep(mz + 0.002, mz - 0.006, P2[:, 1]) * smoothstep(cz - 0.03, cz, P2[:, 1]) * np.exp(-(P2[:, 0] / 0.055) ** 2) * front
add_key("jawOpen", vec(jaw, dz=-0.0095, dy=0.0025))
for k in me.shape_keys.key_blocks:
    k.value = 0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "founder_v2.blend"))
print("done")
