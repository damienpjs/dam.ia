import { describe, expect, it } from "vitest"
import { MAX_DT_S, SecondOrder, SPRINGS } from "@/lib/character/dynamics"

/** Fait tourner le ressort vers `target` pendant `seconds`, renvoie la trajectoire de la première composante. */
function run(spring: SecondOrder, target: number[], seconds: number, dt = 1 / 60): number[] {
  const out: number[] = []
  for (let i = 0; i < Math.round(seconds / dt); i++) out.push(spring.update(dt, target)[0])
  return out
}

describe("SecondOrder", () => {
  it("rejoint la cible et s'y pose", () => {
    const s = new SecondOrder({ f: 1.5, zeta: 0.7, r: 0 }, [0])
    const path = run(s, [1], 4)
    expect(path.at(-1)).toBeCloseTo(1, 3)
    expect(Math.abs(s.v[0])).toBeLessThan(1e-3)
  })

  it("dépasse la cible quand il est peu amorti, jamais quand il l'est critiquement", () => {
    const soft = run(new SecondOrder({ f: 1.5, zeta: 0.5, r: 0 }, [0]), [1], 3)
    const firm = run(new SecondOrder({ f: 1.5, zeta: 1, r: 0 }, [0]), [1], 3)
    expect(Math.max(...soft)).toBeGreaterThan(1.05)
    expect(Math.max(...firm)).toBeLessThanOrEqual(1 + 1e-6)
  })

  it("anticipe (part d'abord à l'opposé) quand r est négatif", () => {
    const s = new SecondOrder({ f: 2, zeta: 0.8, r: -0.5 }, [0])
    // une consigne qui avance progressivement : le terme en vitesse tire en arrière au départ
    let min = 0
    for (let i = 0; i < 30; i++) min = Math.min(min, s.update(1 / 60, [i / 30])[0])
    expect(min).toBeLessThan(0)
  })

  it("reste stable avec un grand pas de temps et ignore un pas nul ou négatif", () => {
    const s = new SecondOrder(SPRINGS.hand, [0, 0, 0])
    const y = s.update(5, [1, 2, 3])
    expect(y.every(Number.isFinite)).toBe(true)
    // le pas est borné : au plus MAX_DT_S d'avance
    const before = [...s.y]
    expect(s.update(0, [1, 2, 3])).toEqual(before)
    expect(s.update(-1, [1, 2, 3])).toEqual(before)
    expect(MAX_DT_S).toBeLessThan(0.2)
  })

  it("repart immobile après un reset", () => {
    const s = new SecondOrder({ f: 1, zeta: 0.5, r: 0 }, [0])
    run(s, [1], 0.5)
    s.reset([3])
    expect(s.y[0]).toBe(3)
    expect(s.v[0]).toBe(0)
    expect(s.update(1 / 60, [3])[0]).toBeCloseTo(3, 6)
  })

  it("change de tempo sans perdre sa position", () => {
    const s = new SecondOrder({ f: 0.5, zeta: 1, r: 0 }, [0])
    run(s, [1], 0.3)
    const at = s.y[0]
    s.retune({ f: 3, zeta: 1, r: 0 })
    expect(s.y[0]).toBe(at)
    run(s, [1], 1.5)
    expect(s.y[0]).toBeCloseTo(1, 3)
  })

  it("donne un tempo à chaque partie du corps, les doigts plus lents que le poignet", () => {
    for (const p of Object.values(SPRINGS)) {
      expect(p.f).toBeGreaterThan(0)
      expect(p.zeta).toBeGreaterThan(0)
    }
    expect(SPRINGS.fingers.f).toBeLessThan(SPRINGS.hand.f)
    expect(SPRINGS.handContact.zeta).toBeGreaterThanOrEqual(1)
  })
})
