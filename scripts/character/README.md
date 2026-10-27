# Character pipeline

Rebuilds `public/models/founder.glb` from the Hunyuan 3D export (mesh, Mixamo
rig, `IDLE` and `WALKING` clips, one 1024 px atlas). Run `./run.sh` with the
export in `work/` (ignored by git); each step reads the previous one's files.

| Step | Script | Why |
| --- | --- | --- |
| Face sheet | `blender/facesheet_render.py`, `erase_eyes.py`, `upscale.py`, `refill_eyes.py` | A frontal, unlit render of the head, painted eyes removed (the shader draws them), upscaled ×4 with Real-ESRGAN, sockets refilled with the surrounding skin |
| Body atlas | `upscale.py`, `blender/uv_dump.py`, `fill_atlas.py`, `fix_flecks.py` | Same UV layout, sharper texels; gutters filled so filtering never reaches black, and skin triangles mapped onto the wrong colour repainted |
| Head views | `blender/head_views.py` | Six orthographic renders of the original head and neck skin: the colour source of the head bake |
| Rebuild | `blender/build.py`, `blender/hands.py` | Hands straightened and wrist weights redone; head and neck on their own material and texture, baked from the views (weights `max(0, n·d)^6`, ray-cast visibility); second UV set for the face shader; 10 shape keys for brows, mouth, jaw |
| Export | `blender/export.py`, `optimize.mjs` | glTF with `TEXCOORD_1` and sparse morph targets, webp textures, meshopt |

Tools: a Python with `bpy` (`pip install bpy`, Blender 5.x), one with `torch`
and `spandrel` plus `RealESRGAN_x4plus.pth`, OpenCV and NumPy, and for
`optimize.mjs` the packages `@gltf-transform/core`, `@gltf-transform/extensions`,
`@gltf-transform/functions`, `meshoptimizer` and `sharp`
(`npm i --no-save …`, not app dependencies).

Contract with the site: material names `founder_body` / `founder_head`,
`TEXCOORD_1` = face-sheet coordinates (see
`src/lib/character/face-shader.ts`), morph target names = `FACE_MORPHS` in
`src/lib/character/moods.ts`, bones `mixamorig:*`.
