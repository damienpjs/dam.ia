"""Collision proxies for the site's runtime arm solver.

Each body bone gets three elliptic capsules (one per third of its length),
fitted to the skin, outfit and head vertices it carries, in the bone's own
frame. The site pushes the hands out of them after the gesture IK, so a
spring overshoot or a camera-driven head turn can never sink a hand into the
body. Stored as JSON in the armature's `dam_colliders` property (glTF extras)."""
import json
import numpy as np

BONES = ("Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftUpLeg", "RightUpLeg")
SLICES = 3


def fit_colliders(rig, meshes, margin=0.004, report=print):
    """margin in metres (world); radii are the 97th percentile plus margin."""
    names_of = {}
    pts = {b: [] for b in BONES}
    to_arm = rig.matrix_world.inverted()
    scale = rig.matrix_world.to_scale()[0]          # armature units -> metres
    for obj in meshes:
        groups = [g.name.replace("mixamorig:", "") for g in obj.vertex_groups]
        mw = obj.matrix_world
        for v in obj.data.vertices:
            best = max(v.groups, key=lambda e: e.weight, default=None)
            if best is None: continue
            n = groups[best.group]
            if n in pts:
                pts[n].append(to_arm @ (mw @ v.co))
    out = []
    for b in BONES:
        if not pts[b]: continue
        bone = rig.data.bones[f"mixamorig:{b}"]
        inv = bone.matrix_local.inverted()
        P = np.array([inv @ p for p in pts[b]])           # bone frame, armature units
        y0, y1 = np.percentile(P[:, 1], [1, 99])
        edges = np.linspace(y0, y1, SLICES + 1)
        m = margin / scale
        for k in range(SLICES):
            sel = P[(P[:, 1] >= edges[k]) & (P[:, 1] <= edges[k + 1])]
            if len(sel) < 12: continue
            cx, cz = np.median(sel[:, 0]), np.median(sel[:, 2])
            rx = np.percentile(np.abs(sel[:, 0] - cx), 97) + m
            rz = np.percentile(np.abs(sel[:, 2] - cz), 97) + m
            out.append(dict(bone=f"mixamorig:{b}", a=[float(cx), float(edges[k]), float(cz)], b=[float(cx), float(edges[k + 1]), float(cz)],
                            rx=float(rx), rz=float(rz)))
    rig["dam_colliders"] = json.dumps(out)
    report(f"colliders: {len(out)} elliptic capsules on {len([b for b in BONES if pts[b]])} bones")
    return out
