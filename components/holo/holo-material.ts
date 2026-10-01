import * as THREE from "three";
import { ART_WINDOW, type Foil } from "@/lib/cards";

const FOIL_MODE: Record<Foil, number> = { none: 0, window: 1, full: 2 };

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vObjNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vObjNormal = normal;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uFoil;        // 0 none · 1 art-window holo · 2 full-art foil
  uniform vec4 uWindow;       // art box in UV: left, bottom, right, top
  uniform vec2 uAngle;        // card yaw / pitch, radians, after all rotation
  uniform vec3 uLightDir;

  varying vec2 vUv;
  varying vec3 vObjNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  vec3 spectrum(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float rectMask(vec2 uv, vec4 r, float soft) {
    vec2 lo = smoothstep(r.xy, r.xy + soft, uv);
    vec2 hi = 1.0 - smoothstep(r.zw - soft, r.zw, uv);
    return lo.x * lo.y * hi.x * hi.y;
  }

  void main() {
    bool isFront = vObjNormal.z > 0.0;
    vec2 uv = isFront ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec4 tex = isFront ? texture2D(uFront, uv) : texture2D(uBack, uv);
    if (tex.a < 0.5) discard;
    vec3 col = tex.rgb;

    // Shop lighting: a softbox up and to the left. Its reflection sweeps across
    // the card as it turns, plus a broad sheen so the card never looks dead.
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 R = reflect(-V, N);
    float facing = dot(R, uLightDir);
    float glare = smoothstep(0.86, 0.995, facing);
    float sheen = smoothstep(0.35, 1.0, facing);

    if (isFront && uFoil > 0.5) {
      float mask = uFoil > 1.5 ? 0.75 : rectMask(uv, uWindow, 0.006);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float tiltPhase = uAngle.x * 1.7 - uAngle.y * 1.3;

      // Diagonal rainbow bands that roll across the foil as the card tilts.
      float phase = dot(uv, vec2(0.8, 1.25)) * 1.4 + tiltPhase;
      vec3 rainbow = spectrum(phase);
      float bands = pow(0.5 + 0.5 * sin(phase * 6.28318 * 1.5), 2.0);

      // Fine etched lines for modern full arts, starfield for vintage holos.
      float etch = uFoil > 1.5
        ? 0.6 + 0.4 * sin((uv.x * 0.7 - uv.y) * 900.0)
        : 1.0;

      vec2 grid = vec2(70.0, 96.0);
      vec2 cell = floor(uv * grid);
      vec2 local = fract(uv * grid) - 0.5;
      float h = hash(cell);
      float star = smoothstep(0.32, 0.0, length(local)) * step(0.9, h);
      float twinkle = pow(0.5 + 0.5 * sin(h * 90.0 + tiltPhase * 10.0), 10.0);

      float strength = mask * (0.25 + 0.75 * smoothstep(0.08, 0.85, lum)) * (0.4 + 0.6 * sheen);
      col += rainbow * bands * etch * strength * 0.55;
      col = mix(col, col * (0.75 + rainbow * 0.5), mask * 0.35);
      col += rainbow * star * twinkle * mask * 1.6;
    }

    col *= 0.88 + 0.12 * sheen;
    col += vec3(1.0, 0.98, 0.95) * glare * (isFront ? 0.32 : 0.22);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type HoloUniforms = {
  uFront: { value: THREE.Texture | null };
  uBack: { value: THREE.Texture | null };
  uFoil: { value: number };
  uWindow: { value: THREE.Vector4 };
  uAngle: { value: THREE.Vector2 };
  uLightDir: { value: THREE.Vector3 };
};

export type HoloMaterial = THREE.ShaderMaterial & { uniforms: HoloUniforms };

export function createHoloMaterial(): HoloMaterial {
  const uniforms: HoloUniforms = {
    uFront: { value: null },
    uBack: { value: null },
    uFoil: { value: 0 },
    uWindow: { value: new THREE.Vector4(...ART_WINDOW) },
    uAngle: { value: new THREE.Vector2() },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.55, 1).normalize() },
  };
  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }) as HoloMaterial;
}

export const foilMode = (foil: Foil) => FOIL_MODE[foil];
