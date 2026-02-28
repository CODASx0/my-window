"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

export type GradientStyle =
  | "sharp-bezier"
  | "soft-bezier"
  | "mesh-static"
  | "mesh-grid"
  | "simple";

export type WarpShape =
  | "flat"
  | "gravity"
  | "circular"
  | "waves"
  | "rows"
  | "columns";

export interface ColorPoint {
  position: [number, number]; // 0-1 normalized
  color: string;
}

export interface MeshGradientProps {
  size?: number;
  points?: ColorPoint[];
  gradientStyle?: GradientStyle;
  warpShape?: WarpShape;
  warp?: number;
  warpSize?: number;
  noise?: number;
  speed?: number;
  motion?: boolean;
  onPointsUpdate?: (points: ColorPoint[]) => void;
  className?: string;
  borderRadius?: number;
}

const GRADIENT_STYLE_MAP: Record<GradientStyle, number> = {
  "sharp-bezier": 0,
  "soft-bezier": 1,
  "mesh-static": 2,
  "mesh-grid": 3,
  simple: 4,
};

const WARP_SHAPE_MAP: Record<WarpShape, number> = {
  flat: 0,
  gravity: 1,
  circular: 2,
  waves: 3,
  rows: 4,
  columns: 5,
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
  uniform float uWarp;
  uniform float uWarpSize;
  uniform int uGradientStyle;
  uniform int uWarpShape;

  // 7 color points (position xy + color rgb)
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

  // warp shape displacement
  float getWarp(vec2 uv, float t) {
    if (uWarpShape == 0) return 0.0; // flat
    if (uWarpShape == 1) { // gravity
      float d = length(uv - 0.5) * 2.0;
      return (1.0 - d) * uWarp;
    }
    if (uWarpShape == 2) { // circular
      float angle = atan(uv.y - 0.5, uv.x - 0.5);
      return sin(angle * uWarpSize + t * 0.5) * uWarp;
    }
    if (uWarpShape == 3) { // waves
      return sin(uv.y * uWarpSize * 6.28 + t * 0.5) * uWarp;
    }
    if (uWarpShape == 4) { // rows
      return sin(uv.y * uWarpSize * 12.56) * uWarp * 0.5;
    }
    if (uWarpShape == 5) { // columns
      return sin(uv.x * uWarpSize * 12.56) * uWarp * 0.5;
    }
    return 0.0;
  }

  // gradient style controls the falloff curve
  float falloff(float d, float radius) {
    float t = clamp(d / radius, 0.0, 1.0);

    if (uGradientStyle == 0) { // sharp bezier
      float s = 1.0 - t;
      return s * s * s; // cubic
    }
    if (uGradientStyle == 1) { // soft bezier
      float s = 1.0 - t;
      return s * s * s * s * s; // quintic
    }
    if (uGradientStyle == 2) { // mesh static
      return 1.0 - t * t;
    }
    if (uGradientStyle == 3) { // mesh grid
      float s = 1.0 - t;
      return s * s;
    }
    if (uGradientStyle == 4) { // simple
      return 1.0 - t;
    }

    return 1.0 - t;
  }

  void main() {
    float t = uTime * uSpeed;
    vec2 uv = vUv;

    // apply warp displacement
    float w = getWarp(uv, t);
    vec2 warpedUv = uv + vec2(w * 0.1, w * 0.05);

    // blend all color points
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

    // film grain
    float grain = snoise(vUv * 250.0) * uNoise;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const GradientMaterial = shaderMaterial(
  {
    uTime: 0,
    uSpeed: 0.3,
    uNoise: 0.03,
    uWarp: 0.5,
    uWarpSize: 1.0,
    uGradientStyle: 0,
    uWarpShape: 1,
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

function GradientPlane({
  points = DEFAULT_POINTS,
  gradientStyle = "sharp-bezier",
  warpShape = "gravity",
  warp = 0.5,
  warpSize = 1.0,
  noise = 0.03,
  speed = 0.3,
  motion = true,
  onPointsUpdate,
}: {
  points?: ColorPoint[];
  gradientStyle?: GradientStyle;
  warpShape?: WarpShape;
  warp?: number;
  warpSize?: number;
  noise?: number;
  speed?: number;
  motion?: boolean;
  onPointsUpdate?: (points: ColorPoint[]) => void;
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
      const updated: ColorPoint[] = [];

      for (let i = 0; i < count; i++) {
        const o = ORBIT_PARAMS[i];
        const nx = basePositions[i][0] + o.rx * Math.sin(t * o.fx + o.px);
        const ny = basePositions[i][1] + o.ry * Math.cos(t * o.fy + o.py);
        const cx = Math.max(0, Math.min(1, nx));
        const cy = Math.max(0, Math.min(1, ny));
        mat.uPos[i].set(cx, cy);
        updated.push({ position: [cx, cy], color: points[i].color });
      }

      // throttle callback to ~10fps to avoid re-render storm
      frameCount.current++;
      if (onPointsUpdate && frameCount.current % 6 === 0) {
        onPointsUpdate(updated);
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
        uWarp={warp}
        uWarpSize={warpSize}
        uGradientStyle={GRADIENT_STYLE_MAP[gradientStyle]}
        uWarpShape={WARP_SHAPE_MAP[warpShape]}
        {...uniforms}
      />
    </mesh>
  );
}

export function MeshGradient({
  size = 100,
  points,
  gradientStyle = "sharp-bezier",
  warpShape = "gravity",
  warp = 0.5,
  warpSize = 1.0,
  noise = 0.03,
  speed = 0.3,
  motion = true,
  onPointsUpdate,
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
          gradientStyle={gradientStyle}
          warpShape={warpShape}
          warp={warp}
          warpSize={warpSize}
          noise={noise}
          speed={speed}
          motion={motion}
          onPointsUpdate={onPointsUpdate}
        />
      </Canvas>
    </div>
  );
}

export { DEFAULT_POINTS };
