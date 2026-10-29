# Character pipeline

Builds `public/models/founder.glb` in two parts, both driven by `./run.sh`
(inputs in `work/`, ignored by git; each step reads the previous one's files):

1. **Head**, from the Hunyuan 3D export (mesh, Mixamo rig, one 1024 px atlas).
   Only its head and neck survive: the generated body had webbed fingers, a
   lump at each wrist and a shirt stretched across the back.
2. **Body**, from Ship or Die's `art/characters/characters.blend`: the
   stylised male base dressed in `demo_shirt`, its rig and its `IDLE` and
   `WALKING` clips, with the head and a generated pair of hands grafted on,
   finger and forearm twist bones added.

| Step | Script | Why |
| --- | --- | --- |
| Face sheet | `blender/facesheet_render.py`, `erase_eyes.py`, `upscale.py`, `refill_eyes.py` | A frontal, unlit render of the head, painted eyes removed (the shader draws them), upscaled ×4 with Real-ESRGAN, sockets refilled with the surrounding skin |
| Head views | `upscale.py`, `blender/head_views.py` | Six orthographic renders of the original head and neck skin: the colour source of the head bake |
| Head build | `blender/build.py`, `blender/hands.py` | Head and neck on their own material and texture, baked from the views (weights `max(0, n·d)^6`, ray-cast visibility); second UV set for the face shader; 10 shape keys for brows, mouth, jaw |
| Ship or Die extract | `blender/sod_extract.py` | Rig, `male.base` dressed in `demo_shirt`, male clips; drops the other 650 MB of `characters.blend` |
| Assembly | `blender/assemble.py` | The founder head moved onto the Ship or Die neck (offset between the two `Head` bones), skin weights copied from the game's own head, the game's head removed |
| Generated hands | `blender/hand_graft.py` | The game's hands (eight-sided fingers, a stubby T-pose thumb) replaced by a hand generated on its own: Gemini reference sheet (palm, back, both profiles, fingers spread), Hunyuan 3D multi-view at 500k faces. Welded with voxels, QuadriFlow quads (about 4,000), colour baked, set to the head's skin tone with only its own shading kept, mirrored for the right hand. Grafted 6 cm above the wrist: three intermediate rings and a zipper of triangles to the body's ring, lofted, the band textured from a small gradient patch |
| Body build | `blender/build_v3.py`, `blender/fingers.py` | Finger chains on each finger's centre line (slices of the free finger, root pushed into the palm), 4 Mixamo bones per finger, bone-heat weights per hand. A forearm twist bone carries the palm's turn from elbow to wrist. Clips: hand twist moved onto it, wrist bend eased, fingers relaxed. One-frame `HAND_*` clips (open, talk, fist, chin, hip) for the gestures |
| Body checks | `blender/collide.py`, `blender/cloth.py`, `blender/watch.py`, `blender/colliders.py` | Arms swung out frame by frame until the hands clear the trousers; outfit weights taken from the torso and upper-arm skin underneath (never the forearm: a shirt panel that followed the hanging forearm left the waist when the arm rose); bare feet removed inside the shoes; each upper arm cut square inside its sleeve and extended as a clean tube; the V tears of the sleeve hems sewn shut; a modelled watch in place of the torn strap; elliptic capsules per body bone for the site's runtime hand push-out (glTF extras) |
| Export | `optimize.mjs` | webp textures at 2048 px, meshopt, sparse morph targets |

Tools: a Python with `bpy` (`pip install bpy`, Blender 5.x), one with `torch`
and `spandrel` plus `RealESRGAN_x4plus.pth`, OpenCV and NumPy, and for
`optimize.mjs` the packages `@gltf-transform/core`, `@gltf-transform/extensions`,
`@gltf-transform/functions`, `meshoptimizer` and `sharp`
(`npm i --no-save …`, not app dependencies).

Contract with the site: material names `founder_body`, `founder_hands`,
`founder_outfit` and `founder_head`, `TEXCOORD_1` = face-sheet coordinates (see
`src/lib/character/face-shader.ts`), morph target names = `FACE_MORPHS` in
`src/lib/character/moods.ts`, bones `mixamorig:*` (fingers and forearm twist
included), hand shape clips `HAND_*` = `HAND_SHAPES` in
`src/lib/character/gestures.ts`, capsules in the armature's `dam_colliders` extra.

The generated inputs (`work/hunyuan_hand.glb`, 35 MB, and its Gemini sheet) are
kept out of git like the rest of `work/`.

To compare hand shapes without one build per try, `DAM_SHAPE_VARIANTS` takes
extra shapes as JSON (`{"chinB": {"curl": {...}, "gather": 0.9, "thumb": [...]}}`)
and adds them as `HAND_*` clips. The site ignores clips it does not know, so a
model built this way is only for comparison, never for `public/models/`.
