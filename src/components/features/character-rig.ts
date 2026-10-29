import * as THREE from "three"
import { FACE_FRAGMENT_BODY, FACE_FRAGMENT_HEADER, FACE_VERTEX_BODY, FACE_VERTEX_HEADER, initialFaceUniforms } from "@/lib/character/face-shader"
import { FACE_MORPHS, type IHeadOffset } from "@/lib/character/moods"
import type { IFaceFrame } from "@/lib/character/face-controller"
import { GESTURE_POSES, HAND_SHAPES, type IHandTarget, type ITouch, type TAnchor, type TGesture, type THandShape, type TVec3 } from "@/lib/character/gestures"
import { SecondOrder, SPRINGS } from "@/lib/character/dynamics"

/**
 * Pont entre le personnage du .glb et la logique de visage et de gestes :
 * patch du matériau de la tête (yeux et bouche dessinés), morph targets,
 * regard caméra et gestes des bras par cinématique inverse, appliqués après
 * l'animation IDLE à chaque image.
 *
 * Conventions mesurées sur ce rig Mixamo (repère local des os) : tête,
 * X+ baisse le menton, Y+ tourne vers la droite du personnage, Z+ penche vers
 * son épaule droite. Le personnage regarde +Z, sa gauche est +X.
 */

const HEAD_MATERIAL = "founder_head"

export interface IFaceUniforms {
  faceEyeOpen: { value: THREE.Vector2 }
  faceSquint: { value: number }
  faceGaze: { value: THREE.Vector2 }
  faceMouthOpen: { value: number }
}

interface IArm {
  upper: THREE.Bone
  lower: THREE.Bone
  /** Os de torsion de l'avant-bras (jusqu'au poignet), parent de la main ; absent sur un ancien modèle. */
  twist: THREE.Bone | null
  /** Os de torsion intermédiaire (du tiers aux deux tiers de l'avant-bras), parent de `twist` ; absent sur un ancien modèle. */
  twist1: THREE.Bone | null
  hand: THREE.Bone
  /** Rotation de repos de la main : alignée sur l'avant-bras. */
  handRest: THREE.Quaternion
  /** Phalanges (pouce compris), par nom d'os sans préfixe. */
  fingers: Map<string, THREE.Bone>
}

/** Capsule elliptique dans le repère d'un os : segment le long de Y, rayons en X et Z. */
export interface ICollider {
  bone: THREE.Bone
  a: THREE.Vector3
  b: THREE.Vector3
  rx: number
  rz: number
}

export interface ICharacterRig {
  uniforms: IFaceUniforms
  morphMeshes: THREE.Mesh[]
  bones: Record<"hips" | "chest" | "neck" | "head", THREE.Bone>
  arms: { right: IArm; left: IArm }
  /** Formes de main : rotation locale de chaque phalange, par forme. */
  shapes: Partial<Record<THandShape, Map<string, THREE.Quaternion>>>
  colliders: ICollider[]
  /** Inverse de l'orientation de repos de la tête, dans le repère du modèle. */
  headRestInverse: THREE.Quaternion
}

/** Remplace les yeux peints par ceux du shader, sur le seul matériau de la tête. */
export function patchHeadMaterial(material: THREE.MeshStandardMaterial): IFaceUniforms {
  const init = initialFaceUniforms()
  const uniforms: IFaceUniforms = {
    faceEyeOpen: { value: new THREE.Vector2(...init.eyeOpen) },
    faceSquint: { value: init.squint },
    faceGaze: { value: new THREE.Vector2(...init.gaze) },
    faceMouthOpen: { value: init.mouthOpen },
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = FACE_VERTEX_HEADER + shader.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>\n${FACE_VERTEX_BODY}`)
    shader.fragmentShader = FACE_FRAGMENT_HEADER + shader.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>\n${FACE_FRAGMENT_BODY}`)
  }
  material.customProgramCacheKey = () => "dam-face"
  material.needsUpdate = true
  return uniforms
}

const FINGER = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/
const boneName = (name: string) => name.replace(/^mixamorig:?/, "")

