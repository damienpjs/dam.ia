"""Finger bones for the Ship or Die male body, whose rig stops at the hands.

The base mesh has five separate fingers, spread, palms towards the camera
(-Y), in T-pose. For each hand:

- the four fingers are found as lines through the vertices past the palm,
  the thumb as the part of the hand above the palm;
- each line gets three phalanges and an end bone, Mixamo names
  (mixamorig:LeftHandIndex1..4, ...), rolled so that a positive turn about
  the bone's X axis curls the finger towards the palm;
- the hand's weight on those vertices is shared between the palm and the
  phalanges, blended over the knuckles and the joints;
- the clips get a relaxed hand: fingers gathered and slightly curled,
  instead of the spread T-pose hand.
"""
import bpy, math
import numpy as np
from mathutils import Matrix, Quaternion, Vector

FINGERS = ("Index", "Middle", "Ring", "Pinky")
PHALANGES = (0.45, 0.30, 0.25)          # share of the knuckle-to-tip length


def _weights(obj, name):
    gi = obj.vertex_groups[name].index
    w = np.zeros(len(obj.data.vertices))
    for v in obj.data.vertices:
        for e in v.groups:
            if e.group == gi: w[v.index] = e.weight
    return w


def _smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def _adjacency(me):
    adj = [[] for _ in me.vertices]
    for e in me.edges:
        a, b = e.vertices; adj[a].append(b); adj[b].append(a)
    return adj


def _geodesic(P, adj, seeds, allowed):
    import heapq
    g = np.full(len(P), np.inf)
    pq = []
    for s in seeds:
        g[s] = 0.0; pq.append((0.0, int(s)))
    heapq.heapify(pq)
    while pq:
        d, u = heapq.heappop(pq)
        if d > g[u]: continue
        for w in adj[u]:
            if not allowed[w]: continue
            nd = d + float(np.linalg.norm(P[u] - P[w]))
            if nd < g[w]:
                g[w] = nd; heapq.heappush(pq, (nd, w))
    return g


def _branches(g, adj, verts, count):
    """Merge tree of the geodesic distance, from the farthest vertices down:
    each finger is a branch (a local maximum) that joins the palm at its
    merge level. Returns the `count` most persistent branches as
    (tip vertex, merge level, member vertices above the merge level)."""
    order = sorted(verts, key=lambda v: -g[v])
    parent = {}
    tipof = {}
    members = {}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    merged = []          # (persistence, tip, merge level, members)
    for v in order:
        parent[v] = v; tipof[v] = v; members[v] = [v]
        roots = {find(w) for w in adj[v] if w in parent and w != v}
        roots.discard(find(v))
        if not roots: continue
        # v joins the oldest neighbour component; younger ones end here
        roots = sorted(roots, key=lambda r: -g[tipof[r]])
        main = roots[0]
        for r in roots[1:]:
            merged.append((g[tipof[r]] - g[v], tipof[r], g[v], members[r]))
            members[main] += members[r]; parent[r] = main
        members[main] += members[find(v)]; parent[find(v)] = main
    top = sorted(merged, key=lambda m: -m[0])[:count - 1]
    # the oldest component (the farthest tip) never merges: it is the last finger
    root = find(order[0])
    rest = [m for m in merged if m[1] != tipof[root]]
    # its own branch: what lies above the level where the others joined it
    lvl = max((m[2] for m in top), default=0.0)
    top.append((g[tipof[root]] - lvl, tipof[root], lvl, [v for v in members[root] if g[v] >= lvl]))
    return top


