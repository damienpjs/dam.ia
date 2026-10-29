"""Refill the eye sockets of the upscaled face sheet with the surrounding skin.

The first erasure (erase_eyes.py, OpenCV inpaint then blur) left a greyish
patch larger than the eyes the shader draws: on screen it reads as a pale
halo. Here a wider mask, past the painted lash line, is filled by push-pull
from the skin just outside it, so the ring between the drawn eye and the mask
edge is plain skin.

python refill_eyes.py sheet_in.png sheet_out.png
"""
import os
import sys
import numpy as np, cv2
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "blender")); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eyes import EYES

src, dst = sys.argv[1:3]
im = cv2.imread(src).astype(np.float32) / 255; H, W = im.shape[:2]
mask = np.zeros((H, W), np.uint8)
for e in EYES.values():
    cx, cy = e["c"][0] * W, (1 - e["c"][1]) * H
    a = int(e["a"] * W * 1.22)
    cv2.ellipse(mask, (int(cx), int(cy)), (a, int(e["bu"] * H * 1.3)), 0, 180, 360, 255, -1)
    cv2.ellipse(mask, (int(cx), int(cy)), (a, int(e["bl"] * H * 1.5)), 0, 0, 180, 255, -1)

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

# sources: the skin around the mask, not the brows (dark) nor the old patch
lum = im @ np.array([0.11, 0.59, 0.3], np.float32)
filled = push_pull(im, (mask == 0) & (lum > 0.42))
# a little blur inside to hide the push-pull structure, then a soft edge
blur = cv2.GaussianBlur(filled, (0, 0), W / 300)
inside = (mask > 0).astype(np.float32)
filled = filled * (1 - inside[..., None]) + blur * inside[..., None]
m = cv2.GaussianBlur(inside, (0, 0), W / 400)[..., None]
out = im * (1 - m) + filled * m
cv2.imwrite(dst, np.clip(out * 255, 0, 255).astype(np.uint8))
print("refilled", int(inside.sum()), "px")
