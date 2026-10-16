// Saturn, drawn in neon light: the planet and its rings are clouds of particles in the Tokyo Night palette.
// The ring structure is the real one (C, B, Cassini division, A, Encke gap, F), the north pole carries the
// hexagon, and the light is honest: the rings shade the planet, the planet shades the rings.
// The planet turns one way, the rings (Kepler) and the moons the other.
// Scroll "activates" it (uLive): a slow survey sweep across the rings and a brighter signal ring.
import * as THREE from "three";
import { buildStudy } from "./study";
import { COMMON, OUT, TIERS, U, buildSky, release, rng, shader, type Tier } from "./world";

/** planet radius; everything else is in these units */
const R = 2;
const TAU = Math.PI * 2;
/** the rings are drawn 30% wider than the real proportion: they carry the composition */
const RING = R * 1.3;
// ring bands in ring units (RING): [inner, outer, optical depth] — C, inner B, outer B, A, A past the Encke gap, F
const BANDS: [number, number, number][] = [
  [1.24, 1.53, 0.16], [1.53, 1.72, 0.7], [1.72, 1.95, 1], [2.03, 2.212, 0.62], [2.228, 2.27, 0.5], [2.318, 2.328, 0.9],
];
const SUN = new THREE.Vector3(-0.78, 0.3, 0.55).normalize();
/** the planet's spin, rad/s: one turn in about half a minute */
const SPIN = 0.2;
// ring orbits follow Kepler (inner faster): the outermost ring at 0.75 x SPIN, the innermost about twice as fast
const ORBIT = 0.6 * SPIN * 1.25 * ((BANDS[BANDS.length - 1][1] * RING) / (R * 2)) ** 1.5;
// atmospheric harvesters riding the pink jets: [starting longitude, jet latitude]. They drift a little slower than the
// clouds, and each sheds a Kármán vortex street behind it: the energy taken out of the jet, made visible
const FLOATS: [number, number][] = [[0.4, 0.42], [2.5, 0.42], [4.6, 0.42], [1.5, -0.42], [3.9, -0.42]];
/** the floats' drift against the clouds, rad/s */
const DRIFT = 0.04;
/** half the vortex spacing in longitude: a whole number around the planet, so the lattice closes */
const HS = TAU / 30;
// particles on the planet, in the rings
const COUNT: Record<Tier, [number, number]> = { low: [22000, 50000], medium: [100000, 220000], high: [180000, 420000] };
// render scale range per tier: points blur at once when the canvas is upscaled, and Saturn has GPU to spare
export const SATURN_RES: Record<Tier, [number, number]> = { low: [0.75, 1.5], medium: [1, 2], high: [1, 2] };

// Tokyo Night, pushed to neon
const NEON = /* glsl */ `
const vec3 TN_BLUE = vec3(0.478, 0.635, 0.969);
const vec3 TN_PURPLE = vec3(0.733, 0.604, 0.969);
const vec3 TN_CYAN = vec3(0.49, 0.812, 1.0);
const vec3 TN_PINK = vec3(0.969, 0.463, 0.557);
const vec3 TN_DEEP = vec3(0.15, 0.17, 0.42);
`;

const RING_OP = /* glsl */ `
float ringOp(float r) {
  r /= ${RING.toFixed(2)};
  float o = 0.0;
${BANDS.map(([a, b, d]) => `  o += ${d.toFixed(2)} * step(${a.toFixed(3)}, r) * step(r, ${b.toFixed(3)});`).join("\n")}
  return o;
}`;

