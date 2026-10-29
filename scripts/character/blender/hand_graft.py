"""Replace the game's hands with a generated hand, retopologised and grafted.

The game's hands are built for a top-down camera: eight-sided fingers, a
stubby thumb, and too few vertices to bend cleanly. A hand and forearm
generated on their own (Gemini reference sheet, Hunyuan 3D at 500k faces)
carry real knuckles and separate fingers. This module:

1. imports the generated mesh, turns it into the rig's T-pose frame and fits
   it to the body's hand (wrist position, wrist-to-middle-tip length);
2. remeshes it into quads (QuadriFlow) at a budget the web can carry;
3. bakes its colour onto the new UVs;
4. cuts the body's forearm and the new forearm on the same plane, matches the
   two sections and bridges them, so skin, weights and normals are continuous.

python hand_graft.py -- founder_v3.blend generated_left_hand.glb out.blend
"""
import bpy, bmesh, math, sys, os
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def import_generated(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    for o in bpy.data.objects:
        if o not in before and o.type != "MESH":
            pass
    bpy.ops.object.select_all(action="DESELECT")
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if len(new) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.name = "generated.hand"
    return obj


def _verts(obj):
    mw = obj.matrix_world
    return np.array([mw @ v.co for v in obj.data.vertices])


def body_hand_frame(skin, rig, side):
    """Wrist centre and middle fingertip of the body's hand, world space (rest pose)."""
    sg = 1 if side == "Left" else -1
    wr = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
    P = _verts(skin)
    hand = P[(P[:, 0] - wr.x) * sg > 0]
    tip = hand[np.argmax(hand[:, 0] * sg)]
    return np.array(wr), tip


def wrist_of(P, axis=0, sign=1):
    """Generated hand pointing +axis: the wrist is the narrowest section below the palm."""
    x = P[:, axis] * sign
    x0, x1 = x.min(), x.max()
    L = x1 - x0
    best, best_w = None, 1e9
    for t in np.linspace(0.30, 0.62, 33):
        c = x1 - t * L
        sl = P[np.abs(x - c) < L * 0.01]
        if len(sl) < 20:
            continue
        others = [i for i in range(3) if i != axis]
        w = (np.ptp(sl[:, others[0]]) + np.ptp(sl[:, others[1]]))
        if w < best_w:
            best_w, best = w, sl.mean(axis=0)
    return best, P[np.argmax(x)]


def fit_to_body(gen, skin, rig, side, turn=None):
    """Rotate (generated hand: fingers +Z, palm -Y, thumb -X after glTF import)
    into the T-pose left hand frame (fingers +X, palm -Y, thumb +Z), mirror for
    the right hand, then scale and move the wrist onto the body's wrist."""
    R = turn if turn is not None else Matrix.Rotation(math.radians(90), 4, "Y")
    gen.data.transform(R)
    if side == "Right":
        gen.data.transform(Matrix.Scale(-1, 4, (1, 0, 0)))
        gen.data.flip_normals()
    gen.data.update()
    sg = 1 if side == "Left" else -1
    P = _verts(gen)
    g_wr, g_tip = wrist_of(P, 0, sg)
    b_wr, b_tip = body_hand_frame(skin, rig, side)
    s = abs(b_tip[0] - b_wr[0]) / abs(g_tip[0] - g_wr[0])
    gen.data.transform(Matrix.Translation(Vector(b_wr)) @ Matrix.Scale(s, 4) @ Matrix.Translation(-Vector(g_wr)))
    gen.data.update()
    return s


def remesh(obj, faces=3000, voxel=0.0012):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    hi = obj.copy(); hi.data = obj.data.copy(); bpy.context.scene.collection.objects.link(hi)
    hi.name = "generated.hand.high"
    # the generated mesh is split along its UV seams and has stray shells: weld it into one
    # watertight surface first (voxels), then let QuadriFlow lay quads along its curvature
    obj.data.materials.clear()
    for layer in list(obj.data.uv_layers): obj.data.uv_layers.remove(layer)
    obj.data.remesh_voxel_size = voxel
    obj.data.use_remesh_fix_poles = True
    bpy.ops.object.voxel_remesh()
    keep_largest_shell(obj)
    bpy.ops.object.quadriflow_remesh(target_faces=faces, use_preserve_sharp=False, use_preserve_boundary=False, use_mesh_symmetry=False, smooth_normals=False, seed=0)
    for poly in obj.data.polygons: poly.use_smooth = True
    return hi


def keep_largest_shell(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    seen, shells = set(), []
    for v in bm.verts:
        if v.index in seen: continue
        stack, shell = [v], []
        seen.add(v.index)
        while stack:
            x = stack.pop(); shell.append(x)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen: seen.add(y.index); stack.append(y)
        shells.append(shell)
    shells.sort(key=len, reverse=True)
    for sh in shells[1:]:
        bmesh.ops.delete(bm, geom=sh, context="VERTS")
    bm.to_mesh(obj.data); bm.free()


def bake_color(high, low, size=1024, out_png=None):
    """Smart-project the low mesh, bake the high mesh's base colour onto it."""
    bpy.ops.object.select_all(action="DESELECT")
    low.select_set(True); bpy.context.view_layer.objects.active = low
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")
    img = bpy.data.images.new("founder_hands_color", size, size)
    m = bpy.data.materials.new("founder_hands"); m.use_nodes = True
    nt = m.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
    nt.links.new(tex.outputs[0], nt.nodes["Principled BSDF"].inputs["Base Color"])
    nt.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.55
    nt.nodes.active = tex
    low.data.materials.clear(); low.data.materials.append(m)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 4
    bake = scene.render.bake
    bake.use_selected_to_active = True; bake.cage_extrusion = 0.004; bake.max_ray_distance = 0.02
    bake.use_pass_direct = False; bake.use_pass_indirect = False; bake.use_pass_color = True
    bake.margin = 8
    bpy.ops.object.select_all(action="DESELECT")
    high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type="DIFFUSE")
    if out_png:
        img.filepath_raw = out_png; img.file_format = "PNG"; img.save()
    img.pack()
    return img


def _section(P, centre, d, u, v):
    rel = P - centre
    rel = rel - np.outer(rel @ d, d)
    ang = np.arctan2(rel @ v, rel @ u)
    rad = np.linalg.norm(rel, axis=1)
    order = np.argsort(ang)
    return ang[order], rad[order]


def _interp_circ(a, xs, ys):
    xs2 = np.concatenate([xs - 2 * np.pi, xs, xs + 2 * np.pi]); ys2 = np.concatenate([ys, ys, ys])
    return np.interp(a, xs2, ys2)


def _boundary_loop(obj, plane_co, plane_no, tol=0.002):
    """Indices of the boundary vertices lying on the cut plane."""
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    mw = obj.matrix_world
    out = [v.index for v in bm.verts if v.is_boundary and abs((mw @ v.co - plane_co).dot(plane_no)) < tol]
    bm.free()
    return out


def graft(skin, low, rig, side, cut=0.06, blend=0.035, gap=0.03, report=print):
    """Cut both meshes `cut` metres up the forearm from the wrist, match the new
    section to the body's (radius per angle, faded over `blend`), bridge the two
    edge loops, and give the new vertices the body's own skin weights."""
    from mathutils.geometry import barycentric_transform
    el = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
    wr = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
    dv = (wr - el).normalized()
    plane_co = wr - dv * cut; plane_no = dv
    # weight source: the untouched skin
    src = skin.copy(); src.data = skin.data.copy(); bpy.context.scene.collection.objects.link(src)
    src.modifiers.clear()
    # the body stops `gap` short of the hand's cut, so the bridge gets real faces
    # instead of a zigzag of zero-width ones lying in one plane
    body_co = plane_co - dv * gap
    for obj, keep_hand in ((skin, False), (low, True)):
        iw = obj.matrix_world.inverted()
        bm = bmesh.new(); bm.from_mesh(obj.data)
        co = iw @ (plane_co if keep_hand else body_co); no = (iw.to_3x3() @ plane_no).normalized()
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        # past the plane lies only this hand (T-pose): drop it from the skin, keep only it on the new mesh
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_inner=keep_hand, clear_outer=not keep_hand, dist=1e-5)
        # the cut passes close to existing vertices and leaves slivers: collapse the degenerate ones
        bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=0.0006 / obj.matrix_world.to_scale()[0])
        bm.to_mesh(obj.data); bm.free(); obj.data.update()
    # sections about the arm axis
    d = np.array(dv); c0 = np.array(plane_co)
    up = np.array((0.0, 0.0, 1.0)); u = np.cross(d, up); u /= np.linalg.norm(u); v = np.cross(d, u)
    Ps = _verts(skin); Pl = _verts(low)
    ring_s = Ps[_boundary_loop(skin, body_co, plane_no)]
    ring_l = Pl[_boundary_loop(low, plane_co, plane_no)]
    cs, cl = ring_s.mean(axis=0), ring_l.mean(axis=0)
    cs = cs + d * ((cl - cs) @ d)          # the body section's centre, brought into the hand's cut plane
    a_s, r_s = _section(ring_s, cs, d, u, v)
    a_l, r_l = _section(ring_l, cl, d, u, v)
    # bend the new forearm onto the body's section: centre and radius per angle, fading out
    lw = low.matrix_world; liw = lw.inverted()
    for vert in low.data.vertices:
        p = np.array(lw @ vert.co)
        t = (p - c0) @ d                       # distance past the cut, towards the hand
        if t > blend: continue
        f = 1.0 - max(t, 0.0) / blend
        f = f * f * (3 - 2 * f)
        rel = p - cl; rel = rel - d * (rel @ d)
        ang = math.atan2(rel @ v, rel @ u); rad = np.linalg.norm(rel)
        k = _interp_circ(ang, a_s, r_s) / max(_interp_circ(ang, a_l, r_l), 1e-6)
        centre = cl + (cs - cl) * f + d * ((p - cl) @ d)
        newp = centre + rel * (1 + (k - 1) * f)
        vert.co = liw @ Vector(newp)
    low.data.update()
    # join and bridge (one UV map name, or the join keeps two half-empty layers)
    low.data.uv_layers[0].name = skin.data.uv_layers[0].name
    n_skin = len(skin.data.vertices)
    n_faces_before = len(skin.data.polygons) + len(low.data.polygons)
    hand_mat = low.data.materials[0]
    bpy.ops.object.select_all(action="DESELECT")
    skin.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = skin
    bpy.ops.object.join()
    body_ids = [i for i in _boundary_loop(skin, body_co, plane_no, tol=0.002) if i < n_skin]
    hand_ids = [i for i in _boundary_loop(skin, plane_co, plane_no, tol=0.002) if i >= n_skin]
    stitch(skin, body_ids, hand_ids, dv, report=report)
    _dress_bridge(skin, n_faces_before, hand_mat, dv, plane_co, body_co)
    loft_seam(skin, plane_co - dv * (gap / 2), plane_no, half=gap / 2 + 0.012, report=report)
    # weights for every new vertex, from the body skin under it
    sw = src.matrix_world
    sv = [sw @ x.co for x in src.data.vertices]
    tris = []
    for poly in src.data.polygons:
        vs = poly.vertices[:]
        for k in range(1, len(vs) - 1): tris.append((vs[0], vs[k], vs[k + 1]))
    bvh = BVHTree.FromPolygons(sv, tris)
    names = [g.name for g in src.vertex_groups]
    W = np.zeros((len(sv), len(names)), np.float32)
    for x in src.data.vertices:
        for e in x.groups: W[x.index, e.group] = e.weight
    groups = {n: (skin.vertex_groups.get(n) or skin.vertex_groups.new(name=n)) for n in names}
    mw = skin.matrix_world
    added = 0
    for x in skin.data.vertices:
        if x.index < n_skin and x.groups: continue
        p = mw @ x.co
        hit, _, fi, _ = bvh.find_nearest(p)
        a_, b_, c_ = tris[fi]
        bc = np.clip(np.array(barycentric_transform(hit, sv[a_], sv[b_], sv[c_], (1, 0, 0), (0, 1, 0), (0, 0, 1))), 0, 1)
        bc /= max(bc.sum(), 1e-9)
        wv = W[a_] * bc[0] + W[b_] * bc[1] + W[c_] * bc[2]
        for gi in np.nonzero(wv > 1e-3)[0]:
            groups[names[gi]].add([x.index], float(wv[gi]), "REPLACE")
        added += 1
    bpy.data.objects.remove(src, do_unlink=True)
    report(f"{side}: hand grafted {cut * 100:.0f} cm above the wrist, {added} new vertices weighted from the body")