/** Formes de main : la première image des clips HAND_*, phalanges seulement. */
function readShapes(animations: THREE.AnimationClip[]): ICharacterRig["shapes"] {
  const shapes: ICharacterRig["shapes"] = {}
  for (const clip of animations) {
    const shape = clip.name.replace(/^HAND_/, "") as THandShape
    if (!clip.name.startsWith("HAND_") || !HAND_SHAPES.includes(shape)) continue
    const map = new Map<string, THREE.Quaternion>()
    for (const track of clip.tracks) {
      const [node, property] = track.name.split(".")
      const name = boneName(node)
      if (property === "quaternion" && FINGER.test(name)) map.set(name, new THREE.Quaternion().fromArray(track.values, 0))
    }
    shapes[shape] = map
  }
  return shapes
}

/** Capsules de collision rangées par Blender dans les extras du squelette. */
function readColliders(root: THREE.Object3D, bones: Record<string, THREE.Bone>): ICollider[] {
  let raw: unknown = null
  root.traverse((object) => {
    if (raw === null && typeof object.userData?.dam_colliders === "string") raw = object.userData.dam_colliders
  })
  if (typeof raw !== "string") return []
  const list = JSON.parse(raw) as { bone: string; a: TVec3; b: TVec3; rx: number; rz: number }[]
  return list
    .filter((c) => bones[boneName(c.bone)])
    .map((c) => ({ bone: bones[boneName(c.bone)], a: new THREE.Vector3(...c.a), b: new THREE.Vector3(...c.b), rx: c.rx, rz: c.rz }))
}

/** Retrouve os, maillages à morphs, matériau de la tête, formes de main et collisions dans la scène du .glb. */
export function createCharacterRig(root: THREE.Object3D, animations: THREE.AnimationClip[] = []): ICharacterRig | null {
  const bones: Record<string, THREE.Bone> = {}
  const morphMeshes: THREE.Mesh[] = []
  let uniforms: IFaceUniforms | null = null
  root.traverse((object) => {
    if ((object as THREE.Bone).isBone) bones[boneName(object.name)] = object as THREE.Bone
    const mesh = object as THREE.Mesh
    if (mesh.isMesh) {
      if (mesh.morphTargetDictionary) morphMeshes.push(mesh)
      const material = mesh.material as THREE.MeshStandardMaterial
      if (material?.name === HEAD_MATERIAL) uniforms = patchHeadMaterial(material)
    }
  })
  const need = ["Hips", "Spine2", "Neck", "Head", "RightArm", "RightForeArm", "RightHand", "LeftArm", "LeftForeArm", "LeftHand"]
  if (!uniforms || need.some((name) => !bones[name])) return null
  const arm = (side: "Left" | "Right"): IArm => ({
    upper: bones[`${side}Arm`],
    lower: bones[`${side}ForeArm`],
    twist: bones[`${side}ForeArmTwist`] ?? null,
    twist1: bones[`${side}ForeArmTwist1`] ?? null,
    hand: bones[`${side}Hand`],
    handRest: bones[`${side}Hand`].quaternion.clone(),
    fingers: new Map(Object.entries(bones).filter(([name]) => FINGER.test(name) && name.startsWith(side))),
  })
  // orientation de repos de la tête par rapport à la racine du modèle (pose de liaison)
  const headRest = new THREE.Quaternion()
  for (let o: THREE.Object3D | null = bones.Head; o && o !== root; o = o.parent) headRest.premultiply(o.quaternion)
  return {
    uniforms,
    morphMeshes,
    bones: { hips: bones.Hips, chest: bones.Spine2, neck: bones.Neck, head: bones.Head },
    arms: { right: arm("Right"), left: arm("Left") },
    headRestInverse: headRest.invert(),
    shapes: readShapes(animations),
    colliders: readColliders(root, bones),
  }
}

const tmpQ = new THREE.Quaternion()

/** Visage : morphs, uniforms des yeux et de la bouche. */
export function applyFace(rig: ICharacterRig, frame: IFaceFrame): void {
  for (const mesh of rig.morphMeshes) {
    const dict = mesh.morphTargetDictionary!
    const influences = mesh.morphTargetInfluences!
    for (const name of FACE_MORPHS) {
      const index = dict[name]
      if (index !== undefined) influences[index] = frame.morphs[name]
    }
  }
  rig.uniforms.faceEyeOpen.value.set(frame.eyeOpen[0], frame.eyeOpen[1])
  rig.uniforms.faceSquint.value = frame.squint
  rig.uniforms.faceGaze.value.set(frame.gaze[0], frame.gaze[1])
  rig.uniforms.faceMouthOpen.value = frame.mouthOpen
}

// ---------------------------------------------------------------- rotations en monde

const qWorld = new THREE.Quaternion()
const qParent = new THREE.Quaternion()
const qDelta = new THREE.Quaternion()
const qStart = new THREE.Quaternion()

