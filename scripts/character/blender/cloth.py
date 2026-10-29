"""Clothing weights that follow the skin underneath."""
import re
import bpy
import numpy as np
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform


def _smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# bones the shirt must never follow: a short sleeve ends above the elbow, and a
# shirt panel that took the weights of the forearm hanging next to it would be
# dragged off the waist as soon as the arm rises
_LIMB = re.compile(r"(Left|Right)(ForeArm|Hand)")


def _upper_arm(name):
    m = _LIMB.search(name)
    return name[:m.start()] + m.group(1) + "Arm"


def fit_outfit_weights(outfit, skin, near=0.03, far=0.06, report=print):
    """Give every piece of cloth close to the body the skin's own weights.

    The outfit came with weights transferred from the game's base body; once the
    hands, the wrists and the shoulders deform differently, sleeve, collar and
    watch drift from the skin and the skin comes through. Each outfit vertex
    takes the weights of the nearest skin point (interpolated over its
    triangle), fully under `near`, fading out to its own weights at `far`.

    Only the torso and the upper arms lend their weights: forearm and hand skin
    is left out of the search, and whatever forearm or hand weight remains (the
    skin near the elbow carries some) is folded into the upper arm of its side."""
    sw = skin.matrix_world; ow = outfit.matrix_world
    sv = [sw @ v.co for v in skin.data.vertices]
    sk_names = [g.name for g in skin.vertex_groups]
    W = np.zeros((len(sv), len(sk_names)), np.float32)
    for v in skin.data.vertices:
        for e in v.groups:
            W[v.index, e.group] = e.weight
    limb = np.array([bool(_LIMB.search(n)) for n in sk_names])
    on_limb = W[:, limb].sum(1) > W[:, ~limb].sum(1) if limb.any() else np.zeros(len(sv), bool)
    # triangulate the skin's polygons for interpolation, forearms and hands left out
    tri_list = []
    for p in skin.data.polygons:
        q = p.vertices[:]
        if all(on_limb[i] for i in q):
            continue
        for k in range(1, len(q) - 1):
            tri_list.append((q[0], q[k], q[k + 1]))
    bvh = BVHTree.FromPolygons(sv, tri_list)
    moved = folded = 0
    for v in outfit.data.vertices:
        p = ow @ v.co
        hit, _, fi, d = bvh.find_nearest(p, far)
        old = {outfit.vertex_groups[e.group].name: e.weight for e in v.groups}
        mix = {}
        t = 0.0
        if hit is not None:
            a, b, c = tri_list[fi]
            bc = barycentric_transform(hit, sv[a], sv[b], sv[c], (1, 0, 0), (0, 1, 0), (0, 0, 1))
            w = np.clip(np.array(bc), 0, 1); w /= max(w.sum(), 1e-9)
            new = W[a] * w[0] + W[b] * w[1] + W[c] * w[2]
            t = 1.0 - float(_smooth(near, far, d))
            for gi in np.nonzero(new > 1e-4)[0]:
                mix[sk_names[gi]] = t * float(new[gi])
            moved += 1
        for n, wo in old.items():
            mix[n] = mix.get(n, 0.0) + (1 - t) * wo
        limbs = [n for n in mix if _LIMB.search(n) and mix[n] > 1e-4]
        folded += bool(limbs)
        for n in limbs:
            up = _upper_arm(n)
            mix[up] = mix.get(up, 0.0) + mix.pop(n)
        s = sum(mix.values()) or 1.0
        for n in set(old) | set(mix):
            g = outfit.vertex_groups.get(n) or outfit.vertex_groups.new(name=n)
            ww = mix.get(n, 0.0) / s
            if ww > 1e-4: g.add([v.index], ww, "REPLACE")
            else: g.remove([v.index])
    report(f"{outfit.name}: {moved} vertices take the weights of the skin underneath, "
           f"{folded} lose their forearm or hand weight to the upper arm")


