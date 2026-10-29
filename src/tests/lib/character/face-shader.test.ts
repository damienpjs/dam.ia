import { describe, expect, it } from "vitest"
import {
  EYES,
  FACE_FRAGMENT_BODY,
  FACE_FRAGMENT_HEADER,
  FACE_VERTEX_BODY,
  FACE_VERTEX_HEADER,
  IRIS_COLOR_INNER,
  IRIS_COLOR_OUTER,
  MOUTH,
  initialFaceUniforms,
} from "@/lib/character/face-shader"

describe("face-shader", () => {
  it("place les yeux en miroir de part et d'autre du visage, à la même hauteur", () => {
    expect(EYES.left.center[1]).toBe(EYES.right.center[1])
    expect(EYES.left.center[0]).toBeGreaterThan(0.5)
    expect(EYES.right.center[0]).toBeLessThan(0.5)
    expect(EYES.left.center[0] - 0.5).toBeCloseTo(0.5 - EYES.right.center[0], 1)
  })

  it("met la bouche sous les yeux, au centre", () => {
    expect(MOUTH.center[0]).toBe(0.5)
    expect(MOUTH.center[1]).toBeLessThan(EYES.left.center[1])
  })

  it("garde un iris brun foncé, plus sombre au centre", () => {
    const sum = (c: number[]) => c.reduce((a, b) => a + b, 0)
    expect(sum(IRIS_COLOR_INNER)).toBeLessThan(sum(IRIS_COLOR_OUTER))
    expect(IRIS_COLOR_OUTER[0]).toBeGreaterThan(IRIS_COLOR_OUTER[2])
  })

  it("déclare les uniforms pilotés par la scène", () => {
    for (const name of ["faceEyeOpen", "faceSquint", "faceGaze", "faceMouthOpen"]) {
      expect(FACE_FRAGMENT_HEADER).toContain(`uniform`)
      expect(FACE_FRAGMENT_HEADER).toContain(name)
    }
  })

  it("dessine les deux yeux et la bouche, uniquement dans la feuille de visage", () => {
    expect(FACE_FRAGMENT_BODY.match(/faceEye\(/g)).toHaveLength(2)
    expect(FACE_FRAGMENT_BODY).toContain("faceMouth(")
    expect(FACE_FRAGMENT_BODY).toContain("abs(vFaceUv.x - 0.5) < 0.6")
    // une face dont les coordonnées sautent ne dessine rien
    expect(FACE_FRAGMENT_BODY).toContain("faceAa < 0.02")
    expect(FACE_FRAGMENT_BODY).not.toMatch(/NaN|undefined/)
  })

  it("lit le second jeu d'UV en retournant l'axe v du glTF", () => {
    expect(FACE_VERTEX_HEADER).toContain("attribute vec2 uv1")
    expect(FACE_VERTEX_BODY).toContain("1.0 - uv1.y")
  })

  it("démarre yeux au repos et bouche fermée", () => {
    const u = initialFaceUniforms()
    expect(u.eyeOpen[0]).toBeGreaterThan(0.5)
    expect(u.eyeOpen).toEqual([u.eyeOpen[0], u.eyeOpen[0]])
    expect(u.mouthOpen).toBe(0)
    expect(u.gaze).toEqual([0, 0])
  })
})
