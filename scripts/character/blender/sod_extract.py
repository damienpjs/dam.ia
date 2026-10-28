"""Keep only what the founder needs from Ship or Die's characters.blend: the
male rig, its stylised base body dressed in demo_shirt, and the male clips.
The full file is about 700 MB; the extract loads in a few seconds.

python sod_extract.py -- characters.blend male_slim.blend
"""
import bpy, sys

SRC, OUT = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.open_mainfile(filepath=SRC, load_ui=False)
keep = {"male.skin.demo_shirt", "male.outfit.demo_shirt", "male.headcut.demo_shirt", "male.base", "male.head.01", "rig"}
for o in list(bpy.data.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    if not a.name.startswith(("male__", "any__")):
        bpy.data.actions.remove(a)
bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
print("saved", OUT, [(i.name, tuple(i.size)) for i in bpy.data.images])