/** Applique `delta` (repère monde) à l'os, autour de sa propre origine. */
function rotateWorld(bone: THREE.Bone, delta: THREE.Quaternion, weight = 1): void {
  bone.getWorldQuaternion(qWorld)
  qWorld.premultiply(weight < 1 ? qStart.identity().slerp(delta, weight) : delta)
  bone.parent!.getWorldQuaternion(qParent)
  bone.quaternion.copy(qParent.invert().multiply(qWorld))
  bone.updateMatrixWorld(true)
}

// ---------------------------------------------------------------- pose du clip

/**
 * Pose du clip sous les corrections procédurales (tête, bras, doigts).
 *
 * Le mixer de three.js ne réécrit un os que lorsque la valeur de son clip
 * change : sur une piste constante (deux clés égales, fréquent pour la torsion
 * de l'avant-bras ou les doigts au repos), la correction de l'image précédente
 * resterait en place et la suivante s'y ajouterait, jusqu'à vriller
 * l'avant-bras. Avant les corrections, un os que le mixer n'a pas réécrit
 * reprend la pose du clip mémorisée ; après, on retient ce qui a été écrit.
 */
export class ClipPoseGuard {
  private readonly clip = new Map<THREE.Bone, THREE.Quaternion>()
  private readonly written = new Map<THREE.Bone, THREE.Quaternion>()

  /** Avant les corrections : rend leur pose de clip aux os que le mixer a laissés tels quels. */
  restore(bones: Iterable<THREE.Bone>): void {
    for (const bone of bones) {
      const written = this.written.get(bone)
      let clip = this.clip.get(bone)
      if (written && clip && bone.quaternion.equals(written)) bone.quaternion.copy(clip)
      if (!clip) this.clip.set(bone, (clip = new THREE.Quaternion()))
      clip.copy(bone.quaternion)
    }
  }

  /** Après les corrections : retient la rotation écrite sur chaque os. */
  record(bones: Iterable<THREE.Bone>): void {
    for (const bone of bones) {
      let written = this.written.get(bone)
      if (!written) this.written.set(bone, (written = new THREE.Quaternion()))
      written.copy(bone.quaternion)
    }
  }
}

// ---------------------------------------------------------------- tête

const camLocal = new THREE.Vector3()
const headWorld = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)
const axisX = new THREE.Vector3()
const axisZ = new THREE.Vector3()
const qYaw = new THREE.Quaternion()
const qPitch = new THREE.Quaternion()
const qRoll = new THREE.Quaternion()

/** Part de la rotation de la tête portée par le cou. */
const NECK_SHARE = 0.38

/**
 * Tête : regard vers la caméra (borné, partagé entre cou et tête) plus le
 * décalage d'humeur, suivis par un ressort : les yeux partent d'abord, la tête
 * rattrape. Rotations construites dans le repère du personnage (lacet autour
 * de la verticale, tangage autour de son axe gauche-droite, roulis autour de
 * son axe avant), donc indépendantes des axes locaux des os.
 */
export class HeadAnimator {
  private readonly spring = new SecondOrder(SPRINGS.head, [0, 0, 0])
  private readonly guard = new ClipPoseGuard()

  update(rig: ICharacterRig, root: THREE.Object3D, camera: THREE.Camera, offset: IHeadOffset, lookWeight: number, dt: number): void {
    const bones = [rig.bones.neck, rig.bones.head]
    this.guard.restore(bones)
    rig.bones.neck.updateMatrixWorld(true)
    rig.bones.head.getWorldPosition(headWorld)
    camLocal.copy(camera.position).sub(headWorld).applyAxisAngle(UP, -root.rotation.y)
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))
    const yawToCam = Math.atan2(camLocal.x, camLocal.z)
    const pitchToCam = Math.atan2(camLocal.y, Math.hypot(camLocal.x, camLocal.z))
    // humeur : yaw+ vers la droite du personnage, pitch+ baisse le menton, roll+ vers l'épaule droite
    const [yaw, chinDown, roll] = this.spring.update(dt, [
      clamp(yawToCam, 0.7) * lookWeight - offset.yaw,
      -clamp(pitchToCam, 0.35) * lookWeight + offset.pitch,
      offset.roll,
    ])
    axisX.set(1, 0, 0).applyAxisAngle(UP, root.rotation.y)
    axisZ.set(0, 0, 1).applyAxisAngle(UP, root.rotation.y)
    for (const [bone, share] of [[rig.bones.neck, NECK_SHARE], [rig.bones.head, 1 - NECK_SHARE]] as const) {
      qYaw.setFromAxisAngle(UP, yaw * share)
      qPitch.setFromAxisAngle(axisX, chinDown * share)
      qRoll.setFromAxisAngle(axisZ, roll * share)
      rotateWorld(bone, tmpQ.copy(qYaw).multiply(qPitch).multiply(qRoll))
    }
    this.guard.record(bones)
  }
}

