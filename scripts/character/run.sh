#!/usr/bin/env bash
# Rebuild public/models/founder.glb. See README.md.
#
#   BLENDER_PY: a Python with the bpy module (pip install bpy)
#   SR_PY:      a Python with torch + spandrel, and ESRGAN_WEIGHTS pointing at
#               RealESRGAN_x4plus.pth
#   work/raw.glb, work/texture.png: the Hunyuan export (head source)
#   work/characters.blend: Ship or Die's art/characters/characters.blend (body source)
#   work/hunyuan_hand.glb: a left hand and forearm from Hunyuan 3D (hands source, see README.md)
set -euo pipefail
cd "$(dirname "$0")"
B=${BLENDER_PY:-python3}; S=${SR_PY:-python3}; W=work
export SOURCE_TEX=$W/texture.png

# 1. face sheet: frontal render of the head, eyes erased, upscaled, sockets refilled
$B blender/facesheet_render.py -- $W/raw.glb $W/texture.png $W/facesheet.png 1024
python3 erase_eyes.py $W/facesheet.png $W/facesheet_noeyes.png $W/eyemask.png
$S upscale.py $W/facesheet_noeyes.png $W/facesheet_noeyes_x4.png
python3 refill_eyes.py $W/facesheet_noeyes_x4.png $W/facesheet_x4.png

# 2. head: six views of the original head, then the rebuild (UVs, bake, shape keys)
$S upscale.py $W/texture.png $W/atlas_x4.png
$B blender/head_views.py -- $W/raw.glb $W/atlas_x4.png $W/views 2048
$B blender/build.py -- $W/raw.glb $W/atlas_x4.png $W/facesheet_x4.png $W/build $W/views

# 3. body: Ship or Die's male in demo_shirt, the head and the generated hands grafted on, fingers rigged
$B blender/sod_extract.py -- $W/characters.blend $W/male_slim.blend
$B blender/assemble.py -- $W/male_slim.blend $W/build/founder_v2.blend $W/founder_v3.blend
$B blender/build_v3.py -- $W/founder_v3.blend $W/build/founder_head_color.png $W/founder_raw.glb $W/hunyuan_hand.glb

# 4. webp textures and meshopt for the web
node optimize.mjs $W/founder_raw.glb ../../public/models/founder.glb
