// The procedural megastructure: star, collector shell, belts, polar crowns, service rings, booms with
// stations, the free swarm, Earth and the sky. Everything that grows with construction is an InstancedMesh
// whose instances are sorted by the moment they appear, so "build" only changes mesh.count and one uniform.
import * as THREE from "three";

export type Tier = "low" | "medium" | "high";

export const TIERS: Record<Tier, {
  tiles: number; swarm: number; stars: number; statites: number; seg: number; earthSeg: number; oct: number;
  /** render scale range (× devicePixelRatio cap) the adaptive resolution moves within */
  res: [number, number];
}> = {
  low: { tiles: 2400, swarm: 1200, stars: 2500, statites: 48, seg: 160, earthSeg: 48, oct: 3, res: [0.5, 1] },
  medium: { tiles: 6500, swarm: 3500, stars: 5000, statites: 96, seg: 256, earthSeg: 72, oct: 4, res: [0.7, 1.5] },
  high: { tiles: 13000, swarm: 8000, stars: 8000, statites: 160, seg: 384, earthSeg: 96, oct: 5, res: [0.85, 2] },
};

/** shared by every material: one write per frame reaches all of them */
export const U = {
  uTime: { value: 0 },
  uBuild: { value: 0.42 },
  /** world size of one device pixel at distance 1: keeps distant swarm panels from vanishing below a pixel */
  uPx: { value: 0.001 },
  uPR: { value: 1 },
  uOct: { value: 4 },
};

const SHELL_R = 2.6;
const deg = THREE.MathUtils.degToRad;

