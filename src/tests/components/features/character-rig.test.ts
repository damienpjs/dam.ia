import * as THREE from "three"
import { describe, expect, it } from "vitest"
import {
  CONTACT_ZONE,
  GestureAnimator,
  HeadAnimator,
  TWIST_AT_ELBOW,
  applyHandShape,
  armPenetration,
  bendWrist,
  createCharacterRig,
  handTargetWorld,
  pushOut,
  solveArm,
  touchWith,
  type ICharacterRig,
} from "@/components/features/character-rig"
import { GESTURE_POSES } from "@/lib/character/gestures"

type TArm = Parameters<typeof solveArm>[0]

/** Bras droit tendu le long de -X, comme le T-pose du rig : épaule, coude, (torsion), poignet, bout des doigts. */
function makeArm(withTwist = false) {
  const root = new THREE.Bone()
  const upper = new THREE.Bone()
  const lower = new THREE.Bone()
  const twist = withTwist ? new THREE.Bone() : null
  const hand = new THREE.Bone()
  const tip = new THREE.Bone()
  lower.position.set(-0.19, 0, 0)
  if (twist) {
    twist.position.set(-0.1, 0, 0)
    hand.position.set(-0.1, 0, 0)
  } else hand.position.set(-0.2, 0, 0)
  tip.position.set(-0.08, 0, 0)
  root.add(upper)
  upper.add(lower)
  if (twist) {
    lower.add(twist)
    twist.add(hand)
  } else lower.add(hand)
  hand.add(tip)
  root.updateMatrixWorld(true)
  const arm: TArm = { upper, lower, twist, hand, handRest: hand.quaternion.clone(), fingers: new Map() }
  return { arm, root, tip }
}

/** Angle de rotation d'un os autour de l'axe X de son parent (le long du bras). */
function rollOf(bone: THREE.Bone): number {
  const q = bone.quaternion
  return 2 * Math.atan2(q.x, q.w)
}

const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"]

/** Personnage minimal : squelette Mixamo nommé, maillage de tête, clip de forme de main, capsules. */
function makeCharacter(options: { headMaterial?: boolean; colliders?: object[] } = {}) {
  const root = new THREE.Group()
  const bone = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const b = new THREE.Bone()
    b.name = `mixamorig:${name}`
    b.position.set(x, y, z)
    parent.add(b)
    return b
  }
  const hips = bone("Hips", root, 0, 1, 0)
  const spine2 = bone("Spine2", hips, 0, 0.35, 0)
  const neck = bone("Neck", spine2, 0, 0.15, 0)
  bone("Head", neck, 0, 0.1, 0)
  for (const [side, sx] of [["Right", -1], ["Left", 1]] as const) {
    const arm = bone(`${side}Arm`, spine2, 0.15 * sx, 0.05, 0)
    const fore = bone(`${side}ForeArm`, arm, 0.25 * sx, 0, 0)
    const twist = bone(`${side}ForeArmTwist`, fore, 0.12 * sx, 0, 0)
    const hand = bone(`${side}Hand`, twist, 0.12 * sx, 0, 0)
    FINGERS.forEach((f, k) => {
      let parent: THREE.Object3D = hand
      for (let p = 1; p <= 3; p++) parent = bone(`${side}Hand${f}${p}`, parent, (p === 1 ? 0.08 : 0.03) * sx, 0, p === 1 ? 0.02 * (2 - k) : 0)
    })
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial())
  ;(mesh.material as THREE.MeshStandardMaterial).name = options.headMaterial === false ? "other" : "founder_head"
  root.add(mesh)
  const holder = new THREE.Object3D()
  holder.userData.dam_colliders = JSON.stringify(options.colliders ?? [{ bone: "mixamorig:Spine2", a: [0, -0.2, 0], b: [0, 0.2, 0], rx: 0.15, rz: 0.1 }])
  root.add(holder)
  root.updateMatrixWorld(true)
  const curl = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.2)
  const tracks = FINGERS.map((f) => new THREE.QuaternionKeyframeTrack(`mixamorigRightHand${f}2.quaternion`, [0], curl.toArray()))
  tracks.push(new THREE.QuaternionKeyframeTrack("mixamorigHips.quaternion", [0], [0, 0, 0, 1]))
  const animations = [new THREE.AnimationClip("HAND_open", 1, tracks), new THREE.AnimationClip("IDLE", 1, []), new THREE.AnimationClip("HAND_unknown", 1, tracks)]
  // les os du .glb arrivent avec des noms assainis (sans ':')
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) o.name = o.name.replace(":", "")
  })
  return { root, animations, curl }
}

