"""Clothing weights that follow the skin underneath."""
import bpy
import numpy as np
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform


def _smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def fit_outfit_weights(outfit, skin, near=0.03, far=0.06, report=print):
    """Give every piece of cloth close to the body the skin's own weights.

    The outfit came with weights transferred from the game's base body; once the
    hands, the wrists and the shoulders deform differently, sleeve, collar and
    watch drift from the skin and the skin comes through. Each outfit vertex
    takes the weights of the nearest skin point (interpolated over its
    triangle), fully under `near`, fading out to its own weights at `far`."""
    sw = skin.matrix_world; ow = outfit.matrix_world
    sv = [sw @ v.co for v in skin.data.vertices]
    tris = [p.vertices[:] for p in skin.data.polygons]
    # triangulate the skin's polygons for interpolation
    tri_list, tri_of = [], []
    for pi, p in enumerate(tris):
        for k in range(1, len(p) - 1):
            tri_list.append((p[0], p[k], p[k + 1]))
    bvh = BVHTree.FromPolygons(sv, tri_list)
    sk_names = [g.name for g in skin.vertex_groups]
    W = np.zeros((len(sv), len(sk_names)), np.float32)
    for v in skin.data.vertices:
        for e in v.groups:
            W[v.index, e.group] = e.weight
    moved = 0
    for v in outfit.data.vertices:
        p = ow @ v.co
        hit, _, fi, d = bvh.find_nearest(p, far)
        if hit is None:
            continue
        a, b, c = tri_list[fi]
        bc = barycentric_transform(hit, sv[a], sv[b], sv[c], (1, 0, 0), (0, 1, 0), (0, 0, 1))
        w = np.clip(np.array(bc), 0, 1); w /= max(w.sum(), 1e-9)
        new = W[a] * w[0] + W[b] * w[1] + W[c] * w[2]
        t = 1.0 - float(_smooth(near, far, d))
        old = {outfit.vertex_groups[e.group].name: e.weight for e in v.groups}
        mix = {}
        for gi in np.nonzero(new > 1e-4)[0]:
            mix[sk_names[gi]] = t * float(new[gi])
        for n, wo in old.items():
            mix[n] = mix.get(n, 0.0) + (1 - t) * wo
        s = sum(mix.values()) or 1.0
        for n in set(old) | set(mix):
            g = outfit.vertex_groups.get(n) or outfit.vertex_groups.new(name=n)
            ww = mix.get(n, 0.0) / s
            if ww > 1e-4: g.add([v.index], ww, "REPLACE")
            else: g.remove([v.index])
        moved += 1
    report(f"{outfit.name}: {moved} vertices take the weights of the skin underneath")