def _base_image(obj, slot=0):
    m = obj.data.materials[slot]
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image and any(l.to_socket.name == "Base Color" for l in n.outputs[0].links):
            return n.image
    return next(n.image for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)


def _band_colour(obj, img, centre, axis, lo, hi):
    """Mean linear colour of `img` over the faces whose centre lies between lo and hi along axis."""
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[:, :, :3]
    mw = obj.matrix_world
    uv = obj.data.uv_layers.active.data
    acc, n = np.zeros(3), 0
    for poly in obj.data.polygons:
        t = (np.array(mw @ poly.center) - centre) @ axis
        if not lo <= t <= hi: continue
        u = np.mean([uv[i].uv[0] for i in poly.loop_indices]); v = np.mean([uv[i].uv[1] for i in poly.loop_indices])
        x = int(np.clip(u, 0, 0.9999) * w); y = int(np.clip(v, 0, 0.9999) * h)
        acc += px[y, x] ** 2.2; n += 1
    return acc / max(n, 1)


def match_colour(skin, low, img, rig, side="Left", cut=0.06, band=0.03, report=print):
    """Scale the baked hand colours (linear, per channel) so the skin each side
    of the cut has the same mean colour: no visible ring at the graft."""
    el = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
    wr = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
    d = np.array((wr - el).normalized()); c = np.array(wr) - d * cut
    body = _band_colour(skin, _base_image(skin), c, d, -band, 0.0)
    hand = _band_colour(low, img, c, d, 0.0, band)
    gain = body / np.maximum(hand, 1e-6)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    px[:, :3] = np.clip((px[:, :3] ** 2.2) * gain, 0, 1) ** (1 / 2.2)
    img.pixels[:] = px.ravel()
    img.update()
    report(f"hand colour matched to the forearm: gain {np.round(gain, 3)}")
    return gain


