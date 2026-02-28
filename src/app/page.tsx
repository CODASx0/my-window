"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_POINTS } from "@/components/three/mesh-gradient";
import type {
  GradientStyle,
  WarpShape,
  ColorPoint,
} from "@/components/three/mesh-gradient";

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

export default function Home() {
  const [dev, setDev] = useState(false);
  const [gradientStyle, setGradientStyle] =
    useState<GradientStyle>("sharp-bezier");
  const [warpShape, setWarpShape] = useState<WarpShape>("gravity");
  const [warp, setWarp] = useState(0.5);
  const [warpSize, setWarpSize] = useState(1.0);
  const [noise, setNoise] = useState(0.03);
  const [motion, setMotion] = useState(true);
  const [speed, setSpeed] = useState(0.3);
  const [size, setSize] = useState(100);
  const [points] = useState<ColorPoint[]>(DEFAULT_POINTS);
  const [livePoints, setLivePoints] = useState<ColorPoint[]>(DEFAULT_POINTS);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
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

      {/* Dev toggle */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Dev</span>
        <Switch checked={dev} onCheckedChange={setDev} aria-label="Toggle dev panel" />
      </div>

      {/* Dev panel */}
      {dev && (
        <div className="fixed right-4 top-14 z-50">
          <GradientDevPanel
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
          />
        </div>
      )}
    </div>
  );
}
