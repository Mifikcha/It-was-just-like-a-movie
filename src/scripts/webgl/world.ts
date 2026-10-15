// The procedural megastructure, second art pass: a complete shell of beveled panels over an inner light,
// seams of starlight between them, rings and great arcs as the large gestures, orbital streams of modules
// in lanes, polar crowns, booms with stations, Earth and the sky.
// Nothing is built on screen: scroll only "activates" the structure (seam light, edge glow, lane traces).
import * as THREE from "three";

export type Tier = "low" | "medium" | "high";

export const TIERS: Record<Tier, {
  tiles: number; swarm: number; stars: number; statites: number; seg: number; earthSeg: number; oct: number;
  /** render scale range (× devicePixelRatio cap) the adaptive resolution moves within */
  res: [number, number];
}> = {
  low: { tiles: 2400, swarm: 1200, stars: 2500, statites: 48, seg: 160, earthSeg: 48, oct: 3, res: [0.5, 1] },
  medium: { tiles: 6000, swarm: 2800, stars: 5000, statites: 96, seg: 256, earthSeg: 72, oct: 4, res: [0.7, 1.5] },
  high: { tiles: 11000, swarm: 5000, stars: 8000, statites: 160, seg: 384, earthSeg: 96, oct: 5, res: [0.85, 2] },
};

/** Art variants kept side by side for comparison (?shell= / ?swarm=); the defaults are the chosen ones. */
export const SHELLS = ["hybrid", "refined", "layered"] as const;
export const SWARMS = ["ribbon", "modules", "shards"] as const;
export type Look = { shell: (typeof SHELLS)[number]; swarm: (typeof SWARMS)[number] };

/** shared by every material: one write per frame reaches all of them */
export const U = {
  uTime: { value: 0 },
  /** activation 0..1 (was construction): light, not geometry */
  uLive: { value: 0 },
  /** world size of one device pixel at distance 1: keeps distant modules from vanishing below a pixel */
  uPx: { value: 0.001 },
  uPR: { value: 1 },
  uOct: { value: 4 },
};

const SHELL_R = 2.6;
export const deg = THREE.MathUtils.degToRad;

export const COMMON = /* glsl */ `
uniform float uTime; uniform float uLive; uniform float uOct;
const vec3 CYAN = vec3(0.49, 0.81, 1.0);
const vec3 VIOLET = vec3(0.73, 0.6, 0.97);
const vec3 WARM = vec3(1.0, 0.86, 0.66);
// a fixed cool key light: every bevel and facet gets a lit and a shaded side
const vec3 KEY = vec3(-0.45, 0.62, 0.64);
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 6; i++) { if (float(i) >= uOct) break; s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
`;

export const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