def _face_samples(obj, img, centre, axis, u, v, lo, hi):
    """(angle about the arm, linear colour) of every face whose centre lies in [lo, hi] along the arm."""
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[:, :, :3] ** 2.2
    mw = obj.matrix_world; uv = obj.data.uv_layers.active.data
    out = []
    for poly in obj.data.polygons:
        p = np.array(mw @ poly.center) - centre
        t = p @ axis
        if not lo <= t <= hi: continue
        a = math.atan2(p @ v, p @ u)
        uu = np.mean([uv[i].uv[0] for i in poly.loop_indices]); vv = np.mean([uv[i].uv[1] for i in poly.loop_indices])
        out.append((a, px[int(np.clip(vv, 0, 0.9999) * h), int(np.clip(uu, 0, 0.9999) * w)]))
    return out


def _circular_profile(samples, bins=24, sigma=1.5):
    acc = np.zeros((bins, 3)); n = np.zeros(bins)
    for a, c in samples:
        k = int((a + math.pi) / (2 * math.pi) * bins) % bins
        acc[k] += c; n[k] += 1
    prof = acc / np.maximum(n, 1)[:, None]
    # fill empty bins and smooth around the circle
    ker = np.exp(-0.5 * (np.arange(-4, 5) / sigma) ** 2)
    out = np.zeros_like(prof)
    for k in range(bins):
        wsum, csum = 0.0, np.zeros(3)
        for j, kw in zip(range(-4, 5), ker):
            q = (k + j) % bins
            if n[q]: wsum += kw; csum += kw * prof[q]
        out[k] = csum / max(wsum, 1e-9)
    return out