def find_chains(skin, rig, side, report=print):
    """Knuckle and tip of each finger of one hand (world space), with the
    vertices of each finger's branch and the geodesic distance from the wrist."""
    sg = 1 if side == "Left" else -1
    mw = skin.matrix_world
    P = np.array([mw @ v.co for v in skin.data.vertices])
    adj = _adjacency(skin.data)
    wh = _weights(skin, f"mixamorig:{side}Hand")
    wr = np.array(rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local)
    u = (P[:, 0] - wr[0]) * sg
    hand = (wh > 0.05) & (u > -0.005)          # past the wrist only: the forearm would add maxima
    seeds = np.where(hand & (u < 0.012))[0]
    g = _geodesic(P, adj, seeds, hand)
    verts = [int(v) for v in np.where(hand & np.isfinite(g))[0]]
    br = _branches(g, adj, verts, 5)
    tips = [P[b[1]] for b in br]
    ti = max(range(len(tips)), key=lambda i: tips[i][2] - abs(tips[i][0] - wr[0]))   # points up, close to the wrist
    thumb = tips[ti]
    thumb_members = [int(v) for v in br[ti][3]]
    order = sorted([i for i in range(len(tips)) if i != ti], key=lambda i: -tips[i][2])
    others = [tips[i] for i in order]
    umax = max(((t[0] - wr[0]) * sg) for t in tips)
    # knuckles: on a line across the palm, just behind where the fingers part,
    # fanned like the tips but tighter (the fingers spread from the knuckles)
    uk = 0.5 * umax
    palm = hand & (u > 0.3 * umax) & (u < 0.55 * umax) & (P[:, 2] < wr[2] + 0.04)
    zc, ymid = float(np.median(P[palm, 2])), float(np.median(P[palm, 1]))
    chains, info = {}, {}
    for name, tp in zip(FINGERS, others):
        chains[name] = (np.array([wr[0] + sg * uk, ymid, zc + (tp[2] - zc) * 0.75]), tp)
    # thumb: from its root near the wrist, on the palm side, to its tip
    root = wr + np.array([sg * 0.22 * umax, -0.012, 0.025])
    chains["Thumb"] = (root, thumb)
    chains = {k: chains[k] for k in ("Thumb",) + FINGERS}
    info = {k: dict(members=[]) for k in chains}
    # the thumb is the one branch the merge tree gets right: it joins the palm low
    info["Thumb"]["members"] = thumb_members
    for name, i in zip(FINGERS, order):
        info[name]["members"] = [int(v) for v in br[i][3]]
    report(f"{side}: " + ", ".join(f"{n} {np.linalg.norm(chains[n][1] - chains[n][0]):.3f} m" for n in chains))
    return chains, info, g


# where the joint sits below the free part of each finger, as a share of the
# free length (web to tip): knuckles hide in the palm, the thumb's root deep in the thenar
ROOT_DEPTH = {"Thumb": 0.35, "Index": 0.30, "Middle": 0.30, "Ring": 0.30, "Pinky": 0.32}


def centreline_chains(skin, side, found, report=print):
    """Re-place each chain on its finger's centre line, measured on the mesh.

    The first guess puts every knuckle on one line across the palm and ends
    the bone on the tip vertex, so on a hand whose fingers are not all in one
    plane the bones run diagonally through the finger and every curl twists
    it. Here each finger's free part is sliced along its main axis, the slice
    centroids give the centre line, and the root is pushed back along that
    line into the palm, centred in the palm's thickness."""
    chains, info, g = found
    mw = skin.matrix_world
    P = np.array([mw @ v.co for v in skin.data.vertices])
    hand = np.isfinite(g)
    names = ("Thumb",) + FINGERS
    adj = _adjacency(skin.data)
    tip_v = {n: int(np.argmin(np.linalg.norm(P - np.asarray(chains[n][1]), axis=1))) for n in names}
    dist = {n: _geodesic(P, adj, [tip_v[n]], hand) for n in names}
    D = np.vstack([dist[n] for n in names])
    label = np.argmin(D, axis=0)
    for k, name in enumerate(names):
        tip = np.asarray(chains[name][1])
        # the free finger: closer to its own tip than to any other, and short of the web
        # (the nearest point, along the surface, that belongs to another finger)
        web = np.min(dist[name][(label != k) & hand])
        M = P[(label == k) & (dist[name] < 0.95 * web)]
        if len(M) < 30:
            continue
        c = M.mean(axis=0)
        _, _, vt = np.linalg.svd(M - c, full_matrices=False)
        d = vt[0]
        if (tip - c) @ d < 0: d = -d
        t = (M - c) @ d
        edges = np.linspace(t.min(), t.max(), 9)
        cents = [M[(t >= a) & (t <= b)].mean(axis=0) for a, b in zip(edges[:-1], edges[1:]) if ((t >= a) & (t <= b)).sum() > 3]
        cents = np.array(cents)
        # straight fit through the slice centroids
        cc = cents.mean(axis=0)
        _, _, vt2 = np.linalg.svd(cents - cc, full_matrices=False)
        d2 = vt2[0] if vt2[0] @ d > 0 else -vt2[0]
        s0 = (cents[0] - cc) @ d2; s1 = (cents[-1] - cc) @ d2
        base, end = cc + d2 * s0, cc + d2 * (s1 + (edges[1] - edges[0]) * 0.5)
        L = np.linalg.norm(end - base)
        root = base - d2 * ROOT_DEPTH[name] * L
        # centre the root in the palm's thickness there (the axis is roughly x, the palm normal y)
        near = P[hand & (np.linalg.norm((P - root)[:, [0, 2]], axis=1) < 0.008)]
        if len(near) > 6:
            root[1] = 0.5 * (near[:, 1].min() + near[:, 1].max())
        chains[name] = (root, end)
    report(f"{side}: chains on the finger centre lines, " + ", ".join(f"{n} {np.linalg.norm(chains[n][1] - chains[n][0]):.3f} m" for n in chains))
    return chains, info, g