const JET = /* glsl */ `
float wrapPi(float x) { return x - 6.2831853 * floor(x / 6.2831853 + 0.5); }
// the pink jet's latitude at a longitude of the cloud frame: the line wanders with the band noise
float jetY(float lon, float j) {
  float c = sqrt(1.0 - j * j);
  return j - (vnoise(vec3(cos(lon) * c, j, sin(lon) * c) * 4.0) - 0.5) * 0.09;
}
// one harvester's street: vortex sites fixed in the clouds, alternating side and spin. A site turns once the float has
// passed it, its eddy widening and fading downstream. Returns how far to swirl the cloud lookup at (lon, y).
vec2 street(float lon, float y, float cl, float h0, float j, float len) {
  float h = h0 + uTime * ${DRIFT.toFixed(3)};
  float x = wrapPi(h - lon);
  if (x < -0.25 || x > len + 0.25 || abs(y - j) > 0.25) return vec2(0.0);
  vec2 w = vec2(0.0);
  float m0 = floor(lon / ${HS.toFixed(5)} + 0.5);
  for (int k = -1; k <= 1; k++) {
    float m = m0 + float(k), lc = m * ${HS.toFixed(5)};
    float age = wrapPi(h - lc);
    float side = mod(m, 2.0) * 2.0 - 1.0;
    vec2 d = vec2(wrapPi(lon - lc) * cl, y - jetY(lc, j) - side * 0.06);
    float sig = 0.055 * (1.0 + max(age, 0.0) / 1.8);
    float a = side * 2.6 * smoothstep(0.0, 0.2, age) * (1.0 - smoothstep(0.35 * len, len, age)) * exp(-dot(d, d) / (2.0 * sig * sig));
    w += vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a)) - d;
  }
  return w;
}`;

// size in pixels from the particle's world size. Below 1.2 px a share of the particles equal to their real coverage
// is kept at full strength and the rest dropped: dimming them all instead averages hundreds of faint dots per pixel
// into haze. Below 1.6 px a sprite is widened to 1.6 px with a soft profile and dimmed to keep its light: spread over a
// few pixels it glides across the pixel grid as the rings turn, instead of flickering on and off.
// Close up the size is capped (the fragment shader turns those into crisp grains).
const POINT = /* glsl */ `
uniform float uPx; uniform float uSize;
varying float vPx; varying float vSoft;
float pointSize(vec4 mv, float seed, out float gain) {
  float px = uSize / (-mv.z * uPx);
  float cov = clamp(px / 1.2, 0.0, 1.0);
  vSoft = 1.0 - smoothstep(1.3, 2.0, px);
  float p = max(px, 1.2);
  gain = step(fract(seed * 917.31), cov * cov) * mix(1.0, p * p * 0.24, vSoft);
  vPx = clamp(px, 1.6, 4.0);
  return vPx;
}`;