/** Sauvegarde la pose de liaison de tous les os, pour jouer le rôle du mixer à chaque image. */
function restPose(root: THREE.Object3D) {
  const saved: [THREE.Bone, THREE.Quaternion][] = []
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) saved.push([o as THREE.Bone, o.quaternion.clone()])
  })
  return () => {
    for (const [b, q] of saved) b.quaternion.copy(q)
    root.updateMatrixWorld(true)
  }
}

describe("solveArm", () => {
  it("amène le poignet sur une cible à portée", () => {
    const { arm } = makeArm()
    const target = new THREE.Vector3(-0.2, -0.15, 0.15)
    solveArm(arm, target, new THREE.Vector3(-0.2, -1, -0.3), 1)
    const wrist = arm.hand.getWorldPosition(new THREE.Vector3())
    expect(wrist.distanceTo(target)).toBeLessThan(1e-3)
  })

  it("sans os de torsion, répartit la rotation de la paume entre le coude et le poignet", () => {
    const { arm } = makeArm()
    // cible dans l'axe du bras : le bras reste droit, seule la torsion agit
    solveArm(arm, new THREE.Vector3(-0.39, 0, 0), new THREE.Vector3(0, -1, 0), 1, 1.6)
    expect(rollOf(arm.lower)).toBeCloseTo(-1.6 * TWIST_AT_ELBOW, 2)
    expect(rollOf(arm.hand)).toBeCloseTo(-1.6 * (1 - TWIST_AT_ELBOW), 2)
  })

  it("avec un os de torsion, lui donne toute la rotation de la paume", () => {
    const { arm } = makeArm(true)
    solveArm(arm, new THREE.Vector3(-0.39, 0, 0), new THREE.Vector3(0, -1, 0), 1, 1.2)
    expect(rollOf(arm.twist!)).toBeCloseTo(-1.2, 2)
    expect(Math.abs(rollOf(arm.lower))).toBeLessThan(1e-3)
  })

  it("tourne la main de toute la torsion demandée, dans le prolongement de l'avant-bras", () => {
    const { arm, tip } = makeArm()
    solveArm(arm, new THREE.Vector3(-0.39, 0, 0), new THREE.Vector3(0, -1, 0), 1, Math.PI / 2)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(arm.hand.getWorldQuaternion(new THREE.Quaternion()))
    expect(Math.abs(up.y)).toBeLessThan(1e-3)
    expect(Math.abs(up.z)).toBeCloseTo(1, 3)
    const line = new THREE.Line3(arm.lower.getWorldPosition(new THREE.Vector3()), arm.hand.getWorldPosition(new THREE.Vector3()))
    const end = tip.getWorldPosition(new THREE.Vector3())
    expect(end.distanceTo(line.closestPointToPoint(end, false, new THREE.Vector3()))).toBeLessThan(1e-3)
  })

  it("ne fait rien sans poids", () => {
    const { arm } = makeArm()
    const before = arm.upper.quaternion.clone()
    solveArm(arm, new THREE.Vector3(0, -0.3, 0.2), new THREE.Vector3(0, -1, 0), 0, 1)
    expect(arm.upper.quaternion.equals(before)).toBe(true)
  })
})

