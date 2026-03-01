"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
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
const SESSION_KEY = "gradient-session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readJSON<T>(raw: string | null | undefined): Partial<T> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function readParamsFromCookie(): Partial<GradientParams> | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  return readJSON<GradientParams>(decodeURIComponent(match.split("=").slice(1).join("=")));
}

function readParamsFromSession(): Partial<GradientParams> | null {
  if (typeof sessionStorage === "undefined") return null;
  return readJSON<GradientParams>(sessionStorage.getItem(SESSION_KEY));
}

function writeParamsToSession(params: GradientParams) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(params)); } catch {}
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

function resolveParams(source: Partial<GradientParams> | null): GradientParams {
  return {
    falloff: {
      falloffExp: source?.falloff?.falloffExp ?? DEFAULT_FALLOFF.falloffExp,
      falloffCurve: source?.falloff?.falloffCurve ?? DEFAULT_FALLOFF.falloffCurve,
    },
    warpParams: {
      warpSize: source?.warpParams?.warpSize ?? DEFAULT_WARP.warpSize,
      radialStrength: source?.warpParams?.radialStrength ?? DEFAULT_WARP.radialStrength,
      radialDispAngle: source?.warpParams?.radialDispAngle ?? DEFAULT_WARP.radialDispAngle,
      angularStrength: source?.warpParams?.angularStrength ?? DEFAULT_WARP.angularStrength,
      angularDispAngle: source?.warpParams?.angularDispAngle ?? DEFAULT_WARP.angularDispAngle,
      waves: source?.warpParams?.waves ?? [...DEFAULT_WARP.waves],
      warpTimeScale: source?.warpParams?.warpTimeScale ?? DEFAULT_WARP.warpTimeScale,
    },
    noise: source?.noise ?? 0.03,
    noiseScale: source?.noiseScale ?? 250,
    motion: source?.motion ?? true,
    speed: source?.speed ?? 7,
    size: source?.size ?? 300,
  };
}

function useInitialParams(): { session: GradientParams; saved: GradientParams } {
  const sessionData = readParamsFromSession();
  const cookieData = readParamsFromCookie();
  return {
    session: resolveParams(sessionData ?? cookieData),
    saved: resolveParams(cookieData),
  };
}

export default function Home() {
  const initial = useInitialParams();
  const [dev, setDev] = useState(false);

  const [falloff, setFalloff] = useState<FalloffParams>(initial.session.falloff);
  const [warpParams, setWarpParams] = useState<WarpParams>(initial.session.warpParams);
  const [noise, setNoise] = useState(initial.session.noise);
  const [noiseScale, setNoiseScale] = useState(initial.session.noiseScale);
  const [motion, setMotion] = useState(initial.session.motion);
  const [speed, setSpeed] = useState(initial.session.speed);
  const [size, setSize] = useState(initial.session.size);
  const [points] = useState<ColorPoint[]>(DEFAULT_POINTS);

  const [savedParams, setSavedParams] = useState<GradientParams>(initial.saved);

  const currentParams = useMemo<GradientParams>(
    () => ({ falloff, warpParams, noise, noiseScale, motion, speed, size }),
    [falloff, warpParams, noise, noiseScale, motion, speed, size]
  );

  useEffect(() => {
    writeParamsToSession(currentParams);
  }, [currentParams]);

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
