"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, ContactShadows, Grid, Html, useAnimations, useGLTF } from "@react-three/drei"
import { EffectComposer, Glitch, ToneMapping } from "@react-three/postprocessing"
import { GlitchMode, ToneMappingMode } from "postprocessing"
import * as THREE from "three"
import {
  MODEL_PATH,
  ANIM_IDLE,
  ANIM_WALK,
  CHARACTER_HEIGHT,
  MODEL_FORWARD_OFFSET,
  WANDER_RADIUS,
  WALK_SPEED,
  TURN_SPEED,
  ARRIVE_DISTANCE,
  IDLE_MIN_S,
  IDLE_MAX_S,
  FADE_S,
  CAMERA_START,
  CAMERA_FOV,
  CONTROLS_TARGET,
  MIN_DISTANCE,
  MAX_DISTANCE,
  MIN_POLAR,
  MAX_POLAR,
  SCENE_BG,
  FOG_NEAR,
  FOG_FAR,
  GRID_CELL_COLOR,
  GRID_SECTION_COLOR,
  KEY_LIGHT,
  RIM_LIGHT,
  FILL_LIGHT,
  CRT_GLOW,
  GLITCH_DELAY_MIN,
  GLITCH_DELAY_MAX,
  GLITCH_DURATION_MIN,
  GLITCH_DURATION_MAX,
  GLITCH_STRENGTH_MIN,
  GLITCH_STRENGTH_MAX,
  GLITCH_CHROMATIC_OFFSET,
  BUBBLE_LINES,
  BUBBLE_DELAY_MIN,
  BUBBLE_DELAY_MAX,
  BUBBLE_DURATION,
  BUBBLE_HEIGHT,
} from "@/constants/scene"
import { cn } from "@/lib/utils"

type TWanderMode = "idle" | "walk"

interface IWanderState {
  mode: TWanderMode
  timer: number
  target: THREE.Vector3
}

const randRange = (min: number, max: number) => min + Math.random() * (max - min)

/** Interpolation d'angle qui prend le plus court chemin (gère le wrap ±π). */
function lerpAngle(current: number, target: number, t: number): number {
  let delta = (target - current) % (Math.PI * 2)
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return current + delta * Math.min(1, t)
}

/**
 * Personnage qui déambule. Le groupe racine sert à la fois de cible au mixer
 * d'animation et de support au déplacement (translation/rotation sur le sol).
 * Le modèle est normalisé (centré, pieds sur y=0, mis à l'échelle) une seule fois.
 */
