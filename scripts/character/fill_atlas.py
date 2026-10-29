"""Fill the gutters of the body atlas so that no filtering reaches black.

Hunyuan lays its UV islands on black; texels at the island borders, and the
upscaler's halo around them, bleed black into the skin as small dark flecks.
The coverage of the UV triangles is rasterised, shrunk by a couple of pixels
(the upscaled border is contaminated), and everything outside is filled by
push-pull from the inside.

python fill_atlas.py atlas.png uv_tris.npy out.png [erode_px]
"""
import sys
import numpy as np, cv2

src, tris_path, dst = sys.argv[1:4]
erode = int(sys.argv[4]) if len(sys.argv) > 4 else 2
im = cv2.imread(src).astype(np.float32) / 255; H, W = im.shape[:2]
tris = np.load(tris_path)
mask = np.zeros((H, W), np.uint8)
pts = np.stack([tris[..., 0] * W, (1 - tris[..., 1]) * H], -1)   # glTF/Blender v up → image rows down
for t in np.round(pts * 16).astype(np.int32):
    cv2.fillConvexPoly(mask, t, 255, lineType=cv2.LINE_8, shift=4)
full = mask.copy()
if erode:
    mask = cv2.erode(mask, np.ones((2 * erode + 1, 2 * erode + 1), np.uint8))
# isolated dark flecks inside the islands are holes too (not the pants, the
# beard or the watch: those are dark over a wide area)
lum = im.sum(-1)
local = cv2.medianBlur((np.clip(lum / 3, 0, 1) * 255).astype(np.uint8), 9).astype(np.float32) / 255 * 3
med = cv2.medianBlur((im * 255).astype(np.uint8), 9).astype(np.float32) / 255
b_, g_, r_ = med[..., 0], med[..., 1], med[..., 2]
skin_around = (r_ > 0.45) & (r_ > g_) & (g_ > b_) & (r_ - b_ > 0.15)
fleck = (lum < 0.55 * local) & (local > 0.9) & skin_around
fleck = cv2.dilate(fleck.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
# the border band is only dropped where the upscaler darkened it: a dark
# island (the trousers) keeps its edge, or the fill would bring in the
# colour of the next island
band = (full > 0) & (mask == 0)
known = ((mask > 0) | (band & (lum > 0.7 * local))) & ~fleck

def push_pull(rgb, known):
    c = rgb * known[..., None]; w = known.astype(np.float32); levels = []
    while min(c.shape[:2]) > 1:
        levels.append((c, w)); h2, w2 = c.shape[0] // 2, c.shape[1] // 2
        c = c[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2, 3).sum((1, 3)); w = w[:h2 * 2, :w2 * 2].reshape(h2, 2, w2, 2).sum((1, 3))
    up = c / np.maximum(w, 1e-6)[..., None]
    for c, w in reversed(levels):
        up = cv2.resize(up, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_LINEAR)
        up = np.where((w > 0)[..., None], c / np.maximum(w, 1e-6)[..., None], up)
    return up

out = push_pull(im, known)
cv2.imwrite(dst, np.clip(out * 255, 0, 255).astype(np.uint8))
print("covered", round(float((mask > 0).mean()), 3), "flecks inside", int(((mask > 0) & fleck).sum()))
