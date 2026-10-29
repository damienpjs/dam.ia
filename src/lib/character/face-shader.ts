/**
 * Yeux et bouche du personnage, dessinés par le shader.
 *
 * Les yeux peints dans la texture d'origine ont été effacés : ils sont
 * redessinés ici, nets à toute distance, avec des paupières qui clignent, un
 * regard qui bouge et des plissements selon l'humeur. La bouche s'ouvre de la
 * même façon pendant la parole.
 *
 * Tout se calcule dans l'espace de la « feuille de visage » : une projection
 * frontale de la tête (deuxième jeu d'UV du .glb, `uv1`), de FACE_SHEET_SIZE
 * mètres de côté. u croît vers la gauche du personnage, v vers le haut. Hors
 * de la face avant, uv1 est repoussé de deux feuilles vers l'extérieur : une
 * face à cheval sur la bordure interpole alors en s'éloignant du visage, sans
 * jamais repasser sur les yeux, et rien n'est dessiné hors de la feuille. Les coordonnées
 * suivent la peau : quand une shape key déplace un sourcil ou un coin de
 * bouche, le dessin suit.
 */

export interface IEyeShape {
  /** Centre (u, v) dans la feuille de visage. */
  center: [number, number]
  /** Demi-largeur, demi-hauteurs haute et basse. */
  halfWidth: number
  halfUp: number
  halfDown: number
}

/**
 * Feuille de visage de 0,26 m de côté, centrée à 1,51 m. Centrés sur les orbites de la
 * tête v4, en amande comme les yeux de la v3 : plus larges que hauts, le bas plus plat.
 */
export const EYES: { left: IEyeShape; right: IEyeShape } = {
  // gauche du personnage = droite de l'image
  left: { center: [0.6758, 0.7087], halfWidth: 0.08, halfUp: 0.052, halfDown: 0.04 },
  right: { center: [0.3242, 0.7087], halfWidth: 0.08, halfUp: 0.052, halfDown: 0.04 },
}

/** Ligne de la bouche peinte : centre et demi-largeur dans la feuille de visage. */
export const MOUTH = { center: [0.5, 0.3813] as [number, number], halfWidth: 0.1119 }

// Couleurs relevées sur les yeux peints d'origine : iris brun foncé,
// grande pupille floue, cerne extérieur plus sombre.
export const IRIS_COLOR_INNER: [number, number, number] = [0.045, 0.03, 0.022]
export const IRIS_COLOR_OUTER: [number, number, number] = [0.22, 0.15, 0.09]

/** Uniforms modifiés à chaque image par la scène. */
export interface IFaceUniformValues {
  eyeOpen: [number, number]
  squint: number
  gaze: [number, number]
  mouthOpen: number
}

const glslVec2 = ([a, b]: [number, number]) => `vec2(${a.toFixed(4)}, ${b.toFixed(4)})`
const glslVec3 = ([a, b, c]: [number, number, number]) => `vec3(${a.toFixed(3)}, ${b.toFixed(3)}, ${c.toFixed(3)})`

function eyeCall(eye: IEyeShape, side: 1 | -1, openUniform: string): string {
  return `col = faceEye(col, fuv, aa, ${glslVec2(eye.center)}, ${eye.halfWidth.toFixed(4)}, ${eye.halfUp.toFixed(4)}, ${eye.halfDown.toFixed(4)}, ${side.toFixed(1)}, ${openUniform}, faceSquint, faceGaze);`
}

