"use client";

import { memo, useRef, useMemo } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { livePointsStore } from "./live-points-store";

export interface ColorPoint {
  position: [number, number]; // 0-1 normalized
  color: string;
}

export interface FalloffParams {
  falloffExp: number;
  falloffCurve: number;
}

export interface WaveParams {
  angle: number;      // sampling direction in degrees
  freq: number;
  strength: number;
  dispAngle: number;  // displacement push direction in degrees
}

export const MAX_WAVES = 8;

export interface WarpParams {
  warpSize: number;
  radialStrength: number;
  radialDispAngle: number;
  angularStrength: number;
  angularDispAngle: number;
  waves: WaveParams[];
  warpTimeScale: number;
}

export interface MeshGradientProps {
  size?: number;
  points?: ColorPoint[];
  falloff?: FalloffParams;
  warpParams?: WarpParams;
  noise?: number;
  noiseScale?: number;
  speed?: number;
  motion?: boolean;
  className?: string;
  borderRadius?: number;
}

export const DEFAULT_FALLOFF: FalloffParams = { falloffExp: 3.0, falloffCurve: 0.0 };

export const DEFAULT_WAVE: WaveParams = { angle: 0, freq: 0, strength: 0, dispAngle: 0 };

export const DEFAULT_WARP: WarpParams = {
  warpSize: 0,
  radialStrength: 0,
  radialDispAngle: 0,
  angularStrength: 0,
  angularDispAngle: 0,
  waves: [{ angle: 90, freq: 5.0, strength: 0.05, dispAngle: 0 }],
  warpTimeScale: 0.3,
};

export const FALLOFF_PRESETS: Record<string, FalloffParams> = {
  "Sharp Bézier": { falloffExp: 3.0, falloffCurve: 0.0 },
  "Soft Bézier": { falloffExp: 5.0, falloffCurve: 0.0 },
  "Mesh Static": { falloffExp: 2.0, falloffCurve: 1.0 },
  "Mesh Grid": { falloffExp: 2.0, falloffCurve: 0.0 },
  Simple: { falloffExp: 1.0, falloffCurve: 0.0 },
};