def hide_feet(skin, report=print):
    """Delete the bare feet: the shoes cover them whole, and at the sole's edge
    the foot skin came through by a few millimetres. Run after the outfit has
    taken the skin's weights, which the shoes need."""
    import bmesh
    names = [g.name for g in skin.vertex_groups]
    foot = re.compile(r"(Left|Right)(Foot|Toe)")
    gone = set()
    for v in skin.data.vertices:
        if v.groups and foot.search(names[max(v.groups, key=lambda e: e.weight).group]):
            gone.add(v.index)
    bm = bmesh.new(); bm.from_mesh(skin.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in gone], context="VERTS")
    bm.to_mesh(skin.data); bm.free()
    report(f"{skin.name}: {len(gone)} foot vertices removed (inside the shoes)")


def seal_sleeves(skin, rig, depth=0.05, report=print):
    """Give each upper arm a clean skin edge deep inside its sleeve.

    The game body was cut under the sleeves along a zigzag (4 to 12 cm above
    the elbow), and the sleeve opening shows it: thin skin spikes hang under
    the hem, and the arm looks hollow from below. Each upper arm is cut square
    just under the lowest point of that zigzag, the jagged part is dropped, and
    the clean ring is extruded `depth` up the arm, a little inside the skin it
    replaces, so the opening only ever shows a smooth arm."""
    import bmesh
    from mathutils import Vector
    names = [g.name for g in skin.vertex_groups]
    mw = skin.matrix_world; inv = mw.inverted()
    for side in ("Right", "Left"):
        sh = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Arm"].head_local
        el = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
        ax = (sh - el).normalized(); L = (sh - el).length
        arm_groups = {i for i, n in enumerate(names) if re.search(side + r"(Arm|ForeArm|Shoulder)$", n)}
        upper = skin.vertex_groups.get(f"mixamorig:{side}Arm")
        bm = bmesh.new(); bm.from_mesh(skin.data); bm.verts.ensure_lookup_table()
        deform = bm.verts.layers.deform.verify()

        def along(v):
            p = mw @ v.co
            return (p - el).dot(ax) / L, ((p - el) - ax * (p - el).dot(ax)).length

        def on_arm(v):
            dv = v[deform]
            return bool(dv) and max(dv.items(), key=lambda kv: kv[1])[0] in arm_groups

        region = [f for f in bm.faces if all(on_arm(v) and along(v)[1] < 0.1 and -0.2 < along(v)[0] < 1.05 for v in f.verts)]
        rv = {v for f in region for v in f.verts}
        edge_t = [along(v)[0] for v in rv for e in v.link_edges if e.is_boundary]
        if not edge_t:
            bm.free(); continue
        t_cut = min(edge_t) - 0.02
        co = inv @ (el + ax * (t_cut * L)); no = (inv.to_3x3() @ ax).normalized()
        geom = list(rv) + list({e for f in region for e in f.edges}) + region
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True, dist=1e-5)
        ring = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge) and e.is_boundary]
        # drop any loose bit the cut left above the plane
        loose = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
        ext = bmesh.ops.extrude_edge_only(bm, edges=ring)
        new = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
        centre = sum((mw @ v.co for v in new), Vector()) / max(len(new), 1)
        for v in new:
            p = mw @ v.co
            p = centre + (p - centre) * 0.96 + ax * depth
            v.co = inv @ p
            # the tube rides the upper arm only
            dv = v[deform]; dv.clear()
            if upper: dv[upper.index] = 1.0
        faces = [f for f in ext["geom"] if isinstance(f, bmesh.types.BMFace)]
        # the new band faces the same way as the arm it continues
        for f in faces:
            f.normal_update()
            out = (mw @ f.calc_center_median()) - centre
            if (inv.to_3x3().transposed() @ f.normal).dot(out - ax * out.dot(ax)) < 0:
                f.normal_flip()
        bm.to_mesh(skin.data); bm.free()
        report(f"{side} sleeve: arm skin cut square {t_cut * L * 100:.1f} cm above the elbow, "
               f"{len(ring)}-edge ring extruded {depth * 100:.0f} cm into the sleeve")


def _longest_cycle(nxt, budget=200000):
    """Longest simple cycle of a small graph {vertex: [neighbours]} (the hem with
    the tears touching it), by depth-first search under a step budget."""
    best = []
    steps = 0
    for start in sorted(nxt, key=lambda v: -len(nxt[v]))[:4] or list(nxt)[:1]:
        stack = [(start, [start], {start})]
        while stack and steps < budget:
            cur, path, seen = stack.pop(); steps += 1
            for nb in nxt[cur]:
                if nb is start and len(path) > 2 and len(path) > len(best):
                    best = path
                elif nb not in seen:
                    stack.append((nb, path + [nb], seen | {nb}))
    return best


