"""Keep the hands out of the body in the baked clips."""
import bpy, math
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

ARM = ("Shoulder", "Arm", "ForeArm", "Hand")


def _dominant(obj):
    names = [g.name for g in obj.vertex_groups]
    out = []
    for v in obj.data.vertices:
        best = max(v.groups, key=lambda e: e.weight, default=None)
        out.append(names[best.group].replace("mixamorig:", "") if best else "")
    return out


def _is_arm(n):
    return n.startswith(("Left", "Right")) and any(n[len("Left" if n.startswith("Left") else "Right"):].startswith(a) for a in ARM)


def clear_hands(rig, skin, outfit, actions, clearance=0.004, step=1.5, limit=24.0, every=2, report=print):
    """Swing each arm out at the shoulder, frame by frame, until its hand and
    forearm clear the trousers and the shirt by `clearance`.

    The game's clips rest the hands on the thighs; once the wrists are eased
    and the hands subdivided, fingers sink a few centimetres into the
    trousers. The swing is measured on the skinned meshes themselves, then
    spread over time (running max, then a gaussian) so it never pops."""
    dg = bpy.context.evaluated_depsgraph_get()
    s_dom, o_dom = _dominant(skin), _dominant(outfit)
    keep_faces = [i for i, p in enumerate(outfit.data.polygons) if not any(_is_arm(o_dom[v]) for v in p.vertices)]
    probes = {side: [i for i, n in enumerate(s_dom) if n.startswith(side) and n[len(side):].startswith(("Hand", "ForeArm"))] for side in ("Left", "Right")}
    scene = bpy.context.scene
    for act in actions:
        rig.animation_data.action = act
        if act.slots: rig.animation_data.action_slot = act.slots[0]
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        frames = list(range(f0, f1 + 1, every)) + ([f1] if (f1 - f0) % every else [])
        need = {s: {} for s in probes}
        for fr in frames:
            scene.frame_set(fr)
            dg.update()
            oe = outfit.evaluated_get(dg); om = oe.to_mesh()
            ow = outfit.matrix_world
            verts = [ow @ v.co for v in om.vertices]
            polys = [om.polygons[i].vertices[:] for i in keep_faces]
            oe.to_mesh_clear()
            bvh = BVHTree.FromPolygons(verts, polys)
            for side, idx in probes.items():
                pb = rig.pose.bones[f"mixamorig:{side}Arm"]
                base = pb.matrix_basis.copy()
                theta = 0.0
                while True:
                    _swing(rig, pb, base, side, theta)
                    dg.update()
                    se = skin.evaluated_get(dg); sm = se.to_mesh(); sw = skin.matrix_world
                    bad = 0
                    for i in idx:
                        p = sw @ sm.vertices[i].co
                        hit, n, fi, d = bvh.find_nearest(p, 0.05)
                        if hit is not None and (p - hit).dot(n) < clearance:
                            bad += 1
                    se.to_mesh_clear()
                    if not bad or theta >= limit:
                        break
                    theta += step
                need[side][fr] = theta
                pb.matrix_basis = base
        # spread over time and key
        for side in probes:
            xs = np.array(frames, float); ys = np.array([need[side][f] for f in frames])
            full = np.arange(f0, f1 + 1)
            y = np.interp(full, xs, ys)
            y = np.array([y[max(0, k - 6):k + 7].max() for k in range(len(y))])      # running max
            k = np.exp(-0.5 * (np.arange(-12, 13) / 4.0) ** 2); k /= k.sum()
            y = np.convolve(np.pad(y, 12, mode="edge"), k, mode="valid")
            pb = rig.pose.bones[f"mixamorig:{side}Arm"]
            keys = []
            for fr, th in zip(full, y):
                scene.frame_set(int(fr))
                base = pb.matrix_basis.copy()
                _swing(rig, pb, base, side, float(th))
                keys.append((int(fr), pb.rotation_quaternion.copy()))
                pb.matrix_basis = base
            for fr, q in keys:
                pb.rotation_quaternion = q
                pb.keyframe_insert("rotation_quaternion", frame=fr, group=pb.name)
            report(f"{act.name} {side}: arm swung out up to {y.max():.1f} deg (mean {y.mean():.1f})")


def _swing(rig, pb, base, side, theta):
    """Rotate the arm about the forward axis at the shoulder (outwards for +theta)."""
    pb.matrix_basis = base
    bpy.context.view_layer.update()
    if not theta:
        return
    a = math.radians(theta) * (-1 if side == "Left" else 1)
    head = pb.matrix.translation.copy()
    # the forward axis in armature space (the Mixamo rig object is rotated and scaled)
    axis = (rig.matrix_world.to_3x3().inverted() @ Vector((0, 1, 0))).normalized()
    r = Matrix.Translation(head) @ Matrix.Rotation(a, 4, axis) @ Matrix.Translation(-head)
    pb.matrix = r @ pb.matrix
    bpy.context.view_layer.update()
