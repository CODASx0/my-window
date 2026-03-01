"use client";

import { memo, useState, useCallback, useSyncExternalStore } from "react";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  FALLOFF_PRESETS,
  WARP_PRESETS,
  DEFAULT_WAVE,
  MAX_WAVES,
} from "./mesh-gradient";
import type {
  ColorPoint,
  FalloffParams,
  WarpParams,
  WaveParams,
} from "./mesh-gradient";
import { livePointsStore } from "./live-points-store";

export interface GradientParams {
  falloff: FalloffParams;
  warpParams: WarpParams;
  noise: number;
  noiseScale: number;
  motion: boolean;
  speed: number;
  size: number;
}

const FALLOFF_PRESET_NAMES = Object.keys(FALLOFF_PRESETS);
const WARP_PRESET_NAMES = Object.keys(WARP_PRESETS);

function matchFalloffPreset(f: FalloffParams): string | undefined {
  return FALLOFF_PRESET_NAMES.find((name) => {
    const p = FALLOFF_PRESETS[name];
    return p.falloffExp === f.falloffExp && p.falloffCurve === f.falloffCurve;
  });
}

function wavesEqual(a: WaveParams, b: WaveParams): boolean {
  return a.angle === b.angle && a.freq === b.freq && a.strength === b.strength && a.dispAngle === b.dispAngle;
}

function waveArraysEqual(a: WaveParams[], b: WaveParams[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((w, i) => wavesEqual(w, b[i]));
}

function matchWarpPreset(w: WarpParams): string | undefined {
  return WARP_PRESET_NAMES.find((name) => {
    const p = WARP_PRESETS[name];
    return (
      p.warpSize === w.warpSize &&
      p.radialStrength === w.radialStrength &&
      p.radialDispAngle === w.radialDispAngle &&
      p.angularStrength === w.angularStrength &&
      p.angularDispAngle === w.angularDispAngle &&
      waveArraysEqual(p.waves, w.waves) &&
      p.warpTimeScale === w.warpTimeScale
    );
  });
}

interface GradientDevPanelProps {
  open: boolean;
  falloff: FalloffParams;
  warpParams: WarpParams;
  noise: number;
  noiseScale: number;
  motion: boolean;
  speed: number;
  size: number;
  points: ColorPoint[];
  onFalloffChange: (v: FalloffParams) => void;
  onWarpParamsChange: (v: WarpParams) => void;
  onNoiseChange: (v: number) => void;
  onNoiseScaleChange: (v: number) => void;
  onMotionChange: (v: boolean) => void;
  onSpeedChange: (v: number) => void;
  onSizeChange: (v: number) => void;
  onSave?: () => void;
  onReset?: () => void;
  savedParams?: GradientParams;
}

function paramsEqual(a: GradientParams, b: GradientParams): boolean {
  return (
    a.falloff.falloffExp === b.falloff.falloffExp &&
    a.falloff.falloffCurve === b.falloff.falloffCurve &&
    a.warpParams.warpSize === b.warpParams.warpSize &&
    a.warpParams.radialStrength === b.warpParams.radialStrength &&
    a.warpParams.radialDispAngle === b.warpParams.radialDispAngle &&
    a.warpParams.angularStrength === b.warpParams.angularStrength &&
    a.warpParams.angularDispAngle === b.warpParams.angularDispAngle &&
    waveArraysEqual(a.warpParams.waves, b.warpParams.waves) &&
    a.warpParams.warpTimeScale === b.warpParams.warpTimeScale &&
    a.noise === b.noise &&
    a.noiseScale === b.noiseScale &&
    a.motion === b.motion &&
    a.speed === b.speed &&
    a.size === b.size
  );
}

function InactiveTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="rounded bg-amber-500/15 px-1 py-px text-[9px] font-medium text-amber-500">
      无效果
    </span>
  );
}

const tipClass = "max-w-48 text-wrap text-pretty";

