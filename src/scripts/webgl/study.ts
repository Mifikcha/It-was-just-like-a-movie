// The study the author's scene is seen from: a short cylindrical pod far out from Saturn, its round window facing
// the planet. Dark matte surfaces lit by two screens and a sliver of sunlight, thin Tokyo Night edges on the furniture.
// The camera flies in through the open back of the pod and stops behind the desk, Saturn framed by the window.
import * as THREE from "three";
import { OUT, shader } from "./world";

// on the sun side, a little above the ring plane; the stage shows it only on the flights in and out, so it never
// stands in the opening shot
const POS = new THREE.Vector3(-4.9, 3.1, 13.9);
/** what the window faces: below Saturn, so the planet rides above the screens in the round frame */
const FACE = new THREE.Vector3(0.3, -2.5, 0);
const R = 0.62;
const FRONT = -0.75;
const BACK = 1.15;
const TAU = Math.PI * 2;

// pod frame: -Z towards the window (Matrix4.lookAt points +Z from the target to the eye)
const frame = new THREE.Matrix4().lookAt(POS, FACE, new THREE.Vector3(0, 1, 0)).setPosition(POS);
const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(frame);

/** camera stops of the flight in and out, in world space */
export const STUDY = {
  /** behind the desk, eyes a little above it */
  cam: at(0.03, 0.0, 0.42),
  look: at(0.0, 0.05, -4),
  /** in the open back of the pod */
  mouth: at(0.0, 0.06, BACK + 0.25),
  /** outside, behind and above: the pod against Saturn before the camera slips in */
  behind: at(0.35, 0.55, BACK + 3.2),
};

