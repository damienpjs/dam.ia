"""A clean watch on the left wrist, in place of the game's strap.

The demo_shirt strap is a single-sided ribbon with missing triangles and no
case: fine from the game's camera, torn at portfolio distance. The new one is
modelled around the actual wrist section: a band with a rounded profile that
clears the skin by `gap`, and a round case on the back of the wrist."""
import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

N = 96                      # samples around the wrist


def _skin_bvh(skin):
    mw = skin.matrix_world
    verts = [mw @ v.co for v in skin.data.vertices]
    tris = []
    for p in skin.data.polygons:
        vs = p.vertices[:]
        for k in range(1, len(vs) - 1):
            tris.append((vs[0], vs[k], vs[k + 1]))
    return BVHTree.FromPolygons(verts, tris), verts, tris


def remove_strap(outfit, rig, side="Left", report=print):
    """Delete the outfit's strap: everything hugging the wrist."""
    mw = outfit.matrix_world
    el = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
    wr = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
    d = (wr - el).normalized()
    bm = bmesh.new(); bm.from_mesh(outfit.data)
    gone = []
    for v in bm.verts:
        p = mw @ v.co
        t = (p - wr).dot(d)
        r = ((p - wr) - d * t).length
        if -0.08 < t < 0.03 and r < 0.06:
            gone.append(v)
    ts = [((mw @ v.co) - wr).dot(d) for v in gone]
    bmesh.ops.delete(bm, geom=gone, context="VERTS")
    bm.to_mesh(outfit.data); bm.free()
    report(f"{side} strap: {len(gone)} outfit vertices removed, along the arm {min(ts):.3f}..{max(ts):.3f} m from the wrist")
    return (min(ts) + max(ts)) / 2