describe("createCharacterRig", () => {
  it("retrouve os, torsion, phalanges, formes de main et capsules", () => {
    const { root, animations, curl } = makeCharacter()
    const rig = createCharacterRig(root, animations)!
    expect(rig).not.toBeNull()
    expect(rig.arms.right.twist?.name).toBe("mixamorigRightForeArmTwist")
    expect(rig.arms.right.fingers.size).toBe(15)
    expect(rig.arms.left.fingers.has("LeftHandThumb1")).toBe(true)
    // seules les phalanges des clips HAND_* connus sont gardées
    expect(Object.keys(rig.shapes)).toEqual(["open"])
    expect(rig.shapes.open!.get("RightHandIndex2")!.angleTo(curl)).toBeLessThan(1e-6)
    expect(rig.shapes.open!.has("Hips")).toBe(false)
    expect(rig.colliders).toHaveLength(1)
    expect(rig.colliders[0].bone).toBe(rig.bones.chest)
  })

  it("ignore les capsules d'un os absent et se passe de capsules", () => {
    const a = makeCharacter({ colliders: [{ bone: "mixamorig:Nope", a: [0, 0, 0], b: [0, 1, 0], rx: 0.1, rz: 0.1 }] })
    expect(createCharacterRig(a.root, a.animations)!.colliders).toHaveLength(0)
    const b = makeCharacter()
    b.root.traverse((o) => delete o.userData.dam_colliders)
    expect(createCharacterRig(b.root)!.colliders).toHaveLength(0)
  })

  it("refuse un modèle sans matériau de tête", () => {
    const { root } = makeCharacter({ headMaterial: false })
    expect(createCharacterRig(root)).toBeNull()
  })
})

describe("applyHandShape", () => {
  it("mélange la forme sur les phalanges selon son poids", () => {
    const { root, animations, curl } = makeCharacter()
    const rig = createCharacterRig(root, animations)!
    const bone = rig.arms.right.fingers.get("RightHandIndex2")!
    applyHandShape(rig, rig.arms.right, "open", 0.5)
    const half = bone.quaternion.angleTo(new THREE.Quaternion())
    expect(half).toBeCloseTo(0.6, 2)
    applyHandShape(rig, rig.arms.right, "open", 1)
    expect(bone.quaternion.angleTo(curl)).toBeLessThan(1e-6)
    // forme absente ou poids nul : rien ne bouge
    const before = bone.quaternion.clone()
    applyHandShape(rig, rig.arms.right, "fist", 1)
    applyHandShape(rig, rig.arms.right, "open", 0)
    expect(bone.quaternion.equals(before)).toBe(true)
  })
})

describe("bendWrist", () => {
  /** Main droite le long de -X ; l'index est du côté +Z, les doigts se replient vers +Y (la paume). */
  function curledHand() {
    const { root, animations } = makeCharacter()
    const rig = createCharacterRig(root, animations)!
    rig.arms.right.fingers.get("RightHandMiddle2")!.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.8)
    root.updateMatrixWorld(true)
    const arm = rig.arms.right
    const dir = () => arm.fingers.get("RightHandMiddle1")!.getWorldPosition(new THREE.Vector3()).sub(arm.hand.getWorldPosition(new THREE.Vector3())).normalize()
    return { root, arm, dir }
  }

  it("plie la main vers la paume, de l'angle demandé", () => {
    const { arm, dir } = curledHand()
    bendWrist(arm, "Right", 0.5, 0)
    const d = dir()
    expect(d.y).toBeCloseTo(Math.sin(0.5), 3)
    expect(Math.abs(d.z)).toBeLessThan(1e-3)
  })

  it("dévie la main vers le pouce dans le plan de la paume", () => {
    const { arm, dir } = curledHand()
    bendWrist(arm, "Right", 0, 0.3)
    const d = dir()
    expect(d.z).toBeCloseTo(Math.sin(0.3), 3)
    expect(Math.abs(d.y)).toBeLessThan(1e-3)
  })

  it("trouve la paume du bon côté et ne fait rien sans pli ou sans doigts", () => {
    const { arm, dir } = curledHand()
    // doigts repliés de l'autre côté : la flexion change de sens
    arm.fingers.get("RightHandMiddle2")!.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.8)
    arm.hand.updateMatrixWorld(true)
    bendWrist(arm, "Right", 0.5, 0)
    expect(dir().y).toBeCloseTo(-Math.sin(0.5), 3)
    const before = arm.hand.quaternion.clone()
    bendWrist(arm, "Right", 0, 0)
    bendWrist({ ...arm, fingers: new Map() }, "Right", 0.5, 0.5)
    expect(arm.hand.quaternion.equals(before)).toBe(true)
  })
})