function Character({ bubblesEnabled }: { bubblesEnabled: boolean }) {
  const root = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF(MODEL_PATH)
  const { actions } = useAnimations(animations, root)
  const currentAction = useRef<THREE.AnimationAction | null>(null)

  // Normalisation du modèle : on calcule l'échelle et l'offset pour centrer le
  // personnage en (0,0) avec les pieds posés sur le sol.
  const { offset, scale } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const s = size.y > 0 ? CHARACTER_HEIGHT / size.y : 1
    return {
      scale: s,
      offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s),
    }
  }, [scene])

  const playAction = useCallback(
    (name: string) => {
      const next = actions[name]
      if (!next || next === currentAction.current) return
      next.reset().fadeIn(FADE_S).play()
      currentAction.current?.fadeOut(FADE_S)
      currentAction.current = next
    },
    [actions],
  )

  const state = useRef<IWanderState>({
    mode: "idle",
    timer: randRange(IDLE_MIN_S, IDLE_MAX_S),
    target: new THREE.Vector3(),
  })

  // Bulle de réplique : apparaît/disparaît sporadiquement au-dessus du
  // personnage. Le timer et l'état « visible » vivent dans des refs (mis à jour
  // chaque frame) ; seules les transitions montrer/masquer déclenchent un
  // re-render React. À chaque apparition, une réplique est tirée au hasard.
  const [bubble, setBubble] = useState<{ visible: boolean; text: string }>({ visible: false, text: BUBBLE_LINES[0] })
  const bubbleVisible = useRef(false)
  const bubbleTimer = useRef(randRange(BUBBLE_DELAY_MIN, BUBBLE_DELAY_MAX))

  useEffect(() => {
    playAction(ANIM_IDLE)
  }, [playAction])

  useFrame((_, dt) => {
    const g = root.current
    if (!g) return
    const s = state.current

    if (!bubblesEnabled) {
      // Conversation ouverte : on masque la bulle et on gèle son timer.
      if (bubbleVisible.current) {
        bubbleVisible.current = false
        bubbleTimer.current = randRange(BUBBLE_DELAY_MIN, BUBBLE_DELAY_MAX)
        setBubble((prev) => ({ ...prev, visible: false }))
      }
    } else {
      bubbleTimer.current -= dt
      if (bubbleTimer.current <= 0) {
        if (bubbleVisible.current) {
          bubbleVisible.current = false
          bubbleTimer.current = randRange(BUBBLE_DELAY_MIN, BUBBLE_DELAY_MAX)
          setBubble((prev) => ({ ...prev, visible: false }))
        } else {
          bubbleVisible.current = true
          bubbleTimer.current = BUBBLE_DURATION
          setBubble({ visible: true, text: BUBBLE_LINES[Math.floor(Math.random() * BUBBLE_LINES.length)] })
        }
      }
    }

    if (s.mode === "idle") {
      s.timer -= dt
      if (s.timer <= 0) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.sqrt(Math.random()) * WANDER_RADIUS
        s.target.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        s.mode = "walk"
        playAction(ANIM_WALK)
      }
      return
    }

    // mode "walk"
    const dx = s.target.x - g.position.x
    const dz = s.target.z - g.position.z
    const dist = Math.hypot(dx, dz)

    if (dist < ARRIVE_DISTANCE) {
      s.mode = "idle"
      s.timer = randRange(IDLE_MIN_S, IDLE_MAX_S)
      playAction(ANIM_IDLE)
      return
    }

    const desiredYaw = Math.atan2(dx, dz) + MODEL_FORWARD_OFFSET
    g.rotation.y = lerpAngle(g.rotation.y, desiredYaw, TURN_SPEED * dt)

    const step = Math.min(WALK_SPEED * dt, dist)
    g.position.x += (dx / dist) * step
    g.position.z += (dz / dist) * step
  })

  return (
    <group ref={root}>
      <group position={offset} scale={scale}>
        <primitive object={scene} />
      </group>
      <Html position={[0, BUBBLE_HEIGHT, 0]} center wrapperClass="speech-bubble-wrap" zIndexRange={[20, 0]}>
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none relative w-max max-w-[15rem] origin-bottom rounded-2xl rounded-bl-sm border border-border bg-card/95 px-3.5 py-2 text-center text-[0.8rem] leading-snug font-medium tracking-wide text-card-foreground shadow-xl backdrop-blur-sm transition-all duration-300 ease-out select-none",
            bubble.visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-90 opacity-0",
          )}
        >
          {bubble.text}
          {/* Queue de la bulle, orientée vers le personnage. */}
          <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] border-r border-b border-border bg-card/95" />
        </div>
      </Html>
    </group>
  )
}

/**
 * Indique si l'utilisateur a demandé à réduire les animations. S'abonne à la
 * media query `prefers-reduced-motion` et renvoie `false` au SSR.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {}
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  )
}

/**
 * Corrige un conflit drei × postprocessing : le constructeur de l'`EffectComposer`
 * (lib `postprocessing`) force `renderer.autoClear = false` de façon permanente.
 * Or `ContactShadows` rend son ombre dans une render target via `gl.render()`, qui
 * compte sur `autoClear` pour effacer la frame précédente. Sans ce reset, l'ombre
 * s'accumule à chaque position du personnage et laisse des traces noires au sol.
 * La priorité négative garantit l'exécution avant le rendu de `ContactShadows`
 * (priorité 0).
 */
function AutoClearFix() {
  useFrame((state) => {
    state.gl.autoClear = true
  }, -1)
  return null
}