def close_sleeve_notches(outfit, rig, zip_dist=0.004, rise=0.06, report=print):
    """Fill the tears in the sleeve hems.

    The generated shirt has a V-shaped tear in each sleeve hem (3 to 6 cm up
    the arm), and the arm shows through it as skin spikes. Hem vertices a few
    millimetres apart are welded; then, along the hem loop, the vertices that
    rise more than `rise` (in upper-arm lengths) above the fitted hem line are
    a tear, whose two sides are welded together by height."""
    import bmesh
    import math
    from mathutils import Vector
    mw = outfit.matrix_world
    bm = bmesh.new(); bm.from_mesh(outfit.data); bm.verts.ensure_lookup_table()
    made = zipped = 0
    for side in ("Right", "Left"):
        sh = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Arm"].head_local
        el = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
        ax = (sh - el).normalized(); L = (sh - el).length

        def tr(v):
            d = mw @ v.co - el
            return d.dot(ax) / L, (d - ax * d.dot(ax)).length

        edges = [e for e in bm.edges if e.is_boundary and all(-0.3 < tr(v)[0] < 0.8 and tr(v)[1] < 0.12 for v in e.verts)]
        if not edges:
            continue
        # zip the hairline cracks first: hem vertices a few millimetres apart that
        # no edge joins (the generated shirt split along its UV seams)
        verts = list({v for e in edges for v in e.verts})
        before = len(bm.verts)
        bmesh.ops.remove_doubles(bm, verts=verts, dist=zip_dist / mw.to_scale().x)
        zipped += before - len(bm.verts)
        bm.verts.ensure_lookup_table()
        edges = [e for e in bm.edges if e.is_boundary and all(-0.3 < tr(v)[0] < 0.8 and tr(v)[1] < 0.12 for v in e.verts)]
        # walk the hem once round (where a tear touches the hem the loop may branch)
        nxt = {}
        for e in edges:
            a, b = e.verts
            nxt.setdefault(a, []).append(b); nxt.setdefault(b, []).append(a)
        loop = _longest_cycle(nxt)
        # the hem line, height against angle round the arm: first harmonic, fitted
        # again without the points well above it (the tears)
        u = ax.cross(Vector((0, 0, 1))).normalized(); w = ax.cross(u)
        ang = np.array([math.atan2((mw @ v.co - el).dot(w), (mw @ v.co - el).dot(u)) for v in loop])
        ts = np.array([tr(v)[0] for v in loop])
        A = np.stack([np.ones_like(ang), np.cos(ang), np.sin(ang)], 1)
        keep = np.ones(len(ts), bool)
        for _ in range(4):
            coef = np.linalg.lstsq(A[keep], ts[keep], rcond=None)[0]
            keep = ts - A @ coef < rise / 2
        high = (ts - A @ coef) > rise
        n = len(loop)
        if high.all() or not high.any():
            continue
        i0 = int(np.argmin(high))
        runs, run = [], []
        for k in range(1, n + 1):
            i = (i0 + k) % n
            if high[i]: run.append(i)
            elif run: runs.append(run); run = []
        for run in runs:
            # a tear is a V: up one side to its apex, down the other; the two sides
            # are stitched together pairwise by height, like sewing it shut
            ring = [loop[(run[0] - 1) % n]] + [loop[i] for i in run] + [loop[(run[-1] + 1) % n]]
            h = [tr(v)[0] for v in ring]
            apex = max(range(len(ring)), key=lambda i: h[i])
            left, right = ring[:apex], ring[apex + 1:]
            if not left or not right:
                continue
            target = {}
            for v in left:
                r = min(right, key=lambda q: abs(tr(q)[0] - tr(v)[0]))
                target[v] = r
            for r in set(target.values()):
                group = [v for v, q in target.items() if q is r] + [r]
                r.co = sum((v.co for v in group), Vector()) / len(group)
            bmesh.ops.weld_verts(bm, targetmap=target)
            bm.verts.ensure_lookup_table()
            made += 1
    bm.to_mesh(outfit.data); bm.free()
    report(f"{outfit.name}: {zipped} hem vertices zipped, {made} tears sewn shut")