describe("touchWith", () => {
  it("tourne la main pour poser la phalange sur son point, sans bouger le poignet", () => {
    const { root, animations } = makeCharacter()
    const rig = createCharacterRig(root, animations)!
    const arm = rig.arms.right
    const wrist = arm.hand.getWorldPosition(new THREE.Vector3())
    const bone = arm.fingers.get("RightHandIndex2")!
    const reach = bone.getWorldPosition(new THREE.Vector3()).distanceTo(wrist)
    // un point à la même distance du poignet, au-dessus, dans le repère du buste
    const chest = rig.bones.chest.getWorldPosition(new THREE.Vector3())
    const point = wrist.clone().add(new THREE.Vector3(0, reach, 0))
    const offset = point.clone().sub(chest).toArray() as [number, number, number]
    touchWith(rig, root, arm, "Right", "chest", { finger: "Index2", offset }, 1, 1)
    expect(bone.getWorldPosition(new THREE.Vector3()).distanceTo(point)).toBeLessThan(1e-3)
    expect(arm.hand.getWorldPosition(new THREE.Vector3()).distanceTo(wrist)).toBeLessThan(1e-6)
    // phalange absente ou poids nul : rien ne change
    const before = arm.hand.quaternion.clone()
    touchWith(rig, root, arm, "Right", "chest", { finger: "Index2", offset: [0, 0, 0] }, 0, 1)
    touchWith(rig, root, { ...arm, fingers: new Map() }, "Right", "chest", { finger: "Index2", offset: [0, 0, 0] }, 1, 1)
    expect(arm.hand.quaternion.equals(before)).toBe(true)
  })
})

describe("collisions", () => {
  it("sort un point d'une capsule jusqu'à sa surface, et laisse un point dehors", () => {
    const { root, animations } = makeCharacter()
    const rig = createCharacterRig(root, animations)!
    const collider = rig.colliders[0]
    const chest = rig.bones.chest.getWorldPosition(new THREE.Vector3())
    const inside = chest.clone().add(new THREE.Vector3(0, 0, 0.05))
    const push = pushOut(collider, inside, 0)!
    expect(push.z).toBeCloseTo(0.05, 4)
    expect(pushOut(collider, inside.clone().add(push).add(new THREE.Vector3(0, 0, 1e-4)), 0)).toBeNull()
    expect(pushOut(collider, chest.clone().add(new THREE.Vector3(0, 0, 0.3)), 0)).toBeNull()
    // au centre exact, on sort vers l'avant
    expect(pushOut(collider, chest, 0)!.z).toBeGreaterThan(0)
  })

  it("mesure la plus grande sortie nécessaire pour la main", () => {
    const { root, animations } = makeCharacter({ colliders: [{ bone: "mixamorig:RightHand", a: [0, -0.1, 0], b: [0, 0.1, 0], rx: 0.1, rz: 0.1 }] })
    const rig = createCharacterRig(root, animations)!
    expect(armPenetration(rig, rig.arms.right, "Right", 1)).not.toBeNull()
    expect(armPenetration(rig, rig.arms.left, "Left", 1)).toBeNull()
  })
})

describe("handTargetWorld", () => {
  it("suit le lacet du personnage pour une ancre du corps et la tête pour une ancre de tête", () => {
    const { root, animations } = makeCharacter()
    const rig = createCharacterRig(root, animations)!
    const out = new THREE.Vector3()
    const chest = rig.bones.chest.getWorldPosition(new THREE.Vector3())
    root.rotation.y = Math.PI / 2
    root.updateMatrixWorld(true)
    const chestNow = rig.bones.chest.getWorldPosition(new THREE.Vector3())
    handTargetWorld(rig, root, { anchor: "chest", offset: [0, 0, 0.3], pole: [0, -1, 0] }, undefined, 0, 1, out)
    expect(out.clone().sub(chestNow).x).toBeCloseTo(0.3, 5)
    expect(chest.y).toBeCloseTo(chestNow.y, 6)
    // tête tournée de 90° vers la gauche : la cible devant le visage passe sur le côté
    root.rotation.y = 0
    rig.bones.head.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
    root.updateMatrixWorld(true)
    const head = rig.bones.head.getWorldPosition(new THREE.Vector3())
    handTargetWorld(rig, root, { anchor: "head", offset: [0, 0, 0.1], pole: [0, -1, 0] }, [0, 0.05, 0], 1, 1, out)
    expect(out.x - head.x).toBeCloseTo(0.1, 5)
    expect(out.y - head.y).toBeCloseTo(0.05, 5)
  })
})

