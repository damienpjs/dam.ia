"""Dump the UV triangles of the mesh (first UV layer) to a .npy, in [0, 1].

python uv_dump.py -- raw.glb out.npy
"""
import os
import bpy, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load
src, out = sys.argv[sys.argv.index("--") + 1:][:2]
mesh, arm = load(src, merge=True)
me = mesh.data; me.calc_loop_triangles()
uv = me.uv_layers[0].data
tris = np.array([[uv[l].uv[:] for l in t.loops] for t in me.loop_triangles], dtype=np.float32)
verts = np.array([list(t.vertices) for t in me.loop_triangles], dtype=np.int32)
# weight of the bare-skin bones (forearms, hands, fingers) per vertex
idx = {g.index for g in mesh.vertex_groups if any(k in g.name for k in ("ForeArm", "Hand"))}
wv = np.array([sum(g.weight for g in v.groups if g.group in idx) for v in me.vertices], dtype=np.float32)
np.save(out.replace(".npy", "_skinw.npy"), wv)
np.save(out, tris); np.save(out.replace(".npy", "_verts.npy"), verts); print("tris", len(tris))
