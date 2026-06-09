"use client"

import { useEffect, useRef } from "react"

const RIBBON_COUNT = 7
const PARTICLE_COUNT = 90

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

    // Respiration avec rotation dynamique intégrée :
    // - amplitude globale qui respire (basses fréquences)
    // - décalage de phase qui évolue → la "forme" tourne lentement, de façon non-périodique
    const breathe = (time: number): number => {
      // Phase shift lent et apériodique → la rotation n'est jamais au même niveau
      const phaseShift = 0.4 * Math.sin(time * 0.07) + 0.25 * Math.sin(time * 0.031 + 1.1)
      return 0.42 + 0.3 * Math.sin(time + phaseShift) + 0.16 * Math.sin(time * 1.618 + 0.8 + phaseShift * 0.6) + 0.12 * Math.sin(time * 0.382 + 2.1 + phaseShift * 1.4)
    }

    // Rotation globale de la scène : lente, avec accélération variable
    const sceneRotation = (time: number): number => time * 0.00035 + 0.15 * Math.sin(time * 0.019) + 0.08 * Math.sin(time * 0.041 + 0.7)

    type TRibbon = {
      baseRadius: number
      angularOffset: number
      rotSpeed: number
      spanSeed: number
      colorPhase: number
      lineWidth: number
      blurRadius: number
    }

    const ribbons: TRibbon[] = Array.from({ length: RIBBON_COUNT }, (_, i) => ({
      baseRadius: 80 + i * 28 + Math.sin(i * 2.3) * 18,
      angularOffset: (i / RIBBON_COUNT) * Math.PI * 2,
      rotSpeed: 0.0008 * (i % 2 === 0 ? 1 : -1) * (1 + i * 0.15),
      spanSeed: i * 1.618,
      colorPhase: (i / RIBBON_COUNT) * Math.PI * 2,
      lineWidth: 1.5 + (i % 3) * 0.8,
      blurRadius: 8 + (i % 4) * 6,
    }))

    // --- Particules ---
    type TParticle = {
      angle: number // angle orbital courant
      radius: number // rayon orbital
      size: number // taille du point
      speed: number // vitesse angulaire
      colorPhase: number // décalage de couleur
      opacity: number // opacité de base
      // vie / clignotement
      life: number // 0..1
      lifeSpeed: number // vitesse de cycle de vie
    }

    const spawnParticle = (i: number): TParticle => ({
      angle: Math.random() * Math.PI * 2,
      radius: 40 + Math.random() * 260,
      size: 0.8 + Math.random() * 2.2,
      speed: (0.0004 + Math.random() * 0.001) * (Math.random() < 0.5 ? 1 : -1),
      colorPhase: (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 1.5,
      opacity: 0.2 + Math.random() * 0.35,
      life: Math.random(),
      lifeSpeed: 0.003 + Math.random() * 0.008,
    })

    const particles: TParticle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => spawnParticle(i))

    const draw = () => {
      if (!canvas || !ctx) return

      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2

      ctx.fillStyle = "rgba(0,0,0,0.18)"
      ctx.fillRect(0, 0, W, H)

      const beat = breathe(t)
      const globalRot = sceneRotation(t)

      // ── Rubans aurora ──────────────────────────────────────────────
      for (const ribbon of ribbons) {
        const r = ribbon.baseRadius * (0.85 + 0.15 * beat)

        const span = Math.PI * 0.6 + Math.PI * 0.35 * Math.abs(Math.sin(ribbon.spanSeed + t * 0.004)) + Math.PI * 0.15 * Math.abs(Math.sin(ribbon.spanSeed * 1.7 + t * 0.007))

        const startAngle = ribbon.angularOffset + t * ribbon.rotSpeed + globalRot

        const hue = ribbon.colorPhase + t * 0.003
        const mix = 0.5 + 0.5 * Math.sin(hue)
        const cr = Math.round(124 + (251 - 124) * mix)
        const cg = Math.round(58 + (146 - 58) * mix)
        const cb = Math.round(237 + (60 - 237) * mix)
        const alpha = (0.15 + 0.2 * beat) * 0.5

        ctx.save()
        ctx.shadowColor = `rgba(${cr},${cg},${cb},0.9)`
        ctx.shadowBlur = ribbon.blurRadius
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`
        ctx.lineWidth = ribbon.lineWidth
        ctx.lineCap = "round"

        ctx.beginPath()
        ctx.arc(cx, cy, r, startAngle, startAngle + span)
        ctx.stroke()

        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.arc(cx, cy, r * 0.97, startAngle + Math.PI, startAngle + Math.PI + span * 0.7)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.restore()
      }

      // ── Particules ─────────────────────────────────────────────────
      for (const p of particles) {
        // Avancer l'angle orbital + rotation globale
        p.angle += p.speed + globalRot * 0.012
        p.life += p.lifeSpeed
        if (p.life > 1) p.life = 0

        // Scintillement : sin sur le cycle de vie
        const flicker = Math.sin(p.life * Math.PI) // 0 → 1 → 0

        const px = cx + Math.cos(p.angle) * p.radius
        const py = cy + Math.sin(p.angle) * p.radius

        // Couleur calquée sur les rubans (même palette)
        const mix = 0.5 + 0.5 * Math.sin(p.colorPhase + t * 0.003)
        const cr = Math.round(124 + (251 - 124) * mix)
        const cg = Math.round(58 + (146 - 58) * mix)
        const cb = Math.round(237 + (60 - 237) * mix)
        const alpha = p.opacity * flicker * 0.5 // ~50% opacité globale

        ctx.save()
        ctx.shadowColor = `rgba(${cr},${cg},${cb},0.8)`
        ctx.shadowBlur = p.size * 4
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`
        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      t += 0.005
      raf = requestAnimationFrame(draw)
    }

    resize()
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    window.addEventListener("resize", resize)
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" aria-hidden="true" />
}
