#!/usr/bin/env bash
# Rebuild public/models/founder.glb from the Hunyuan export. See README.md.
#
#   BLENDER_PY: a Python with the bpy module (pip install bpy)
#   SR_PY:      a Python with torch + spandrel, and ESRGAN_WEIGHTS pointing at
#               RealESRGAN_x4plus.pth
#   work/raw.glb, work/texture.png, work/normal.png, work/mr.png: the export
set -euo pipefail
cd "$(dirname "$0")"
B=${BLENDER_PY:-python3}; S=${SR_PY:-python3}; W=work
export SOURCE_TEX=$W/texture.png

# 1. face sheet: frontal render of the head, eyes erased, upscaled, sockets refilled
$B blender/facesheet_render.py -- $W/raw.glb $W/texture.png $W/facesheet.png 1024
python3 erase_eyes.py $W/facesheet.png $W/facesheet_noeyes.png $W/eyemask.png
$S upscale.py $W/facesheet_noeyes.png $W/facesheet_noeyes_x4.png
python3 refill_eyes.py $W/facesheet_noeyes_x4.png $W/facesheet_x4.png

# 2. body atlas: upscaled, brought back to 2048, gutters and flecks cleaned
$S upscale.py $W/texture.png $W/atlas_x4.png
python3 -c "import cv2; cv2.imwrite('$W/atlas_2048.png', cv2.resize(cv2.imread('$W/atlas_x4.png'), (2048, 2048), interpolation=cv2.INTER_AREA))"
$B blender/uv_dump.py -- $W/raw.glb $W/uv_tris.npy
python3 fill_atlas.py $W/atlas_2048.png $W/uv_tris.npy $W/atlas_filled.png 2
python3 fix_flecks.py $W/atlas_filled.png $W/uv_tris.npy $W/atlas_clean.png

# 3. head: six views of the original head, then the rebuild (UVs, bake, hands, shape keys)
$B blender/head_views.py -- $W/raw.glb $W/atlas_x4.png $W/views 2048
$B blender/build.py -- $W/raw.glb $W/atlas_x4.png $W/facesheet_x4.png $W/build $W/views

# 4. glTF, then webp textures and meshopt for the web
$B blender/export.py -- $W/build/founder_v2.blend $W/atlas_clean.png $W/build/founder_head_color.png $W/normal.png $W/mr.png $W/founder_raw.glb
node optimize.mjs $W/founder_raw.glb ../../public/models/founder.glb