def add_finger_bones(rig, found_by_side):
    """Create the phalanges in edit mode; returns the bone names per finger."""
    chains_by_side = {side: found[0] for side, found in found_by_side.items()}
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    iw = rig.matrix_world.inverted()
    palm_normal = (rig.matrix_world.to_3x3().inverted() @ Vector((0, -1, 0))).normalized()
    names = {}
    for side, chains in chains_by_side.items():
        hand = rig.data.edit_bones[f"mixamorig:{side}Hand"]
        for finger, (k, t) in chains.items():
            k, t = Vector(k), Vector(t)
            parent = hand; head = k
            seq = []
            acc = 0.0
            for i, share in enumerate(PHALANGES + (0.12,), 1):
                acc_next = min(1.0 + 0.12, acc + share)
                tail = k + (t - k) * (acc + share) if i < 4 else t + (t - k).normalized() * 0.012
                b = rig.data.edit_bones.new(f"mixamorig:{side}Hand{finger}{i}")
                b.head = iw @ head; b.tail = iw @ tail
                b.parent = parent; b.use_connect = i > 1
                b.align_roll(palm_normal)
                seq.append(b.name); parent = b; head = tail; acc += share
            names[(side, finger)] = seq
    bpy.ops.object.mode_set(mode="OBJECT")
    return names


# Relaxed hand, in degrees: curl per phalanx, and how much of the T-pose spread to take back.
# Hand shapes: curl of each phalanx (deg), how much of the modelled spread is
# taken back (gather), and the thumb as (spread, palmar, curl1, curl2, curl3).
# "relaxed" is keyed into the clips; the others ship as one-frame HAND_* clips
# that the site blends in during gestures.
HAND_SHAPES = {
    "relaxed": dict(curl={"Index": (18, 22, 14), "Middle": (22, 26, 16), "Ring": (26, 30, 18), "Pinky": (30, 34, 20)},
                    gather=0.75, thumb=(12, 22, 0, 10, 16)),
    "open": dict(curl={"Index": (5, 4, 2), "Middle": (6, 4, 2), "Ring": (8, 5, 3), "Pinky": (10, 6, 3)},
                 gather=0.45, thumb=(-5, 8, 0, 4, 4)),
    "talk": dict(curl={"Index": (10, 12, 8), "Middle": (15, 17, 10), "Ring": (20, 22, 12), "Pinky": (24, 26, 14)},
                 gather=0.65, thumb=(8, 18, 0, 8, 10)),
    "fist": dict(curl={"Index": (55, 78, 45), "Middle": (68, 90, 55), "Ring": (72, 92, 55), "Pinky": (76, 92, 50)},
                 gather=0.9, thumb=(30, 34, 8, 22, 28)),
    "chin": dict(curl={"Index": (30, 55, 30), "Middle": (62, 88, 50), "Ring": (70, 92, 50), "Pinky": (76, 92, 46)},
                 gather=0.85, thumb=(-8, 22, 0, 6, 12)),
    "hip": dict(curl={"Index": (10, 8, 4), "Middle": (10, 8, 4), "Ring": (12, 10, 5), "Pinky": (14, 12, 6)},
                gather=0.95, thumb=(-30, -18, 0, 6, 6)),
}


