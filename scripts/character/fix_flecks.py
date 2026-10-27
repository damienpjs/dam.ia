"""Repaint the triangles of the body atlas whose colour does not match the skin
around them.

Hunyuan maps some small triangles (back of the hands, wrists, forearms) onto
texels of another colour: grey or dark slivers on the skin. A triangle whose
mean colour is far from the median of the triangles around it, in a skin
area, gets its UV footprint repainted with that median.

python fix_flecks.py atlas.png uv_tris.npy out.png
"""
import sys
import numpy as np, cv2

src, tris_path, dst = sys.argv[1:4]
im = cv2.imread(src).astype(np.float32) / 255; H, W = im.shape[:2]
uv = np.load(tris_path); tv = np.load(tris_path.replace(".npy", "_verts.npy"))
px = np.stack([uv[..., 0] * W, (1 - uv[..., 1]) * H], -1)        # (T, 3, 2)

# mean colour of each triangle: 7 interior samples
bary = np.array([[1/3, 1/3, 1/3], [.6, .2, .2], [.2, .6, .2], [.2, .2, .6], [.45, .45, .1], [.1, .45, .45], [.45, .1, .45]], np.float32)
pts = np.einsum("sk,tkd->tsd", bary, px)
xi = np.clip(pts[..., 0].astype(int), 0, W - 1); yi = np.clip(pts[..., 1].astype(int), 0, H - 1)
col = im[yi, xi].mean(1)                                          # (T, 3) BGR

# neighbours: triangles sharing a vertex
nv = tv.max() + 1
v2t = [[] for _ in range(nv)]
for t, (a, b, c) in enumerate(tv):
    v2t[a].append(t); v2t[b].append(t); v2t[c].append(t)
ref = np.empty_like(col)
for t, vs in enumerate(tv):
    nb = {n for v in vs for n in v2t[v]} - {t}
    ref[t] = np.median(col[list(nb)], 0) if nb else col[t]

def skin(c):
    b, g, r = c[..., 0], c[..., 1], c[..., 2]
    return (r > 0.45) & (r > g) & (g > b) & (r - b > 0.15)

# only where the skin is bare: forearms and hands by their bones, elsewhere
# where nearly all the triangles around are skin (not the orange flowers)
wv = np.load(tris_path.replace(".npy", "_skinw.npy"))
bare = wv[tv].mean(1) > 0.5
is_skin = skin(col)
frac = np.array([is_skin[list({n for v in vs for n in v2t[v]})].mean() for vs in tv])
dist = np.linalg.norm(col - ref, axis=1)
bad = skin(ref) & (((dist > 0.07) & bare) | ((dist > 0.12) & (frac > 0.9)))
out = im.copy()
for t in np.where(bad)[0]:
    poly = np.round(px[t] * 16).astype(np.int32)
    cv2.fillConvexPoly(out, poly, ref[t].tolist(), lineType=cv2.LINE_AA, shift=4)
    cv2.polylines(out, [poly], True, ref[t].tolist(), thickness=2, lineType=cv2.LINE_AA, shift=4)
cv2.imwrite(dst, np.clip(out * 255, 0, 255).astype(np.uint8))
print("triangles repainted", int(bad.sum()), "of", len(tv))