def blend_seam_colour(skin, low, img, rig, side="Left", cut=0.06, fade=0.06, report=print):
    """Bend the hand texture towards the forearm's colour around the cut, angle
    by angle (the inside of the wrist is paler than the back), fading out over
    `fade` metres. Painted straight into the texture, triangle by triangle."""
    el = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
    wr = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
    d = np.array((wr - el).normalized()); c = np.array(wr) - d * cut
    u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u); v = np.cross(d, u)
    bins = 24
    body = _circular_profile(_face_samples(skin, _base_image(skin), c, d, u, v, -0.025, 0.0), bins)
    hand = _circular_profile(_face_samples(low, img, c, d, u, v, 0.0, 0.02), bins)
    ratio = body / np.maximum(hand, 1e-6)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    lin = px[:, :, :3] ** 2.2
    mw = low.matrix_world; uvl = low.data.uv_layers.active.data
    me = low.data
    def gain_at(p):
        q = p - c; t = q @ d
        f = 1 - np.clip(t / fade, 0, 1); f = f * f * (3 - 2 * f)
        a = math.atan2(q @ v, q @ u)
        x = (a + math.pi) / (2 * math.pi) * bins - 0.5
        k0 = int(math.floor(x)) % bins; k1 = (k0 + 1) % bins; fr = x - math.floor(x)
        r = ratio[k0] * (1 - fr) + ratio[k1] * fr
        return r ** f
    vg = np.array([gain_at(np.array(mw @ vx.co)) for vx in me.vertices])
    painted = 0
    gsum = np.zeros((h, w, 3), np.float32); wsum = np.zeros((h, w), np.float32)
    for poly in me.polygons:
        if np.all(np.abs(vg[list(poly.vertices)] - 1) < 1e-3): continue
        li = list(poly.loop_indices); vi = list(poly.vertices)
        for k in range(1, len(li) - 1):
            tri = [0, k, k + 1]
            P2 = np.array([[uvl[li[j]].uv[0] * w, uvl[li[j]].uv[1] * h] for j in tri])
            G = vg[[vi[j] for j in tri]]
            x0, y0 = np.floor(P2.min(0)).astype(int) - 2; x1, y1 = np.ceil(P2.max(0)).astype(int) + 2
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, w - 1), min(y1, h - 1)
            if x1 < x0 or y1 < y0: continue
            ys, xs = np.mgrid[y0:y1 + 1, x0:x1 + 1]
            A = P2[0]; B = P2[1]; C = P2[2]
            den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])
            if abs(den) < 1e-9: continue
            l0 = ((B[1] - C[1]) * (xs + 0.5 - C[0]) + (C[0] - B[0]) * (ys + 0.5 - C[1])) / den
            l1 = ((C[1] - A[1]) * (xs + 0.5 - C[0]) + (A[0] - C[0]) * (ys + 0.5 - C[1])) / den
            l2 = 1 - l0 - l1
            # texels inside weigh 1, the bleed ring around the triangle fades out:
            # shared edges are averaged, never painted twice
            m = np.minimum(np.minimum(l0, l1), l2)
            wt = np.clip(1 + m / 0.15, 0, 1)
            g = (l0[..., None] * G[0] + l1[..., None] * G[1] + l2[..., None] * G[2])
            gsum[y0:y1 + 1, x0:x1 + 1] += g * wt[..., None]
            wsum[y0:y1 + 1, x0:x1 + 1] += wt
            painted += int((wt > 0).sum())
    has = wsum > 1e-6
    lin[has] = lin[has] * (gsum[has] / wsum[has][:, None])
    px[:, :, :3] = np.clip(lin, 0, 1) ** (1 / 2.2)
    img.pixels[:] = px.ravel(); img.update()
    report(f"seam colour blended over {fade * 100:.0f} cm ({painted} texels), ratio range {ratio.min():.2f}..{ratio.max():.2f}")