export const WARP_PRESETS: Record<string, WarpParams> = {
  Flat: { warpSize: 0, radialStrength: 0, radialDispAngle: 0, angularStrength: 0, angularDispAngle: 0, waves: [], warpTimeScale: 0 },
  Gravity: { warpSize: 0, radialStrength: 0.05, radialDispAngle: 30, angularStrength: 0, angularDispAngle: 0, waves: [], warpTimeScale: 0 },
  Circular: { warpSize: 3, radialStrength: 0, radialDispAngle: 0, angularStrength: 0.05, angularDispAngle: 90, waves: [], warpTimeScale: 0.5 },
  Waves: { warpSize: 0, radialStrength: 0, radialDispAngle: 0, angularStrength: 0, angularDispAngle: 0, waves: [{ angle: 90, freq: 1.0, strength: 0.1, dispAngle: 0 }], warpTimeScale: 0.5 },
  Rows: { warpSize: 0, radialStrength: 0, radialDispAngle: 0, angularStrength: 0, angularDispAngle: 0, waves: [{ angle: 90, freq: 5.0, strength: 0.05, dispAngle: 0 }], warpTimeScale: 0 },
  Columns: { warpSize: 0, radialStrength: 0, radialDispAngle: 0, angularStrength: 0, angularDispAngle: 0, waves: [{ angle: 0, freq: 5.0, strength: 0.05, dispAngle: 90 }], warpTimeScale: 0 },
  Diagonal: { warpSize: 0, radialStrength: 0, radialDispAngle: 0, angularStrength: 0, angularDispAngle: 0, waves: [{ angle: 45, freq: 1.5, strength: 0.08, dispAngle: 135 }], warpTimeScale: 0.3 },
  Crosshatch: { warpSize: 0, radialStrength: 0, radialDispAngle: 0, angularStrength: 0, angularDispAngle: 0, waves: [{ angle: 0, freq: 5.0, strength: 0.05, dispAngle: 90 }, { angle: 90, freq: 5.0, strength: 0.05, dispAngle: 0 }], warpTimeScale: 0 },
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uNoise;
  uniform float uNoiseScale;

  // falloff params
  uniform float uFalloffExp;
  uniform float uFalloffCurve;

  // warp params
  uniform float uWarpSize;
  uniform float uRadialStrength;
  uniform float uRadialDispAngle;
  uniform float uAngularStrength;
  uniform float uAngularDispAngle;
  uniform float uWarpTimeScale;

  uniform vec4 uWaves[8];
  uniform int uWaveCount;

  uniform vec2 uPos[7];
  uniform vec3 uCol[7];
  uniform int uCount;

  varying vec2 vUv;

  // --- simplex 2D noise ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  vec2 calcWave(vec4 wave, vec2 uv, float timePhase) {
    float sampleAngle = wave.x;
    float freq = wave.y;
    float strength = wave.z;
    float dispAngle = wave.w;
    vec2 sampleDir = vec2(cos(sampleAngle), sin(sampleAngle));
    float phase = dot(uv, sampleDir) * freq * 6.28 + timePhase;
    float val = sin(phase) * strength;
    return val * vec2(cos(dispAngle), sin(dispAngle));
  }

  vec2 getWarp(vec2 uv, float t) {
    float d = length(uv - 0.5) * 2.0;
    float a = atan(uv.y - 0.5, uv.x - 0.5);
    float timePhase = t * uWarpTimeScale;

    float radialVal = (1.0 - d) * uRadialStrength;
    vec2 radial = radialVal * vec2(cos(uRadialDispAngle), sin(uRadialDispAngle));

    float angularVal = sin(a * uWarpSize + timePhase) * uAngularStrength;
    vec2 angular = angularVal * vec2(cos(uAngularDispAngle), sin(uAngularDispAngle));

    vec2 waveSum = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      if (i >= uWaveCount) break;
      waveSum += calcWave(uWaves[i], uv, timePhase);
    }

    return radial + angular + waveSum;
  }

  float falloff(float d, float radius) {
    float t = clamp(d / radius, 0.0, 1.0);
    float a = pow(1.0 - t, uFalloffExp);
    float b = 1.0 - pow(t, uFalloffExp);
    return mix(a, b, uFalloffCurve);
  }

  void main() {
    float t = uTime * uSpeed;
    vec2 uv = vUv;

    vec2 warpedUv = uv + getWarp(uv, t);

    vec3 color = vec3(0.0);
    float totalWeight = 0.0;

    for (int i = 0; i < 7; i++) {
      if (i >= uCount) break;
      float d = length(warpedUv - uPos[i]);
      float weight = falloff(d, 0.7);
      weight = max(weight, 0.0);
      color += uCol[i] * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0.0) {
      color /= totalWeight;
    }

    float grain = snoise(vUv * uNoiseScale) * uNoise;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const DEG2RAD = Math.PI / 180;

const GradientMaterial = shaderMaterial(
  {
    uTime: 0,
    uSpeed: 7,
    uNoise: 0.03,
    uNoiseScale: 250.0,
    uFalloffExp: DEFAULT_FALLOFF.falloffExp,
    uFalloffCurve: DEFAULT_FALLOFF.falloffCurve,
    uWarpSize: DEFAULT_WARP.warpSize,
    uRadialStrength: DEFAULT_WARP.radialStrength,
    uRadialDispAngle: DEFAULT_WARP.radialDispAngle * DEG2RAD,
    uAngularStrength: DEFAULT_WARP.angularStrength,
    uAngularDispAngle: DEFAULT_WARP.angularDispAngle * DEG2RAD,
    uWarpTimeScale: DEFAULT_WARP.warpTimeScale,
    uWaves: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)),
    uWaveCount: 0,
    uPos: Array.from({ length: 7 }, () => new THREE.Vector2(0, 0)),
    uCol: Array.from({ length: 7 }, () => new THREE.Color("#000")),
    uCount: 0,
  },
  vertexShader,
  fragmentShader
);

extend({ GradientMaterial });

const DEFAULT_POINTS: ColorPoint[] = [
  { position: [0.15, 0.85], color: "#2483A5" },
  { position: [0.45, 0.80], color: "#E0B94B" },
  { position: [0.10, 0.45], color: "#477459" },
  { position: [0.85, 0.55], color: "#C45408" },
  { position: [0.50, 0.30], color: "#6E9091" },
  { position: [0.80, 0.85], color: "#EFE3D1" },
  { position: [0.30, 0.15], color: "#E4D5B9" },
];

// each point gets unique orbit params so motion feels organic
const ORBIT_PARAMS = [
  { rx: 0.08, ry: 0.06, fx: 0.41, fy: 0.37, px: 1.2, py: 0.8 },
  { rx: 0.06, ry: 0.09, fx: 0.53, fy: 0.31, px: 2.5, py: 1.7 },
  { rx: 0.10, ry: 0.07, fx: 0.29, fy: 0.43, px: 3.8, py: 0.3 },
  { rx: 0.07, ry: 0.08, fx: 0.47, fy: 0.39, px: 5.1, py: 2.2 },
  { rx: 0.09, ry: 0.06, fx: 0.33, fy: 0.51, px: 4.0, py: 1.0 },
  { rx: 0.05, ry: 0.10, fx: 0.59, fy: 0.27, px: 0.5, py: 3.3 },
  { rx: 0.08, ry: 0.05, fx: 0.37, fy: 0.61, px: 2.0, py: 4.5 },
];