// ---------------------------------------------------------------- bras (IK à deux os)

const vA = new THREE.Vector3()
const vB = new THREE.Vector3()
const vC = new THREE.Vector3()
const vT = new THREE.Vector3()
const vP = new THREE.Vector3()
const vTmp = new THREE.Vector3()
const vWanted = new THREE.Vector3()

/** Fait pivoter `bone` (en monde) pour que la direction from→to devienne from→target. */
function aimBone(bone: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3, target: THREE.Vector3, weight: number): void {
  vTmp.copy(to).sub(from).normalize()
  vWanted.copy(target).sub(from).normalize()
  qDelta.setFromUnitVectors(vTmp, vWanted)
  rotateWorld(bone, qDelta, weight)
}

/** Part de la pose du clip remplacée par la main droite pendant un geste. */
const HAND_STRAIGHTEN = 0.85

/** Sans os de torsion, part de la rotation de l'avant-bras portée par le coude, le reste par le poignet. */
export const TWIST_AT_ELBOW = 0.5

const qTwist = new THREE.Quaternion()

/** Fait tourner `bone` de `angle` autour de l'axe coude→poignet. */
function rollAboutForearm(arm: IArm, bone: THREE.Bone, angle: number): void {
  arm.lower.getWorldPosition(vB)
  arm.hand.getWorldPosition(vC)
  rotateWorld(bone, qTwist.setFromAxisAngle(vC.sub(vB).normalize(), angle))
}

/**
 * Résout un bras pour amener le poignet sur `target`, coude vers `pole`
 * (repère monde), puis oriente la paume (`twist`, rad, autour de l'avant-bras).
 * Avec deux os de torsion, elle est partagée en trois tiers entre l'avant-bras
 * (sur son axe), Twist1 et Twist ; avec un seul, il la porte toute ; sans os de
 * torsion, elle est partagée entre coude et poignet.
 */
export function solveArm(arm: IArm, target: THREE.Vector3, pole: THREE.Vector3, weight: number, twist = 0): void {
  if (weight <= 0.001) return
  arm.upper.getWorldPosition(vA)
  arm.lower.getWorldPosition(vB)
  arm.hand.getWorldPosition(vC)
  const l1 = vA.distanceTo(vB)
  const l2 = vB.distanceTo(vC)
  vT.copy(target).sub(vA)
  const dist = THREE.MathUtils.clamp(vT.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3)
  const dir = vT.normalize()
  // plan du bras : contient la cible et le pôle
  vP.copy(pole).sub(vA)
  const side = vP.sub(dir.clone().multiplyScalar(vP.dot(dir))).normalize()
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA))
  const elbow = vA.clone().add(dir.clone().multiplyScalar(cosA * l1)).add(side.multiplyScalar(sinA * l1))
  const wrist = vA.clone().add(dir.multiplyScalar(dist))
  aimBone(arm.upper, vA, vB, elbow, weight)
  arm.lower.getWorldPosition(vB)
  arm.hand.getWorldPosition(vC)
  aimBone(arm.lower, vB, vC, wrist, weight)
  if (twist && arm.twist && arm.twist1) {
    // trois pas égaux (avant-bras sur son axe, Twist1, Twist) : le skinning linéaire
    // ne pince chaque mélange que de 1 - cos(angle / 6), au lieu de 1 - cos(angle / 2)
    for (const bone of [arm.lower, arm.twist1, arm.twist]) rollAboutForearm(arm, bone, (twist * weight) / 3)
  } else if (twist && arm.twist) rollAboutForearm(arm, arm.twist, twist * weight)
  else if (twist) rollAboutForearm(arm, arm.lower, twist * weight * TWIST_AT_ELBOW)
  if (twist) {
    // l'os de torsion n'est pas exactement sur l'axe coude-poignet : sa rotation
    // décale un peu la main, qu'on ramène sur la cible
    arm.lower.getWorldPosition(vB)
    arm.hand.getWorldPosition(vC)
    aimBone(arm.lower, vB, vC, wrist, weight)
  }
  // le clip laisse pendre la main ; bras levé, elle doit prolonger l'avant-bras
  arm.hand.quaternion.slerp(arm.handRest, weight * HAND_STRAIGHTEN)
  arm.hand.updateMatrixWorld(true)
  if (twist && !arm.twist) rollAboutForearm(arm, arm.hand, twist * weight * (1 - TWIST_AT_ELBOW))
}