def _lin(img):
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    return px, np.clip(px[:, :, :3], 0, 1) ** 2.2


def head_tone(head_png):
    """Linear skin colour of the head: median of its brighter half (skin, not beard or brows)."""
    img = bpy.data.images.load(head_png)
    _, lin = _lin(img)
    L = lin @ np.array([0.2126, 0.7152, 0.0722])
    v = L[L > 0.02]
    m = (L > np.percentile(v, 30)) & (L < np.percentile(v, 90))     # skin, without beard, brows and highlights
    tone = np.median(lin[m], axis=0)
    bpy.data.images.remove(img)
    return tone


def retone(img, tone, contrast, report=print, label=""):
    """Albedo = head tone x the texture's own relative luminance (its shading and
    detail: creases, nails, knuckles), so both parts of the arm share one colour."""
    px, lin = _lin(img)
    L = lin @ np.array([0.2126, 0.7152, 0.0722])
    used = L > 0.02
    m = np.median(L[used])
    rel = np.clip(L / m, 0.25, 2.0) ** contrast
    out = np.clip(tone[None, None, :] * rel[..., None], 0, 1) ** (1 / 2.2)
    px[:, :, :3] = np.where(used[..., None], out, px[:, :, :3])
    img.pixels[:] = px.ravel(); img.update()
    report(f"{label} albedo set to the head tone {np.round(tone ** (1 / 2.2), 3)} (detail contrast {contrast})")


def _ordered_ring(bm, ids):
    """Boundary vertices `ids` as one cycle, walking the boundary edges."""
    ids = set(ids)
    start = next(iter(ids))
    ring = [start]; prev = None; cur = start
    while True:
        nxt = None
        for e in bm.verts[cur].link_edges:
            if not e.is_boundary: continue
            o = e.other_vert(bm.verts[cur]).index
            if o in ids and o != prev and (o != start or len(ring) > 2):
                nxt = o; break
        if nxt is None or nxt == start: break
        prev, cur = cur, nxt; ring.append(cur)
    return ring