function wavesToUniformArray(waves: WaveParams[]): THREE.Vector4[] {
  return Array.from({ length: MAX_WAVES }, (_, i) => {
    if (i < waves.length) {
      const w = waves[i];
      return new THREE.Vector4(w.angle * DEG2RAD, w.freq, w.strength, w.dispAngle * DEG2RAD);
    }
    return new THREE.Vector4(0, 0, 0, 0);
  });
}

function GradientPlane({
  points = DEFAULT_POINTS,
  falloff = DEFAULT_FALLOFF,
  warpParams = DEFAULT_WARP,
  noise = 0.03,
  noiseScale = 250,
  speed = 7,
  motion = true,
}: {
  points?: ColorPoint[];
  falloff?: FalloffParams;
  warpParams?: WarpParams;
  noise?: number;
  noiseScale?: number;
  speed?: number;
  motion?: boolean;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const frameCount = useRef(0);

  const uniforms = useMemo(() => {
    const positions = Array.from({ length: 7 }, (_, i) =>
      i < points.length
        ? new THREE.Vector2(points[i].position[0], points[i].position[1])
        : new THREE.Vector2(0, 0)
    );
    const colors = Array.from({ length: 7 }, (_, i) =>
      i < points.length ? new THREE.Color(points[i].color) : new THREE.Color("#000")
    );
    return { uPos: positions, uCol: colors, uCount: Math.min(points.length, 7) };
  }, [points]);

  const basePositions = useMemo(
    () => points.map((p) => [...p.position] as [number, number]),
    [points]
  );

  const wavesUniform = useMemo(
    () => wavesToUniformArray(warpParams.waves),
    [warpParams.waves]
  );
  const waveCount = Math.min(warpParams.waves.length, MAX_WAVES);

  useFrame(({ viewport }, delta) => {
    if (matRef.current) {
      (matRef.current as unknown as Record<string, number>).uTime += delta;
    }
    if (meshRef.current) {
      meshRef.current.scale.set(viewport.width, viewport.height, 1);
    }

    if (motion && matRef.current) {
      timeRef.current += delta * speed;
      const t = timeRef.current;
      const mat = matRef.current as unknown as { uPos: THREE.Vector2[] };
      const count = Math.min(points.length, 7);

      for (let i = 0; i < count; i++) {
        const o = ORBIT_PARAMS[i];
        const nx = basePositions[i][0] + o.rx * Math.sin(t * o.fx + o.px);
        const ny = basePositions[i][1] + o.ry * Math.cos(t * o.fy + o.py);
        mat.uPos[i].set(
          Math.max(0, Math.min(1, nx)),
          Math.max(0, Math.min(1, ny)),
        );
      }

      frameCount.current++;
      if (frameCount.current % 6 === 0) {
        const updated: ColorPoint[] = [];
        for (let i = 0; i < count; i++) {
          updated.push({
            position: [mat.uPos[i].x, mat.uPos[i].y],
            color: points[i].color,
          });
        }
        livePointsStore.set(updated);
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      {/* @ts-expect-error - custom shader material */}
      <gradientMaterial
        ref={matRef}
        uSpeed={speed}
        uNoise={noise}
        uNoiseScale={noiseScale}
        uFalloffExp={falloff.falloffExp}
        uFalloffCurve={falloff.falloffCurve}
        uWarpSize={warpParams.warpSize}
        uRadialStrength={warpParams.radialStrength}
        uRadialDispAngle={warpParams.radialDispAngle * DEG2RAD}
        uAngularStrength={warpParams.angularStrength}
        uAngularDispAngle={warpParams.angularDispAngle * DEG2RAD}
        uWarpTimeScale={warpParams.warpTimeScale}
        uWaves={wavesUniform}
        uWaveCount={waveCount}
        {...uniforms}
      />
    </mesh>
  );
}

export const MeshGradient = memo(function MeshGradient({
  size = 300,
  points,
  falloff = DEFAULT_FALLOFF,
  warpParams = DEFAULT_WARP,
  noise = 0.03,
  noiseScale = 250,
  speed = 7,
  motion = true,
  className,
  borderRadius = 0,
}: MeshGradientProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size, borderRadius, overflow: "hidden" }}
    >
      <Canvas
        orthographic
        camera={{ zoom: 1, position: [0, 0, 1] }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 2]}
      >
        <GradientPlane
          points={points}
          falloff={falloff}
          warpParams={warpParams}
          noise={noise}
          noiseScale={noiseScale}
          speed={speed}
          motion={motion}
        />
      </Canvas>
    </div>
  );
});

export { DEFAULT_POINTS };