// the screens: a slow plot over a faint grid, the jets and their vortex street drawn as data
const SCREEN_FRAG = /* glsl */ `
uniform float uTime; uniform float uSeed;
varying vec2 vUv;
void main() {
  vec2 g = abs(fract(vUv * vec2(12.0, 7.0)) - 0.5);
  float grid = (1.0 - smoothstep(0.0, 0.06, min(g.x, g.y))) * 0.16;
  float x = vUv.x * 9.0 + uSeed * 3.0;
  float y1 = 0.5 + 0.22 * sin(x + uTime * 0.6) * cos(x * 0.37 - uTime * 0.2);
  float y2 = 0.3 + 0.1 * sin(x * 2.3 - uTime * 0.9 + uSeed);
  float l1 = 1.0 - smoothstep(0.0, 0.018, abs(vUv.y - y1));
  float l2 = 1.0 - smoothstep(0.0, 0.012, abs(vUv.y - y2));
  vec3 col = vec3(0.02, 0.03, 0.08) + vec3(0.48, 0.64, 0.97) * grid * 0.7 + vec3(0.49, 0.81, 1.0) * l1 * 0.6 + vec3(0.97, 0.46, 0.56) * l2 * 0.45;
  // edge vignette: an LCD glow, not a flat card
  vec2 e = min(vUv, 1.0 - vUv);
  col *= 0.6 + 0.4 * smoothstep(0.0, 0.08, min(e.x, e.y));
  gl_FragColor = vec4(col, 1.0);
  ${OUT}
}`;
const SCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function buildStudy(sun: THREE.Vector3) {
  const root = new THREE.Group();
  const pod = new THREE.Group();
  pod.matrixAutoUpdate = false;
  pod.matrix.copy(frame);
  root.add(pod);

  const mat = (color: number) => new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  // graphite, barely cool: the colour in this room comes from the screens and the window
  const hull = mat(0x2a2c36);
  const rib = mat(0x3a3d4c);
  const panel = mat(0x1e2029);
  const desk = mat(0x6b7088);
  const dark = mat(0x14151c);
  const edge = new THREE.LineBasicMaterial({ color: 0x7aa2f7, transparent: true, opacity: 0.28, depthWrite: false });
  const glow = new THREE.MeshBasicMaterial({ color: 0x7dcfff });
  const put = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, edges = false, ry = 0, rx = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    pod.add(mesh);
    if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), edge));
    return mesh;
  };
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, edges = true, ry = 0, rx = 0) =>
    put(new THREE.BoxGeometry(w, h, d), m, x, y, z, edges, ry, rx);

  // ---------------------------------------------------------------- the hull: a tube open at the back, ribs inside
  put(new THREE.CylinderGeometry(R, R, BACK - FRONT, 64, 1, true).rotateX(Math.PI / 2), hull, 0, 0, (BACK + FRONT) / 2);
  for (let z = FRONT + 0.2; z < BACK; z += 0.4) put(new THREE.TorusGeometry(R - 0.012, 0.016, 8, 72), rib, 0, 0, z);
  put(new THREE.TorusGeometry(R, 0.03, 10, 72), rib, 0, 0, BACK);
  // panel seams along the tube
  const seams: THREE.Vector3[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    seams.push(new THREE.Vector3(Math.cos(a) * (R - 0.004), Math.sin(a) * (R - 0.004), FRONT), new THREE.Vector3(Math.cos(a) * (R - 0.004), Math.sin(a) * (R - 0.004), BACK));
  }
  pod.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seams), new THREE.LineBasicMaterial({ color: 0x7aa2f7, transparent: true, opacity: 0.1, depthWrite: false })));

  // ---------------------------------------------------------------- the window wall: a round frame, three brackets
  put(new THREE.RingGeometry(0.4, R, 72), panel, 0, 0, FRONT);
  put(new THREE.TorusGeometry(0.4, 0.028, 12, 96), rib, 0, 0, FRONT + 0.01);
  put(new THREE.TorusGeometry(0.5, 0.008, 6, 96), rib, 0, 0, FRONT + 0.012);
  const ring = Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * TAU) * 0.445, Math.sin((i / 128) * TAU) * 0.445, FRONT + 0.016));
  pod.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), new THREE.LineBasicMaterial({ color: 0x7dcfff, transparent: true, opacity: 0.4, depthWrite: false })));
  for (const a of [Math.PI / 2, Math.PI / 2 + TAU / 3, Math.PI / 2 - TAU / 3]) {
    box(0.016, 0.075, 0.03, desk, Math.cos(a) * 0.43, Math.sin(a) * 0.43, FRONT + 0.02, false).rotation.z = a - Math.PI / 2;
  }

  // ---------------------------------------------------------------- floor, desk and what is on it
  box(0.92, 0.015, BACK - FRONT, dark, 0, -0.42, (BACK + FRONT) / 2, false);
  put(new THREE.BoxGeometry(0.26, 0.006, 0.018), glow, 0, -0.41, 0.15);
  box(0.66, 0.024, 0.25, desk, 0, -0.17, -0.57);
  box(0.62, 0.24, 0.02, dark, 0, -0.3, -0.455);
  box(0.02, 0.24, 0.22, dark, -0.3, -0.3, -0.57, false);
  // two screens turned in toward the chair
  const screens = [[-0.2, -0.062, -0.63, 0.28, 0.4], [0.215, -0.06, -0.63, -0.3, 1.7]];
  for (const [x, y, z, ry, seed] of screens) {
    const m = box(0.205, 0.128, 0.008, dark, x, y, z, true, ry);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.114), shader(SCREEN_VERT, SCREEN_FRAG, { uSeed: { value: seed } }));
    s.position.z = 0.0045;
    m.add(s);
    box(0.012, 0.05, 0.012, dark, x, -0.14, z - 0.01, false, ry);
  }
  // a laptop, open; a notebook; a mug
  box(0.13, 0.006, 0.085, desk, 0.0, -0.155, -0.53);
  box(0.13, 0.085, 0.004, panel, 0.0, -0.115, -0.575, true, 0, -0.25);
  box(0.075, 0.004, 0.055, mat(0xa9b1d6), -0.14, -0.156, -0.5, false, 0.2);
  put(new THREE.CylinderGeometry(0.012, 0.011, 0.024, 16), mat(0xc0caf5), 0.27, -0.146, -0.52);
  // books on a wall shelf, left
  box(0.2, 0.01, 0.09, dark, -0.4, -0.235, -0.36);
  const spines = [0x4a4d5c, 0x6b6f80, 0x9a9cab, 0x3a3c48, 0x8a7fa8, 0xb4b6c2, 0x55586a];
  let bx = -0.485;
  spines.forEach((c, i) => {
    const w = 0.016 + ((i * 7) % 3) * 0.005;
    const h = 0.07 + ((i * 5) % 4) * 0.012;
    box(w, h, 0.07, mat(c), bx + w / 2, -0.23 + h / 2, -0.36, false);
    bx += w + 0.003;
  });

  // ---------------------------------------------------------------- outside: two radiator wings, so the pod reads as a craft
  for (const s of [-1, 1]) box(0.75, 0.008, 0.36, rib, s * (R + 0.42), 0.0, 0.35, true);

  // light: the screens, the room, and the sun through the window
  const lamp = new THREE.PointLight(0x7dcfff, 0.7, 1.2, 1.5);
  lamp.position.set(0, -0.02, -0.5);
  pod.add(lamp);
  const sunLight = new THREE.DirectionalLight(0xe6e2f4, 1.3);
  sunLight.position.copy(POS).addScaledVector(sun, 10);
  sunLight.target.position.copy(POS);
  root.add(sunLight, sunLight.target, new THREE.AmbientLight(0x9aa0c0, 0.32));
  return root;
}
