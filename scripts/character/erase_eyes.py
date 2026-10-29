import os
import numpy as np, cv2, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "blender"))
from eyes import EYES
src, dst, mask_out = sys.argv[1:4]
im = cv2.imread(src); H, W = im.shape[:2]
mask = np.zeros((H, W), np.uint8)
for side, e in EYES.items():
    cx, cy = e["c"][0] * W, (1 - e["c"][1]) * H
    a = e["a"] * W * 1.13
    # upper half and lower half ellipses
    cv2.ellipse(mask, (int(cx), int(cy)), (int(a), int(e["bu"] * H * 1.18)), 0, 180, 360, 255, -1)
    cv2.ellipse(mask, (int(cx), int(cy)), (int(a), int(e["bl"] * H * 1.32)), 0, 0, 180, 255, -1)
mask = cv2.GaussianBlur(mask, (0, 0), 1.5); mask = (mask > 40).astype(np.uint8) * 255
r = max(3, W // 70)
inp = cv2.inpaint(im, mask, r, cv2.INPAINT_TELEA)
# soften the filled area so the inpaint streaks disappear, keep the edges
blur = cv2.GaussianBlur(inp, (0, 0), W / 140)
m = cv2.GaussianBlur(mask, (0, 0), W / 220).astype(np.float32)[..., None] / 255
out = (inp * (1 - m) + blur * m).astype(np.uint8)
cv2.imwrite(dst, out); cv2.imwrite(mask_out, mask)