/** Déclarations du fragment shader (uniforms et fonctions de dessin). */
export const FACE_FRAGMENT_HEADER = /* glsl */ `
varying vec2 vFaceUv;
uniform vec2 faceEyeOpen;
uniform float faceSquint;
uniform vec2 faceGaze;
uniform float faceMouthOpen;

float faceStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

vec3 faceEye(vec3 col, vec2 p, float aa, vec2 c, float a, float bu, float bl, float side, float openUp, float squint, vec2 gaze) {
  float x = (p.x - c.x) / a;
  float xs = x * side;                         // +1 au coin externe des deux yeux
  float shape = max(1.0 - x * x, 0.0);
  if (shape <= 0.0) return col;
  float up = c.y + bu * pow(shape, 0.55) * (1.0 + 0.12 * xs);
  float lo = c.y - bl * pow(shape, 0.75) * (1.0 - 0.15 * xs);
  lo = lo + (up - lo) * squint * 0.55;
  float closeLine = lo + (up - lo) * 0.32;
  float top = closeLine + (up - closeLine) * openUp;
  lo = closeLine + (lo - closeLine) * sqrt(clamp(openUp, 0.0, 1.0));
  // iris, pupille, reflet : comme les yeux peints d'origine, l'iris est grand,
  // placé haut et un peu vers le nez, le haut caché par la paupière
  float ir = 1.02 * bu;
  float softEdge = aa + ir * 0.06;
  vec2 ic = vec2(c.x - side * 0.12 * a + gaze.x * a * 0.36, c.y + 0.1 * bu + gaze.y * bu * 0.3);
  float d = length(p - ic);
  float iris = faceStep(ir + softEdge, ir - softEdge, d);
  float pupil = faceStep(ir * 0.6 + softEdge * 2.0, ir * 0.6 - softEdge * 2.0, d);
  vec3 irisCol = mix(${glslVec3(IRIS_COLOR_INNER)}, ${glslVec3(IRIS_COLOR_OUTER)}, smoothstep(0.5, 0.9, d / ir));
  irisCol *= 1.0 - 0.45 * faceStep(ir * 0.8, ir, d);
  float lidShadow = faceStep(0.0, bu * 0.95, top - p.y);
  vec3 eye = vec3(0.92, 0.88, 0.84) * mix(0.62, 1.0, faceStep(0.0, 0.35, (p.y - lo) / max(top - lo, 1e-4)) * 0.4 + 0.6);
  eye = mix(eye, irisCol, iris);
  eye = mix(eye, vec3(0.05, 0.035, 0.025), pupil);
  eye *= mix(0.32, 1.0, lidShadow);
  float h1 = faceStep(0.12 * ir + aa, 0.12 * ir - aa, length(p - (ic + vec2(0.38, 0.32) * ir)));
  eye = mix(eye, vec3(1.0), h1 * 0.45);
  float edgeSoft = aa * 2.5;
  float insideSoft = faceStep(-edgeSoft, edgeSoft, p.y - lo) * faceStep(-aa, aa, top - p.y);
  col = mix(col, eye, insideSoft);

  // trait de cils sur la paupière supérieure, ligne douce en bas
  float taper = pow(shape, 0.35);
  float thick = bu * (0.2 + 0.12 * clamp(xs, 0.0, 1.0)) * taper;
  float lash = faceStep(-aa, aa * 2.0, p.y - (top - thick * 0.35)) * faceStep(-aa * 3.0, aa * 3.0, top + thick - p.y);
  vec3 lashCol = vec3(0.17, 0.09, 0.07);
  return mix(col, lashCol, lash * 0.92);
}

vec3 faceMouth(vec3 col, vec2 p, float aa, vec2 c, float w, float open) {
  if (open <= 0.001) return col;
  float x = (p.x - c.x) / (w * (0.55 + 0.25 * open));
  float shape = max(1.0 - x * x, 0.0);
  if (shape <= 0.0) return col;
  float top = c.y + 0.004 * pow(shape, 0.8);
  float bottom = c.y - 0.034 * open * pow(shape, 0.6);
  float inside = faceStep(-aa, aa, p.y - bottom) * faceStep(-aa, aa, top - p.y);
  float depth = clamp((top - p.y) / max(top - bottom, 1e-4), 0.0, 1.0);
  vec3 cavity = mix(vec3(0.24, 0.07, 0.07), vec3(0.42, 0.16, 0.15), smoothstep(0.55, 1.0, depth));
  // dents du haut : une bande claire sous la lèvre, visible bouche bien ouverte
  float teeth = faceStep(-aa, aa, p.y - (top - 0.004 - 0.006 * open));
  cavity = mix(cavity, vec3(0.93, 0.90, 0.85), teeth * smoothstep(0.2, 0.5, open) * pow(shape, 0.5));
  return mix(col, cavity, inside);
}
`

/** Corps du dessin, injecté après la lecture de la texture de couleur. */
export const FACE_FRAGMENT_BODY = /* glsl */ `
float faceAa = length(fwidth(vFaceUv));
// une face dont les coordonnées sautent (bordure de la feuille) ne dessine rien
if (abs(vFaceUv.x - 0.5) < 0.6 && abs(vFaceUv.y - 0.5) < 0.6 && faceAa < 0.02) {
  vec2 fuv = vFaceUv;
  float aa = max(faceAa * 0.75, 0.0004);
  vec3 col = diffuseColor.rgb;
  ${eyeCall(EYES.left, 1, "faceEyeOpen.x")}
  ${eyeCall(EYES.right, -1, "faceEyeOpen.y")}
  col = faceMouth(col, fuv, aa, ${glslVec2(MOUTH.center)}, ${MOUTH.halfWidth.toFixed(4)}, faceMouthOpen);
  diffuseColor.rgb = col;
}
`

export const FACE_VERTEX_HEADER = /* glsl */ `
#ifndef USE_UV1
attribute vec2 uv1;
#endif
varying vec2 vFaceUv;
`

// glTF retourne l'axe v des UV par rapport à Blender, où la feuille a été calculée.
export const FACE_VERTEX_BODY = /* glsl */ `
vFaceUv = vec2(uv1.x, 1.0 - uv1.y);
`

/** Valeurs de départ des uniforms : yeux au repos, bouche fermée. */
export function initialFaceUniforms(): IFaceUniformValues {
  return { eyeOpen: [0.86, 0.86], squint: 0.1, gaze: [0, 0], mouthOpen: 0 }
}