function SectionHeader({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className={tipClass}>
          {tip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function SubSectionHeader({
  label,
  tip,
  tag,
}: {
  label: string;
  tip: string;
  tag?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            <Info className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className={tipClass}>
          {tip}
        </TooltipContent>
      </Tooltip>
      {tag}
    </div>
  );
}

const warn = "font-mono text-xs text-amber-500 tabular-nums";
const normal = "font-mono text-xs text-muted-foreground tabular-nums";

function WaveControl({
  wave,
  onChange,
}: {
  wave: WaveParams;
  onChange: (w: WaveParams) => void;
}) {
  const inactive = wave.strength === 0 && wave.freq > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Angle</Label>
        <span className={normal}>
          {wave.angle.toFixed(0)}°
        </span>
      </div>
      <Slider
        value={[wave.angle]}
        onValueChange={([v]) => onChange({ ...wave, angle: v })}
        min={0}
        max={360}
        step={1}
      />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Freq</Label>
        <span className={normal}>
          {wave.freq.toFixed(1)}
        </span>
      </div>
      <Slider
        value={[wave.freq]}
        onValueChange={([v]) => onChange({ ...wave, freq: v })}
        min={0}
        max={10}
        step={0.1}
      />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Strength</Label>
        <span className={inactive ? warn : normal}>
          {wave.strength.toFixed(3)}
        </span>
      </div>
      <Slider
        value={[wave.strength]}
        onValueChange={([v]) => onChange({ ...wave, strength: v })}
        min={0}
        max={0.5}
        step={0.001}
      />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Push Dir</Label>
        <span className={normal}>
          {wave.dispAngle.toFixed(0)}°
        </span>
      </div>
      <Slider
        value={[wave.dispAngle]}
        onValueChange={([v]) => onChange({ ...wave, dispAngle: v })}
        min={0}
        max={360}
        step={1}
      />
    </div>
  );
}

function LivePointsDisplay({ fallbackPoints }: { fallbackPoints: ColorPoint[] }) {
  const live = useSyncExternalStore(
    livePointsStore.subscribe,
    livePointsStore.getSnapshot,
    () => [] as ColorPoint[],
  );
  const displayPoints = live.length > 0 ? live : fallbackPoints;

  return (
    <>
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
    </>
  );
}

export const GradientDevPanel = memo(function GradientDevPanel({
  open,
  falloff,
  warpParams,
  noise,
  noiseScale,
  motion,
  speed,
  size,
  points,
  onFalloffChange,
  onWarpParamsChange,
  onNoiseChange,
  onNoiseScaleChange,
  onMotionChange,
  onSpeedChange,
  onSizeChange,
  onSave,
  onReset,
  savedParams,
}: GradientDevPanelProps) {
  const [saved, setSaved] = useState(false);

  const currentParams: GradientParams = {
    falloff,
    warpParams,
    noise,
    noiseScale,
    motion,
    speed,
    size,
  };
  const isDefault = savedParams != null && paramsEqual(currentParams, savedParams);

  const handleSave = useCallback(() => {
    onSave?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [onSave]);

  const falloffPreset = matchFalloffPreset(falloff);
  const warpPreset = matchWarpPreset(warpParams);

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
        {/* --- Falloff Section --- */}
        <div className="space-y-1.5">
          <SectionHeader
            label="Falloff"
            tip="控制颜色的衰减方式。Exponent 越大，颜色边界越锐利；Curve Mix 在两种衰减曲线之间混合。"
          />
          <Select
            value={falloffPreset ?? "__custom"}
            onValueChange={(name) => {
              const p = FALLOFF_PRESETS[name];
              if (p) onFalloffChange(p);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Custom" />
            </SelectTrigger>
            <SelectContent>
              {FALLOFF_PRESET_NAMES.map((name) => (
                <SelectItem key={name} value={name} className="text-xs">
                  {name}
                </SelectItem>
              ))}
              {!falloffPreset && (
                <SelectItem value="__custom" className="text-xs" disabled>
                  Custom
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Exponent</Label>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {falloff.falloffExp.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[falloff.falloffExp]}
            onValueChange={([v]) => onFalloffChange({ ...falloff, falloffExp: v })}
            min={0.5}
            max={8}
            step={0.1}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Curve Mix</Label>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {falloff.falloffCurve.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[falloff.falloffCurve]}
            onValueChange={([v]) => onFalloffChange({ ...falloff, falloffCurve: v })}
            min={0}
            max={1}
            step={0.01}
          />
        </div>

        <Separator />

        {/* --- Warp Section --- */}
        <div className="space-y-1.5">
          <SectionHeader
            label="Warp"
            tip="对渐变进行空间扭曲变形，包含径向拉伸、旋涡扭曲和波纹效果。选择预设可快速切换不同风格。"
          />
          <Select
            value={warpPreset ?? "__custom"}
            onValueChange={(name) => {
              const p = WARP_PRESETS[name];
              if (p) onWarpParamsChange(p);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Custom" />
            </SelectTrigger>
            <SelectContent>
              {WARP_PRESET_NAMES.map((name) => (
                <SelectItem key={name} value={name} className="text-xs">
                  {name}
                </SelectItem>
              ))}
              {!warpPreset && (
                <SelectItem value="__custom" className="text-xs" disabled>
                  Custom
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <SubSectionHeader
            label="Radial"
            tip="径向拉伸：像引力一样，将中心附近的颜色沿指定方向拉扯。Strength 控制拉力大小，Push Dir 控制拉伸方向。"
            tag={<InactiveTag show={warpParams.radialStrength === 0} />}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Strength</Label>
            <span className={warpParams.radialStrength === 0 ? warn : normal}>
              {warpParams.radialStrength.toFixed(3)}
            </span>
          </div>
          <Slider
            value={[warpParams.radialStrength]}
            onValueChange={([v]) => onWarpParamsChange({ ...warpParams, radialStrength: v })}
            min={0}
            max={0.5}
            step={0.001}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Push Dir</Label>
            <span className={normal}>
              {warpParams.radialDispAngle.toFixed(0)}°
            </span>
          </div>
          <Slider
            value={[warpParams.radialDispAngle]}
            onValueChange={([v]) => onWarpParamsChange({ ...warpParams, radialDispAngle: v })}
            min={0}
            max={360}
            step={1}
          />
        </div>

        <div className="space-y-1.5">
          <SubSectionHeader
            label="Angular"
            tip="旋涡扭曲：围绕画面中心产生花瓣状/螺旋状的变形。Size 控制花瓣数量，Strength 控制扭曲幅度，Push Dir 控制扭曲方向。"
            tag={<InactiveTag show={warpParams.angularStrength === 0 || warpParams.warpSize === 0} />}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Size</Label>
            <span className={warpParams.warpSize === 0 && warpParams.angularStrength > 0 ? warn : normal}>
              {warpParams.warpSize.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[warpParams.warpSize]}
            onValueChange={([v]) => onWarpParamsChange({ ...warpParams, warpSize: v })}
            min={0}
            max={50}
            step={0.1}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Strength</Label>
            <span className={warpParams.angularStrength === 0 && warpParams.warpSize > 0 ? warn : normal}>
              {warpParams.angularStrength.toFixed(3)}
            </span>
          </div>
          <Slider
            value={[warpParams.angularStrength]}
            onValueChange={([v]) => onWarpParamsChange({ ...warpParams, angularStrength: v })}
            min={0}
            max={0.5}
            step={0.001}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Push Dir</Label>
            <span className={normal}>
              {warpParams.angularDispAngle.toFixed(0)}°
            </span>
          </div>
          <Slider
            value={[warpParams.angularDispAngle]}
            onValueChange={([v]) => onWarpParamsChange({ ...warpParams, angularDispAngle: v })}
            min={0}
            max={360}
            step={1}
          />
        </div>

        {warpParams.waves.map((wave, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <SubSectionHeader
                label={`Wave ${i + 1}`}
                tip="正弦波纹：沿 Angle 方向采样，按 Push Dir 方向推动像素。Freq 控制波纹密度，Strength 控制推动幅度。"
                tag={<InactiveTag show={wave.strength === 0 && wave.freq > 0} />}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const next = warpParams.waves.filter((_, j) => j !== i);
                  onWarpParamsChange({ ...warpParams, waves: next });
                }}
              >
                ✕
              </Button>
            </div>
            <WaveControl
              wave={wave}
              onChange={(w) => {
                const next = [...warpParams.waves];
                next[i] = w;
                onWarpParamsChange({ ...warpParams, waves: next });
              }}
            />
          </div>
        ))}

        {warpParams.waves.length < MAX_WAVES && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              onWarpParamsChange({
                ...warpParams,
                waves: [...warpParams.waves, { ...DEFAULT_WAVE }],
              });
            }}
          >
            + Wave
          </Button>
        )}

        <div className="space-y-1.5">
          <SubSectionHeader
            label="Time Scale"
            tip="变形动画速度：控制 Angular 和 Wave 效果随时间变化的快慢。设为 0 则变形静止不动。"
            tag={<InactiveTag show={warpParams.warpTimeScale === 0 && (warpParams.angularStrength > 0 || warpParams.waves.some((w) => w.strength > 0))} />}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Value</Label>
            <span className={warpParams.warpTimeScale === 0 && (warpParams.angularStrength > 0 || warpParams.waves.some((w) => w.strength > 0)) ? warn : normal}>
              {warpParams.warpTimeScale.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[warpParams.warpTimeScale]}
            onValueChange={([v]) => onWarpParamsChange({ ...warpParams, warpTimeScale: v })}
            min={0}
            max={3}
            step={0.01}
          />
        </div>

        <Separator />

        {/* --- Noise --- */}
        <div className="space-y-1.5">
          <SectionHeader
            label="Noise"
            tip="为渐变叠加颗粒感噪点纹理。Strength 控制噪点明显程度，Scale 控制噪点颗粒大小（值越大颗粒越细）。"
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Strength</Label>
            <span className={normal}>
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
          <div className="flex items-center justify-between">
            <Label className="text-xs">Scale</Label>
            <span className={normal}>
              {noiseScale.toFixed(0)}
            </span>
          </div>
          <Slider
            value={[noiseScale]}
            onValueChange={([v]) => onNoiseScaleChange(v)}
            min={10}
            max={1000}
            step={10}
          />
        </div>

        <Separator />

        {/* --- Motion --- */}
        <div className="space-y-1.5">
          <SubSectionHeader
            label="Motion"
            tip="颜色点轨道运动：开启后各颜色点会沿各自的椭圆轨道缓慢漂移，让渐变产生自然的呼吸感。Speed 控制漂移速度。"
            tag={<InactiveTag show={!motion || (motion && speed === 0)} />}
          />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Enabled</Label>
            <Switch
              checked={motion}
              onCheckedChange={onMotionChange}
              aria-label="Toggle motion"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Speed</Label>
            <span className={motion && speed === 0 ? warn : normal}>
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

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Canvas Size</Label>
            <span className={normal}>
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

        <LivePointsDisplay fallbackPoints={points} />
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
});
