import { describe, it, expect } from "vitest"
import * as scene from "@/constants/scene"

describe("constants/scene", () => {
  it("pointe vers le modèle .glb dans /public", () => {
    expect(scene.MODEL_PATH).toBe("/models/founder.glb")
    expect(scene.MODEL_PATH.startsWith("/")).toBe(true)
  })

  it("expose des noms de clips d'animation distincts et non vides", () => {
    expect(scene.ANIM_IDLE).toBeTruthy()
    expect(scene.ANIM_WALK).toBeTruthy()
    expect(scene.ANIM_IDLE).not.toBe(scene.ANIM_WALK)
  })

  it("normalise le personnage à une hauteur positive", () => {
    expect(scene.CHARACTER_HEIGHT).toBeGreaterThan(0)
  })

  it("définit un offset d'orientation valide (0 ou π)", () => {
    expect([0, Math.PI]).toContain(scene.MODEL_FORWARD_OFFSET)
  })

  it("paramètre la déambulation avec des valeurs strictement positives", () => {
    expect(scene.WANDER_RADIUS).toBeGreaterThan(0)
    expect(scene.WALK_SPEED).toBeGreaterThan(0)
    expect(scene.TURN_SPEED).toBeGreaterThan(0)
    expect(scene.ARRIVE_DISTANCE).toBeGreaterThan(0)
    expect(scene.FADE_S).toBeGreaterThan(0)
  })

  it("borne la durée des pauses (min < max)", () => {
    expect(scene.IDLE_MIN_S).toBeGreaterThan(0)
    expect(scene.IDLE_MAX_S).toBeGreaterThan(scene.IDLE_MIN_S)
  })

  it("expose des vecteurs caméra/contrôles à trois composantes", () => {
    expect(scene.CAMERA_START).toHaveLength(3)
    expect(scene.CONTROLS_TARGET).toHaveLength(3)
  })

  it("garde un FOV plausible et des distances d'orbite ordonnées", () => {
    expect(scene.CAMERA_FOV).toBeGreaterThan(0)
    expect(scene.CAMERA_FOV).toBeLessThan(180)
    expect(scene.MIN_DISTANCE).toBeLessThan(scene.MAX_DISTANCE)
  })

  it("contraint l'angle polaire entre 0 et π/2 (jamais sous le sol)", () => {
    expect(scene.MIN_POLAR).toBeGreaterThanOrEqual(0)
    expect(scene.MIN_POLAR).toBeLessThan(scene.MAX_POLAR)
    expect(scene.MAX_POLAR).toBeLessThanOrEqual(Math.PI / 2)
  })

  it("ordonne le brouillard (near < far)", () => {
    expect(scene.FOG_NEAR).toBeLessThan(scene.FOG_FAR)
  })

  it("configure la bulle de réplique (répliques, délais ordonnés, durée et hauteur)", () => {
    expect(scene.BUBBLE_LINES.length).toBeGreaterThan(0)
    expect(scene.BUBBLE_LINES.every((line) => line.trim().length > 0)).toBe(true)
    expect(scene.BUBBLE_DELAY_MIN).toBeGreaterThan(0)
    expect(scene.BUBBLE_DELAY_MAX).toBeGreaterThan(scene.BUBBLE_DELAY_MIN)
    expect(scene.BUBBLE_DURATION).toBeGreaterThan(0)
    expect(scene.BUBBLE_HEIGHT).toBeGreaterThan(scene.CHARACTER_HEIGHT)
  })

  it("expose des couleurs au format hexadécimal", () => {
    const hex = /^#[0-9a-fA-F]{6}$/
    for (const color of [scene.SCENE_BG, scene.GRID_CELL_COLOR, scene.GRID_SECTION_COLOR, scene.KEY_LIGHT, scene.RIM_LIGHT, scene.FILL_LIGHT, scene.CRT_GLOW]) {
      expect(color).toMatch(hex)
    }
  })
})