/** Lumières + sol + brouillard donnant l'ambiance sombre/nostalgique. */
function SceneContent({ bubblesEnabled }: { bubblesEnabled: boolean }) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <>
      <color attach="background" args={[SCENE_BG]} />
      <fog attach="fog" args={[SCENE_BG, FOG_NEAR, FOG_FAR]} />

      <hemisphereLight intensity={0.55} color={CRT_GLOW} groundColor={SCENE_BG} />
      <ambientLight intensity={0.3} color={CRT_GLOW} />
      <directionalLight position={[5, 8, 4]} intensity={1.35} color={KEY_LIGHT} />
      <directionalLight position={[-6, 3, -4]} intensity={0.7} color={RIM_LIGHT} />
      <pointLight position={[0, 2.2, -5]} intensity={6} distance={16} color={FILL_LIGHT} />

      <Suspense fallback={null}>
        <Character bubblesEnabled={bubblesEnabled} />
      </Suspense>

      <AutoClearFix />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} blur={2.6} far={6} resolution={512} color="#000000" />

      <Grid args={[40, 40]} infiniteGrid cellSize={0.6} cellThickness={0.6} sectionSize={3} sectionThickness={1} cellColor={GRID_CELL_COLOR} sectionColor={GRID_SECTION_COLOR} fadeDistance={26} fadeStrength={5} followCamera={false} />

      {/* Glitch CRT : décalage de blocs + RGB split, déclenché sporadiquement
          sur tout le rendu. Désactivé si l'utilisateur réduit les animations. */}
      {!reducedMotion && (
        <EffectComposer>
          <Glitch
            mode={GlitchMode.SPORADIC}
            delay={new THREE.Vector2(GLITCH_DELAY_MIN, GLITCH_DELAY_MAX)}
            duration={new THREE.Vector2(GLITCH_DURATION_MIN, GLITCH_DURATION_MAX)}
            strength={new THREE.Vector2(GLITCH_STRENGTH_MIN, GLITCH_STRENGTH_MAX)}
            chromaticAberrationOffset={new THREE.Vector2(GLITCH_CHROMATIC_OFFSET, GLITCH_CHROMATIC_OFFSET)}
          />
          {/* Rétablit le tone mapping ACES du Canvas, que l'EffectComposer désactive. */}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}

      <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={MIN_DISTANCE} maxDistance={MAX_DISTANCE} minPolarAngle={MIN_POLAR} maxPolarAngle={MAX_POLAR} target={CONTROLS_TARGET} />
    </>
  )
}

/**
 * Hero scene plein écran, montée derrière l'UI. Le Canvas n'est rendu qu'après
 * le montage client pour éviter tout rendu/hydratation côté serveur.
 */
/**
 * Indique si le composant est monté côté client. S'appuie sur `useSyncExternalStore`
 * pour renvoyer `false` au SSR et `true` au navigateur, sans `setState` dans un effet.
 */
function useIsMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

interface IHeroSceneProps {
  /** Affiche les bulles de réplique du personnage (masquées quand le chat est ouvert). */
  bubblesEnabled?: boolean
}

export function HeroScene({ bubblesEnabled = true }: IHeroSceneProps = {}) {
  const mounted = useIsMounted()

  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      {mounted && (
        <Canvas dpr={[1, 2]} camera={{ position: CAMERA_START, fov: CAMERA_FOV }} gl={{ antialias: true }}>
          <SceneContent bubblesEnabled={bubblesEnabled} />
        </Canvas>
      )}
      {/* Vignette : assombrit les bords pour renforcer l'atmosphère nostalgique. */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 120% at 50% 35%, transparent 55%, rgba(8,12,12,0.55) 100%)" }} />
      {/* Grésillement CRT : bandes qui défilent (roll bars) + lignes de balayage. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="crt-band" />
        <div className="crt-band crt-band--thin" />
      </div>
      <div className="crt-scanlines pointer-events-none absolute inset-0" />
    </div>
  )
}

// Préchargement du modèle, uniquement côté navigateur (évite tout chargement au SSR).
if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_PATH)
}
