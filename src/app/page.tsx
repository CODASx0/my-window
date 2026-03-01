"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_POINTS,
  DEFAULT_FALLOFF,
  DEFAULT_WARP,
} from "@/components/three/mesh-gradient";
import type {
  ColorPoint,
  FalloffParams,
  WarpParams,
} from "@/components/three/mesh-gradient";
import type { GradientParams } from "@/components/three/gradient-dev-panel";

const COOKIE_KEY = "gradient-params";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readParamsFromCookie(): Partial<GradientParams> | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

function writeParamsToCookie(params: GradientParams) {
  const value = encodeURIComponent(JSON.stringify(params));
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

const MeshGradient = dynamic(
  () => import("@/components/three/mesh-gradient").then((m) => m.MeshGradient),
  { ssr: false }
);

const GradientDevPanel = dynamic(
  () =>
    import("@/components/three/gradient-dev-panel").then(
      (m) => m.GradientDevPanel
    ),
  { ssr: false }
);

function useInitialParams(): GradientParams {
  const saved = readParamsFromCookie();
  return {
    falloff: {
      falloffExp: saved?.falloff?.falloffExp ?? DEFAULT_FALLOFF.falloffExp,
      falloffCurve: saved?.falloff?.falloffCurve ?? DEFAULT_FALLOFF.falloffCurve,
    },
    warpParams: {
      warpSize: saved?.warpParams?.warpSize ?? DEFAULT_WARP.warpSize,
      radialStrength: saved?.warpParams?.radialStrength ?? DEFAULT_WARP.radialStrength,
      radialDispAngle: saved?.warpParams?.radialDispAngle ?? DEFAULT_WARP.radialDispAngle,
      angularStrength: saved?.warpParams?.angularStrength ?? DEFAULT_WARP.angularStrength,
      angularDispAngle: saved?.warpParams?.angularDispAngle ?? DEFAULT_WARP.angularDispAngle,
      waves: saved?.warpParams?.waves ?? [...DEFAULT_WARP.waves],
      warpTimeScale: saved?.warpParams?.warpTimeScale ?? DEFAULT_WARP.warpTimeScale,
    },
    noise: saved?.noise ?? 0.03,
    noiseScale: saved?.noiseScale ?? 250,
    motion: saved?.motion ?? true,
    speed: saved?.speed ?? 0.3,
    size: saved?.size ?? 100,
  };
}

export default function Home() {
  const initial = useInitialParams();
  const [dev, setDev] = useState(false);

  const [falloff, setFalloff] = useState<FalloffParams>(initial.falloff);
  const [warpParams, setWarpParams] = useState<WarpParams>(initial.warpParams);
  const [noise, setNoise] = useState(initial.noise);
  const [noiseScale, setNoiseScale] = useState(initial.noiseScale);
  const [motion, setMotion] = useState(initial.motion);
  const [speed, setSpeed] = useState(initial.speed);
  const [size, setSize] = useState(initial.size);
  const [points] = useState<ColorPoint[]>(DEFAULT_POINTS);

  const [savedParams, setSavedParams] = useState<GradientParams>(initial);

  const currentParams = useMemo<GradientParams>(
    () => ({ falloff, warpParams, noise, noiseScale, motion, speed, size }),
    [falloff, warpParams, noise, noiseScale, motion, speed, size]
  );

  const currentRef = useRef(currentParams);
  currentRef.current = currentParams;
  const savedRef = useRef(savedParams);
  savedRef.current = savedParams;

  const handleSave = useCallback(() => {
    writeParamsToCookie(currentRef.current);
    setSavedParams(currentRef.current);
  }, []);

  const handleReset = useCallback(() => {
    const s = savedRef.current;
    setFalloff(s.falloff);
    setWarpParams(s.warpParams);
    setNoise(s.noise);
    setNoiseScale(s.noiseScale);
    setMotion(s.motion);
    setSpeed(s.speed);
    setSize(s.size);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <main className="relative flex flex-1 items-center justify-center transition-all duration-300 ease-out">
        <MeshGradient
          size={size}
          borderRadius={12}
          points={points}
          falloff={falloff}
          warpParams={warpParams}
          noise={noise}
          noiseScale={noiseScale}
          speed={speed}
          motion={motion}
        />

        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Dev</span>
          <Switch checked={dev} onCheckedChange={setDev} aria-label="Toggle dev panel" />
        </div>
      </main>

      <GradientDevPanel
        open={dev}
        falloff={falloff}
        warpParams={warpParams}
        noise={noise}
        noiseScale={noiseScale}
        motion={motion}
        speed={speed}
        size={size}
        points={points}
        onFalloffChange={setFalloff}
        onWarpParamsChange={setWarpParams}
        onNoiseChange={setNoise}
        onNoiseScaleChange={setNoiseScale}
        onMotionChange={setMotion}
        onSpeedChange={setSpeed}
        onSizeChange={setSize}
        onSave={handleSave}
        onReset={handleReset}
        savedParams={savedParams}
      />
    </div>
  );
}
