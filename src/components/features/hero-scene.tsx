"use client"

import { Suspense, useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
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
  FOG_COLOR,
  FOG_NEAR,
  FOG_FAR,
  GRID_CELL_COLOR,
  GRID_SECTION_COLOR,
  HEMI_SKY,
  HEMI_GROUND,
  KEY_LIGHT,
  RIM_LIGHT,
  FILL_LIGHT,
  SHADOW_COLOR,
  SHADOW_OPACITY,
  VIEW_OFFSET_WIDE,
  VIEW_OFFSET_NARROW,
  VIEW_OFFSET_EASE,
  WIDE_LAYOUT_MIN_WIDTH,
  type IViewOffset,
  type TSceneLayout,
  GLITCH_DELAY_MIN,
  GLITCH_DELAY_MAX,
  GLITCH_DURATION_MIN,
  GLITCH_DURATION_MAX,
  GLITCH_STRENGTH_MIN,
  GLITCH_STRENGTH_MAX,
  GLITCH_CHROMATIC_OFFSET,
  BUBBLE_DELAY_MIN,
  BUBBLE_DELAY_MAX,
  BUBBLE_DURATION,
  BUBBLE_HEIGHT,
} from "@/constants/scene"
import { useLocale } from "@/lib/locale-context"
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
function Character({ bubblesEnabled, bubbleLines }: { bubblesEnabled: boolean; bubbleLines: string[] }) {
  const root = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF(MODEL_PATH)
  const { actions, mixer } = useAnimations(animations, root)
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
    (name: string, immediate = false) => {
      const next = actions[name]
      if (!next || next === currentAction.current) return
      if (immediate) {
        // Prise de contrôle instantanée (pas de fondu depuis la T-pose) : sert à
        // poser le squelette avant le tout premier rendu.
        next.reset().play()
      } else {
        next.reset().fadeIn(FADE_S).play()
        currentAction.current?.fadeOut(FADE_S)
      }
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
  const [bubble, setBubble] = useState<{ visible: boolean; text: string }>({ visible: false, text: bubbleLines[0] })
  const bubbleVisible = useRef(false)
  const bubbleTimer = useRef(randRange(BUBBLE_DELAY_MIN, BUBBLE_DELAY_MAX))

  useLayoutEffect(() => {
    // Démarre l'idle et applique immédiatement la première pose (mixer.update(0))
    // avant le paint. L'effet de layout s'exécute de façon synchrone après le
    // commit React et avant tout rendu three.js : le squelette est donc posé dès
    // la première frame affichée, sans jamais passer par la pose de repos (T-pose).
    playAction(ANIM_IDLE, true)
    mixer.update(0)
  }, [playAction, mixer])

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
          setBubble({ visible: true, text: bubbleLines[Math.floor(Math.random() * bubbleLines.length)] })
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
            "pointer-events-none flex w-max max-w-[15rem] origin-bottom flex-col items-center transition-all ease-out select-none",
            bubble.visible ? "translate-y-0 opacity-100 duration-200" : "translate-y-1 opacity-0 duration-150",
          )}
        >
          <div className="border border-teal-ink bg-paper px-3 py-2 font-mono text-[13px] leading-[1.45] text-ink">{bubble.text}</div>
          {/* Pointe : un filet et un carré, orientés vers la tête du personnage. */}
          <span className="h-5 w-px bg-teal-ink" />
          <span className="size-[5px] bg-teal-ink" />
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

/**
 * Cadrage selon la mise en page : décale le personnage dans l'écran
 * (`setViewOffset`) et ajuste la focale, sans toucher à l'orbite. Le passage
 * de l'accueil au chat glisse en douceur ; en mouvement réduit, il est immédiat.
 */
function ViewOffset({ layout, animated }: { layout: TSceneLayout; animated: boolean }) {
  const current = useRef<IViewOffset | null>(null)

  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera
    const { width, height } = state.size
    const target = width >= WIDE_LAYOUT_MIN_WIDTH ? VIEW_OFFSET_WIDE[layout] : VIEW_OFFSET_NARROW
    const c = current.current ?? { ...target }
    const k = animated ? Math.min(1, dt * VIEW_OFFSET_EASE) : 1
    c.x += (target.x - c.x) * k
    c.y += (target.y - c.y) * k
    c.zoom += (target.zoom - c.zoom) * k
    current.current = c

    camera.zoom = c.zoom
    // setViewOffset recalcule la matrice de projection (zoom compris).
    camera.setViewOffset(width, height, -c.x * width, -c.y * height, width, height)
  })

  return null
}

/** Lumières + sol + brouillard donnant l'ambiance sombre/nostalgique. */
function SceneContent({ bubblesEnabled, bubbleLines, layout }: { bubblesEnabled: boolean; bubbleLines: string[]; layout: TSceneLayout }) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <>
      {/* Pas de fond : le canvas est transparent, le papier du site passe dessous. */}
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <ViewOffset layout={layout} animated={!reducedMotion} />

      <hemisphereLight intensity={0.9} color={HEMI_SKY} groundColor={HEMI_GROUND} />
      <ambientLight intensity={0.35} color={HEMI_SKY} />
      <directionalLight position={[5, 8, 4]} intensity={1.35} color={KEY_LIGHT} />
      <directionalLight position={[-6, 3, -4]} intensity={0.9} color={RIM_LIGHT} />
      <pointLight position={[0, 2.2, -5]} intensity={3} distance={16} color={FILL_LIGHT} />

      <Suspense fallback={null}>
        <Character bubblesEnabled={bubblesEnabled} bubbleLines={bubbleLines} />
      </Suspense>

      <AutoClearFix />
      <ContactShadows position={[0, 0.01, 0]} opacity={SHADOW_OPACITY} blur={2.6} far={6} resolution={512} color={SHADOW_COLOR} />

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
  /** Mise en page courante de l'accueil, qui décide où se tient le personnage. */
  layout?: TSceneLayout
}

export function HeroScene({ bubblesEnabled = true, layout = "landing" }: IHeroSceneProps = {}) {
  const mounted = useIsMounted()
  // Les répliques sont résolues ici, HORS du <Canvas> : le réconciliateur
  // react-three-fiber ne propage pas les contextes React, on les passe donc en props.
  const { t } = useLocale()

  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      {mounted && (
        <Canvas dpr={[1, 2]} camera={{ position: CAMERA_START, fov: CAMERA_FOV }} gl={{ antialias: true, alpha: true, premultipliedAlpha: false }}>
          <SceneContent bubblesEnabled={bubblesEnabled} bubbleLines={t.scene.bubbleLines} layout={layout} />
        </Canvas>
      )}
    </div>
  )
}

// Préchargement du modèle, uniquement côté navigateur (évite tout chargement au SSR).
if (typeof window !== "undefined") {
  useGLTF.preload(MODEL_PATH)
}
