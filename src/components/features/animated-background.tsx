"use client"

import { useEffect, useRef } from "react"

const PARTICLE_COUNT = 900
const ORB_COUNT = 7

// Palette pastel centrée sur #F9B288 — pêche, sable, lavande, crème, rose
const COLORS: [number, number, number][] = [
  [249, 178, 136], // #F9B288 — pêche principal
  [245, 195, 160], // pêche clair
  [235, 160, 120], // pêche soutenu
  [220, 185, 175], // sable rosé
  [195, 170, 205], // lavande douce
  [240, 210, 190], // crème chaud
  [215, 165, 175], // rose poudré
]

type TParticle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  colorIndex: number
  baseOpacity: number
  pulseSpeed: number
  pulseOffset: number
  driftPhase: number
  driftSpeed: number
}

type TOrb = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  blur: number
  color: [number, number, number]
  baseOpacity: number
  pulseSpeed: number
  pulseOffset: number
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf: number
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const W = () => canvas.width || window.innerWidth
    const H = () => canvas.height || window.innerHeight

    // Distribution gaussienne (Box-Muller) pour spawn centré
    const gaussRandom = (): number => {
      const u1 = Math.random()
      const u2 = Math.random()
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    }

    const createParticle = (): TParticle => {
      const w = W()
      const h = H()
      return {
        x: w / 2 + gaussRandom() * w * 0.15,
        y: h / 2 + gaussRandom() * h * 0.15,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: 0.3 + Math.random() * 1.1,
        colorIndex: Math.floor(Math.random() * COLORS.length),
        baseOpacity: 0.1 + Math.random() * 0.35,
        pulseSpeed: 0.004 + Math.random() * 0.012,
        pulseOffset: Math.PI * 0.3 + Math.random() * Math.PI * 0.4,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.003 + Math.random() * 0.008,
      }
    }

    const createOrb = (i: number): TOrb => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      radius: 30 + Math.random() * 40,
      blur: 80 + Math.random() * 70,
      color: COLORS[i % COLORS.length],
      baseOpacity: 0.025 + Math.random() * 0.04,
      pulseSpeed: 0.002 + Math.random() * 0.004,
      pulseOffset: Math.random() * Math.PI * 2,
    })

    const particles: TParticle[] = []
    const orbs: TOrb[] = []

    const draw = () => {
      if (!canvas || !ctx) return

      const w = canvas.width
      const h = canvas.height

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = "rgb(26, 23, 21)"
      ctx.fillRect(0, 0, w, h)

      // ── Orbes ambiantes (halos diffus) — peu nombreuses, shadow OK ──
      for (const orb of orbs) {
        orb.x += orb.vx
        orb.y += orb.vy

        if (orb.x < -orb.blur) orb.x = w + orb.blur
        if (orb.x > w + orb.blur) orb.x = -orb.blur
        if (orb.y < -orb.blur) orb.y = h + orb.blur
        if (orb.y > h + orb.blur) orb.y = -orb.blur

        const pulse = Math.sin(t * orb.pulseSpeed + orb.pulseOffset)
        const alpha = orb.baseOpacity * (0.7 + 0.3 * pulse)
        const [r, g, b] = orb.color

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius + orb.blur)
        gradient.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
        gradient.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.5})`)
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius + orb.blur, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Particules — sans shadowBlur pour la performance ──────
      // Pré-calculer les sinus de drift une seule fois par frame
      const TAU = Math.PI * 2

      for (const p of particles) {
        p.vx += (Math.random() - 0.5) * 0.04
        p.vy += (Math.random() - 0.5) * 0.04
        p.vx += Math.sin(t * p.driftSpeed + p.driftPhase) * 0.008
        p.vy += Math.cos(t * p.driftSpeed * 1.3 + p.driftPhase) * 0.008
        p.vx *= 0.995
        p.vy *= 0.995
        p.x += p.vx
        p.y += p.vy

        if (p.x < -5) p.x = w + 5
        if (p.x > w + 5) p.x = -5
        if (p.y < -5) p.y = h + 5
        if (p.y > h + 5) p.y = -5

        const pulse = Math.sin(t * p.pulseSpeed + p.pulseOffset)
        const alpha = p.baseOpacity * (0.5 + 0.5 * pulse)
        const [r, g, b] = COLORS[p.colorIndex]

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, TAU)
        ctx.fill()
      }

      t++
      raf = requestAnimationFrame(draw)
    }

    resize()

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle())
    for (let i = 0; i < ORB_COUNT; i++) orbs.push(createOrb(i))

    window.addEventListener("resize", resize)
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" aria-hidden="true" />
}