const vAcross = new THREE.Vector3()
const vNormal = new THREE.Vector3()
const qBend = new THREE.Quaternion()

/**
 * Plie le poignet dans le repère de la main, mesuré sur le squelette :
 * `flex` (rad) autour de l'axe index→auriculaire, positif vers la paume ;
 * `deviation` (rad) dans le plan de la paume, positif vers le pouce.
 * Indépendant des axes locaux des os, donc identique pour les deux mains.
 */
export function bendWrist(arm: IArm, side: "Left" | "Right", flex: number, deviation: number): void {
  const index = arm.fingers.get(`${side}HandIndex1`)
  const pinky = arm.fingers.get(`${side}HandPinky1`)
  const knuckle = arm.fingers.get(`${side}HandMiddle1`)
  const tip = arm.fingers.get(`${side}HandMiddle3`)
  if (!index || !pinky || !knuckle || !tip || (Math.abs(flex) < 1e-5 && Math.abs(deviation) < 1e-5)) return
  arm.lower.getWorldPosition(vB)
  arm.hand.getWorldPosition(vC)
  const along = vTmp.copy(vC).sub(vB).normalize()
  index.getWorldPosition(vAcross)
  pinky.getWorldPosition(vNormal)
  vAcross.sub(vNormal)
  vAcross.addScaledVector(along, -vAcross.dot(along)).normalize()
  // normale côté paume : les doigts s'y replient, même relâchés
  vNormal.copy(along).cross(vAcross)
  tip.getWorldPosition(vWanted)
  knuckle.getWorldPosition(vP)
  const palmSign = Math.sign(vWanted.sub(vP).dot(vNormal)) || 1
  vNormal.multiplyScalar(palmSign)
  // flexion : la direction de la main tourne de `along` vers la paume
  rotateWorld(arm.hand, qBend.setFromAxisAngle(vWanted.copy(along).cross(vNormal).normalize(), flex))
  // déviation : vers le côté du pouce (l'index)
  rotateWorld(arm.hand, qBend.setFromAxisAngle(vWanted.copy(along).cross(vAcross).normalize(), deviation))
}

/** Mélange une forme de main sur la pose courante des doigts. */
export function applyHandShape(rig: ICharacterRig, arm: IArm, shape: THandShape, weight: number): void {
  const target = rig.shapes[shape]
  if (!target || weight <= 0.001) return
  for (const [name, bone] of arm.fingers) {
    const q = target.get(name)
    if (q) bone.quaternion.slerp(q, Math.min(1, weight))
  }
}

// ---------------------------------------------------------------- collisions

const cLocal = new THREE.Vector3()
const cOnAxis = new THREE.Vector3()
const cOut = new THREE.Vector3()
const cScale = new THREE.Vector3()

/**
 * Vecteur (monde) qui sort une sphère de centre `point` et de rayon `radius`
 * de la capsule, ou null si elle n'y entre pas.
 */
export function pushOut(collider: ICollider, point: THREE.Vector3, radius: number): THREE.Vector3 | null {
  const { bone, a, b } = collider
  bone.getWorldScale(cScale)
  const r = radius / cScale.x
  cLocal.copy(point)
  bone.worldToLocal(cLocal)
  const t = THREE.MathUtils.clamp((cLocal.y - a.y) / (b.y - a.y || 1), 0, 1)
  cOnAxis.lerpVectors(a, b, t)
  const dx = cLocal.x - cOnAxis.x
  const dy = cLocal.y - cOnAxis.y
  const dz = cLocal.z - cOnAxis.z
  const rx = collider.rx + r
  const rz = collider.rz + r
  const ry = Math.min(rx, rz)
  const e = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rz) ** 2)
  if (e >= 1) return null
  // ramené sur la surface le long du rayon ; au centre exact, vers l'avant
  if (e < 1e-6) cOut.set(cOnAxis.x, cOnAxis.y, cOnAxis.z + rz)
  else cOut.set(cOnAxis.x + dx / e, cOnAxis.y + dy / e, cOnAxis.z + dz / e)
  bone.localToWorld(cOut)
  return cOut.sub(point).clone()
}