def build_watch(skin, rig, t0, side="Left", width=0.017, gap=0.0012, thick=0.0024, case_r=0.0150, case_h=0.0075, report=print):
    el = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
    wr = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
    d = (wr - el).normalized()
    # back of the hand: fingers curl about their x axis towards +z, so the palm is +z
    mid = rig.data.bones[f"mixamorig:{side}HandMiddle1"]
    dorsal = -(rig.matrix_world.to_3x3() @ mid.matrix_local.to_3x3() @ Vector((0, 0, 1))).normalized()
    v_ax = (dorsal - d * dorsal.dot(d)).normalized()
    u_ax = d.cross(v_ax).normalized()
    bvh, sverts, stris = _skin_bvh(skin)
    c0 = wr + d * t0
    # wrist section: widest radius across the band width, from the arm axis
    phis = np.linspace(0, 2 * math.pi, N, endpoint=False)
    r = np.zeros(N)
    for k, ph in enumerate(phis):
        dirv = u_ax * math.cos(ph) + v_ax * math.sin(ph)
        best = 0.0
        for dt in np.linspace(-width * 0.6, width * 0.6, 7):
            # cast inwards from outside, so the outer surface is what we hit
            o = c0 + d * dt + dirv * 0.08
            hit, n, fi, dist = bvh.ray_cast(o, -dirv, 0.08)
            if hit is not None:
                best = max(best, (hit - (c0 + d * dt)).dot(dirv))
        r[k] = best
    if (r <= 0).any():
        raise RuntimeError("wrist section not found all around")
    # smooth the section (circular gaussian) so the band reads as one curve
    ker = np.exp(-0.5 * (np.arange(-6, 7) / 2.5) ** 2); ker /= ker.sum()
    r = np.array([sum(ker[j] * r[(k + j - 6) % N] for j in range(13)) for k in range(N)]) + gap

    bm = bmesh.new()
    # band: rounded-rectangle profile (axis offset, radial offset) swept around the wrist
    hw = width / 2; ch = thick * 0.35
    prof = [(-hw + ch, 0), (hw - ch, 0), (hw, ch), (hw, thick - ch), (hw - ch, thick), (-hw + ch, thick), (-hw, thick - ch), (-hw, ch)]
    rings = []
    for k, ph in enumerate(phis):
        dirv = u_ax * math.cos(ph) + v_ax * math.sin(ph)
        rings.append([bm.verts.new(c0 + d * a + dirv * (r[k] + b)) for a, b in prof])
    for k in range(N):
        A, B = rings[k], rings[(k + 1) % N]
        for j in range(len(prof)):
            f = bm.faces.new((A[j], A[(j + 1) % len(prof)], B[(j + 1) % len(prof)], B[j]))
            f.material_index = 0; f.smooth = True
    # case: a turned profile on the back of the wrist
    top = r[N // 4] + thick                           # phi = 90 deg: dorsal
    base = c0 + v_ax * (top - 0.0006)
    cprof = [(case_r * 0.92, 0.0), (case_r, case_h * 0.22), (case_r * 1.02, case_h * 0.55), (case_r * 0.97, case_h * 0.82),
             (case_r * 0.86, case_h * 0.92), (case_r * 0.80, case_h * 0.95)]
    S = 64
    ring_v = []
    for a in range(S):
        ang = 2 * math.pi * a / S
        radial = d * math.cos(ang) + u_ax * math.sin(ang)
        ring_v.append([bm.verts.new(base + radial * rr + v_ax * hh) for rr, hh in cprof])
    for a in range(S):
        A, B = ring_v[a], ring_v[(a + 1) % S]
        for j in range(len(cprof) - 1):
            f = bm.faces.new((A[j], A[j + 1], B[j + 1], B[j]))
            f.material_index = 1; f.smooth = j != 4          # flat bezel ring
    # bottom and glass: fans, the glass slightly domed
    cb = bm.verts.new(base); ct = bm.verts.new(base + v_ax * (case_h * 0.99))
    for a in range(S):
        A, B = ring_v[a], ring_v[(a + 1) % S]
        f = bm.faces.new((cb, B[0], A[0])); f.material_index = 1
        f = bm.faces.new((ct, A[-1], B[-1])); f.material_index = 2; f.smooth = True
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("founder.watch"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("founder.watch", me); bpy.context.scene.collection.objects.link(ob)
    for name, col, metal, rough in (("founder_watch_band", (0.018, 0.018, 0.02), 0.0, 0.55),
                                     ("founder_watch_case", (0.32, 0.32, 0.34), 1.0, 0.28),
                                     ("founder_watch_glass", (0.01, 0.012, 0.016), 0.0, 0.06)):
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
        me.materials.append(m)
    # weights: the band follows the skin under it, the case is rigid (mean of the band's top)
    names = [g.name for g in skin.vertex_groups]
    W = np.zeros((len(sverts), len(names)), np.float32)
    for v in skin.data.vertices:
        for e in v.groups: W[v.index, e.group] = e.weight
    def skin_w(p):
        hit, _, fi, _ = bvh.find_nearest(p)
        a, b, c = stris[fi]
        bc = np.clip(np.array(barycentric_transform(hit, sverts[a], sverts[b], sverts[c], (1, 0, 0), (0, 1, 0), (0, 0, 1))), 0, 1)
        bc /= max(bc.sum(), 1e-9)
        return W[a] * bc[0] + W[b] * bc[1] + W[c] * bc[2]
    case_w = np.mean([skin_w(c0 + v_ax * r[N // 4] + d * dt + u_ax * du) for dt in (-0.006, 0, 0.006) for du in (-0.008, 0, 0.008)], axis=0)
    groups = {n: ob.vertex_groups.new(name=n) for n in names}
    band_n = N * len(prof)
    for v in me.vertices:
        w = skin_w(ob.matrix_world @ v.co) if v.index < band_n else case_w
        w = w / max(w.sum(), 1e-9)
        for gi in np.nonzero(w > 1e-3)[0]:
            groups[names[gi]].add([v.index], float(w[gi]), "REPLACE")
    ob.parent = rig
    ob.matrix_parent_inverse = rig.matrix_world.inverted()
    mod = ob.modifiers.new("rig", "ARMATURE"); mod.object = rig
    report(f"watch: {len(me.vertices)} vertices, wrist section {r.min() * 1000:.1f}..{r.max() * 1000:.1f} mm")
    return ob
