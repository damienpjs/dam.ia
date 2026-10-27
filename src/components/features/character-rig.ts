import * as THREE from "three"
import { FACE_FRAGMENT_BODY, FACE_FRAGMENT_HEADER, FACE_VERTEX_BODY, FACE_VERTEX_HEADER, initialFaceUniforms } from "@/lib/character/face-shader"
import { FACE_MORPHS, type IHeadOffset } from "@/lib/character/moods"
import type { IFaceFrame } from "@/lib/character/face-controller"
import { GESTURE_POSES, type IHandTarget, type TAnchor, type TGesture, type TVec3 } from "@/lib/character/gestures"

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
  hand: THREE.Bone
  /** Rotation de repos de la main : alignée sur l'avant-bras depuis le maillage redressé. */
  handRest: THREE.Quaternion
}

export interface ICharacterRig {
  uniforms: IFaceUniforms
  morphMeshes: THREE.Mesh[]
  bones: Record<"hips" | "chest" | "neck" | "head", THREE.Bone>
  arms: { right: IArm; left: IArm }
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

/** Retrouve os, maillages à morphs et matériau de la tête dans la scène du .glb. */
export function createCharacterRig(root: THREE.Object3D): ICharacterRig | null {
  const bones: Record<string, THREE.Bone> = {}
  const morphMeshes: THREE.Mesh[] = []
  let uniforms: IFaceUniforms | null = null
  root.traverse((object) => {
    if ((object as THREE.Bone).isBone) bones[object.name.replace(/^mixamorig:?/, "")] = object as THREE.Bone
    const mesh = object as THREE.Mesh
    if (mesh.isMesh) {
      if (mesh.morphTargetDictionary) morphMeshes.push(mesh)
      const material = mesh.material as THREE.MeshStandardMaterial
      if (material?.name === HEAD_MATERIAL) uniforms = patchHeadMaterial(material)
    }
  })
  const need = ["Hips", "Spine2", "Neck", "Head", "RightArm", "RightForeArm", "RightHand", "LeftArm", "LeftForeArm", "LeftHand"]
  if (!uniforms || need.some((name) => !bones[name])) return null
  return {
    uniforms,
    morphMeshes,
    bones: { hips: bones.Hips, chest: bones.Spine2, neck: bones.Neck, head: bones.Head },
    arms: {
      right: { upper: bones.RightArm, lower: bones.RightForeArm, hand: bones.RightHand, handRest: bones.RightHand.quaternion.clone() },
      left: { upper: bones.LeftArm, lower: bones.LeftForeArm, hand: bones.LeftHand, handRest: bones.LeftHand.quaternion.clone() },
    },
  }
}

const tmpQ = new THREE.Quaternion()
const tmpE = new THREE.Euler()

/** Rotation additive d'un os, dans son repère local, après l'animation. */
function addRotation(bone: THREE.Bone, x: number, y: number, z: number): void {
  tmpQ.setFromEuler(tmpE.set(x, y, z, "XYZ"))
  bone.quaternion.multiply(tmpQ)
}

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

const camLocal = new THREE.Vector3()
const headWorld = new THREE.Vector3()

/**
 * Tête : regard vers la caméra (bornée, partagée entre cou et tête) plus le
 * décalage d'humeur. `lookWeight` à 0 laisse l'animation seule.
 */
export function applyHead(rig: ICharacterRig, root: THREE.Object3D, camera: THREE.Camera, offset: IHeadOffset, lookWeight: number): void {
  rig.bones.head.getWorldPosition(headWorld)
  camLocal.copy(camera.position).sub(headWorld)
  // dans le repère du personnage (lacet seulement)
  camLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), -root.rotation.y)
  const yawToCam = Math.atan2(camLocal.x, camLocal.z)
  const pitchToCam = Math.atan2(camLocal.y, Math.hypot(camLocal.x, camLocal.z))
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))
  // Y+ tourne vers la droite du personnage (−X) ; X+ baisse le menton
  const yaw = -clamp(yawToCam, 0.7) * lookWeight + offset.yaw
  const pitch = -clamp(pitchToCam, 0.35) * lookWeight + offset.pitch
  addRotation(rig.bones.neck, pitch * 0.35, yaw * 0.4, offset.roll * 0.3)
  addRotation(rig.bones.head, pitch * 0.65, yaw * 0.6, offset.roll * 0.7)
}

// ---------------------------------------------------------------- bras (IK à deux os)