/**
 * Points de la main testés contre le corps, avec leur rayon (m, personnage de 1,70 m).
 * L'avant-bras n'en fait pas partie : le sortir d'une capsule en déplaçant la
 * cible du poignet ferait voyager la main, ce qui est pire que le contact.
 */
const PROBES: [string, number][] = [
  ["Hand", 0.028],
  ["HandMiddle1", 0.022],
  ["HandIndex3", 0.009],
  ["HandMiddle3", 0.009],
  ["HandRing3", 0.009],
  ["HandPinky3", 0.009],
  ["HandThumb3", 0.01],
]

const probeWorld = new THREE.Vector3()

/** Plus grande sortie nécessaire pour les points d'un bras, ou null. */
export function armPenetration(rig: ICharacterRig, arm: IArm, side: "Left" | "Right", scale: number): THREE.Vector3 | null {
  let worst: THREE.Vector3 | null = null
  for (const [suffix, radius] of PROBES) {
    const bone = suffix === "Hand" ? arm.hand : arm.fingers.get(`${side}${suffix}`)
    if (!bone) continue
    bone.getWorldPosition(probeWorld)
    for (const collider of rig.colliders) {
      const push = pushOut(collider, probeWorld, radius * scale)
      if (push && (!worst || push.lengthSq() > worst.lengthSq())) worst = push
    }
  }
  return worst
}

// ---------------------------------------------------------------- gestes animés

function anchorBone(rig: ICharacterRig, anchor: TAnchor): THREE.Bone {
  return anchor === "head" ? rig.bones.head : anchor === "hips" ? rig.bones.hips : rig.bones.chest
}

const anchorWorld = new THREE.Vector3()
const anchorQ = new THREE.Quaternion()

/** Point exprimé dans le repère d'une ancre (m, personnage de 1,70 m), en monde. */
function anchorPointWorld(rig: ICharacterRig, root: THREE.Object3D, anchor: TAnchor, offset: THREE.Vector3, scale: number, out: THREE.Vector3): THREE.Vector3 {
  const bone = anchorBone(rig, anchor)
  bone.getWorldPosition(anchorWorld)
  out.copy(offset).multiplyScalar(scale)
  if (anchor === "head") {
    // repère de la tête, mesuré au repos : on n'applique que sa rotation depuis le repos
    bone.getWorldQuaternion(anchorQ)
    out.applyQuaternion(anchorQ.multiply(rig.headRestInverse))
  } else out.applyAxisAngle(UP, root.rotation.y)
  return out.add(anchorWorld)
}

/** Cible d'une main en monde : ancrée sur la tête (orientation comprise) ou sur le corps (lacet du personnage). */
export function handTargetWorld(rig: ICharacterRig, root: THREE.Object3D, hand: IHandTarget, beat: TVec3 | undefined, beatAmount: number, scale: number, out: THREE.Vector3): THREE.Vector3 {
  vOffset.set(hand.offset[0], hand.offset[1], hand.offset[2])
  if (beat) vOffset.addScaledVector(vTmp.set(beat[0], beat[1], beat[2]), beatAmount)
  return anchorPointWorld(rig, root, hand.anchor, vOffset, scale, out)
}

const vOffset = new THREE.Vector3()
const touchGoal = new THREE.Vector3()
const touchFrom = new THREE.Vector3()
const touchTo = new THREE.Vector3()

/**
 * Oriente la main autour du poignet pour poser la phalange de `touch` sur son
 * point (rotation minimale) : le contact ne dépend plus de l'avant-bras.
 */
export function touchWith(rig: ICharacterRig, root: THREE.Object3D, arm: IArm, side: "Left" | "Right", anchor: TAnchor, touch: ITouch, weight: number, scale: number): void {
  const bone = arm.fingers.get(`${side}Hand${touch.finger}`)
  if (!bone || weight <= 0.001) return
  anchorPointWorld(rig, root, anchor, vOffset.set(...touch.offset), scale, touchGoal)
  arm.hand.getWorldPosition(touchFrom)
  bone.getWorldPosition(touchTo)
  aimBone(arm.hand, touchFrom, touchTo, touchGoal, weight)
}

/**
 * Arc de trajectoire : à mi-chemin d'une cible à l'autre, la main passe devant
 * le corps d'au plus cette part de la distance à parcourir. Un geste ne glisse
 * jamais en ligne droite sur la poitrine.
 */