def thumb_rotation(rig, side, spread, palmar):
    """Thumb1 turned about its root, as a rotation in its own rest frame.

    The game's thumb sticks straight up in the T-pose. It turns towards the
    fingers in the palm plane (`spread`) and in front of the palm (`palmar`;
    palms face -y at rest). Built in world space, then expressed in the bone's
    frame, so the same numbers mean the same thing on both hands."""
    b1 = rig.data.bones[f"mixamorig:{side}HandThumb1"]
    root = rig.matrix_world @ b1.head_local
    tip = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}HandThumb4"].tail_local
    r1 = Matrix.Rotation(math.radians(spread) * (1 if side == "Left" else -1), 3, Vector((0, 1, 0)))
    k = (r1 @ (tip - root)).normalized().cross(Vector((0, -1, 0))).normalized()
    R = Matrix.Rotation(math.radians(palmar), 3, k) @ r1
    A = rig.matrix_world.to_3x3().normalized()
    B = b1.matrix_local.to_3x3().normalized()
    return (B.inverted() @ A.inverted() @ R @ A @ B).to_quaternion()


def hand_pose(rig, chains, side, shape):
    """Local rotation of every finger bone of one hand for a named shape."""
    spec = HAND_SHAPES[shape]
    mid = np.asarray(chains["Middle"][1]) - np.asarray(chains["Middle"][0])
    mid /= np.linalg.norm(mid)
    out = {}
    for f in chains:
        for p in range(3):
            if f == "Thumb":
                sp, pa, *curl = spec["thumb"]
                q = Quaternion((1, 0, 0), math.radians(curl[p]))
                if p == 0:
                    q = thumb_rotation(rig, side, sp, pa) @ q
            else:
                q = Quaternion((1, 0, 0), math.radians(spec["curl"][f][p]))
                if p == 0 and f != "Middle":
                    d = np.asarray(chains[f][1]) - np.asarray(chains[f][0]); d /= np.linalg.norm(d)
                    # spread angle in the palm plane, taken back towards the middle finger
                    ang = math.atan2(np.cross(mid, d)[1], mid.dot(d))
                    q = Quaternion((0, 0, 1), -spec["gather"] * ang * (1 if side == "Left" else -1)) @ q
            out[f"mixamorig:{side}Hand{f}{p + 1}"] = q
    return out


def relax_hands(rig, found_by_side, actions, report=print):
    """Key the relaxed hand into every action, constant over its frame range."""
    for side, (chains, _, _) in found_by_side.items():
        pose = hand_pose(rig, chains, side, "relaxed")
        for act in actions:
            fr = act.frame_range
            for bname, q in pose.items():
                pb = rig.pose.bones[bname]
                pb.rotation_mode = "QUATERNION"
                for frame in (fr[0], fr[1]):
                    pb.rotation_quaternion = q
                    pb.keyframe_insert("rotation_quaternion", frame=frame, group=bname)
        report(f"{side}: relaxed hand keyed into {[a.name for a in actions]}")


def add_hand_shape_clips(rig, found_by_side, report=print):
    """One-frame HAND_<shape> clips (finger bones only, both hands)."""
    made = []
    for shape in HAND_SHAPES:
        if shape == "relaxed":
            continue
        act = bpy.data.actions.new(f"HAND_{shape}")
        act.use_fake_user = True
        rig.animation_data.action = act
        if act.slots: rig.animation_data.action_slot = act.slots[0]
        for side, (chains, _, _) in found_by_side.items():
            for bname, q in hand_pose(rig, chains, side, shape).items():
                pb = rig.pose.bones[bname]
                pb.rotation_mode = "QUATERNION"
                pb.rotation_quaternion = q
                pb.keyframe_insert("rotation_quaternion", frame=1, group=bname)
                pb.keyframe_insert("rotation_quaternion", frame=2, group=bname)
        made.append(act)
    report(f"hand shapes: {[a.name for a in made]}")
    return made