const PLANET_VERT = /* glsl */ `
${COMMON}
${NEON}
${RING_OP}
${POINT}
${JET}
uniform vec3 uSun;
attribute float aSeed;
varying vec3 vC; varying float vA;
float sdHex(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p); p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy; p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
void main() {
  vec3 n = normalize(position);
  // the cloud pattern turns with the planet, against the rings; light and shadows stay with the sun
  float a = uTime * ${SPIN};
  vec3 s = vec3(n.x * cos(a) - n.z * sin(a), n.y, n.x * sin(a) + n.z * cos(a));
  // the harvesters' vortex streets swirl the point the cloud pattern is read from (the wake grows with uLive)
  float cl = max(sqrt(1.0 - s.y * s.y), 0.1), sl = atan(s.z, s.x), len = mix(0.5, 1.8, uLive);
  vec2 w = vec2(0.0);
${FLOATS.map(([h, j]) => `  w += street(sl, s.y, cl, ${h.toFixed(2)}, ${j.toFixed(2)}, len);`).join("\n")}
  sl += w.x / cl;
  float sy = clamp(s.y + w.y, -1.0, 1.0);
  s = vec3(cos(sl), 0.0, sin(sl)) * sqrt(1.0 - sy * sy) + vec3(0.0, sy, 0.0);
  float lon = atan(s.z, s.x);
  // band edges: festoons along the jets and small eddies where they shear
  float lat = s.y + (vnoise(s * 4.0) - 0.5) * 0.09
    + sin(lon * 11.0 + n.y * 40.0) * 0.012 + (vnoise(s * vec3(16.0, 48.0, 16.0)) - 0.5) * 0.02;
  float belts = vnoise(vec3(lat * 17.0, 0.5, 0.5));
  float fine = vnoise(vec3(lat * 70.0, 2.5, 0.5));
  // violet zones over deep indigo belts, a thin pink jet at mid latitudes, a blue-cyan equatorial zone
  vec3 col = mix(TN_PURPLE * 0.85, TN_DEEP * 0.8, smoothstep(0.3, 0.72, belts)) * (0.65 + 0.4 * fine);
  // cloud streaks stretched along the jets: zonal bands alone hide the spin, these make it read
  col *= 0.6 + 0.75 * smoothstep(0.35, 0.8, vnoise(vec3(s.x * 3.0, s.y * 55.0, s.z * 3.0)));
  col = mix(col, TN_PINK, 0.55 * (1.0 - smoothstep(0.0, 0.035, abs(abs(lat) - 0.42))));
  col = mix(col, mix(TN_BLUE, TN_CYAN, 0.5), 0.7 * (1.0 - smoothstep(0.0, 0.12, abs(lat))));
  // the north polar hexagon: a deep indigo cap inside a cyan jet
  float h = sdHex(s.xz, 0.2);
  float cap = step(0.0, s.y);
  col = mix(col, TN_DEEP * 0.6, cap * smoothstep(0.015, -0.015, h));
  col += cap * TN_CYAN * 0.9 * (1.0 - smoothstep(0.0, 0.018, abs(h)));
  col *= 1.0 - cap * 0.7 * smoothstep(0.05, 0.0, length(s.xz));

  float ndl = dot(n, uSun);
  float day = smoothstep(-0.06, 0.35, ndl);
  // the rings' shadow: follow the ray to the sun down to the ring plane
  float t = -position.y / uSun.y;
  float shade = t > 0.0 ? ringOp(length((position + uSun * t).xz)) : 0.0;
  vec3 v = normalize(cameraPosition - position);
  float mu = max(dot(n, v), 0.0);
  // a neon rim: violet-cyan on the lit limb, a faint pink edge on the night side
  float rim = pow(1.0 - mu, 2.5);
  vC = col * (0.03 + day * (1.0 - 0.82 * min(shade, 1.0)))
    + mix(TN_PURPLE, TN_CYAN, 0.45) * rim * 0.22 * day + TN_PINK * rim * 0.12 * (1.0 - day);

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float gain;
  gl_PointSize = pointSize(mv, aSeed, gain);
  // the limb stacks particles: thin it out so the disc reads as a sphere, not a ring of light
  vA = gain * (1.0 + 0.45 * aSeed) * mix(0.45, 1.0, mu);
  gl_Position = projectionMatrix * mv;
}`;

