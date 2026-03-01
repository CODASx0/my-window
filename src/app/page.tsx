"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_POINTS } from "@/components/three/mesh-gradient";
import type {
  GradientStyle,
  WarpShape,
  ColorPoint,
} from "@/components/three/mesh-gradient";
import type { GradientParams } from "@/components/three/gradient-dev-panel";

const COOKIE_KEY = "gradient-params";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

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

function useInitialParams() {
  const saved = readParamsFromCookie();
  return {
    gradientStyle: (saved?.gradientStyle ?? "sharp-bezier") as GradientStyle,
    warpShape: (saved?.warpShape ?? "gravity") as WarpShape,
    warp: saved?.warp ?? 0.5,
    warpSize: saved?.warpSize ?? 1.0,
    noise: saved?.noise ?? 0.03,
    motion: saved?.motion ?? true,
    speed: saved?.speed ?? 0.3,
    size: saved?.size ?? 100,
  };
}

export default function Home() {
  const initial = useInitialParams();
  const [dev, setDev] = useState(false);
  const [gradientStyle, setGradientStyle] = useState<GradientStyle>(initial.gradientStyle);
  const [warpShape, setWarpShape] = useState<WarpShape>(initial.warpShape);
  const [warp, setWarp] = useState(initial.warp);
  const [warpSize, setWarpSize] = useState(initial.warpSize);
  const [noise, setNoise] = useState(initial.noise);
  const [motion, setMotion] = useState(initial.motion);
  const [speed, setSpeed] = useState(initial.speed);
  const [size, setSize] = useState(initial.size);
  const [points] = useState<ColorPoint[]>(DEFAULT_POINTS);
  const [livePoints, setLivePoints] = useState<ColorPoint[]>(DEFAULT_POINTS);

  const [savedParams, setSavedParams] = useState<GradientParams>(initial);

  const currentParams = useMemo<GradientParams>(
    () => ({ gradientStyle, warpShape, warp, warpSize, noise, motion, speed, size }),
    [gradientStyle, warpShape, warp, warpSize, noise, motion, speed, size]
  );

  const handleSave = useCallback(() => {
    writeParamsToCookie(currentParams);
    setSavedParams(currentParams);
  }, [currentParams]);

  const handleReset = useCallback(() => {
    setGradientStyle(savedParams.gradientStyle);
    setWarpShape(savedParams.warpShape);
    setWarp(savedParams.warp);
    setWarpSize(savedParams.warpSize);
    setNoise(savedParams.noise);
    setMotion(savedParams.motion);
    setSpeed(savedParams.speed);
    setSize(savedParams.size);
  }, [savedParams]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Main content — stretches to fill remaining space */}
      <main className="relative flex flex-1 items-center justify-center transition-all duration-300 ease-out">
        <MeshGradient
          size={size}
          borderRadius={12}
          points={points}
          gradientStyle={gradientStyle}
          warpShape={warpShape}
          warp={warp}
          warpSize={warpSize}
          noise={noise}
          speed={speed}
          motion={motion}
          onPointsUpdate={dev ? setLivePoints : undefined}
        />

        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Dev</span>
          <Switch checked={dev} onCheckedChange={setDev} aria-label="Toggle dev panel" />
        </div>
      </main>

      {/* Dev sidebar — pushes main content when open */}
      <GradientDevPanel
        open={dev}
        gradientStyle={gradientStyle}
        warpShape={warpShape}
        warp={warp}
        warpSize={warpSize}
        noise={noise}
        motion={motion}
        speed={speed}
        size={size}
        points={points}
        livePoints={motion ? livePoints : undefined}
        onGradientStyleChange={setGradientStyle}
        onWarpShapeChange={setWarpShape}
        onWarpChange={setWarp}
        onWarpSizeChange={setWarpSize}
        onNoiseChange={setNoise}
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
