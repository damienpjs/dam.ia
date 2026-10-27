import os
import sys, time, numpy as np, torch
from PIL import Image
from spandrel import ModelLoader
src, dst = sys.argv[1], sys.argv[2]
torch.set_num_threads(2)
model = ModelLoader().load_from_file(os.environ.get("ESRGAN_WEIGHTS", "RealESRGAN_x4plus.pth")).model.eval()
img = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
H, W, _ = img.shape
T, P, S = 192, 16, 4
out = np.zeros((H * S, W * S, 3), np.float32)
t0 = time.time()
with torch.inference_mode():
    for y in range(0, H, T):
        for x in range(0, W, T):
            y0, x0 = max(0, y - P), max(0, x - P)
            y1, x1 = min(H, y + T + P), min(W, x + T + P)
            tile = torch.from_numpy(img[y0:y1, x0:x1].transpose(2, 0, 1))[None]
            r = model(tile)[0].numpy().transpose(1, 2, 0)
            oy, ox = (y - y0) * S, (x - x0) * S
            h, w = min(T, H - y) * S, min(T, W - x) * S
            out[y * S:y * S + h, x * S:x * S + w] = r[oy:oy + h, ox:ox + w]
        print(f"row {y}/{H} {time.time()-t0:.0f}s", flush=True)
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst)
print("done", time.time() - t0)