const vA = new THREE.Vector3()
const vB = new THREE.Vector3()
const vC = new THREE.Vector3()
const vT = new THREE.Vector3()
const vP = new THREE.Vector3()
const vTmp = new THREE.Vector3()
const qWorld = new THREE.Quaternion()
const qParent = new THREE.Quaternion()
const qDelta = new THREE.Quaternion()
const qStart = new THREE.Quaternion()

/** Fait pivoter `bone` (en monde) pour que la direction from→to devienne from→target. */
function aimBone(bone: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3, target: THREE.Vector3, weight: number): void {
  const current = vTmp.copy(to).sub(from).normalize()
  const wanted = new THREE.Vector3().copy(target).sub(from).normalize()
  qDelta.setFromUnitVectors(current, wanted)
  bone.getWorldQuaternion(qWorld)
  qWorld.premultiply(qDelta)
  bone.parent!.getWorldQuaternion(qParent)
  qStart.copy(bone.quaternion)
  bone.quaternion.copy(qParent.invert().multiply(qWorld))
  if (weight < 1) bone.quaternion.copy(qStart.slerp(bone.quaternion, weight))
  bone.updateMatrixWorld(true)
}

/** Part du poignet de l'IDLE remplacée par la main droite pendant un geste. */
const HAND_STRAIGHTEN = 0.85

/** Résout un bras pour amener le poignet sur `target`, coude vers `pole` (repère monde). */
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
  if (twist) {
    // rotation de l'avant-bras autour de son propre axe : oriente la paume
    arm.lower.getWorldPosition(vB)
    arm.hand.getWorldPosition(vC)
    qDelta.setFromAxisAngle(vC.sub(vB).normalize(), twist * weight)
    arm.lower.getWorldQuaternion(qWorld)
    qWorld.premultiply(qDelta)
    arm.lower.parent!.getWorldQuaternion(qParent)
    arm.lower.quaternion.copy(qParent.invert().multiply(qWorld))
    arm.lower.updateMatrixWorld(true)
  }
  // l'IDLE laisse pendre la main ; bras levé, elle doit prolonger l'avant-bras
  arm.hand.quaternion.slerp(arm.handRest, weight * HAND_STRAIGHTEN)
  arm.hand.updateMatrixWorld(true)
}

const anchorWorld = new THREE.Vector3()
const targetWorld = new THREE.Vector3()
const poleWorld = new THREE.Vector3()

function toWorld(root: THREE.Object3D, base: THREE.Vector3, local: TVec3, scale: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(local[0], local[1], local[2]).multiplyScalar(scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), root.rotation.y).add(base)
}

/**
 * Gestes : chaque bras va vers sa cible avec son poids (fondu), le battement
 * de parole déplace la main. `heightScale` convertit les mètres du repère
 * (personnage de 1,70 m) en unités de la scène.
 */
export function applyGestures(rig: ICharacterRig, root: THREE.Object3D, weights: Partial<Record<TGesture, number>>, beat: number, heightScale = 1): void {
  rig.bones.hips.updateMatrixWorld(true)
  for (const side of ["right", "left"] as const) {
    let total = 0
    let twist = 0
    const wanted = new THREE.Vector3()
    const pole = new THREE.Vector3()
    for (const [gesture, weight] of Object.entries(weights) as [TGesture, number][]) {
      const pose = GESTURE_POSES[gesture]
      const hand: IHandTarget | undefined = pose[side]
      if (!hand || weight <= 0.001) continue
      anchorBone(rig, hand.anchor).getWorldPosition(anchorWorld)
      const offset: TVec3 = [...hand.offset]
      if (pose.beat) for (let i = 0; i < 3; i++) offset[i] += pose.beat[i] * beat
      toWorld(root, anchorWorld, offset, heightScale, targetWorld)
      rig.arms[side].upper.getWorldPosition(vA)
      toWorld(root, vA, hand.pole, heightScale, poleWorld)
      wanted.addScaledVector(targetWorld, weight)
      pole.addScaledVector(poleWorld, weight)
      twist += (hand.twist ?? 0) * weight
      total += weight
    }
    if (total <= 0.001) continue
    wanted.divideScalar(total)
    pole.divideScalar(total)
    solveArm(rig.arms[side], wanted, pole, Math.min(1, total), twist / total)
  }
}

function anchorBone(rig: ICharacterRig, anchor: TAnchor): THREE.Bone {
  return anchor === "head" ? rig.bones.head : anchor === "hips" ? rig.bones.hips : rig.bones.chest
}
