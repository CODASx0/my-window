"use client";

import { useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
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

export interface GradientParams {
  gradientStyle: GradientStyle;
  warpShape: WarpShape;
  warp: number;
  warpSize: number;
  noise: number;
  motion: boolean;
  speed: number;
  size: number;
}

interface GradientDevPanelProps {
  open: boolean;
  gradientStyle: GradientStyle;
  warpShape: WarpShape;
  warp: number;
  warpSize: number;
  noise: number;
  motion: boolean;
  speed: number;
  size: number;
  points: ColorPoint[];
  livePoints?: ColorPoint[];
  onGradientStyleChange: (v: GradientStyle) => void;
  onWarpShapeChange: (v: WarpShape) => void;
  onWarpChange: (v: number) => void;
  onWarpSizeChange: (v: number) => void;
  onNoiseChange: (v: number) => void;
  onMotionChange: (v: boolean) => void;
  onSpeedChange: (v: number) => void;
  onSizeChange: (v: number) => void;
  onSave?: () => void;
  onReset?: () => void;
  savedParams?: GradientParams;
}

export function GradientDevPanel({
  open,
  gradientStyle,
  warpShape,
  warp,
  warpSize,
  noise,
  motion,
  speed,
  size,
  points,
  livePoints,
  onGradientStyleChange,
  onWarpShapeChange,
  onWarpChange,
  onWarpSizeChange,
  onNoiseChange,
  onMotionChange,
  onSpeedChange,
  onSizeChange,
  onSave,
  onReset,
  savedParams,
}: GradientDevPanelProps) {
  const [saved, setSaved] = useState(false);
  const displayPoints = livePoints ?? points;

  const isDefault =
    savedParams != null &&
    gradientStyle === savedParams.gradientStyle &&
    warpShape === savedParams.warpShape &&
    warp === savedParams.warp &&
    warpSize === savedParams.warpSize &&
    noise === savedParams.noise &&
    motion === savedParams.motion &&
    speed === savedParams.speed &&
    size === savedParams.size;

  const handleSave = useCallback(() => {
    onSave?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [onSave]);
  return (
    <aside
      className="flex h-dvh shrink-0 flex-col border-l border-border bg-card/95 shadow-lg backdrop-blur-sm transition-[width,opacity] duration-300 ease-out"
      style={{
        width: open ? "18rem" : 0,
        opacity: open ? 1 : 0,
        overflow: "hidden",
      }}
      aria-hidden={!open}
    >
      <div className="flex w-72 shrink-0 items-center border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Dev Controls
        </p>
      </div>

      <div className="w-72 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
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
            max={4.5}
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
            max={20}
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

        {/* Speed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Speed</Label>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {speed.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={([v]) => onSpeedChange(v)}
            min={0}
            max={10}
            step={0.01}
          />
        </div>

        {/* Canvas Size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Canvas Size</Label>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {size}px
            </span>
          </div>
          <Slider
            value={[size]}
            onValueChange={([v]) => onSizeChange(v)}
            min={50}
            max={600}
            step={10}
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

      <div className="flex w-72 shrink-0 gap-2 border-t border-border px-4 py-3">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1 text-xs"
          onClick={onReset}
          disabled={isDefault}
        >
          重置
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={handleSave}
          disabled={isDefault}
        >
          {saved ? "✓ 已保存" : isDefault ? "参数未变更" : "保存为默认参数"}
        </Button>
      </div>
    </aside>
  );
}