def stitch(obj, body_ids, hand_ids, axis, layers=3, report=print):
    """Join the body's cut ring to the hand's with `layers` intermediate rings
    (as many vertices as the hand's ring, quads between them) and a zipper of
    triangles to the body's coarser ring, matched by angle about the arm."""
    mw = obj.matrix_world; iw = mw.inverted()
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.verts.ensure_lookup_table()
    B = _ordered_ring(bm, body_ids); H = _ordered_ring(bm, hand_ids)
    d = np.array(axis); u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u); v = np.cross(d, u)
    PB = np.array([mw @ bm.verts[i].co for i in B]); PH = np.array([mw @ bm.verts[i].co for i in H])
    cB, cH = PB.mean(axis=0), PH.mean(axis=0)
    ang = lambda P, c: np.arctan2((P - c) @ v, (P - c) @ u)
    aB, aH = ang(PB, cB), ang(PH, cH)
    # same turning direction, starting at the smallest angle
    for name in ("B", "H"):
        a = aB if name == "B" else aH
        if np.sum(np.sin(np.diff(np.concatenate([a, a[:1]])))) < 0:
            if name == "B": B, PB, aB = B[::-1], PB[::-1], aB[::-1]
            else: H, PH, aH = H[::-1], PH[::-1], aH[::-1]
    kB = int(np.argmin(aB)); kH = int(np.argmin(aH))
    B = B[kB:] + B[:kB]; PB = np.roll(PB, -kB, 0); aB = np.roll(aB, -kB)
    H = H[kH:] + H[:kH]; PH = np.roll(PH, -kH, 0); aH = np.roll(aH, -kH)
    unwrap = lambda a: np.unwrap(a)
    aB, aH = unwrap(aB), unwrap(aH)
    rB = np.linalg.norm((PB - cB) - np.outer((PB - cB) @ d, d), axis=1)
    rH = np.linalg.norm((PH - cH) - np.outer((PH - cH) @ d, d), axis=1)
    def r_body(theta):
        return np.interp(theta, np.concatenate([aB - 2 * np.pi, aB, aB + 2 * np.pi]), np.concatenate([rB, rB, rB]))
    hv = [bm.verts[i] for i in H]; bv = [bm.verts[i] for i in B]
    rings = []
    for k in range(1, layers + 1):
        f = k / (layers + 1)                       # 0 at the hand, 1 at the body
        g = f * f * (3 - 2 * f)
        cen = cH * (1 - f) + cB * f
        ring = []
        for j in range(len(H)):
            th = aH[j]
            dirv = np.cos(th) * u + np.sin(th) * v
            r = rH[j] * (1 - g) + r_body(th) * g
            ring.append(bm.verts.new(iw @ Vector(cen + dirv * r)))
        rings.append(ring)
    made = []
    chain = [hv] + rings
    for a_ring, b_ring in zip(chain[:-1], chain[1:]):
        n = len(a_ring)
        for j in range(n):
            made.append(bm.faces.new((a_ring[j], a_ring[(j + 1) % n], b_ring[(j + 1) % n], b_ring[j])))
    # zipper: last ring (n = len(H), angles aH) to the body ring (angles aB)
    last = rings[-1]
    nm, nb = len(last), len(bv)
    i = j = 0
    while i < nb or j < nm:
        ai = aB[(i + 1) % nb] + (2 * np.pi if i + 1 >= nb else 0)
        aj = aH[(j + 1) % nm] + (2 * np.pi if j + 1 >= nm else 0)
        if j >= nm or (i < nb and ai < aj):
            made.append(bm.faces.new((bv[i % nb], bv[(i + 1) % nb], last[j % nm]))); i += 1
        else:
            made.append(bm.faces.new((bv[i % nb], last[(j + 1) % nm], last[j % nm]))); j += 1
    # outward normals
    bm.normal_update()
    for f in made:
        c = np.array(mw @ f.calc_center_median()); n = np.array(mw.to_3x3() @ f.normal)
        rad = (c - cH) - d * ((c - cH) @ d)
        if n @ rad < 0: f.normal_flip()
        f.smooth = True
    bm.to_mesh(obj.data); bm.free(); obj.data.update()
    report(f"seam stitched: {len(B)} body vertices to {len(H)} hand vertices through {layers} rings")


def _empty_block(px, w, h, pad=3):
    """Top-left corner of a w x h block of unbaked (black) texels."""
    L = px[:, :, :3].sum(axis=2)
    H, W = L.shape
    for y in range(pad, H - h - pad, 4):
        for x in range(pad, W - w - pad, 4):
            if L[y - pad:y + h + pad, x - pad:x + w + pad].max() < 0.01:
                return x, y
    raise RuntimeError("no free block in the hand texture")