const COMMON = /* glsl */ `
uniform float uTime; uniform float uBuild; uniform float uOct;
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

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

// instances scale in from nothing as construction passes their rank (aRank is 0 where the attribute is absent)
const VERT = /* glsl */ `
${COMMON}
attribute float aRank; attribute float aSeed;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vSeed; varying vec3 vObj; varying vec3 vObjN;
void main() {
  float s = smoothstep(aRank, aRank + 0.015, uBuild);
  #ifdef USE_INSTANCING
  mat4 mw = modelMatrix * instanceMatrix;
  #else
  mat4 mw = modelMatrix;
  #endif
  vec4 wp = mw * vec4(position * s, 1.0);
  vW = wp.xyz; vUv = uv; vSeed = aSeed; vObj = position; vObjN = normal;
  vN = normalize(mat3(mw) * normal);
  #ifdef JITTER
  // each collector sits at its own slight angle: reflections break into a patchwork, as on the renders
  vN = normalize(vN + (vec3(fract(aSeed * 17.3), fract(aSeed * 31.7), fract(aSeed * 47.1)) - 0.5) * 0.35);
  #endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const PANEL_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uTint; uniform vec2 uGrid; uniform float uGrow;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vSeed;
void main() {
  vec2 uv = vUv; float seed = vSeed;
  #ifdef BELT
  if (vUv.x > uGrow) discard;
  vec2 cell = floor(vUv * uGrid); uv = fract(vUv * uGrid); seed = hash3(vec3(cell, 7.0));
  #endif
  vec2 e = min(uv, 1.0 - uv);
  float frame = 1.0 - smoothstep(0.0, 0.07, min(e.x, e.y));
  vec3 col;
  if (!gl_FrontFacing) {
    // the side facing the star, seen through the gaps of the unfinished shell
    col = vec3(1.0, 0.82, 0.64) * (0.7 + 0.8 * seed) * (1.0 - 0.6 * frame);
  } else {
    vec3 v = normalize(cameraPosition - vW); vec3 n = normalize(vN);
    vec2 g = abs(fract(uv * vec2(3.0, 2.0)) - 0.5);
    float cells = smoothstep(0.44, 0.5, max(g.x, g.y));
    vec3 r = reflect(-v, n);
    float sky = pow(clamp(r.y * 0.5 + 0.5, 0.0, 1.0), 2.5);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 env = mix(vec3(0.01, 0.014, 0.03), vec3(0.17, 0.23, 0.4), sky) * (0.35 + 1.0 * seed);
    float glint = pow(max(dot(r, normalize(vec3(-0.4, 0.6, 0.7))), 0.0), 32.0) * step(0.8, seed);
    col = uTint * (0.5 + 0.6 * seed) + env * (0.4 + 0.6 * fres) + glint * vec3(1.0, 0.97, 0.92);
    col += frame * vec3(0.16, 0.2, 0.32) * 0.35 + cells * vec3(0.04, 0.05, 0.09);
    // a few lit service windows, warm and cyan
    float lit = step(0.975, fract(seed * 91.7));
    col += lit * (1.0 - frame) * mix(vec3(1.0, 0.78, 0.45), vec3(0.35, 0.8, 1.0), step(0.5, fract(seed * 13.1))) * 0.9;
  }
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

const METAL_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uBase; uniform float uGrow; uniform float uLights;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vSeed; varying vec3 vObj; varying vec3 vObjN;
void main() {
  #ifdef RING
  if (vUv.x > uGrow) discard;
  #endif
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
  vec3 v = normalize(cameraPosition - vW); vec3 l = normalize(-vW);
  float ndl = max(dot(n, l), 0.0);
  float spec = pow(max(dot(n, normalize(l + v)), 0.0), 48.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 fill = vec3(0.09, 0.12, 0.22) * (0.6 + 0.4 * n.y) + vec3(0.05, 0.06, 0.1);
  vec3 col = uBase * (fill + vec3(1.0, 0.93, 0.82) * ndl * 1.1) + spec * vec3(1.0, 0.95, 0.85) * 1.6 + fres * vec3(0.3, 0.45, 0.85) * 0.55;
  #ifdef RING
  // brass collars and running lights crawling along the ring
  col = mix(col, col * 1.8 + vec3(0.3, 0.22, 0.1) * (0.3 + ndl), step(0.985, fract(vUv.x * 48.0)));
  col += step(0.93, fract(vUv.x * uLights - uTime * 0.03)) * step(abs(vUv.y - 0.25), 0.07) * vec3(0.55, 0.8, 1.0) * 3.0;
  #endif
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

const SWARM_VERT = /* glsl */ `
${COMMON}
uniform float uPx;
attribute float aRank; attribute vec4 aOrbit; attribute vec3 aMisc;
varying float vB; varying float vWarm;
void main() {
  float s = smoothstep(aRank, aRank + 0.02, uBuild);
  float ang = aOrbit.w + uTime * aMisc.x;
  vec3 p = vec3(cos(ang), 0.0, sin(ang)) * aOrbit.x;
  float ci = cos(aOrbit.y), si = sin(aOrbit.y), cn = cos(aOrbit.z), sn = sin(aOrbit.z);
  p = vec3(p.x, p.y * ci - p.z * si, p.y * si + p.z * ci);
  p = vec3(p.x * cn + p.z * sn, p.y, -p.x * sn + p.z * cn);
  vec3 nrm = normalize(p);
  vec3 t = normalize(cross(nrm, vec3(0.31, 0.9, 0.2)));
  vec3 b = cross(nrm, t);
  vec3 toCam = cameraPosition - p;
  float dist = length(toCam);
  float px = dist * uPx * 1.2;
  float size = max(aMisc.y, px) * s;
  vec3 wp = p + (position.x * 1.6 * t + position.y * b) * size;
  // below a pixel the panel is drawn at a pixel and dimmed by its real coverage
  vB = clamp(aMisc.y / px, 0.25, 1.0) * (0.35 + 0.65 * pow(1.0 - abs(dot(nrm, toCam / dist)), 2.0));
  vWarm = step(0.97, aMisc.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const SWARM_FRAG = /* glsl */ `
varying float vB; varying float vWarm;
void main() {
  gl_FragColor = vec4(mix(vec3(0.22, 0.27, 0.4) * vB, vec3(1.2, 0.9, 0.6), vWarm), 1.0);
  ${OUT}
}`;

const STAR_FRAG = /* glsl */ `
${COMMON}
varying vec3 vW; varying vec3 vN; varying vec3 vObj;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float mu = max(dot(normalize(vN), v), 0.0);
  float gran = fbm(vObj * 6.0 + vec3(0.0, uTime * 0.05, 0.0));
  vec3 col = mix(vec3(1.0, 0.78, 0.5), vec3(1.0, 0.97, 0.92), pow(mu, 0.4)) * (2.2 + 1.4 * gran) * (0.55 + 0.45 * sqrt(mu));
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
uniform float uHalo; uniform float uCore; varying vec2 vP; varying float vNear;
void main() {
  float r = length(vP);
  // r = 0.1 is the star's radius, 0.26 the shell's
  vec3 col = (vec3(1.0, 0.96, 0.92) * exp(-r * 22.0) * 3.0 + vec3(0.45, 0.6, 1.0) * exp(-r * 9.0) * 0.3) * uCore * vNear
    + vec3(0.1, 0.18, 0.5) * exp(-r * 2.5) * 0.05 * uHalo;
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
  vec3 night = mix(vec3(0.004, 0.01, 0.026), vec3(0.012, 0.014, 0.02), land) + city * vec3(1.0, 0.72, 0.38) * 2.2 * (1.0 - clouds * 0.7);
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
  gl_FragColor = vec4(vC * a, 1.0);
  ${OUT}
}`;

const shader = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform> = {}, extra: THREE.ShaderMaterialParameters = {}) =>
  new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...U, ...uniforms }, ...extra });

// deterministic: the same structure on every visit
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Item = { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; rank: number; seed: number };

/** Instances sorted by the construction value at which they appear: count = how many have appeared. */
const ranked = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[]) => {
  items.sort((a, b) => a.rank - b.rank);
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const rank = new Float32Array(items.length);
  const seed = new Float32Array(items.length);
  const m = new THREE.Matrix4();
  items.forEach((it, i) => {
    mesh.setMatrixAt(i, m.compose(it.p, it.q, it.s));
    rank[i] = it.rank;
    seed[i] = it.seed;
  });
  geometry.setAttribute("aRank", new THREE.InstancedBufferAttribute(rank, 1));
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
  mesh.userData.ranks = rank;
  return mesh;
};

const below = (sorted: Float32Array, v: number) => {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
// orientation whose +Z is `normal` (what Object3D.lookAt does, without an Object3D per panel)
const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const facing = (p: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3) =>
  new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(_v.copy(p).add(normal), p, up));

/** sun: light on Earth, from behind as the opening shot sees it (a lit crescent, the night side with cities) */
export type Layout = { earth: THREE.Vector3; earthR: number; boom: THREE.Vector3; sun: THREE.Vector3 };
export type World = ReturnType<typeof buildWorld>;

export function buildWorld(tier: Tier, layout: Layout) {
  const cfg = TIERS[tier];
  const r = rng(20261015);
  const group = new THREE.Group();
  const rankedMeshes: THREE.InstancedMesh[] = [];
  const add = <T extends THREE.Object3D>(o: T) => (group.add(o), o);

  // ---------------------------------------------------------------- star and its light
  add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), shader(VERT, STAR_FRAG)));
  const glowMat = shader(GLOW_VERT, GLOW_FRAG, { uSize: { value: 10 }, uHalo: { value: 1 }, uCore: { value: 1 } }, {
    // drawn over the shell like a lens bloom: the star burns through the unfinished structure
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true,
  });
  const glow = add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMat));
  glow.frustumCulled = false;
  glow.renderOrder = 2;

  // ---------------------------------------------------------------- collector shell: rows of panels, equator first
  const panel = (tint: THREE.Color, defines: Record<string, string> = {}, grid = [1, 1]) =>
    shader(VERT, PANEL_FRAG, { uTint: { value: tint }, uGrid: { value: new THREE.Vector2(...grid) }, uGrow: { value: 1 } }, {
      side: THREE.DoubleSide, defines,
    });
  const tiles: Item[] = [];
  const LAT = deg(78);
  const tileH = Math.sqrt((4 * Math.PI * SHELL_R * SHELL_R * Math.sin(LAT)) / cfg.tiles / 1.4);
  const rows = Math.round((2 * LAT * SHELL_R) / tileH);
  for (let row = 0; row < rows; row++) {
    const lat = -LAT + ((row + 0.5) * 2 * LAT) / rows;
    const circ = 2 * Math.PI * SHELL_R * Math.cos(lat);
    const n = Math.max(3, Math.round(circ / (tileH * 1.4)));
    const off = r() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const lon = off + (k * 2 * Math.PI) / n;
      const p = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(SHELL_R);
      // construction spreads from the equator in irregular patches, never as a clean band
      const patch = 0.5 + 0.5 * Math.sin(3 * lon + 2 * lat) * Math.cos(2 * lon - 4 * lat);
      tiles.push({
        p, q: facing(p, p.clone().normalize(), Y), s: new THREE.Vector3((circ / n) * 0.93, tileH * 0.9, 1),
        rank: Math.abs(Math.sin(lat)) * 0.55 + patch * 0.35 + r() * 0.08, seed: r(),
      });
    }
  }
  // ranks become evenly spaced: construction 0.42 means 42% of the shell is in place
  tiles.sort((a, b) => a.rank - b.rank).forEach((t, i) => (t.rank = (i / tiles.length) * 0.97));
  rankedMeshes.push(add(ranked(new THREE.PlaneGeometry(1, 1), panel(new THREE.Color(0.05, 0.065, 0.11), { JITTER: "" }), tiles)));

  // the frame the panels hang on: always complete, it is what the visitor sees through the gaps
  const lattice: number[] = [];
  const LR = SHELL_R - 0.015;
  const ring = (f: (a: number) => THREE.Vector3) => {
    for (let i = 0; i < 96; i++) lattice.push(...f((i / 96) * Math.PI * 2).toArray(), ...f(((i + 1) / 96) * Math.PI * 2).toArray());
  };
  for (let m = 0; m < 24; m++) {
    const lon = (m / 24) * Math.PI * 2;
    ring((a) => new THREE.Vector3(Math.cos(a) * Math.cos(lon), Math.sin(a), Math.cos(a) * Math.sin(lon)).multiplyScalar(LR));
  }
  for (let lat = -72; lat <= 72; lat += 12) {
    const c = Math.cos(deg(lat));
    ring((a) => new THREE.Vector3(Math.cos(a) * c, Math.sin(deg(lat)), Math.sin(a) * c).multiplyScalar(LR));
  }
  const latticeGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lattice, 3));
  add(new THREE.LineSegments(latticeGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0.22, 0.28, 0.45), transparent: true, opacity: 0.55 })));

  // equatorial thermal belt: wraps around as construction goes on
  const beltMat = panel(new THREE.Color(0.07, 0.05, 0.14), { BELT: "" }, [Math.round(cfg.seg / 2), 3]);
  add(new THREE.Mesh(new THREE.CylinderGeometry(SHELL_R + 0.07, SHELL_R + 0.07, 0.42, cfg.seg, 1, true), beltMat));

  // polar crowns of radiator vanes around the plasma collectors
  const crown: Item[] = [];
  for (const pole of [1, -1]) {
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const p = radial.clone().multiplyScalar(0.85).setY(pole * 2.55);
      const normal = radial.clone().multiplyScalar(Math.sin(deg(25))).setY(pole * Math.cos(deg(25)));
      crown.push({ p, q: facing(p, normal, radial), s: new THREE.Vector3(0.2, 0.9, 1), rank: 0.55 + 0.35 * ((k + (pole > 0 ? 0 : 24)) / 48), seed: r() });
    }
  }
  rankedMeshes.push(add(ranked(new THREE.PlaneGeometry(1, 1), panel(new THREE.Color(0.13, 0.08, 0.12)), crown)));

  // statite mirrors inside the shell: violet points seen through the gaps
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

  // ---------------------------------------------------------------- service rings, joined to the shell by spokes
  const metal = (base: THREE.Color, defines: Record<string, string> = {}, extra: Record<string, THREE.IUniform> = {}) =>
    shader(VERT, METAL_FRAG, { uBase: { value: base }, uGrow: { value: 1 }, uLights: { value: 0 }, ...extra }, { defines, side: THREE.DoubleSide });
  const steel = new THREE.Color(0.16, 0.19, 0.28);
  const RINGS = [
    { R: 3.05, tube: 0.035, rot: [8, 0, 5], grow: null },
    { R: 3.4, tube: 0.045, rot: [78, 20, 0], grow: null },
    { R: 4.2, tube: 0.05, rot: [100, -35, 12], grow: null },
    { R: 4.9, tube: 0.055, rot: [62, 70, -18], grow: [0.42, 0.78] },
  ] as const;
  const ringMats: { mat: THREE.ShaderMaterial; grow: readonly [number, number] }[] = [];
  const spokes: Item[] = [];
  for (const spec of RINGS) {
    const mat = metal(steel, { RING: "" }, { uLights: { value: Math.round(spec.R * 40) } });
    const mesh = add(new THREE.Mesh(new THREE.TorusGeometry(spec.R, spec.tube, 8, cfg.seg), mat));
    mesh.rotation.set(deg(spec.rot[0]), deg(spec.rot[1]), deg(spec.rot[2]));
    mesh.updateMatrix();
    if (spec.grow) ringMats.push({ mat, grow: spec.grow });
    for (let k = 0; k < 6; k++) {
      const f = (k + 0.3) / 6;
      const q = new THREE.Vector3(Math.cos(f * Math.PI * 2), Math.sin(f * Math.PI * 2), 0).multiplyScalar(spec.R).applyMatrix4(mesh.matrix);
      const s = q.clone().setLength(SHELL_R + 0.02);
      const dir = q.clone().sub(s);
      spokes.push({
        p: s.clone().add(q).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().normalize()),
        s: new THREE.Vector3(0.016, dir.length(), 0.016), rank: spec.grow ? spec.grow[0] + (spec.grow[1] - spec.grow[0]) * f : 0, seed: 0,
      });
    }
  }
  rankedMeshes.push(add(ranked(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), metal(steel), spokes)));

  // ---------------------------------------------------------------- booms with stations at their ends
  const booms = [layout.boom.clone(), new THREE.Vector3(0.3, 0.85, -0.4).setLength(7.5), new THREE.Vector3(0.5, -0.6, 0.6).setLength(7)];
  const trussGeo = new THREE.BoxGeometry(1, 1, 1);
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

  // ---------------------------------------------------------------- the free swarm: orbits computed on the GPU
  const swarmGeo = new THREE.PlaneGeometry(1, 1);
  const orbit = new Float32Array(cfg.swarm * 4);
  const misc = new Float32Array(cfg.swarm * 3);
  const rank = new Float32Array(cfg.swarm);
  const planes = Array.from({ length: 9 }, () => ({ inc: 0.1 + r() * 1.3, node: r() * Math.PI * 2 }));
  for (let i = 0; i < cfg.swarm; i++) {
    const pl = planes[i % planes.length];
    const radius = 3.3 + (i % planes.length) * 0.35 + (r() + r() - 1) * 0.12;
    orbit.set([radius, pl.inc, pl.node, r() * Math.PI * 2], i * 4);
    misc.set([0.06 * Math.pow(3.3 / radius, 1.5), r() < 0.03 ? 0.045 : 0.01 + r() * 0.018, r()], i * 3);
    rank[i] = r() * 0.95;
  }
  rank.sort();
  swarmGeo.setAttribute("aOrbit", new THREE.InstancedBufferAttribute(orbit, 4));
  swarmGeo.setAttribute("aMisc", new THREE.InstancedBufferAttribute(misc, 3));
  swarmGeo.setAttribute("aRank", new THREE.InstancedBufferAttribute(rank, 1));
  const swarm = add(new THREE.InstancedMesh(swarmGeo, shader(SWARM_VERT, SWARM_FRAG, {}, { side: THREE.DoubleSide }), cfg.swarm));
  swarm.userData.ranks = rank;
  swarm.frustumCulled = false; // positions live in the shader
  rankedMeshes.push(swarm);

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

  // ---------------------------------------------------------------- sky: a shell of points that travels with the camera
  const sky = new Float32Array(cfg.stars * 3);
  const size = new Float32Array(cfg.stars);
  const color = new Float32Array(cfg.stars * 3);
  const band = new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(60), 0, deg(25)));
  for (let i = 0; i < cfg.stars; i++) {
    // a third of the stars crowd a galactic band
    const y = i % 3 === 0 ? (r() + r() + r() - 1.5) * 0.18 : r() * 2 - 1;
    const a = r() * Math.PI * 2;
    const c = Math.sqrt(1 - y * y);
    new THREE.Vector3(Math.cos(a) * c, y, Math.sin(a) * c).applyQuaternion(band).multiplyScalar(900).toArray(sky, i * 3);
    size[i] = 0.8 + Math.pow(r(), 6) * 2.6;
    const warm = r();
    color.set([0.7 + warm * 0.3, 0.75 + warm * 0.15, 1.0 - warm * 0.2].map((v) => v * (0.35 + r() * 0.65)), i * 3);
  }
  const skyGeo = new THREE.BufferGeometry()
    .setAttribute("position", new THREE.BufferAttribute(sky, 3))
    .setAttribute("aSize", new THREE.BufferAttribute(size, 1))
    .setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  const stars = add(new THREE.Points(skyGeo, shader(SKY_VERT, SKY_FRAG, {}, { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })));
  stars.frustumCulled = false;
  stars.renderOrder = -1;

  return {
    group,
    stars,
    /** construction 0..1: instance counts, growing rings and belt, the star's halo dimming as the shell closes */
    update(build: number) {
      U.uBuild.value = build;
      rankedMeshes.forEach((m) => (m.count = Math.min(m.userData.ranks.length, below(m.userData.ranks, build))));
      ringMats.forEach(({ mat, grow }) => (mat.uniforms.uGrow.value = THREE.MathUtils.clamp((build - grow[0]) / (grow[1] - grow[0]), 0, 1)));
      beltMat.uniforms.uGrow.value = THREE.MathUtils.smoothstep(build, 0.48, 0.92);
      glowMat.uniforms.uHalo.value = 1 - 0.85 * THREE.MathUtils.smoothstep(build, 0.6, 1);
      glowMat.uniforms.uCore.value = 1 - 0.92 * THREE.MathUtils.smoothstep(build, 0.55, 0.97);
    },
    /** instances actually submitted to the GPU this frame */
    instances: () => group.children.reduce((s, o) => s + ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 0), 0),
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
        (o as THREE.InstancedMesh).dispose?.();
      });
    },
  };
}
