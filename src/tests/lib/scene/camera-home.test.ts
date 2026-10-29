import { describe, expect, it } from "vitest"
import { CAMERA_START, CONTROLS_TARGET } from "@/constants/scene"
import { HOME_EPSILON, HOME_SNAP, homeEase, isAwayFromHome, isHomeReached } from "@/lib/scene/camera-home"

describe("camera-home", () => {
  it("considère la vue de départ comme non modifiée", () => {
    expect(isAwayFromHome(CAMERA_START, CONTROLS_TARGET)).toBe(false)
  })

  it("ignore un écart plus petit que le seuil (fin d'amorti)", () => {
    const [x, y, z] = CAMERA_START
    expect(isAwayFromHome([x + HOME_EPSILON / 2, y, z], CONTROLS_TARGET)).toBe(false)
  })

  it("repère une rotation ou un zoom", () => {
    const [x, y, z] = CAMERA_START
    expect(isAwayFromHome([x * 0.8, y * 0.8, z * 0.8], CONTROLS_TARGET)).toBe(true)
    expect(isAwayFromHome([-x, y, z], CONTROLS_TARGET)).toBe(true)
  })

  it("repère une cible déplacée", () => {
    const [x, y, z] = CONTROLS_TARGET
    expect(isAwayFromHome(CAMERA_START, [x, y + 0.5, z])).toBe(true)
  })

  it("se cale sur la vue de départ une fois assez proche", () => {
    const [x, y, z] = CAMERA_START
    expect(isHomeReached([x + HOME_SNAP / 2, y, z], CONTROLS_TARGET)).toBe(true)
    expect(isHomeReached([x + HOME_EPSILON, y, z], CONTROLS_TARGET)).toBe(false)
  })

  it("avance d'une part du chemin croissante avec le temps, jamais au-delà", () => {
    expect(homeEase(0)).toBe(0)
    expect(homeEase(1 / 60)).toBeGreaterThan(0)
    expect(homeEase(1 / 30)).toBeGreaterThan(homeEase(1 / 60))
    expect(homeEase(10)).toBeLessThanOrEqual(1)
  })
})
