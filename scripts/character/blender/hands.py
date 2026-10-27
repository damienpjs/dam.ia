"""Straighten the hands and clean the wrist weights of the founder mesh.

Hunyuan generated the hands drooping at the wrist while Mixamo's bones run
straight along the forearm: the hand reads broken, more so once IDLE bends it.
And a few vertices around the wrists and the fingers carry weights that do not
match their neighbours: they tear into spikes when the hand turns.

- rotate each hand (and its finger bones) about the wrist so that it lines up
  with the forearm, blended by the hand chain's weight so the wrist stays smooth;
- replace outlier weight vectors by their neighbours' average, then smooth the
  forearm/hand split over a band around the wrist.
"""
import bpy, math
import numpy as np
from mathutils import Vector, Quaternion, Matrix


def _adjacency(me):
    adj = [[] for _ in me.vertices]
    for e in me.edges:
        a, b = e.vertices
        adj[a].append(b); adj[b].append(a)
    return adj


def _weights(mesh, names):
    me = mesh.data
    idx = {mesh.vertex_groups[n].index: k for k, n in enumerate(names) if n in mesh.vertex_groups}
    W = np.zeros((len(me.vertices), len(names)))
    for v in me.vertices:
        for g in v.groups:
            k = idx.get(g.group)
            if k is not None: W[v.index, k] = g.weight
    return W


def _write_weights(mesh, names, W, verts):
    for k, n in enumerate(names):
        vg = mesh.vertex_groups.get(n) or mesh.vertex_groups.new(name=n)
        for i in verts:
            w = float(W[i, k])
            if w > 1e-4: vg.add([int(i)], w, "REPLACE")
            else: vg.remove([int(i)])


def _watch_mask(mesh, tex_path):
    """Vertices painted near black in the original texture (the watch)."""
    me = mesh.data
    img = bpy.data.images.load(tex_path); W_, H_ = img.size
    px = np.empty(W_ * H_ * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(H_, W_, 4)
    dark = np.zeros(len(me.vertices), bool)
    uv = me.uv_layers[0].data
    for l in me.loops:
        u, v = uv[l.index].uv
        c = px[int(np.clip(v * H_, 0, H_ - 1)), int(np.clip(u * W_, 0, W_ - 1)), :3]
        if c.sum() < 0.3: dark[l.vertex_index] = True
    bpy.data.images.remove(img)
    return dark


def damp_hand_keys(keep=0.4, report=print):
    """The clips let the hands hang 20 to 33 degrees off the forearm: keep only
    `keep` of that rotation, a relaxed but straight wrist."""
    for act in bpy.data.actions:
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    for side in ("Right", "Left"):
                        dp = f'pose.bones["mixamorig:{side}Hand"].rotation_quaternion'
                        fc = [cb.fcurves.find(dp, index=i) for i in range(4)]
                        if not all(fc): continue
                        n = len(fc[0].keyframe_points)
                        if any(len(f.keyframe_points) != n for f in fc): continue
                        ident = Quaternion()
                        for k in range(n):
                            q = Quaternion([fc[i].keyframe_points[k].co[1] for i in range(4)])
                            q2 = ident.slerp(q, keep)
                            for i in range(4):
                                kp = fc[i].keyframe_points[k]
                                kp.co[1] = q2[i]; kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
                        for f in fc: f.update()
                        report(f"{act.name} {side}Hand: {n} keys damped to {keep:.0%}")


def fix_hands(mesh, arm, report=print, watch_tex=None):
    me = mesh.data
    mw = mesh.matrix_world; imw = mw.inverted()
    co = np.array([mw @ v.co for v in me.vertices])
    adj = _adjacency(me)
    watch = _watch_mask(mesh, watch_tex) if watch_tex else None
    bones = arm.data.bones
    for side in ("Right", "Left"):
        prefix = "mixamorig:" + side
        chain = [b.name for b in bones if b.name.startswith(prefix + "Hand")]          # Hand + fingers
        forearm = prefix + "ForeArm"
        names = [forearm] + chain
        W = _weights(mesh, names)
        w_chain = W[:, 1:].sum(1)
        wrist = arm.matrix_world @ bones[prefix + "Hand"].head_local
        elbow = arm.matrix_world @ bones[forearm].head_local
        fore_dir = (wrist - elbow).normalized()

        # --- weights: outliers, then the wrist band -----------------------------
        region = np.where((W.sum(1) > 0.05) & (np.linalg.norm(co - np.array(wrist), axis=1) < 0.16))[0]
        rset = set(region.tolist())
        fixed = 0
        for _ in range(3):
            for i in region:
                nb = [j for j in adj[i] if j in rset]
                if len(nb) < 2: continue
                avg = W[nb].mean(0)
                if np.abs(W[i] - avg).sum() > 0.6:
                    W[i] = avg; fixed += 1
        # forearm/hand split as a function of the distance along the forearm
        # axis only: a soft 7 cm band, the same all round the wrist, instead of
        # Hunyuan's ragged edge that pinches the top of the wrist when it bends
        t = (co - np.array(wrist)) @ np.array(fore_dir)
        radial = np.linalg.norm((co - np.array(wrist)) - np.outer(t, np.array(fore_dir)), axis=1)
        band = [i for i in region if abs(t[i]) < 0.06 and radial[i] < 0.07]
        ih = names.index(prefix + "Hand")
        for i in band:
            pair = W[i, 0] + W[i, ih]
            if pair < 0.5 * W[i].sum(): continue          # fingers: leave alone
            x = np.clip((t[i] + 0.035) / 0.07, 0, 1); h = x * x * (3 - 2 * x)
            W[i, 0] = pair * (1 - h); W[i, ih] = pair * h
        # a watch is rigid: it rides the forearm
        if watch is not None:
            n_w = 0
            for i in region:
                if watch[i] and abs(t[i]) < 0.06:
                    W[i] = 0; W[i, 0] = 1; n_w += 1
            report(f"{side}: {n_w} watch verts pinned to the forearm")
        tot = W.sum(1, keepdims=True)
        # keep each vertex's share of these bones: rescale to what it had before
        before = _weights(mesh, names).sum(1, keepdims=True)
        W = np.where(tot > 1e-6, W / np.maximum(tot, 1e-6) * before, W)
        _write_weights(mesh, names, W, region)
        w_chain = W[:, 1:].sum(1)

        # --- straighten: hand direction = wrist -> centroid of the palm -----------
        palm = np.where((w_chain > 0.8) & (np.linalg.norm(co - np.array(wrist), axis=1) < 0.11))[0]
        centroid = Vector(co[palm].mean(0))
        hand_dir = (centroid - wrist).normalized()
        q = hand_dir.rotation_difference(fore_dir)
        angle = math.degrees(q.angle)
        report(f"{side}: {fixed} outlier weights fixed, wrist band {len(band)} verts, hand bent {angle:.1f} deg")
        if angle < 3:
            continue
        ident = Quaternion()
        for i in np.where(w_chain > 0.01)[0]:
            f = float(np.clip(w_chain[i], 0, 1)) ** 1.5
            p = Vector(co[i]) - wrist
            r = ident.slerp(q, f)
            me.vertices[int(i)].co = imw @ (wrist + r @ p)
        # finger bones follow the hand
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode="EDIT")
        am = arm.matrix_world; iam = am.inverted()
        for b in arm.data.edit_bones:
            if b.name in chain and b.name != prefix + "Hand":
                for attr in ("head", "tail"):
                    p = am @ getattr(b, attr) - wrist
                    setattr(b, attr, iam @ (wrist + q @ p))
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.context.view_layer.objects.active = mesh