export const ARC = 0.22
/** Distance à la cible (m) en deçà de laquelle la main s'oriente progressivement vers son point de contact. */
export const TOUCH_REACH = 0.12
/** Près d'une cible de contact (m, personnage de 1,70 m), les capsules ne repoussent plus la main. */
export const CONTACT_ZONE = 0.07

/** Pas d'inertie du poignet au-delà de cet angle (rad). */
const DRAG_MAX = 0.3
/** Inclinaison de la main par m/s de vitesse du poignet (rad). */
const DRAG_GAIN = 0.35

interface IArmState {
  pos: SecondOrder
  pole: SecondOrder
  weight: SecondOrder
  twist: SecondOrder
  wrist: SecondOrder
  shapes: Record<THandShape, SecondOrder>
  contact: boolean
  started: boolean
  /** Cible suivie, pour repérer un changement de geste. */
  aim: IHandTarget | undefined
  /** Distance à parcourir depuis le dernier changement (m). */
  span: number
  /** Cible de l'image précédente : le ressort suit le déplacement de son ancre. */
  lastGoal: THREE.Vector3
}

const clipQ = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()]
const wristClip = new THREE.Vector3()
const goal = new THREE.Vector3()
const goalPole = new THREE.Vector3()
const springTarget = new THREE.Vector3()
const springPole = new THREE.Vector3()
const vel = new THREE.Vector3()
const forearmDir = new THREE.Vector3()
const qDrag = new THREE.Quaternion()
const arcGoal = new THREE.Vector3()

/**
 * Gestes des bras, animés : chaque canal (cible du poignet, coude, poids,
 * rotation de l'avant-bras, forme de la main) suit sa consigne par un ressort
 * à son propre tempo, ce qui donne arcs, dépassement et chevauchement ; la
 * main traîne derrière le poignet quand il accélère ; le bras est enfin sorti
 * des capsules du corps, pour qu'aucun rebond ne traverse le personnage.
 */
export class GestureAnimator {
  private readonly arms: Record<"right" | "left", IArmState>
  private readonly guard = new ClipPoseGuard()

  constructor() {
    const make = (): IArmState => ({
      pos: new SecondOrder(SPRINGS.hand, [0, 0, 0]),
      pole: new SecondOrder(SPRINGS.pole, [0, -1, 0]),
      weight: new SecondOrder(SPRINGS.weight, [0]),
      twist: new SecondOrder(SPRINGS.twist, [0]),
      wrist: new SecondOrder(SPRINGS.wrist, [0, 0]),
      shapes: Object.fromEntries(HAND_SHAPES.map((s) => [s, new SecondOrder(SPRINGS.fingers, [0])])) as Record<THandShape, SecondOrder>,
      contact: false,
      started: false,
      aim: undefined,
      span: 0,
      lastGoal: new THREE.Vector3(),
    })
    this.arms = { right: make(), left: make() }
  }

