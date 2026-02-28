"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type {
  GradientStyle,
  WarpShape,
  ColorPoint,
} from "./mesh-gradient";

const GRADIENT_STYLES: { value: GradientStyle; label: string }[] = [
  { value: "sharp-bezier", label: "Sharp Bézier" },
  { value: "soft-bezier", label: "Soft Bézier" },
  { value: "mesh-static", label: "Mesh Static" },
  { value: "mesh-grid", label: "Mesh Grid" },
  { value: "simple", label: "Simple" },
];

const WARP_SHAPES: { value: WarpShape; label: string }[] = [
  { value: "flat", label: "Flat" },
  { value: "gravity", label: "Gravity" },
  { value: "circular", label: "Circular" },
  { value: "waves", label: "Waves" },
  { value: "rows", label: "Rows" },
  { value: "columns", label: "Columns" },
];

interface GradientDevPanelProps {
  gradientStyle: GradientStyle;
  warpShape: WarpShape;
  warp: number;
  warpSize: number;
  noise: number;
  motion: boolean;
  points: ColorPoint[];
  livePoints?: ColorPoint[];
  onGradientStyleChange: (v: GradientStyle) => void;
  onWarpShapeChange: (v: WarpShape) => void;
  onWarpChange: (v: number) => void;
  onWarpSizeChange: (v: number) => void;
  onNoiseChange: (v: number) => void;
  onMotionChange: (v: boolean) => void;
}

export function GradientDevPanel({
  gradientStyle,
  warpShape,
  warp,
  warpSize,
  noise,
  motion,
  points,
  livePoints,
  onGradientStyleChange,
  onWarpShapeChange,
  onWarpChange,
  onWarpSizeChange,
  onNoiseChange,
  onMotionChange,
}: GradientDevPanelProps) {
  const displayPoints = livePoints ?? points;
  return (
    <div className="w-64 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Dev Controls
      </p>

      <div className="space-y-4">
        {/* Gradient Style */}
        <div className="space-y-1.5">
          <Label className="text-xs">Gradient</Label>
          <Select value={gradientStyle} onValueChange={onGradientStyleChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRADIENT_STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warp Shape */}
        <div className="space-y-1.5">
          <Label className="text-xs">Warp Shape</Label>
          <Select value={warpShape} onValueChange={onWarpShapeChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WARP_SHAPES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warp */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Warp</Label>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {warp.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[warp]}
            onValueChange={([v]) => onWarpChange(v)}
            min={0}
            max={2}
            step={0.01}
          />
        </div>

        {/* Warp Size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Warp Size</Label>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {warpSize.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[warpSize]}
            onValueChange={([v]) => onWarpSizeChange(v)}
            min={0.1}
            max={5}
            step={0.1}
          />
        </div>

        {/* Noise */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Noise</Label>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {noise.toFixed(3)}
            </span>
          </div>
          <Slider
            value={[noise]}
            onValueChange={([v]) => onNoiseChange(v)}
            min={0}
            max={0.1}
            step={0.001}
          />
        </div>

        {/* Motion */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Motion</Label>
          <Switch
            checked={motion}
            onCheckedChange={onMotionChange}
            aria-label="Toggle motion"
          />
        </div>

        <Separator />

        {/* Color Points */}
        <div className="space-y-2">
          <Label className="text-xs">Color Points</Label>
          <div className="space-y-1.5">
            {displayPoints.map((pt, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="h-4 w-4 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: pt.color }}
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {pt.color}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                  ({pt.position[0].toFixed(2)}, {pt.position[1].toFixed(2)})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Visual point map */}
        <div className="relative aspect-square w-full rounded-lg border border-border bg-muted/50">
          {displayPoints.map((pt, i) => (
            <div
              key={i}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition-[left,bottom] duration-100"
              style={{
                left: `${pt.position[0] * 100}%`,
                bottom: `${pt.position[1] * 100}%`,
                backgroundColor: pt.color,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