export const VERT = /* glsl */ `
${COMMON}
attribute float aSeed;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vSeed; varying vec3 vObj; varying vec3 vObjN; varying vec3 vTx; varying vec3 vTy;
void main() {
  #ifdef USE_INSTANCING
  mat4 mw = modelMatrix * instanceMatrix;
  #else
  mat4 mw = modelMatrix;
  #endif
  vec4 wp = mw * vec4(position, 1.0);
  mat3 m3 = mat3(mw);
  vW = wp.xyz; vUv = uv; vSeed = aSeed; vObj = position; vObjN = normal;
  vN = normalize(m3 * normal); vTx = normalize(m3 * vec3(1, 0, 0)); vTy = normalize(m3 * vec3(0, 1, 0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// Panels are thin boxes. Top: a beveled frame around a slightly recessed plate cut by fine grooves.
// Walls: dark metal catching the seam light from below. The bevel bends the normal toward the nearest rim,
// so every panel has a lit edge and a shaded edge under the key light: volume without extra geometry.
const PANEL_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uTint; uniform float uSeam; uniform vec2 uCells; uniform float uAccent;
varying vec3 vW; varying vec3 vN; varying float vSeed; varying vec3 vObj; varying vec3 vObjN; varying vec3 vTx; varying vec3 vTy;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  vec3 n = normalize(vN);
  vec3 k = normalize(KEY);
  vec3 col;
  if (vObjN.z > 0.5) {
    vec2 uv = vObj.xy + 0.5; vec2 d = uv - 0.5; vec2 a = abs(d);
    float edge = 0.5 - max(a.x, a.y);
    float bevel = 1.0 - smoothstep(0.0, 0.09, edge);
    vec2 dir = a.x > a.y ? vec2(sign(d.x), 0.0) : vec2(0.0, sign(d.y));
    vec3 nb = normalize(n + (vTx * dir.x + vTy * dir.y) * bevel * 1.3);
    float inset = smoothstep(0.115, 0.13, edge);
    vec2 g = abs(fract(uv * uCells) - 0.5);
    float groove = inset * smoothstep(0.45, 0.5, max(g.x, g.y));
    vec3 r = reflect(-v, nb);
    float sky = pow(clamp(r.y * 0.5 + 0.5, 0.0, 1.0), 2.0);
    float fres = pow(1.0 - max(dot(nb, v), 0.0), 4.0);
    float key = max(dot(nb, k), 0.0);
    float spec = pow(max(dot(r, k), 0.0), 48.0);
    vec3 base = uTint * (0.6 + 0.5 * vSeed);
    // dark plates; light lives on the bevels, the rim and the seams
    col = base * (0.2 + 0.45 * key)
      + mix(vec3(0.006, 0.009, 0.022), vec3(0.06, 0.09, 0.18), sky) * (0.25 + 0.9 * fres)
      + spec * vec3(0.85, 0.92, 1.0) * (0.12 + 1.5 * bevel);
    col *= (1.0 - 0.5 * groove) * mix(1.0, 0.8, inset);
    col += fres * CYAN * 0.1;
    float lit = step(uAccent, fract(vSeed * 91.7)) * inset * (1.0 - groove);
    col += lit * mix(WARM, CYAN, step(0.5, fract(vSeed * 13.1))) * (0.12 + 0.25 * uLive);
    #ifdef BLOCK
    // engineering blocks: rows of lit ports across the plate
    float ports = inset * step(0.62, fract(uv.y * 4.0)) * step(0.5, fract(uv.x * 9.0)) * step(0.12, uv.x) * step(uv.x, 0.88);
    col += ports * mix(CYAN, WARM, step(0.7, vSeed)) * (0.35 + 0.65 * uLive);
    #endif
  } else if (vObjN.z < -0.5) {
    col = vec3(0.01, 0.012, 0.02);
  } else {
    // walls: dark metal, washed from below by the light leaking through the seams
    float low = 0.5 - vObj.z;
    col = uTint * 0.35 * (0.3 + max(dot(n, k), 0.0)) + CYAN * uSeam * (0.3 + 0.7 * uLive) * low * low * 0.6;
  }
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

// The light under the panels: what the seams show. White-hot where the view goes straight toward the star,
// cyan around it, violet at the limb; it breathes slowly.
const SEAM_FRAG = /* glsl */ `
${COMMON}
uniform float uSeam;
varying vec3 vW; varying vec3 vN; varying vec3 vObj;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float mu = max(dot(normalize(vN), v), 0.0);
  // seen at a grazing angle the channels still glow (violet-cyan), never go grey
  vec3 col = mix(mix(VIOLET, CYAN, 0.45) * 0.38, CYAN * 0.7, smoothstep(0.0, 0.7, mu));
  col = mix(col, WARM * 1.6, pow(mu, 14.0));
  col *= uSeam * (0.55 + 0.45 * uLive) * (0.88 + 0.12 * sin(uTime * 0.5 + vObj.y * 6.0));
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