  update(rig: ICharacterRig, root: THREE.Object3D, gesture: TGesture, beat: number, dt: number, scale = 1): void {
    const bones = armBones(rig)
    this.guard.restore(bones)
    rig.bones.hips.updateMatrixWorld(true)
    const pose = GESTURE_POSES[gesture]
    for (const side of ["right", "left"] as const) {
      const arm = rig.arms[side]
      const st = this.arms[side]
      const target = pose[side]
      arm.hand.getWorldPosition(wristClip)
      if (!st.started) {
        st.pos.reset(wristClip.toArray())
        st.started = true
      }
      if (target) {
        handTargetWorld(rig, root, target, pose.beat, beat, scale, goal)
        arm.upper.getWorldPosition(vA)
        goalPole.set(...target.pole).multiplyScalar(scale).applyAxisAngle(UP, root.rotation.y).add(vA)
      } else {
        goal.copy(wristClip)
        goalPole.fromArray(st.pole.y)
      }
      const contact = !!target?.contact
      if (contact !== st.contact) {
        st.pos.retune(contact ? SPRINGS.handContact : SPRINGS.hand)
        st.contact = contact
      }
      // arc : la consigne passe devant le corps, d'autant plus qu'on est loin des deux bouts
      // même geste : le ressort est porté par son ancre (tête, buste, bassin) ; la main posée
      // au menton suit la respiration et la tête sans retard, seul le changement de cible est animé
      if (target && target === st.aim) st.pos.shift(vTmp.copy(goal).sub(st.lastGoal).toArray())
      st.lastGoal.copy(goal)
      springTarget.fromArray(st.pos.y)
      if (target !== st.aim) {
        st.aim = target
        st.span = springTarget.distanceTo(goal)
      }
      const left = springTarget.distanceTo(goal)
      const progress = st.span > 1e-4 ? THREE.MathUtils.clamp(1 - left / st.span, 0, 1) : 1
      // carré du sinus : nul et plat aux deux bouts, la main se pose exactement sur sa cible
      const bulge = Math.sin(Math.PI * progress) ** 2 * ARC * st.span
      vTmp.set(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y)).multiplyScalar(bulge)
      springTarget.fromArray(st.pos.update(dt, arcGoal.copy(goal).add(vTmp).toArray()))
      springPole.fromArray(st.pole.update(dt, goalPole.toArray()))
      const weight = THREE.MathUtils.clamp(st.weight.update(dt, [target ? 1 : 0])[0], 0, 1)
      const twist = st.twist.update(dt, [target?.twist ?? 0])[0]
      const [flex, deviation] = st.wrist.update(dt, target?.wrist ?? [0, 0])
      for (const shape of HAND_SHAPES) {
        const w = THREE.MathUtils.clamp(st.shapes[shape].update(dt, [target?.hand === shape ? 1 : 0])[0], 0, 1)
        applyHandShape(rig, arm, shape, w)
      }
      if (weight <= 0.001) continue

      const chain = [arm.upper, arm.lower, arm.twist1 ?? arm.lower, arm.twist ?? arm.lower, arm.hand]
      chain.forEach((bone, i) => clipQ[i].copy(bone.quaternion))
      const sideName = side === "right" ? "Right" : "Left"
      // jusqu'à trois passes : si le bras entre dans le corps, on décale la cible d'autant
      for (let pass = 0; pass < 3; pass++) {
        if (pass > 0) {
          chain.forEach((bone, i) => bone.quaternion.copy(clipQ[i]))
          arm.upper.updateMatrixWorld(true)
        }
        solveArm(arm, springTarget, springPole, weight, twist)
        bendWrist(arm, sideName, flex * weight, deviation * weight)
        // le contact ne s'oriente qu'à l'arrivée : en route, la main suit l'avant-bras
        if (target?.touch) {
          const arrival = THREE.MathUtils.clamp(1 - springTarget.distanceTo(goal) / (TOUCH_REACH * scale), 0, 1)
          touchWith(rig, root, arm, sideName, target.anchor, target.touch, weight * arrival, scale)
        }
        // inertie : la main traîne derrière le poignet qui accélère
        vel.fromArray(st.pos.v)
        arm.lower.getWorldPosition(vB)
        arm.hand.getWorldPosition(vC)
        forearmDir.copy(vC).sub(vB).normalize()
        vTmp.copy(vel).sub(forearmDir.clone().multiplyScalar(vel.dot(forearmDir)))
        const speed = vTmp.length() / scale
        if (speed > 1e-4) {
          const angle = Math.min(DRAG_MAX, speed * DRAG_GAIN) * weight
          rotateWorld(arm.hand, qDrag.setFromAxisAngle(vTmp.normalize().cross(forearmDir).normalize(), angle))
        }
        // en route, toujours ; arrivée près d'un contact (visage, hanche) ou du clip, la cible
        // mesurée sur les vrais maillages prime : les capsules y sont trop grossières
        const arriving = springTarget.distanceTo(goal) < CONTACT_ZONE * scale
        const push = rig.colliders.length && !(arriving && (!target || target.contact)) ? armPenetration(rig, arm, sideName, scale) : null
        if (!push) break
        springTarget.add(push)
      }
    }
    this.guard.record(bones)
  }
}

const armBonesOf = new WeakMap<ICharacterRig, THREE.Bone[]>()

/** Os des deux bras que les gestes peuvent modifier : épaule à main, torsion et phalanges. */
function armBones(rig: ICharacterRig): THREE.Bone[] {
  let out = armBonesOf.get(rig)
  if (!out) {
    out = []
    for (const arm of [rig.arms.right, rig.arms.left]) {
      out.push(arm.upper, arm.lower, arm.hand, ...arm.fingers.values())
      if (arm.twist1) out.push(arm.twist1)
      if (arm.twist) out.push(arm.twist)
    }
    armBonesOf.set(rig, out)
  }
  return out
}