def ease_wrists(rig, actions, keep=0.35, report=print):
    """Keep only `keep` of each hand's bend (swing), all of its twist.

    The Ship or Die clips fold the hands toward the thighs, which reads from far
    away in the game but looks like a broken wrist at portfolio distance. The
    twist is what turns the palm toward the thigh: it stays."""
    from mathutils import Quaternion as Q
    for act in actions:
        bags = [cb for layer in act.layers for strip in layer.strips for cb in strip.channelbags]
        for side in ("Left", "Right"):
            hn = f"mixamorig:{side}Hand"
            fh = None
            for cb in bags:
                fc = [cb.fcurves.find(f'pose.bones["{hn}"].rotation_quaternion', index=i) for i in range(4)]
                if all(fc): fh = fc; break
            if not fh: continue
            data = []
            for kp in range(len(fh[0].keyframe_points)):
                fr = fh[0].keyframe_points[kp].co[0]
                q = Q([c.evaluate(fr) for c in fh]).normalized()
                tw = Q((q.w, 0.0, q.y, 0.0))
                tw = tw.normalized() if tw.magnitude > 1e-6 else Q()
                swing = q @ tw.inverted()
                data.append((fr, Q().slerp(swing, keep) @ tw))
            for i, c in enumerate(fh):
                for k, (fr, q) in enumerate(data):
                    c.keyframe_points[k].co = (fr, q[i])
                c.update()
            report(f"{act.name} {side}: wrist bend kept at {int(keep * 100)} %")


def heat_weight_hands(skin, rig, sides=("Left", "Right"), blend=(0.01, 0.035), report=print):
    """Weight each hand with Blender's bone heat, on a copy of the hand alone.

    Distances to the finger lines could not tell the thenar from the palm: the
    thumb stayed on the hand bone and tore when it bent. Bone heat follows the
    surface, so the base of the thumb goes with it. The copy stops 35 mm up
    the forearm; between 10 and 35 mm the new weights fade into the old ones."""
    import bmesh
    from mathutils.kdtree import KDTree
    mw = skin.matrix_world
    for side in sides:
        sg = -1 if side == "Right" else 1           # the right hand lies towards -x
        wr = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
        out = lambda p: sg * (p.x - wr.x)          # > 0: towards the fingers
        h = skin.copy(); h.data = skin.data.copy(); bpy.context.scene.collection.objects.link(h)
        h.modifiers.clear(); h.vertex_groups.clear(); h.parent = None; h.matrix_world = mw.copy()
        bm = bmesh.new(); bm.from_mesh(h.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if out(mw @ v.co) < -blend[1] - 0.005], context="VERTS")
        bm.to_mesh(h.data); bm.free()
        deform = {b.name: b.use_deform for b in rig.data.bones}
        for b in rig.data.bones:
            b.use_deform = (b.name.startswith(f"mixamorig:{side}Hand") and not b.name.endswith("4")) or b.name == f"mixamorig:{side}ForeArm"
        bpy.ops.object.select_all(action="DESELECT")
        h.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
        for n, v in deform.items(): rig.data.bones[n].use_deform = v
        kd = KDTree(len(h.data.vertices))
        for v in h.data.vertices: kd.insert(mw @ v.co, v.index)
        kd.balance()
        names = {g.index: g.name for g in h.vertex_groups}
        done = 0
        for v in skin.data.vertices:
            p = mw @ v.co
            if out(p) < -blend[1]: continue
            _, i, d = kd.find(p)
            if d > 1e-5: continue
            t = 1.0 if out(p) > -blend[0] else (out(p) + blend[1]) / (blend[1] - blend[0])
            old = {skin.vertex_groups[e.group].name: e.weight for e in v.groups}
            new = {names[e.group]: e.weight for e in h.data.vertices[i].groups}
            s = sum(new.values())
            if s <= 0: continue
            for n in set(old) | set(new):
                w = (1 - t) * old.get(n, 0.0) + t * new.get(n, 0.0) / s
                g = skin.vertex_groups.get(n) or skin.vertex_groups.new(name=n)
                if w > 1e-4: g.add([v.index], w, "REPLACE")
                else: g.remove([v.index])
            done += 1
        bpy.data.objects.remove(h, do_unlink=True)
        report(f"{side}: bone heat weights on {done} hand vertices")


def subdivide(obj, levels=1, report=print):
    """Catmull-Clark once, weights and UVs carried over: the game mesh is built
    for a top-down camera, and its 8-sided fingers show their facets up close."""
    n0 = len(obj.data.vertices)
    m = obj.modifiers.new("subdiv", "SUBSURF")
    m.levels = m.render_levels = levels
    m.uv_smooth = "PRESERVE_BOUNDARIES"; m.boundary_smooth = "PRESERVE_CORNERS"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_move_to_index(modifier=m.name, index=0)
    bpy.ops.object.modifier_apply(modifier=m.name)
    report(f"{obj.name}: {n0} -> {len(obj.data.vertices)} vertices")