const METAL_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uBase; uniform float uLights;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vSeed; varying vec3 vObj; varying vec3 vObjN;
void main() {
  #ifdef TRUSS
  // open lattice: edges, rungs and diagonals of each bay; aSeed carries the number of bays along the boom
  if (abs(vObjN.z) > 0.5) discard;
  float across = (abs(vObjN.x) > 0.5 ? vObj.y : vObj.x) + 0.5;
  float t = fract((vObj.z + 0.5) * vSeed);
  float bar = step(0.42, abs(across - 0.5)) + step(t, 0.06)
    + step(abs(t - across), 0.05) + step(abs(1.0 - t - across), 0.05);
  if (bar < 0.5) discard;
  #endif
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vW); vec3 k = normalize(KEY);
  // two lights: the cool key, and the glowing shell below
  float key = max(dot(n, k), 0.0);
  float shell = max(dot(n, normalize(-vW)), 0.0);
  float spec = pow(max(dot(reflect(-v, n), k), 0.0), 40.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 col = uBase * (0.12 + 0.7 * key) + CYAN * shell * 0.12 * (0.5 + 0.5 * uLive) + spec * vec3(0.9, 0.95, 1.0) * 1.2 + fres * vec3(0.3, 0.45, 0.85) * 0.45;
  #ifdef RING
  // the neon line along the outer side of the tube, with slow pulses travelling along the ring
  float line = 1.0 - smoothstep(0.0, 0.04, abs(fract(vUv.y + 0.5) - 0.5));
  col += line * CYAN * (0.25 + 0.6 * uLive) * (0.7 + 0.3 * sin(vUv.x * uLights * 0.25 - uTime * 0.8));
  // collars
  col = mix(col, col * 1.6 + WARM * 0.12, step(0.985, fract(vUv.x * uLights * 0.3)));
  #endif
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

// Orbital streams: small volumes (boxes or facetted shards) flying along their lanes, oriented by their motion:
// x along the direction of travel, y along the lane's normal, z away from the star.
const SWARM_VERT = /* glsl */ `
${COMMON}
uniform float uPx; uniform vec3 uShape;
attribute vec4 aOrbit; attribute vec3 aMisc;
varying vec3 vW; varying vec3 vN; varying vec3 vObj; varying float vB; varying float vWarm;
vec3 lane(vec3 p, float ci, float si, float cn, float sn) {
  p = vec3(p.x, p.y * ci - p.z * si, p.y * si + p.z * ci);
  return vec3(p.x * cn + p.z * sn, p.y, -p.x * sn + p.z * cn);
}
void main() {
  float ang = aOrbit.w + uTime * aMisc.x;
  float ca = cos(ang), sa = sin(ang);
  float ci = cos(aOrbit.y), si = sin(aOrbit.y), cn = cos(aOrbit.z), sn = sin(aOrbit.z);
  vec3 p = lane(vec3(ca, 0.0, sa) * aOrbit.x, ci, si, cn, sn);
  vec3 t = lane(vec3(-sa, 0.0, ca), ci, si, cn, sn);
  vec3 b = lane(vec3(0.0, 1.0, 0.0), ci, si, cn, sn);
  vec3 rad = normalize(p);
  // each module rolls a little about its direction of travel: the stream catches light unevenly
  float roll = (fract(aMisc.z * 7.31) - 0.5) * 1.4;
  vec3 y = b * cos(roll) + rad * sin(roll);
  vec3 z = rad * cos(roll) - b * sin(roll);
  float dist = length(cameraPosition - p);
  float px = dist * uPx * 1.1;
  float size = max(aMisc.y, px);
  vec3 lp = position * uShape * size;
  vec3 wp = p + t * lp.x + y * lp.y + z * lp.z;
  vec3 ln = normal / uShape;
  vN = normalize(t * ln.x + y * ln.y + z * ln.z);
  vObj = position; vW = wp;
  // below a pixel a module is drawn at a pixel and dimmed by its real coverage
  vB = clamp(aMisc.y / px, 0.3, 1.0);
  vWarm = step(0.975, aMisc.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const SWARM_FRAG = /* glsl */ `
${COMMON}
varying vec3 vW; varying vec3 vN; varying vec3 vObj; varying float vB; varying float vWarm;
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vW); vec3 k = normalize(KEY);
  float shell = max(dot(n, normalize(-vW)), 0.0);
  float key = max(dot(n, k), 0.0);
  float spec = pow(max(dot(reflect(-v, n), k), 0.0), 24.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 col = vec3(0.03, 0.04, 0.07) * (0.4 + key) + CYAN * shell * 0.12 + spec * vec3(0.8, 0.9, 1.0) * 0.2 + fres * VIOLET * 0.1;
  #ifndef SHARD
  // lit edges: where two faces of the box meet
  vec3 a = smoothstep(0.38, 0.49, abs(vObj));
  col += clamp(a.x * a.y + a.y * a.z + a.z * a.x, 0.0, 1.0) * CYAN * (0.16 + 0.24 * uLive);
  #endif
  col = mix(col, WARM * 1.1, vWarm) * vB * vB;
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;


const GLOW_VERT = /* glsl */ `
uniform float uSize; varying vec2 vP; varying float vNear;
void main() {
  vP = position.xy;
  // close to the shell the structure fills the view: no bloom from a star hidden behind it
  vNear = smoothstep(5.0, 9.0, length(cameraPosition));
  vec4 c = viewMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += position.xy * uSize;
  gl_Position = projectionMatrix * c;
}`;

const GLOW_FRAG = /* glsl */ `
uniform float uCore; varying vec2 vP; varying float vNear;
void main() {
  float r = length(vP);
  // r = 0.1 is the star's radius, 0.26 the shell's: a soft bloom over the hottest part of the seams
  vec3 col = (vec3(1.0, 0.95, 0.88) * exp(-r * 18.0) * 1.0 + vec3(0.45, 0.62, 1.0) * exp(-r * 7.0) * 0.12) * uCore * vNear
    + vec3(0.1, 0.18, 0.5) * exp(-r * 2.5) * 0.04;
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

const EARTH_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uSun;
varying vec3 vW; varying vec3 vN; varying vec3 vObj;
void main() {
  float a = uTime * 0.004;
  vec3 p = normalize(vObj);
  p = vec3(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a));
  vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); vec3 l = uSun;
  float land = smoothstep(0.5, 0.54, fbm(p * 1.6));
  float clouds = smoothstep(0.52, 0.78, fbm(p * 4.5 + vec3(uTime * 0.003, 0.0, 0.0)));
  float ndl = dot(n, l);
  float day = smoothstep(-0.12, 0.25, ndl);
  vec3 dayCol = (mix(vec3(0.02, 0.07, 0.2), vec3(0.16, 0.17, 0.12), land) + clouds * 0.8) * max(ndl, 0.0) * 1.6;
  // cities: fine grains, densest along the coasts
  float coast = 1.0 - smoothstep(0.0, 0.05, abs(fbm(p * 1.6) - 0.52));
  float region = smoothstep(0.45, 0.75, vnoise(p * 9.0));
  float city = pow(vnoise(p * 260.0), 8.0) * 6.0 * region * land * (0.3 + 0.7 * coast);
  vec3 night = mix(vec3(0.004, 0.01, 0.026), vec3(0.012, 0.014, 0.02), land) + city * vec3(1.0, 0.72, 0.38) * 1.3 * (1.0 - clouds * 0.7);
  vec3 col = mix(night, dayCol, day);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  col += fres * vec3(0.25, 0.5, 1.0) * (0.25 + 1.3 * smoothstep(-0.3, 0.6, ndl));
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

// back faces of a slightly larger sphere: brightest at the planet's limb, gone at the halo's edge
const ATMO_FRAG = /* glsl */ `
uniform vec3 uCenter; uniform vec3 uSun;
varying vec3 vW; varying vec3 vN;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float i = smoothstep(0.0, 0.33, -dot(normalize(vN), v));
  float lit = max(dot(normalize(vW - uCenter), uSun) + 0.35, 0.0);
  gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * i * i * (0.15 + 1.3 * lit), 1.0);
  ${OUT}
}`;

const SKY_VERT = /* glsl */ `
uniform float uTime; uniform float uPR;
attribute float aSize; attribute vec3 aColor;
varying vec3 vC;
void main() {
  vC = aColor * (0.85 + 0.15 * sin(uTime * (0.4 + aSize) + aSize * 40.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPR;
}`;

const SKY_FRAG = /* glsl */ `
varying vec3 vC;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(vC * a * 1.6, 1.0);
  ${OUT}
}`;

export const shader = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform> = {}, extra: THREE.ShaderMaterialParameters = {}) =>
  new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...U, ...uniforms }, ...extra });

// deterministic: the same structure on every visit
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Item = { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; seed: number };

const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[]) => {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const seed = new Float32Array(items.length);
  const m = new THREE.Matrix4();
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, m.compose(it.p, it.q, it.s));
    seed[i] = it.seed;
  });
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
  return mesh;
};

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
// orientation whose +Z is `normal` (what Object3D.lookAt does, without an Object3D per panel)
const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const facing = (p: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3) =>
  new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(_v.copy(p).add(normal), p, up));
const onShell = (lat: number, lon: number, r: number) =>
  new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(r);

/** sun: light on Earth, from behind as the opening shot sees it (a lit crescent, the night side with cities) */
export type Layout = { earth: THREE.Vector3; earthR: number; boom: THREE.Vector3; sun: THREE.Vector3 };
export type World = ReturnType<typeof buildWorld>;

// per shell variant: seam width (share of the panel cut away), seam light, plate cells, accents, extra layers
const SHELL_LOOK = {
  // beveled panels, tight dark seams: calm, mineral
  refined: { gap: 0.035, seam: 0.25, cells: [3, 2], accent: 0.99, blocks: 0, inner: false, channels: false },
  // an outer skin with regular windows onto a deeper layer of large modules
  layered: { gap: 0.05, seam: 0.8, cells: [2, 2], accent: 0.99, blocks: 0, inner: true, channels: false },
  // panels, lit seams, and raised engineering blocks with rows of ports
  hybrid: { gap: 0.05, seam: 0.7, cells: [3, 2], accent: 0.99, blocks: 1 / 70, inner: false, channels: true },
} as const;

export function buildWorld(tier: Tier, layout: Layout, look: Look) {
  const cfg = TIERS[tier];
  const L = SHELL_LOOK[look.shell];
  const r = rng(20261015);
  const group = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => (group.add(o), o);
  const box = () => new THREE.BoxGeometry(1, 1, 1);

  // ---------------------------------------------------------------- the light inside, seen through the seams
  const seamU = { value: L.seam };
  add(new THREE.Mesh(new THREE.SphereGeometry(SHELL_R - (L.inner ? 0.14 : 0.01), 64, 32), shader(VERT, SEAM_FRAG, { uSeam: seamU })));
  const glowMat = shader(GLOW_VERT, GLOW_FRAG, { uSize: { value: 10 }, uCore: { value: 0.15 + 0.3 * L.seam } }, {
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true,
  });
  const glow = add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMat));
  glow.frustumCulled = false;
  glow.renderOrder = 2;

  // ---------------------------------------------------------------- shell: rows of beveled panels
  const panel = (tint: THREE.Color, defines: Record<string, string> = {}) =>
    shader(VERT, PANEL_FRAG, {
      uTint: { value: tint }, uSeam: seamU, uCells: { value: new THREE.Vector2(...L.cells) }, uAccent: { value: L.accent },
    }, { defines });
  const steelBlue = new THREE.Color(0.055, 0.07, 0.12);
  const tiles: Item[] = [];
  const LAT = deg(78);
  const tileH = Math.sqrt((4 * Math.PI * SHELL_R * SHELL_R * Math.sin(LAT)) / cfg.tiles / 1.4);
  const rows = Math.round((2 * LAT * SHELL_R) / tileH);
  for (let row = 0; row < rows; row++) {
    const lat = -LAT + ((row + 0.5) * 2 * LAT) / rows;
    const circ = 2 * Math.PI * SHELL_R * Math.cos(lat);
    // with channels every row holds whole sectors (12 of 30°), so the meridian channels run straight
    const n = L.channels ? Math.max(1, Math.round(circ / (tileH * 1.4) / 12)) * 12 : Math.max(3, Math.round(circ / (tileH * 1.4)));
    const off = L.channels ? 0 : (row % 2) * (Math.PI / n);
    // major channels: every 16th row and every 30° meridian stay open, so the seam light draws a large
    // sector grid over the fine panelling (two scales of order instead of one uniform tiling)
    if (L.channels && row % 16 === 8) continue;
    for (let k = 0; k < n; k++) {
      const lon = off + (k * 2 * Math.PI) / n;
      if (L.channels && k % (n / 12) === 0) continue;
      // layered: regular windows in the skin onto the module layer below
      if (L.inner && row % 10 < 4 && Math.floor((lon / (2 * Math.PI)) * 24) % 3 === 0) continue;
      // depth varies a little: panels sit at slightly different heights and thicknesses
      const thick = 0.035 + r() * 0.025;
      const p = onShell(lat, lon, SHELL_R + thick / 2 + (r() - 0.5) * 0.01);
      tiles.push({ p, q: facing(p, p.clone().normalize(), Y), s: new THREE.Vector3((circ / n) * (1 - L.gap), tileH * (1 - L.gap), thick), seed: r() });
    }
  }
  add(instanced(box(), panel(steelBlue), tiles));

  // larger elements on the same shell: engineering blocks (hybrid) or the inner module layer (layered)
  const blocks: Item[] = [];
  if (L.blocks) {
    for (let i = 0; i < Math.round(cfg.tiles * L.blocks); i++) {
      const lat = (r() * 2 - 1) * deg(68);
      const thick = 0.06 + r() * 0.04;
      const p = onShell(lat, r() * Math.PI * 2, SHELL_R + 0.04 + thick / 2);
      blocks.push({ p, q: facing(p, p.clone().normalize(), Y), s: new THREE.Vector3(tileH * (2.8 + r() * 1.4), tileH * 1.9, thick), seed: r() });
    }
  }
  if (L.inner) {
    for (let lat = -72; lat <= 72; lat += 8) {
      const circ = 2 * Math.PI * (SHELL_R - 0.08) * Math.cos(deg(lat));
      const n = Math.round(circ / 0.42);
      for (let k = 0; k < n; k++) {
        const p = onShell(deg(lat), (k / n) * Math.PI * 2, SHELL_R - 0.08);
        blocks.push({ p, q: facing(p, p.clone().normalize(), Y), s: new THREE.Vector3((circ / n) * 0.9, deg(8) * SHELL_R * 0.88, 0.07), seed: r() });
      }
    }
  }
  if (blocks.length) add(instanced(box(), panel(new THREE.Color(0.075, 0.08, 0.14), { BLOCK: "" }), blocks));

  // equatorial belt: a raised band of large violet modules
  const belt: Item[] = [];
  const beltN = Math.round(cfg.seg / 3);
  for (let k = 0; k < beltN; k++) {
    const p = onShell(0, (k / beltN) * Math.PI * 2, SHELL_R + 0.1);
    belt.push({ p, q: facing(p, p.clone().normalize(), Y), s: new THREE.Vector3(((2 * Math.PI * (SHELL_R + 0.1)) / beltN) * 0.94, 0.4, 0.07), seed: r() });
  }
  add(instanced(box(), panel(new THREE.Color(0.075, 0.055, 0.15), { BLOCK: "" }), belt));

  // polar crowns of radiator vanes around the plasma collectors
  const crown: Item[] = [];
  for (const pole of [1, -1]) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const p = radial.clone().multiplyScalar(0.85).setY(pole * 2.58);
      const normal = radial.clone().multiplyScalar(Math.sin(deg(25))).setY(pole * Math.cos(deg(25)));
      crown.push({ p, q: facing(p, normal, radial), s: new THREE.Vector3(0.2, 0.9, 0.035), seed: r() });
    }
  }
  add(instanced(box(), panel(new THREE.Color(0.12, 0.08, 0.13)), crown));

  // statite mirrors just inside the shell: violet points in the windows (layered) — elsewhere hidden
  if (L.inner) {
    const statites = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.07, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.45, 1.0).multiplyScalar(1.6), side: THREE.DoubleSide }),
      cfg.statites,
    );
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deg(12));
    for (let i = 0; i < cfg.statites; i++) {
      const a = (i / cfg.statites) * Math.PI * 2;
      const p = new THREE.Vector3(Math.cos(a) * 1.85, (r() - 0.5) * 0.08, Math.sin(a) * 1.85).applyQuaternion(tilt);
      statites.setMatrixAt(i, new THREE.Matrix4().compose(p, facing(p, p.clone().negate(), Y), new THREE.Vector3(1, 1, 1)));
    }
    add(statites);
  }

  // ---------------------------------------------------------------- rings and great arcs: the large gestures
  const metal = (base: THREE.Color, defines: Record<string, string> = {}, extra: Record<string, THREE.IUniform> = {}) =>
    shader(VERT, METAL_FRAG, { uBase: { value: base }, uLights: { value: 0 }, ...extra }, { defines, side: THREE.DoubleSide });
  const steel = new THREE.Color(0.09, 0.11, 0.17);
  const RINGS = [
    // few and strong: an equatorial service ring, two inclined rings, one great arc
    { R: 3.05, tube: 0.04, rot: [8, 0, 5], arc: 360, spokes: 4 },
    { R: 4.0, tube: 0.055, rot: [92, -35, 12], arc: 360, spokes: 4 },
    { R: 4.9, tube: 0.06, rot: [62, 70, -18], arc: 360, spokes: 0 },
    // unfinished on purpose: it reads as a gesture, not as one more ring
    { R: 6.2, tube: 0.045, rot: [-24, 10, 38], arc: 200, spokes: 0 },
  ] as const;
  const spokes: Item[] = [];
  for (const spec of RINGS) {
    const mesh = add(new THREE.Mesh(
      new THREE.TorusGeometry(spec.R, spec.tube, 8, Math.round((cfg.seg * spec.arc) / 360), deg(spec.arc)),
      metal(steel, { RING: "" }, { uLights: { value: Math.round((spec.R * 40 * spec.arc) / 360) } }),
    ));
    mesh.rotation.set(deg(spec.rot[0]), deg(spec.rot[1]), deg(spec.rot[2]));
    mesh.updateMatrix();
    for (let k = 0; k < spec.spokes; k++) {
      const f = (k + 0.3) / spec.spokes;
      const q = new THREE.Vector3(Math.cos(f * Math.PI * 2), Math.sin(f * Math.PI * 2), 0).multiplyScalar(spec.R).applyMatrix4(mesh.matrix);
      const s = q.clone().setLength(SHELL_R + 0.05);
      const dir = q.clone().sub(s);
      spokes.push({
        p: s.clone().add(q).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().normalize()),
        s: new THREE.Vector3(0.016, dir.length(), 0.016), seed: 0,
      });
    }
  }
  add(instanced(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), metal(steel), spokes));

  // ---------------------------------------------------------------- booms with stations at their ends
  const booms = [layout.boom.clone(), new THREE.Vector3(0.3, 0.85, -0.4).setLength(7.5), new THREE.Vector3(0.5, -0.6, 0.6).setLength(7)];
  const trussGeo = box();
  const truss = new THREE.InstancedMesh(trussGeo, metal(steel.clone().multiplyScalar(1.3), { TRUSS: "" }), booms.length);
  const bays = new Float32Array(booms.length);
  const hubs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 16), metal(steel), booms.length);
  const wheels = new THREE.InstancedMesh(new THREE.TorusGeometry(0.55, 0.08, 10, 64), metal(steel, { RING: "" }, { uLights: { value: 24 } }), booms.length * 2);
  booms.forEach((end, i) => {
    const dir = end.clone().normalize();
    const start = dir.clone().multiplyScalar(SHELL_R + 0.1);
    const len = end.distanceTo(start);
    const along = new THREE.Quaternion().setFromUnitVectors(Z, dir);
    truss.setMatrixAt(i, new THREE.Matrix4().compose(start.clone().add(end).multiplyScalar(0.5), along, new THREE.Vector3(0.13, 0.13, len)));
    bays[i] = Math.round(len / 0.13);
    hubs.setMatrixAt(i, new THREE.Matrix4().compose(end.clone().addScaledVector(dir, 0.55), new THREE.Quaternion().setFromUnitVectors(Y, dir), new THREE.Vector3(1, 1, 1)));
    for (const [j, at] of [0.25, 0.85].entries()) {
      wheels.setMatrixAt(i * 2 + j, new THREE.Matrix4().compose(end.clone().addScaledVector(dir, at), along, new THREE.Vector3(1, 1, 1)));
    }
  });
  trussGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(bays, 1));
  add(truss);
  add(hubs);
  add(wheels);

  // ---------------------------------------------------------------- orbital streams: lanes of modules, orbits on the GPU
  const shard = look.swarm === "shards";
  const swarmGeo = shard ? new THREE.OctahedronGeometry(0.5, 0) : box();
  if (shard) swarmGeo.computeVertexNormals(); // flat facets
  const N = cfg.swarm;
  const orbit = new Float32Array(N * 4);
  const misc = new Float32Array(N * 3);
  const lanes = Array.from({ length: 9 }, (_, i) => ({ inc: 0.1 + r() * 1.3, node: r() * Math.PI * 2, R: 3.3 + i * 0.35 }));
  const speed = (R: number) => 0.06 * Math.pow(3.3 / R, 1.5);
  let i = 0;
  const put = (R: number, inc: number, node: number, phase: number, size: number) => {
    orbit.set([R, inc, node, phase], i * 4);
    misc.set([speed(R), size, r()], i * 3);
    i++;
  };
  while (i < N) {
    const ln = lanes[i % lanes.length];
    if (look.swarm === "ribbon" && r() < 0.06) {
      // a convoy: a short train of modules nose to tail along the lane, among the loose ones
      const size = 0.014 + r() * 0.01;
      const count = Math.min(N - i, 4 + Math.floor(r() * 7));
      const R = ln.R + (r() - 0.5) * 0.08;
      const start = r() * Math.PI * 2;
      for (let k = 0; k < count; k++) put(R, ln.inc, ln.node, start + (k * size * 3.2) / R, size);
    } else {
      // loose modules around the lane: a thicker cloud for shards
      const spread = shard ? 0.28 : 0.14;
      put(ln.R + (r() + r() - 1) * spread, ln.inc + (r() - 0.5) * (shard ? 0.05 : 0.02), ln.node, r() * Math.PI * 2, r() < 0.04 ? 0.05 : 0.01 + r() * 0.022);
    }
  }
  swarmGeo.setAttribute("aOrbit", new THREE.InstancedBufferAttribute(orbit, 4));
  swarmGeo.setAttribute("aMisc", new THREE.InstancedBufferAttribute(misc, 3));
  const shape = shard ? new THREE.Vector3(2.8, 0.22, 0.9) : look.swarm === "ribbon" ? new THREE.Vector3(2.2, 0.9, 0.4) : new THREE.Vector3(1.8, 1.0, 0.4);
  const swarm = add(new THREE.InstancedMesh(swarmGeo, shader(SWARM_VERT, SWARM_FRAG, { uShape: { value: shape } }, { defines: shard ? { SHARD: "" } : {} }), N));
  swarm.frustumCulled = false; // positions live in the shader


  // ---------------------------------------------------------------- Earth in the foreground of the opening shot
  const earthGeo = new THREE.SphereGeometry(1, cfg.earthSeg, Math.round(cfg.earthSeg * 0.66));
  const sun = { value: layout.sun };
  const earth = add(new THREE.Mesh(earthGeo, shader(VERT, EARTH_FRAG, { uSun: sun })));
  earth.position.copy(layout.earth);
  earth.scale.setScalar(layout.earthR);
  earth.rotation.z = deg(-18);
  const atmo = add(new THREE.Mesh(earthGeo, shader(VERT, ATMO_FRAG, { uCenter: { value: layout.earth }, uSun: sun }, {
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  })));
  atmo.position.copy(layout.earth);
  atmo.scale.setScalar(layout.earthR * 1.06);

  const stars = add(buildSky(cfg.stars, r));

  return {
    group,
    stars,
    /** the old construction value now only activates the structure: seams, edges and traces brighten */
    update(build: number) {
      U.uLive.value = THREE.MathUtils.smoothstep(build, 0.42, 1);
    },
    instances: () => group.children.reduce((s, o) => s + ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 0), 0),
    dispose: () => release(group),
  };
}

/** the sky: a shell of points that travels with the camera */
export function buildSky(count: number, r: () => number) {
  const sky = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const band = new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(60), 0, deg(25)));
  for (let s = 0; s < count; s++) {
    // a third of the stars crowd a galactic band
    const y = s % 3 === 0 ? (r() + r() + r() - 1.5) * 0.18 : r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const c = Math.sqrt(1 - y * y);
    new THREE.Vector3(Math.cos(a) * c, y, Math.sin(a) * c).applyQuaternion(band).multiplyScalar(900).toArray(sky, s * 3);
    size[s] = 0.8 + Math.pow(r(), 6) * 2.6;
    const warm = r();
    color.set([0.7 + warm * 0.3, 0.75 + warm * 0.15, 1.0 - warm * 0.2].map((v) => v * (0.35 + r() * 0.65)), s * 3);
  }
  const skyGeo = new THREE.BufferGeometry()
    .setAttribute("position", new THREE.BufferAttribute(sky, 3))
    .setAttribute("aSize", new THREE.BufferAttribute(size, 1))
    .setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  const stars = new THREE.Points(skyGeo, shader(SKY_VERT, SKY_FRAG, {}, { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  return stars;
}

export function release(group: THREE.Group) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
    (o as THREE.InstancedMesh).dispose?.();
  });
}