def _ring_profile(obj, mat_index, img, centre, axis, u, v, lo, hi, bins):
    """Per-angle mean linear colour of `img` over faces of one material between lo and hi along the arm."""
    me = obj.data; mw = obj.matrix_world
    W, H = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)[:, :, :3] ** 2.2
    uv = me.uv_layers.active.data
    samples = []
    for poly in me.polygons:
        if poly.material_index != mat_index: continue
        q = np.array(mw @ poly.center) - centre
        t = q @ axis
        if not lo <= t <= hi: continue
        a = math.atan2(q @ v, q @ u)
        for li in poly.loop_indices:
            u_, v_ = uv[li].uv
            samples.append((a, px[int(np.clip(v_, 0, 0.9999) * H), int(np.clip(u_, 0, 0.9999) * W)]))
    return _circular_profile(samples, bins)


def _dress_bridge(obj, first_new_face, hand_mat, axis, plane_co, body_co, bins=32, length=64):
    """The stitch faces join two textures. They go on the hand's material and
    read a small patch painted into an unused corner of its texture: across,
    the angle about the arm; along, the way from the body's cut to the hand's.
    Each end of the patch holds that side's own colour at that angle, so the
    band meets both skins without a step."""
    me = obj.data; mw = obj.matrix_world
    mi = list(me.materials).index(hand_mat)
    img = next(n.image for n in hand_mat.node_tree.nodes if n.type == "TEX_IMAGE" and n.image)
    body_img = next(n.image for n in me.materials[0].node_tree.nodes if n.type == "TEX_IMAGE" and n.image and any(l.to_socket.name == "Base Color" for l in n.outputs[0].links))
    d = np.array(axis); u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u); v = np.cross(d, u)
    c_h = np.array(plane_co); c_b = np.array(body_co)
    body = _ring_profile(obj, 0, body_img, c_b, d, u, v, -0.012, 0.0, bins)
    hand = _ring_profile(obj, mi, img, c_h, d, u, v, 0.0, 0.012, bins)
    W, H = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    x0, y0 = _empty_block(px, length, bins + 2)
    for k in range(bins + 2):
        kk = (k - 1) % bins                          # the patch wraps round the arm: its extra rows repeat the far side
        for i in range(length):
            f = i / (length - 1)                    # 0: body side, 1: hand side
            lin = body[kk] * (1 - f) + hand[kk] * f
            px[y0 + k, x0 + i, :3] = np.clip(lin, 0, 1) ** (1 / 2.2)
            px[y0 + k, x0 + i, 3] = 1.0
    img.pixels[:] = px.ravel(); img.update()
    uvl = me.uv_layers.active.data
    t_b, t_h = c_b @ d, c_h @ d
    for poly in me.polygons[first_new_face:]:
        poly.use_smooth = True
        poly.material_index = mi
        cen = np.array(mw @ poly.center)
        a_face = math.atan2((cen - c_h) @ v, (cen - c_h) @ u)
        for li in poly.loop_indices:
            p = np.array(mw @ me.vertices[me.loops[li].vertex_index].co)
            f = min(max(((p @ d) - t_b) / (t_h - t_b), 0.0), 1.0)
            a = math.atan2((p - c_h) @ v, (p - c_h) @ u)
            # keep a face's corners on one side of the patch's angular wrap
            if a - a_face > math.pi: a -= 2 * math.pi
            if a_face - a > math.pi: a += 2 * math.pi
            k = (a + math.pi) / (2 * math.pi) * bins       # 0..bins (may leave by one bin at the wrap)
            k = min(max(k, -0.5), bins + 0.5)
            uvl[li].uv = ((x0 + 0.5 + f * (length - 1)) / W, (y0 + 1 + k) / H)
    me.update()


