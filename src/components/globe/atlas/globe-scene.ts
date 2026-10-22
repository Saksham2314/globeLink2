import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  type Material,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Points,
  PointsMaterial,
  Raycaster,
  RepeatWrapping,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  type Texture,
  TextureLoader,
  TubeGeometry,
  CatmullRomCurve3,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import {
  facingRotation,
  framedRotation,
  greatCircleArc,
  latLngToVec3,
  wrapAngle,
} from "@/modules/atlas/geo";

/**
 * The landing-page globe, as a self-contained imperative three.js scene.
 * React owns *what* is selected/highlighted; this class owns every frame.
 * Nothing here calls React state per frame — continuous motion lives in plain
 * fields and the render loop.
 */

export type GlobeTheme = "light" | "dark";

export interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
}

export interface GlobeArc {
  id: string;
  destinationId: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

export interface GlobeSceneOptions {
  host: HTMLElement;
  textureUrl: string;
  markers: GlobeMarker[];
  arcs: GlobeArc[];
  theme: GlobeTheme;
  reducedMotion: boolean;
  /** Touch-first / small screen: lighter geometry, no pointer tracking. */
  lite: boolean;
  onReady: () => void;
  onError: (reason: string) => void;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
}

interface Palette {
  oceanDeep: string;
  oceanShallow: string;
  land: string;
  landHi: string;
  ice: string;
  border: string;
  coast: string;
  grid: string;
  rim: string;
  atmosphere: string;
  cloud: string;
  cloudAlpha: number;
  night: number;
  gridStrength: number;
  borderStrength: number;
  coastStrength: number;
  rimStrength: number;
  atmosphereStrength: number;
  specular: number;
  marker: string;
  arc: string;
  stars: number;
}

const PALETTES: Record<GlobeTheme, Palette> = {
  dark: {
    oceanDeep: "#04111a",
    oceanShallow: "#0e3443",
    land: "#183a44",
    landHi: "#2f5960",
    ice: "#b7cad0",
    border: "#5d8a93",
    coast: "#86c7d4",
    grid: "#1f4652",
    rim: "#5cb8cf",
    atmosphere: "#4aa8c8",
    cloud: "#cfe0e6",
    cloudAlpha: 0.26,
    night: 0.16,
    gridStrength: 0.35,
    borderStrength: 0.45,
    coastStrength: 0.55,
    rimStrength: 0.9,
    atmosphereStrength: 1.4,
    specular: 0.16,
    marker: "#f0b663",
    arc: "#f0b663",
    stars: 0.75,
  },
  light: {
    oceanDeep: "#b4ccd3",
    oceanShallow: "#dce8e4",
    land: "#5c8466",
    landHi: "#87a784",
    ice: "#f7f2ea",
    border: "#f3ece0",
    coast: "#476b54",
    grid: "#93acb5",
    rim: "#fff8ee",
    atmosphere: "#a9c9d2",
    cloud: "#ffffff",
    cloudAlpha: 0.5,
    night: 0.62,
    gridStrength: 0.42,
    borderStrength: 0.55,
    coastStrength: 0.35,
    rimStrength: 0.5,
    atmosphereStrength: 0.8,
    specular: 0.12,
    marker: "#a0661d",
    arc: "#a0661d",
    stars: 0,
  },
};

const EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vObj;
  void main() {
    vUv = uv;
    vObj = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosW = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uOceanDeep, uOceanShallow, uLand, uLandHi, uIce, uBorder, uCoast, uGrid, uRim;
  uniform vec3 uLightDir;
  uniform float uNight, uGridStrength, uBorderStrength, uCoastStrength, uRimStrength, uSpecular;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec3 vObj;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; }
    return v;
  }

  void main() {
    // Derivatives corrected across the u = 0/1 seam, so mip selection (and the
    // grid's anti-aliasing) doesn't produce a visible line down the Pacific.
    vec2 dx = dFdx(vUv);
    vec2 dy = dFdy(vUv);
    dx.x -= sign(dx.x) * step(0.5, abs(dx.x));
    dy.x -= sign(dy.x) * step(0.5, abs(dy.x));

    vec3 tex = textureGrad(uMap, vUv, dx, dy).rgb;
    float soft = textureGrad(uMap, vUv, dx * 24.0, dy * 24.0).r;

    float land = smoothstep(0.32, 0.68, tex.r);
    float lat = asin(clamp(vObj.y, -1.0, 1.0));
    float ice = smoothstep(1.13, 1.3, abs(lat)) * land;

    float n = fbm(vObj * 5.5);
    vec3 landCol = mix(uLand, uLandHi, smoothstep(0.25, 0.85, n));
    landCol = mix(landCol, uIce, ice);

    float shallow = smoothstep(0.02, 0.55, soft) * (1.0 - land);
    vec3 oceanCol = mix(uOceanDeep, uOceanShallow, shallow * 0.9);

    vec3 col = mix(oceanCol, landCol, land);
    col = mix(col, uCoast, tex.b * uCoastStrength);
    col = mix(col, uBorder, tex.g * uBorderStrength * land * (1.0 - ice));

    // Graticule every 15°, faded towards the poles where meridians converge.
    vec2 g = vec2(vUv.x * 24.0, vUv.y * 12.0);
    vec2 fw = vec2(length(vec2(dx.x, dy.x)) * 24.0, length(vec2(dx.y, dy.y)) * 12.0);
    vec2 d = abs(fract(g - 0.5) - 0.5) / max(fw * 1.2, vec2(1e-4));
    float line = 1.0 - min(min(d.x, d.y), 1.0);
    line *= 1.0 - smoothstep(1.05, 1.35, abs(lat));
    col = mix(col, uGrid, line * uGridStrength * (1.0 - land * 0.7));

    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 L = normalize(uLightDir);
    float wrap = clamp(dot(N, L) * 0.5 + 0.5, 0.0, 1.0);
    float lit = mix(uNight, 1.0, smoothstep(0.18, 0.82, wrap));
    col *= lit;

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 36.0) * uSpecular * (1.0 - land);
    col += uRim * spec;

    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += uRim * fres * uRimStrength;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormalV;
  void main() {
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vNormalV;
  void main() {
    float i = pow(clamp(-vNormalV.z, 0.0, 1.0), 2.4) * uStrength;
    gl_FragColor = vec4(uColor * i, i);
    #include <colorspace_fragment>
  }
`;

const CLOUD_FRAG = /* glsl */ `
  uniform vec3 uCloud;
  uniform vec3 uLightDir;
  uniform float uAlpha;
  uniform float uTime;
  varying vec3 vNormalW;
  varying vec3 vObj;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  void main() {
    // Two octaves, slowly drifting — sparse weather, never hiding the land.
    vec3 p = vObj * 2.6 + vec3(uTime * 0.018, uTime * 0.004, -uTime * 0.012);
    float n = noise(p) * 0.65 + noise(p * 2.3 + 7.1) * 0.35;
    float c = smoothstep(0.56, 0.8, n);
    float lit = mix(0.4, 1.0, smoothstep(-0.25, 0.7, dot(normalize(vNormalW), normalize(uLightDir))));
    gl_FragColor = vec4(uCloud * lit, c * uAlpha);
    #include <colorspace_fragment>
  }
`;

const ATMOSPHERE_SCALE = 1.16;
const CLOUD_SCALE = 1.014;
/** Globe + atmosphere as a fraction of the stage's shorter side. */
const STAGE_FILL = 0.92;
/** Axial tilt, so the planet reads as a planet — north leans right. */
const AXIAL_TILT = -0.3;
const MARKER_LIFT = 1.004;
const BASE_PITCH = 0.32;
const AMBIENT_SPEED = 0.045; // rad/s — a slow, ambient turn
const INTRO_SECONDS = 1.25;

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Frame-rate independent exponential smoothing factor. */
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

interface MarkerView {
  id: string;
  index: number;
  group: Group;
  dot: Mesh<CircleGeometry, MeshBasicMaterial>;
  ring: Mesh<RingGeometry, MeshBasicMaterial>;
  hit: Mesh;
  normal: Vector3;
  emphasis: number; // 0..1, smoothed
}

interface ArcView {
  id: string;
  destinationId: string;
  mesh: Mesh<TubeGeometry, MeshBasicMaterial>;
  indexCount: number;
}

export class GlobeScene {
  private readonly opts: GlobeSceneOptions;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 0.1, 120);
  private readonly globe = new Group();
  private readonly tilt = new Group();
  private readonly cloudMaterial: ShaderMaterial | null = null;
  private readonly earthMaterial: ShaderMaterial;
  private readonly atmoMaterial: ShaderMaterial;
  private readonly stars: Points<BufferGeometry, PointsMaterial>;
  private readonly markers: MarkerView[] = [];
  private readonly arcs: ArcView[] = [];
  private readonly raycaster = new Raycaster();
  private readonly pointerNdc = new Vector2();
  private readonly tmpV = new Vector3();
  private readonly tmpV2 = new Vector3();
  private readonly labelPos = new Vector3();
  private readonly tmpQ = new Quaternion();
  private texture: Texture | null = null;

  private raf = 0;
  private lastTime = 0;
  private elapsed = 0;
  private introT = 0;
  private visible = true;
  private disposed = false;
  private readyFired = false;
  private needsFrame = true;

  private theme: GlobeTheme;
  private themeMix: number; // 0 = dark, 1 = light
  private reducedMotion: boolean;

  // Orientation
  private yaw: number;
  private pitch = BASE_PITCH;
  private ambientYaw: number;
  private dragYaw = 0;
  private dragPitch = 0;
  private dragVelocity = 0;
  private pointerX = 0;
  private pointerY = 0;
  private trackX = 0;
  private trackY = 0;

  // Interaction
  private selectedId: string | null = null;
  private selectionFrame = { yaw: 0, pitch: 0 };
  private highlightId: string | null = null;
  private hoverId: string | null = null;
  private labelTargetId: string | null = null;
  private labelEl: HTMLElement | null = null;
  private dragging = false;
  private dragMoved = 0;
  private lastDragX = 0;
  private lastDragY = 0;
  private pendingHover: { x: number; y: number } | null = null;
  private pointerOverGlobe = false;

  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly cleanups: (() => void)[] = [];

  constructor(opts: GlobeSceneOptions) {
    this.opts = opts;
    this.theme = opts.theme;
    this.themeMix = opts.theme === "light" ? 1 : 0;
    this.reducedMotion = opts.reducedMotion;

    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: opts.lite ? "low-power" : "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.lite ? 1.5 : 2));
    const canvas = this.renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    opts.host.appendChild(canvas);

    const onLost = (e: Event) => {
      e.preventDefault();
      this.opts.onError("webgl-context-lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    this.cleanups.push(() => canvas.removeEventListener("webglcontextlost", onLost));

    // Earth
    const segments = opts.lite ? 96 : 160;
    this.earthMaterial = new ShaderMaterial({
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
      // Terrain-noise detail: one octave less on lite devices.
      defines: { OCTAVES: opts.lite ? 3 : 4 },
      uniforms: {
        uMap: { value: null },
        uOceanDeep: { value: new Color() },
        uOceanShallow: { value: new Color() },
        uLand: { value: new Color() },
        uLandHi: { value: new Color() },
        uIce: { value: new Color() },
        uBorder: { value: new Color() },
        uCoast: { value: new Color() },
        uGrid: { value: new Color() },
        uRim: { value: new Color() },
        uLightDir: { value: new Vector3(-0.55, 0.45, 0.9).normalize() },
        uNight: { value: 0 },
        uGridStrength: { value: 0 },
        uBorderStrength: { value: 0 },
        uCoastStrength: { value: 0 },
        uRimStrength: { value: 0 },
        uSpecular: { value: 0 },
      },
    });
    const earth = new Mesh(new SphereGeometry(1, segments, segments / 2), this.earthMaterial);
    this.globe.add(earth);

    // Clouds — a sparse, slowly drifting shell. Skipped on lite devices.
    if (!opts.lite) {
      this.cloudMaterial = new ShaderMaterial({
        vertexShader: EARTH_VERT,
        fragmentShader: CLOUD_FRAG,
        uniforms: {
          uCloud: { value: new Color() },
          uAlpha: { value: 0 },
          uTime: { value: 0 },
          uLightDir: this.earthMaterial.uniforms.uLightDir!,
        },
        transparent: true,
        depthWrite: false,
      });
      const clouds = new Mesh(new SphereGeometry(CLOUD_SCALE, 96, 48), this.cloudMaterial);
      clouds.renderOrder = 1;
      this.globe.add(clouds);
    }

    // Atmosphere — a back-face shell, so it glows only around the limb.
    this.atmoMaterial = new ShaderMaterial({
      vertexShader: ATMO_VERT,
      fragmentShader: ATMO_FRAG,
      uniforms: { uColor: { value: new Color() }, uStrength: { value: 0 } },
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosphere = new Mesh(new SphereGeometry(ATMOSPHERE_SCALE, 64, 32), this.atmoMaterial);
    this.scene.add(atmosphere);

    // Stars — purely atmospheric, never confused with destinations: far away,
    // tiny, and hidden entirely in the light theme.
    this.stars = this.buildStars(opts.lite ? 220 : 650);
    this.scene.add(this.stars);

    this.tilt.rotation.z = AXIAL_TILT;
    this.tilt.add(this.globe);
    this.scene.add(this.tilt);
    this.buildMarkers(opts.markers);
    this.buildArcs(opts.arcs);
    this.applyPalette();

    // Initial orientation: face the first real destination (or South Asia).
    const first = opts.markers[0];
    const start = facingRotation(first?.lat ?? 22, first?.lng ?? 78);
    this.yaw = start.yaw + (this.reducedMotion ? 0 : 0.5);
    this.ambientYaw = start.yaw;
    if (this.reducedMotion) this.introT = 1;
    this.globe.rotation.set(this.pitch, this.yaw, 0, "XYZ");

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(opts.host);
    this.resize();

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = Boolean(entry?.isIntersecting);
        if (this.visible) this.kick();
      },
      { threshold: 0 },
    );
    this.intersectionObserver.observe(opts.host);

    const onVisibility = () => {
      if (!document.hidden) this.kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

    this.bindPointer(canvas);
    this.loadTexture();
  }

  // ---------------------------------------------------------------- public API

  /**
   * `frame` offsets where the selected place sits on screen (see
   * `framedRotation`) — e.g. left of a side panel on wide layouts.
   */
  setSelected(id: string | null, frame = { yaw: 0, pitch: 0 }) {
    this.selectionFrame = frame;
    if (id === this.selectedId) {
      this.kick();
      return;
    }
    if (!id && this.selectedId) {
      // Return to ambient from wherever the globe now points — no jump.
      this.ambientYaw = this.yaw;
      this.dragYaw = 0;
      this.dragPitch = 0;
      this.dragVelocity = 0;
    }
    this.selectedId = id;
    this.kick();
  }

  setHighlight(id: string | null) {
    this.highlightId = id;
    this.kick();
  }

  setLabelTarget(id: string | null, el: HTMLElement | null) {
    this.labelTargetId = id;
    this.labelEl = el;
    if (el && !id) el.style.opacity = "0";
    this.kick();
  }

  setTheme(theme: GlobeTheme) {
    if (theme === this.theme) return;
    this.theme = theme;
    if (this.reducedMotion) this.themeMix = theme === "light" ? 1 : 0;
    this.kick();
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
    if (reduced) this.introT = 1;
    this.kick();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    for (const fn of this.cleanups) fn();
    this.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as Material | Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.texture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ------------------------------------------------------------------ building

  private buildStars(count: number) {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform direction, distance 30–55 — well behind the globe.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 25;
      const s = Math.sqrt(1 - u * u);
      positions[i * 3] = r * s * Math.cos(t);
      positions[i * 3 + 1] = r * u;
      positions[i * 3 + 2] = r * s * Math.sin(t) - 10;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: "#cfdcf0",
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return new Points(geometry, material);
  }

  private buildMarkers(markers: GlobeMarker[]) {
    const hitMaterial = new MeshBasicMaterial({ visible: false });
    markers.forEach((m, index) => {
      const [x, y, z] = latLngToVec3(m.lat, m.lng, MARKER_LIFT);
      const normal = new Vector3(x, y, z).normalize();
      const group = new Group();
      group.position.set(x, y, z);
      // Lie flat on the surface, in globe-local space (lookAt works in world
      // space, which the axial-tilt parent would skew).
      group.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);

      const dot = new Mesh(
        new CircleGeometry(0.0115, 24),
        new MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false }),
      );
      const ring = new Mesh(
        new RingGeometry(0.017, 0.0215, 40),
        new MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false }),
      );
      dot.renderOrder = 2;
      ring.renderOrder = 2;
      const hit = new Mesh(new SphereGeometry(0.055, 8, 8), hitMaterial);
      hit.userData.markerId = m.id;

      group.add(ring, dot, hit);
      group.scale.setScalar(this.reducedMotion ? 1 : 0.0001);
      this.globe.add(group);
      this.markers.push({ id: m.id, index, group, dot, ring, hit, normal, emphasis: 0 });
    });
  }

  private buildArcs(arcs: GlobeArc[]) {
    for (const arc of arcs) {
      const pts = greatCircleArc(arc.from, arc.to, 64, MARKER_LIFT).map(
        ([x, y, z]) => new Vector3(x, y, z),
      );
      const geometry = new TubeGeometry(new CatmullRomCurve3(pts), 96, 0.0032, 6, false);
      const indexCount = geometry.index?.count ?? 0;
      geometry.setDrawRange(0, this.reducedMotion ? indexCount : 0);
      const mesh = new Mesh(
        geometry,
        new MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      );
      mesh.renderOrder = 1;
      this.globe.add(mesh);
      this.arcs.push({ id: arc.id, destinationId: arc.destinationId, mesh, indexCount });
    }
  }

  private loadTexture() {
    new TextureLoader().load(
      this.opts.textureUrl,
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.wrapS = RepeatWrapping;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        this.texture = texture;
        this.earthMaterial.uniforms.uMap!.value = texture;
        this.lastTime = performance.now();
        this.kick();
      },
      undefined,
      () => this.opts.onError("texture-failed"),
    );
  }

  // ------------------------------------------------------------------- palette

  private applyPalette() {
    const a = PALETTES.dark;
    const b = PALETTES.light;
    const t = this.themeMix;
    const u = this.earthMaterial.uniforms;
    const mixColor = (target: Color, ca: string, cb: string) => {
      target.set(ca).lerp(this.tmpColor.set(cb), t);
    };
    const mixNum = (na: number, nb: number) => na + (nb - na) * t;

    mixColor(u.uOceanDeep!.value, a.oceanDeep, b.oceanDeep);
    mixColor(u.uOceanShallow!.value, a.oceanShallow, b.oceanShallow);
    mixColor(u.uLand!.value, a.land, b.land);
    mixColor(u.uLandHi!.value, a.landHi, b.landHi);
    mixColor(u.uIce!.value, a.ice, b.ice);
    mixColor(u.uBorder!.value, a.border, b.border);
    mixColor(u.uCoast!.value, a.coast, b.coast);
    mixColor(u.uGrid!.value, a.grid, b.grid);
    mixColor(u.uRim!.value, a.rim, b.rim);
    u.uNight!.value = mixNum(a.night, b.night);
    u.uGridStrength!.value = mixNum(a.gridStrength, b.gridStrength);
    u.uBorderStrength!.value = mixNum(a.borderStrength, b.borderStrength);
    u.uCoastStrength!.value = mixNum(a.coastStrength, b.coastStrength);
    u.uRimStrength!.value = mixNum(a.rimStrength, b.rimStrength);
    u.uSpecular!.value = mixNum(a.specular, b.specular);

    mixColor(this.atmoMaterial.uniforms.uColor!.value, a.atmosphere, b.atmosphere);
    if (this.cloudMaterial) {
      mixColor(this.cloudMaterial.uniforms.uCloud!.value, a.cloud, b.cloud);
      this.cloudMaterial.uniforms.uAlpha!.value = mixNum(a.cloudAlpha, b.cloudAlpha);
    }
    this.atmoMaterial.uniforms.uStrength!.value = mixNum(
      a.atmosphereStrength,
      b.atmosphereStrength,
    );

    this.stars.material.opacity = mixNum(a.stars, b.stars);
    this.stars.visible = this.stars.material.opacity > 0.01;

    mixColor(this.markerColor, a.marker, b.marker);
    mixColor(this.arcColor, a.arc, b.arc);
    for (const m of this.markers) {
      m.dot.material.color.copy(this.markerColor);
      m.ring.material.color.copy(this.markerColor);
    }
    for (const arc of this.arcs) arc.mesh.material.color.copy(this.arcColor);
  }

  private readonly tmpColor = new Color();
  private readonly markerColor = new Color();
  private readonly arcColor = new Color();

  // ------------------------------------------------------------------- pointer

  private bindPointer(canvas: HTMLCanvasElement) {
    const finePointer = window.matchMedia("(pointer: fine)").matches && !this.opts.lite;

    // Passive cursor tracking over the whole window, so the globe "notices" the
    // visitor without ever capturing the pointer or blocking page interaction.
    if (finePointer) {
      const onWindowMove = (e: PointerEvent) => {
        this.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
        this.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
        this.kick();
      };
      window.addEventListener("pointermove", onWindowMove, { passive: true });
      this.cleanups.push(() => window.removeEventListener("pointermove", onWindowMove));
    }

    const onDown = (e: PointerEvent) => {
      this.dragMoved = 0;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      // Only a mouse drags the globe; touch keeps native page scrolling.
      if (e.pointerType === "mouse" && e.button === 0 && !this.selectedId) {
        this.dragging = true;
        this.dragVelocity = 0;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
      }
    };
    const onMove = (e: PointerEvent) => {
      if (this.dragging) {
        const dx = e.clientX - this.lastDragX;
        const dy = e.clientY - this.lastDragY;
        this.dragMoved += Math.abs(dx) + Math.abs(dy);
        this.lastDragX = e.clientX;
        this.lastDragY = e.clientY;
        const step = dx * 0.0055;
        this.dragYaw += step;
        this.dragVelocity = step * 60;
        this.dragPitch = Math.max(-0.45, Math.min(0.45, this.dragPitch + dy * 0.003));
        this.kick();
        return;
      }
      if (e.pointerType === "mouse") {
        this.pendingHover = { x: e.clientX, y: e.clientY };
        this.kick();
      }
    };
    const onUp = (e: PointerEvent) => {
      const wasDragging = this.dragging;
      if (wasDragging) {
        this.dragging = false;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        canvas.style.cursor = "";
      } else {
        this.dragMoved +=
          Math.abs(e.clientX - this.lastDragX) + Math.abs(e.clientY - this.lastDragY);
      }
      if (this.dragMoved < 6) {
        const id = this.pick(e.clientX, e.clientY);
        if (id) this.opts.onPick(id);
      }
    };
    const onEnter = () => {
      this.pointerOverGlobe = true;
    };
    const onLeave = () => {
      this.pointerOverGlobe = false;
      this.pendingHover = null;
      this.setHover(null);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);
    this.cleanups.push(() => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointerleave", onLeave);
    });
  }

  private pick(clientX: number, clientY: number): string | null {
    if (this.markers.length === 0) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.markers.map((m) => m.hit),
      false,
    );
    for (const hit of hits) {
      const id = hit.object.userData.markerId as string;
      if (this.isFacing(this.markers.find((m) => m.id === id)!)) return id;
    }
    return null;
  }

  private setHover(id: string | null) {
    if (id === this.hoverId) return;
    this.hoverId = id;
    if (!this.dragging) this.renderer.domElement.style.cursor = id ? "pointer" : "";
    this.opts.onHover(id);
  }

  private isFacing(m: MarkerView, threshold = 0.12): boolean {
    // World rotation (includes the axial tilt), not just the globe's own.
    this.tmpV.copy(m.normal).applyQuaternion(this.globe.getWorldQuaternion(this.tmpQ));
    this.tmpV2.copy(this.camera.position).normalize();
    return this.tmpV.dot(this.tmpV2) > threshold;
  }

  // -------------------------------------------------------------------- frames

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.opts.host;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Fit the globe (plus its atmosphere) to ~80% of the shorter side.
    const fill = STAGE_FILL / ATMOSPHERE_SCALE;
    const tanHalf = Math.tan((this.camera.fov * Math.PI) / 360);
    const fitH = 1 / (fill * tanHalf);
    const fitW = 1 / (fill * tanHalf * this.camera.aspect);
    this.camera.position.set(0, 0, Math.max(fitH, fitW));
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.kick();
  }

  /** Request frames; the loop stops itself when nothing is moving. */
  private kick() {
    this.needsFrame = true;
    if (!this.raf && !this.disposed) {
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private readonly frame = (now: number) => {
    this.raf = 0;
    if (this.disposed) return;
    if (!this.visible || document.hidden) return; // resumes via observers

    const dt = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    const animating = this.step(dt);

    if (this.texture) {
      this.renderer.render(this.scene, this.camera);
      if (!this.readyFired) {
        this.readyFired = true;
        this.opts.onReady();
      }
    }
    this.updateLabel();

    // Before the texture arrives there is nothing to draw; its onLoad kicks.
    if (this.texture && (animating || this.needsFrame)) {
      this.needsFrame = false;
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  /** Advance the simulation. Returns true while anything is still moving. */
  private step(dt: number): boolean {
    const reduced = this.reducedMotion;
    let moving = false;
    if (this.texture) this.elapsed += dt;
    if (this.cloudMaterial && !reduced) this.cloudMaterial.uniforms.uTime!.value = this.elapsed;

    // Intro: scale up into place, then markers and arcs arrive.
    if (this.texture && this.introT < 1) {
      this.introT = Math.min(1, this.introT + dt / INTRO_SECONDS);
      moving = true;
    }
    const intro = easeOutCubic(this.introT);
    this.globe.scale.setScalar(reduced ? 1 : 0.9 + 0.1 * intro);

    // Theme cross-fade.
    const themeTarget = this.theme === "light" ? 1 : 0;
    if (Math.abs(this.themeMix - themeTarget) > 0.001) {
      this.themeMix += (themeTarget - this.themeMix) * (reduced ? 1 : damp(6, dt));
      if (Math.abs(this.themeMix - themeTarget) < 0.002) this.themeMix = themeTarget;
      this.applyPalette();
      moving = true;
    }

    // Hover raycast at most once per frame.
    if (this.pendingHover && !this.dragging) {
      this.setHover(this.pick(this.pendingHover.x, this.pendingHover.y));
      this.pendingHover = null;
    }

    // Orientation targets.
    const selected = this.selectedId ? this.markers.find((m) => m.id === this.selectedId) : null;
    let targetYaw: number;
    let targetPitch: number;
    if (selected) {
      const marker = this.opts.markers[selected.index]!;
      const f = framedRotation(
        marker.lat,
        marker.lng,
        this.selectionFrame.yaw,
        this.selectionFrame.pitch,
      );
      targetYaw = f.yaw;
      targetPitch = Math.max(-0.9, Math.min(0.9, f.pitch));
    } else {
      if (!reduced && !this.dragging) {
        // Hold still under a hovered marker so it can be clicked.
        if (!this.hoverId) this.ambientYaw += AMBIENT_SPEED * dt;
        if (Math.abs(this.dragVelocity) > 0.0005) {
          this.dragYaw += this.dragVelocity * dt;
          this.dragVelocity *= Math.exp(-3 * dt);
          moving = true;
        } else this.dragVelocity = 0;
      }
      const trackOn = !reduced;
      // Cursor tracking holds while the pointer is over the globe itself, so
      // the surface doesn't slide away from someone aiming at a marker.
      if (!this.pointerOverGlobe) {
        this.trackX += ((trackOn ? this.pointerX : 0) - this.trackX) * damp(2.2, dt);
        this.trackY += ((trackOn ? this.pointerY : 0) - this.trackY) * damp(2.2, dt);
      }
      targetYaw = this.ambientYaw + this.dragYaw + this.trackX * 0.32;
      targetPitch = BASE_PITCH + this.dragPitch + this.trackY * 0.14;
    }

    const yawDelta = wrapAngle(targetYaw - this.yaw);
    const pitchDelta = targetPitch - this.pitch;
    if (reduced) {
      this.yaw += yawDelta;
      this.pitch += pitchDelta;
    } else {
      const rate = selected ? 3.2 : this.dragging ? 14 : 2.4;
      this.yaw += yawDelta * damp(rate, dt);
      this.pitch += pitchDelta * damp(rate, dt);
      if (Math.abs(yawDelta) > 0.0008 || Math.abs(pitchDelta) > 0.0008) moving = true;
      if (!selected) moving = true; // ambient rotation never settles
    }
    this.globe.rotation.set(this.pitch, this.yaw, 0, "XYZ");
    this.stars.rotation.y = this.yaw * 0.04;

    // Markers: staggered pop-in, emphasis for hover/focus/selection, soft pulse.
    for (const m of this.markers) {
      const appear = reduced
        ? 1
        : clamp01((this.introT * INTRO_SECONDS - 0.45 - m.index * 0.12) / 0.45);
      const pop = reduced ? 1 : Math.max(0.0001, easeOutBack(appear));
      const want =
        m.id === this.selectedId
          ? 1
          : m.id === this.highlightId || m.id === this.hoverId
            ? 0.75
            : 0;
      m.emphasis += (want - m.emphasis) * (reduced ? 1 : damp(10, dt));
      if (Math.abs(want - m.emphasis) > 0.002) moving = true;
      m.group.scale.setScalar(pop * (1 + m.emphasis * 0.55));

      if (reduced) {
        m.ring.scale.setScalar(1 + m.emphasis * 0.3);
        m.ring.material.opacity = 0.55 + m.emphasis * 0.4;
      } else {
        const phase = (this.elapsed * 0.55 + m.index * 0.37) % 1;
        m.ring.scale.setScalar(1 + phase * 1.4 + m.emphasis * 0.3);
        m.ring.material.opacity = (1 - phase) * 0.6 + m.emphasis * 0.35;
        if (this.markers.length) moving = true;
      }
      m.dot.material.opacity = 0.95;
    }

    // Arcs draw in after the markers; the selected destination's arc stays bright.
    const arcProgress = reduced ? 1 : clamp01((this.introT * INTRO_SECONDS - 0.7) / 0.55);
    for (const arc of this.arcs) {
      const count = Math.floor((arc.indexCount * easeOutCubic(arcProgress)) / 3) * 3;
      arc.mesh.geometry.setDrawRange(0, count);
      const dim = this.selectedId && this.selectedId !== arc.destinationId ? 0.25 : 0.85;
      arc.mesh.material.opacity += (dim - arc.mesh.material.opacity) * (reduced ? 1 : damp(8, dt));
    }

    return moving;
  }

  private updateLabel() {
    const el = this.labelEl;
    if (!el) return;
    const m = this.labelTargetId ? this.markers.find((x) => x.id === this.labelTargetId) : null;
    if (!m || !this.texture) {
      el.style.opacity = "0";
      return;
    }
    // Own vector: isFacing() reuses tmpV as scratch space.
    const facing = this.isFacing(m, 0.05);
    m.group.getWorldPosition(this.labelPos).project(this.camera);
    const host = this.opts.host;
    const x = (this.labelPos.x * 0.5 + 0.5) * host.clientWidth;
    const y = (-this.labelPos.y * 0.5 + 0.5) * host.clientHeight;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, calc(-100% - 14px))`;
    el.style.opacity = facing ? "1" : "0";
  }
}