def add_twist_bones(rig, skin, sides=("Left", "Right"), ramp=(0.15, 0.95), report=print):
    """A forearm twist bone per arm, the hand reparented under it.

    Turning the palm is the radius rolling over the ulna along the whole
    forearm, not a turn at the wrist. The twist bone runs from mid-forearm to
    the wrist; the forearm skin moves from the forearm bone at the elbow to the
    twist bone at the wrist, so a 100 degree turn spreads over the forearm
    instead of pinching one ring of vertices."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = rig.data.edit_bones
    for side in sides:
        fa, hd = eb[f"mixamorig:{side}ForeArm"], eb[f"mixamorig:{side}Hand"]
        tw = eb.new(f"mixamorig:{side}ForeArmTwist")
        tw.head = fa.head.lerp(hd.head, 0.5); tw.tail = hd.head.copy()
        tw.align_roll(fa.z_axis)
        tw.parent = fa; tw.use_connect = False; tw.use_deform = True
        hd.parent = tw; hd.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    mw = skin.matrix_world
    for side in sides:
        e = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}ForeArm"].head_local
        w = rig.matrix_world @ rig.data.bones[f"mixamorig:{side}Hand"].head_local
        ax = w - e; L2 = ax.length_squared
        fg = skin.vertex_groups[f"mixamorig:{side}ForeArm"]
        tg = skin.vertex_groups.get(f"mixamorig:{side}ForeArmTwist") or skin.vertex_groups.new(name=f"mixamorig:{side}ForeArmTwist")
        n = 0
        for v in skin.data.vertices:
            wf = next((g.weight for g in v.groups if g.group == fg.index), 0.0)
            if wf <= 0: continue
            t = (mw @ v.co - e).dot(ax) / L2
            share = float(_smooth(ramp[0], ramp[1], t))
            if share <= 0: continue
            tg.add([v.index], wf * share, "REPLACE")
            if share >= 1: fg.remove([v.index])
            else: fg.add([v.index], wf * (1 - share), "REPLACE")
            n += 1
        report(f"{side}: forearm twist bone, {n} skin vertices share it")


def twist_to_twist_bone(rig, actions, share=1.0, report=print):
    """Move `share` of each hand key's twist (about the forearm axis) onto the
    forearm twist bone; the hand keeps its world orientation."""
    from mathutils import Quaternion as Q, Vector as V
    for act in actions:
        bags = [cb for layer in act.layers for strip in layer.strips for cb in strip.channelbags]
        for side in ("Left", "Right"):
            hn, tn = f"mixamorig:{side}Hand", f"mixamorig:{side}ForeArmTwist"
            fh = None
            for cb in bags:
                fc = [cb.fcurves.find(f'pose.bones["{hn}"].rotation_quaternion', index=i) for i in range(4)]
                if all(fc): fh = fc; bag = cb; break
            if not fh: continue
            rest_rel = rig.data.bones[tn].matrix_local.inverted() @ rig.data.bones[hn].matrix_local
            axis_t = (rest_rel.to_3x3() @ V((0, 1, 0))).normalized()
            f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
            new_h, new_t = [], []
            for fr in range(f0, f1 + 1):
                qh = Q([c.evaluate(fr) for c in fh]).normalized()
                tw = Q((qh.w, 0.0, qh.y, 0.0))
                tw = tw.normalized() if tw.magnitude > 1e-6 else Q()
                ang = tw.angle * (1 if tw.y >= 0 else -1)
                if ang > math.pi: ang -= 2 * math.pi
                new_h.append((fr, Q(V((0, 1, 0)), share * ang).inverted() @ qh))
                new_t.append((fr, Q(axis_t, share * ang)))
            ft = [bag.fcurves.new(f'pose.bones["{tn}"].rotation_quaternion', index=i) for i in range(4)]
            for fc, data in ((fh, new_h), (ft, new_t)):
                for i, c in enumerate(fc):
                    c.keyframe_points.clear()
                    c.keyframe_points.add(len(data))
                    for k, (fr, q) in enumerate(data):
                        c.keyframe_points[k].co = (fr, q[i]); c.keyframe_points[k].interpolation = "LINEAR"
                    c.update()
            report(f"{act.name} {side}: {int(share * 100)} % of the hand twist on the forearm twist bone")