def loft_seam(obj, plane_co, plane_no, half=0.025, bins=48, report=print):
    """Rebuild the ring around the graft as a smooth loft between the body's
    section just above it and the hand's section just below it. Vertices only
    move along their own radius (angle and height kept), so nothing can fold."""
    d = np.array(plane_no); c = np.array(plane_co)
    u = np.cross(d, (0, 0, 1)); u /= np.linalg.norm(u); v = np.cross(d, u)
    mw = obj.matrix_world; iw = mw.inverted()
    P = np.array([mw @ x.co for x in obj.data.vertices])
    rel = P - c; t = rel @ d
    near = (np.abs(t) < half + 0.012) & (np.linalg.norm(rel - np.outer(t, d), axis=1) < 0.08)
    def section(lo, hi):
        m = near & (t > lo) & (t < hi)
        cen = P[m].mean(axis=0) if m.any() else c
        q = P[m] - cen; q = q - np.outer(q @ d, d)
        ang = np.arctan2(q @ v, q @ u); rad = np.linalg.norm(q, axis=1)
        prof = np.zeros(bins); cnt = np.zeros(bins)
        k = ((ang + np.pi) / (2 * np.pi) * bins).astype(int) % bins
        np.add.at(prof, k, rad); np.add.at(cnt, k, 1)
        for i in range(bins):        # empty bins: neighbours
            if not cnt[i]:
                j = next(j for j in range(1, bins) if cnt[(i + j) % bins] or cnt[(i - j) % bins])
                a = (i + j) % bins if cnt[(i + j) % bins] else (i - j) % bins
                prof[i], cnt[i] = prof[a] / cnt[a], 1
        return cen - d * ((cen - c) @ d), prof / cnt
    c0, r0 = section(-half - 0.01, -half)        # body, above the band
    c1, r1 = section(half, half + 0.01)          # hand, below it
    moved = 0
    for i in np.nonzero(near & (np.abs(t) <= half))[0]:
        s_ = (t[i] + half) / (2 * half); s_ = s_ * s_ * (3 - 2 * s_)
        cen = c0 * (1 - s_) + c1 * s_ + d * t[i]
        q = P[i] - cen; q = q - d * (q @ d)
        ang = math.atan2(q @ v, q @ u)
        x = (ang + math.pi) / (2 * math.pi) * bins - 0.5
        k0 = int(math.floor(x)) % bins; k1 = (k0 + 1) % bins; f = x - math.floor(x)
        r = (r0[k0] * (1 - f) + r0[k1] * f) * (1 - s_) + (r1[k0] * (1 - f) + r1[k1] * f) * s_
        n = np.linalg.norm(q)
        if n < 1e-6: continue
        obj.data.vertices[i].co = iw @ Vector(cen + q / n * r)
        moved += 1
    obj.data.update()
    report(f"seam lofted over {2 * half * 100:.0f} cm ({moved} vertices)")


def mirrored_copy(obj, name):
    """Copy mirrored across the body's mid plane (x = 0), normals kept outwards."""
    m = obj.copy(); m.data = obj.data.copy(); m.name = name
    bpy.context.scene.collection.objects.link(m)
    m.data.transform(Matrix.Scale(-1, 4, (1, 0, 0)))
    m.data.flip_normals(); m.data.update()
    return m


def graft_hands(skin, rig, generated, faces=4000, cut=0.06, texture_png=None, head_png=None, report=print):
    """Generated left hand: fitted, remeshed, baked once, mirrored for the right."""
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    low = import_generated(generated)
    s = fit_to_body(low, skin, rig, "Left")
    high = remesh(low, faces)
    quads = sum(1 for f in low.data.polygons if len(f.vertices) == 4)
    report(f"generated hand fitted (scale {s:.4f}) and remeshed to {len(low.data.polygons)} faces ({quads} quads)")
    img = bake_color(high, low, 1024, None)
    bpy.data.objects.remove(high, do_unlink=True)
    if head_png:
        tone = head_tone(head_png)
        retone(_base_image(skin), tone, 0.55, report, "arms (game texture):")
        retone(img, tone, 0.8, report, "hands (generated):")
    else:
        match_colour(skin, low, img, rig, "Left", cut, report=report)
    blend_seam_colour(skin, low, img, rig, "Left", cut, report=report)
    if texture_png:
        img.filepath_raw = texture_png; img.file_format = "PNG"; img.save()
        # the bake left a packed copy that the exporter would use: point the material at the saved file
        fresh = bpy.data.images.load(texture_png); fresh.pack(); fresh.name = "founder_hands_color"
        for n in low.data.materials[0].node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image == img: n.image = fresh
        bpy.data.images.remove(img)
    right = mirrored_copy(low, "generated.hand.R")
    graft(skin, low, rig, "Left", cut, report=report)
    graft(skin, right, rig, "Right", cut, report=report)


if __name__ == "__main__":
    BLEND, GLB, OUT = sys.argv[sys.argv.index("--") + 1:][:3]
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    graft_hands(bpy.data.objects["male.skin.demo_shirt"], bpy.data.objects["rig"], GLB,
                texture_png=os.path.join(os.path.dirname(OUT), "founder_hands_color.png"))
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