describe("GestureAnimator", () => {
  it("amène la main sur la cible du geste, forme de main comprise, puis rend la pose du clip", () => {
    const { root, animations } = makeCharacter({ colliders: [] })
    const rig = createCharacterRig(root, animations)!
    const reset = restPose(root)
    const gestures = new GestureAnimator()
    const target = new THREE.Vector3()
    for (let i = 0; i < 240; i++) {
      reset()
      gestures.update(rig, root, "open", 0, 1 / 60)
    }
    handTargetWorld(rig, root, GESTURE_POSES.open.right!, undefined, 0, 1, target)
    expect(rig.arms.right.hand.getWorldPosition(new THREE.Vector3()).distanceTo(target)).toBeLessThan(0.01)
    expect(rig.arms.right.fingers.get("RightHandIndex2")!.quaternion.angleTo(new THREE.Quaternion())).toBeGreaterThan(1)
    for (let i = 0; i < 300; i++) {
      reset()
      gestures.update(rig, root, "none", 0, 1 / 60)
    }
    expect(rig.arms.right.upper.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(1e-3)
  })

  it("dépasse un peu la cible puis s'y pose (pas de fondu linéaire)", () => {
    const { root, animations } = makeCharacter({ colliders: [] })
    const rig = createCharacterRig(root, animations)!
    const reset = restPose(root)
    const gestures = new GestureAnimator()
    const target = new THREE.Vector3()
    handTargetWorld(rig, root, GESTURE_POSES.talk.right!, undefined, 0, 1, target)
    const start = rig.arms.right.hand.getWorldPosition(new THREE.Vector3())
    const total = start.distanceTo(target)
    let overshoot = false
    for (let i = 0; i < 300; i++) {
      reset()
      gestures.update(rig, root, "talk", 0, 1 / 60)
      const w = rig.arms.right.hand.getWorldPosition(new THREE.Vector3())
      if (w.distanceTo(start) > total + 0.002) overshoot = true
    }
    expect(overshoot).toBe(true)
  })

  it("sort la main d'une capsule du corps pendant un geste sans contact", () => {
    const { root, animations } = makeCharacter({ colliders: [] })
    const rig = createCharacterRig(root, animations)!
    const reset = restPose(root)
    const target = new THREE.Vector3()
    handTargetWorld(rig, root, GESTURE_POSES.talk.right!, undefined, 0, 1, target)
    // une capsule posée sur la cible même, portée par le bassin
    const hips = rig.bones.hips
    const local = hips.worldToLocal(target.clone())
    rig.colliders.push({ bone: hips, a: local.clone().add(new THREE.Vector3(0, -0.05, 0)), b: local.clone().add(new THREE.Vector3(0, 0.05, 0)), rx: 0.06, rz: 0.06 })
    const gestures = new GestureAnimator()
    for (let i = 0; i < 240; i++) {
      reset()
      gestures.update(rig, root, "talk", 0, 1 / 60)
    }
    expect(rig.arms.right.hand.getWorldPosition(new THREE.Vector3()).distanceTo(target)).toBeGreaterThan(0.05)
  })
})

describe("GestureAnimator, trajectoires", () => {
  it("passe en arc devant le corps entre deux cibles", () => {
    const { root, animations } = makeCharacter({ colliders: [] })
    const rig = createCharacterRig(root, animations)!
    const reset = restPose(root)
    const gestures = new GestureAnimator()
    const start = rig.arms.right.hand.getWorldPosition(new THREE.Vector3())
    const end = handTargetWorld(rig, root, GESTURE_POSES.open.right!, undefined, 0, 1, new THREE.Vector3())
    const line = new THREE.Line3(start, end)
    let ahead = 0
    for (let i = 0; i < 120; i++) {
      reset()
      gestures.update(rig, root, "open", 0, 1 / 60)
      const w = rig.arms.right.hand.getWorldPosition(new THREE.Vector3())
      ahead = Math.max(ahead, w.z - line.closestPointToPoint(w, true, new THREE.Vector3()).z)
    }
    expect(ahead).toBeGreaterThan(0.02)
  })

  it("laisse une main de contact se poser malgré une capsule, mais l'écarte du corps en route", () => {
    const { root, animations } = makeCharacter({ colliders: [] })
    const rig = createCharacterRig(root, animations)!
    const reset = restPose(root)
    const target = handTargetWorld(rig, root, GESTURE_POSES.akimbo.right!, undefined, 0, 1, new THREE.Vector3())
    const hips = rig.bones.hips
    const local = hips.worldToLocal(target.clone())
    // capsule plus large que la zone de contact, centrée sur la cible
    const r = CONTACT_ZONE * 1.5
    rig.colliders.push({ bone: hips, a: local.clone().add(new THREE.Vector3(0, -0.02, 0)), b: local.clone().add(new THREE.Vector3(0, 0.02, 0)), rx: r, rz: r })
    const gestures = new GestureAnimator()
    let closest = Infinity
    for (let i = 0; i < 300; i++) {
      reset()
      gestures.update(rig, root, "akimbo", 0, 1 / 60)
      const d = rig.arms.right.hand.getWorldPosition(new THREE.Vector3()).distanceTo(target)
      if (i < 20) closest = Math.min(closest, d)
    }
    // en route, la capsule la tient à distance ; arrivée, la cible mesurée l'emporte
    expect(closest).toBeGreaterThan(CONTACT_ZONE)
    expect(rig.arms.right.hand.getWorldPosition(new THREE.Vector3()).distanceTo(target)).toBeLessThan(0.01)
  })

  it("plie le poignet du geste qui le demande", () => {
    const { root, animations } = makeCharacter({ colliders: [] })
    const rig = createCharacterRig(root, animations)!
    const reset = restPose(root)
    const gestures = new GestureAnimator()
    for (let i = 0; i < 240; i++) {
      reset()
      gestures.update(rig, root, "think", 0, 1 / 60)
    }
    const arm = rig.arms.right
    const fore = arm.hand.getWorldPosition(new THREE.Vector3()).sub(arm.lower.getWorldPosition(new THREE.Vector3())).normalize()
    const hand = arm.fingers.get("RightHandMiddle1")!.getWorldPosition(new THREE.Vector3()).sub(arm.hand.getWorldPosition(new THREE.Vector3())).normalize()
    const [flex, dev] = GESTURE_POSES.think.right!.wrist!
    expect(fore.angleTo(hand)).toBeGreaterThan(0.6 * Math.hypot(flex, dev))
  })
})

describe("HeadAnimator", () => {
  it("tourne la tête vers la caméra avec un temps de retard, sans rien faire quand le regard est coupé", () => {
    const { root, animations } = makeCharacter()
    const rig = createCharacterRig(root, animations)! as ICharacterRig
    const reset = restPose(root)
    const camera = new THREE.PerspectiveCamera()
    camera.position.set(2, 1.6, 2)
    const head = new HeadAnimator()
    const forward = () => new THREE.Vector3(0, 0, 1).applyQuaternion(rig.bones.head.getWorldQuaternion(new THREE.Quaternion()))
    reset()
    head.update(rig, root, camera, { yaw: 0, pitch: 0, roll: 0 }, 1, 1 / 60)
    const early = forward().x
    for (let i = 0; i < 180; i++) {
      reset()
      head.update(rig, root, camera, { yaw: 0, pitch: 0, roll: 0 }, 1, 1 / 60)
    }
    expect(forward().x).toBeGreaterThan(0.4)
    expect(early).toBeLessThan(forward().x)
    const still = new HeadAnimator()
    reset()
    still.update(rig, root, camera, { yaw: 0, pitch: 0, roll: 0 }, 0, 1 / 60)
    expect(forward().x).toBeCloseTo(0, 6)
  })
})