const RING_VERT = /* glsl */ `
${COMMON}
${NEON}
${RING_OP}
${POINT}
uniform vec3 uSun;
attribute float aSeed;
varying vec3 vC; varying float vA;
void main() {
  // position carries (radius, phase, height): Kepler orbits on the GPU, inner particles faster
  float r = position.x;
  float ang = position.y + uTime * ${ORBIT.toFixed(4)} * pow(r / ${(R * 2).toFixed(1)}, -1.5);
  vec3 p = vec3(cos(ang) * r, position.z, sin(ang) * r);
  float rr = r / ${RING.toFixed(2)};
  float op = ringOp(r);
  // C ring deep blue, B blue into cyan, A violet, F the pink signal line
  vec3 col = mix(TN_BLUE * 0.7, mix(TN_BLUE, TN_CYAN, smoothstep(1.6, 1.9, rr)), smoothstep(1.5, 1.6, rr));
  col = mix(col, TN_PURPLE, smoothstep(1.97, 2.05, rr));
  col = mix(col, TN_PINK * (1.0 + 0.6 * uLive), step(2.3, rr));
  // ringlets
  float b = 0.55 * (0.3 + 0.8 * hash3(vec3(floor(rr * 240.0)))) * (0.35 + 0.9 * aSeed) * (0.3 + op);
  // the planet's shadow behind it
  float along = dot(p, uSun);
  float shadow = step(along, 0.0) * (1.0 - smoothstep(${(R * 0.97).toFixed(2)}, ${(R * 1.03).toFixed(2)}, length(p - uSun * along)));
  b *= 1.0 - 0.95 * shadow;
  // spiral density waves launched at moon resonances: ripples that tighten and fade away from their source
  float wave = 0.0;
  for (int i = 0; i < 4; i++) {
    float x = rr - (i == 0 ? 1.7 : 2.07 + float(i - 1) * 0.055);
    wave += step(0.0, x) * exp(-x * 50.0) * sin(x * 314.0 + x * x * 12000.0);
  }
  // and the sharp, bright outer edge of the B ring
  b *= 1.0 + 0.45 * wave + 0.6 * smoothstep(1.92, 1.95, rr) * step(rr, 1.95);
  // seen from the unlit side, dense rings go dark and thin ones glow
  b *= mix(1.0, 0.2 + 0.9 * (1.0 - op), step(cameraPosition.y * uSun.y, 0.0));
  // a slow survey sweep with a fading tail: the activated system being read
  float sweep = fract((atan(p.z, p.x) - uTime * 0.07) / 6.2831853);
  col += TN_CYAN * 0.6 * uLive * pow(sweep, 24.0);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float gain;
  gl_PointSize = pointSize(mv, aSeed, gain);
  vC = col;
  vA = b * gain * 1.4 * smoothstep(0.06, 0.5, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

// the harvesters: three cyan grains in a row on each jet, like a buoy on a current
const FLOAT_VERT = /* glsl */ `
${COMMON}
${NEON}
${POINT}
${JET}
uniform vec3 uSun;
varying vec3 vC; varying float vA;
void main() {
  // position carries (starting longitude, jet latitude, offset along the stream), all in the cloud frame
  float h = position.x + uTime * ${DRIFT.toFixed(3)};
  float y = jetY(h, position.y);
  float lon = h + position.z - uTime * ${SPIN};
  vec3 n = vec3(cos(lon), 0.0, sin(lon)) * sqrt(1.0 - y * y) + vec3(0.0, y, 0.0);
  // a flash each time the float sheds a vortex
  float shed = pow(1.0 - fract(h / ${HS.toFixed(5)}), 14.0) * uLive;
  vC = mix(TN_CYAN, vec3(1.0), 0.3 + 0.4 * shed);
  vA = (1.4 + 0.6 * uLive) * mix(0.3, 1.0, smoothstep(-0.06, 0.35, dot(n, uSun))) + 2.5 * shed;
  vec4 mv = modelViewMatrix * vec4(n * ${(R * 1.01).toFixed(2)}, 1.0);
  float gain;
  gl_PointSize = pointSize(mv, 0.0, gain);
  gl_Position = projectionMatrix * mv;
}`;

const DOT_FRAG = /* glsl */ `
varying vec3 vC; varying float vA; varying float vPx; varying float vSoft;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float f = 1.0 - d;
  // a tight core with a faint halo: distant particles stay points instead of melting into haze
  float soft = mix(pow(f, 4.0) * 1.15 + pow(f, 1.6) * 0.18, exp(-d * d * 6.0), vSoft);
  // large sprites (close up) become crisp grains with a one-pixel edge and a faint neon halo, not soft blobs
  float aa = 2.0 / vPx;
  float grain = 1.0 - smoothstep(0.55 - aa, 0.55 + aa, d);
  gl_FragColor = vec4(vC * vA * mix(soft, grain * 0.6 + soft * 0.2, smoothstep(2.0, 3.5, vPx)), 1.0);
  ${OUT}
}`;

// the route's stars (stage.pinStars): brighter than the field around them, a tight core in a soft halo
const PIN_VERT = /* glsl */ `
uniform float uPR; attribute float aSeed; varying float vA;
void main() {
  vA = 0.85 + 0.3 * aSeed;
  gl_PointSize = 15.0 * uPR;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const PIN_FRAG = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-d * d * 30.0) * 2.6 + exp(-d * 4.0) * 0.3;
  gl_FragColor = vec4(vec3(0.86, 0.9, 1.0) * a * vA, 1.0);
  ${OUT}
}`;

// moons travel their orbits in the shader: the mesh sits at its starting point, the vertex turns it about the axis
const MOON_VERT = /* glsl */ `
uniform float uTime; uniform float uRate;
varying vec3 vN; varying vec3 vW;
void main() {
  float a = uTime * uRate;
  mat3 turn = mat3(cos(a), 0.0, sin(a), 0.0, 1.0, 0.0, -sin(a), 0.0, cos(a));
  vW = turn * (modelMatrix * vec4(position, 1.0)).xyz;
  vN = turn * normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;

const MOON_FRAG = /* glsl */ `
${NEON}
uniform vec3 uSun;
varying vec3 vN; varying vec3 vW;
void main() {
  vec3 n = normalize(vN);
  float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vW)), 0.0), 2.0);
  gl_FragColor = vec4(vec3(0.78, 0.74, 0.95) * max(dot(n, uSun), 0.0) + TN_PURPLE * rim * 0.5 + 0.01, 1.0);
  ${OUT}
}`;

// a soft neon halo around the planet: a camera-facing quad, hidden behind the planet by the depth test
const HALO_VERT = /* glsl */ `
uniform float uSize; varying vec2 vP;
void main() {
  vP = position.xy * uSize;
  vec4 c = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  c.xy += vP;
  gl_Position = projectionMatrix * c;
}`;

const HALO_FRAG = /* glsl */ `
${NEON}
varying vec2 vP;
void main() {
  float d = length(vP) - ${R.toFixed(1)};
  vec3 col = mix(TN_CYAN, TN_PURPLE, smoothstep(0.0, 0.5, d)) * exp(-max(d, 0.0) * 5.0) * 0.09 * step(0.0, d);
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;

export function buildSaturn(tier: Tier) {
  const [planetN, ringN] = COUNT[tier];
  const r = rng(20261015);
  const group = new THREE.Group();
  const add = <T extends THREE.Object3D>(o: T) => (group.add(o), o);
  const sun = { value: SUN };
  const dots = (vert: string, size: number) =>
    shader(vert, DOT_FRAG, { uSun: sun, uSize: { value: size } }, { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const cloud = (pos: Float32Array, seed: Float32Array, mat: THREE.ShaderMaterial) => {
    const pts = add(new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)).setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)),
      mat,
    ));
    pts.frustumCulled = false; // the rings move in the shader
    return pts;
  };

  // a dark body just under the particle surface hides the far side of the planet and the rings behind it
  add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 64, 32), new THREE.MeshBasicMaterial({ color: 0x04050b })));

  // ---------------------------------------------------------------- planet: a Fibonacci sphere, jittered by half a spacing
  // (even coverage like the lattice, without its moiré)
  const spacing = Math.sqrt((4 * Math.PI) / planetN);
  const pp = new Float32Array(planetN * 3);
  const ps = new Float32Array(planetN);
  const p = new THREE.Vector3();
  for (let i = 0; i < planetN; i++) {
    const y = 1 - (2 * (i + 0.5)) / planetN;
    const c = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    p.set(Math.cos(th) * c, y, Math.sin(th) * c).add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(spacing));
    p.setLength(R * (1 + (r() - 0.5) * 0.006)).toArray(pp, i * 3);
    ps[i] = r();
  }
  // sprites a little wider than the spacing: wider ones overlap their neighbours and blur the bands into haze
  cloud(pp, ps, dots(PLANET_VERT, spacing * R * 1.25));
  const halo = add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shader(HALO_VERT, HALO_FRAG, { uSize: { value: R * 1.8 } }, {
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  })));
  halo.frustumCulled = false;
  const fp = new Float32Array(FLOATS.flatMap(([h, j]) => [-0.012, 0, 0.012].flatMap((o) => [h, j, o])));
  cloud(fp, new Float32Array(fp.length / 3), dots(FLOAT_VERT, spacing * R * 3.5));

  // ---------------------------------------------------------------- rings: bands weighted by area and depth, fine ringlets
  const weights = BANDS.map(([a, b, d]) => (b * b - a * a) * (0.25 + d));
  const total = weights.reduce((s, w) => s + w, 0);
  const rp = new Float32Array(ringN * 3);
  const rs = new Float32Array(ringN);
  for (let i = 0; i < ringN; ) {
    let pick = r() * total;
    const band = BANDS.find((_, k) => (pick -= weights[k]) <= 0) ?? BANDS[0];
    const rr = Math.sqrt(band[0] ** 2 + r() * (band[1] ** 2 - band[0] ** 2));
    // ringlets: a beat of two waves thins some lanes
    if (r() > 0.62 + 0.38 * Math.sin(rr * 151) * Math.sin(rr * 57)) continue;
    rp.set([rr * RING, r() * TAU, (r() - 0.5) * 0.024], i * 3);
    rs[i++] = r();
  }
  const ringArea = Math.PI * RING * RING * BANDS.reduce((s, [a, b]) => s + b * b - a * a, 0);
  cloud(rp, rs, dots(RING_VERT, Math.sqrt(ringArea / ringN) * 0.9));

  // ---------------------------------------------------------------- two moons on thin orbits, with ticks on the outer one
  const line = new THREE.LineBasicMaterial({ color: 0xbb9af7, transparent: true, opacity: 0.22, depthWrite: false });
  // [orbit radius, starting phase, size, angular speed rad/s]: the inner one laps the outer
  for (const [rad, phase, size, rate] of [[7.6, 2.5, 0.07, 0.04], [11.5, 4.3, 0.13, 0.022]]) {
    const ring = Array.from({ length: 256 }, (_, i) => new THREE.Vector3(Math.cos((i / 256) * TAU) * rad, 0, Math.sin((i / 256) * TAU) * rad));
    add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring), line));
    const moon = add(new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), shader(MOON_VERT, MOON_FRAG, { uSun: sun, uRate: { value: rate } })));
    moon.position.set(Math.cos(phase) * rad, 0, Math.sin(phase) * rad);
    moon.frustumCulled = false; // it moves in the shader
  }
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const len = i % 4 ? 0.12 : 0.3;
    return [11.5 - len, 11.5 + len].map((d) => new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d));
  }).flat();
  add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0x7dcfff, transparent: true, opacity: 0.3, depthWrite: false })));

  const study = add(buildStudy(SUN));
  const stars = add(buildSky(TIERS[tier].stars, r));
  return {
    group,
    stars,
    study,
    /** stars at these directions, as far as the sky (they ride with it) */
    pin(dirs: THREE.Vector3[]) {
      stars.children.forEach((c) => release(c as THREE.Group));
      stars.clear();
      const pos = new Float32Array(dirs.flatMap((d) => d.clone().multiplyScalar(880).toArray()));
      const seed = new Float32Array(dirs.map((_, i) => (i * 0.37) % 1));
      const pts = new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)).setAttribute("aSeed", new THREE.BufferAttribute(seed, 1)),
        shader(PIN_VERT, PIN_FRAG, {}, { blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
      );
      pts.frustumCulled = false;
      stars.add(pts);
    },
    update(build: number) {
      U.uLive.value = THREE.MathUtils.smoothstep(build, 0.42, 1);
    },
    instances: () => planetN + ringN,
    dispose: () => release(group),
  };
}
