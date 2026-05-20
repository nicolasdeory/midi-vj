import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { EffectParams, RGB } from "@midi-vj/core";
import {
  getEffectDurationMs,
  loopedElapsedMs,
  renderEffectPreviewAtTime,
} from "@midi-vj/core";
import { colorToHex } from "@midi-vj/core";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props {
  effect: EffectParams;
  pixelCount?: number;
  playing?: boolean;
  showTimeline?: boolean;
  className?: string;
}

export const AnimatedPresetPreview = memo(function AnimatedPresetPreview({
  effect,
  pixelCount = 50,
  playing = false,
  showTimeline = true,
  className,
}: Props) {
  const durationMs = useMemo(() => getEffectDurationMs(effect, pixelCount), [effect, pixelCount]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    setElapsedMs(0);
  }, [effect, pixelCount]);

  useEffect(() => {
    if (!playing || scrubbing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setElapsedMs((prev) => loopedElapsedMs(prev + dt, durationMs));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, scrubbing, durationMs]);

  const endScrub = () => {
    draggingRef.current = false;
    setScrubbing(false);
  };

  const pixels: RGB[] = renderEffectPreviewAtTime(effect, elapsedMs, pixelCount);
  const progress = durationMs > 0 ? (elapsedMs / durationMs) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">
        <span>0</span>
        <div
          className="grid flex-1 gap-px"
          style={{ gridTemplateColumns: `repeat(${pixelCount}, minmax(0, 1fr))` }}
        >
          {pixels.map((pixel, index) => (
            <div
              key={index}
              className="h-3 rounded-[2px] ring-1 ring-white/5"
              style={{ backgroundColor: colorToHex(pixel) }}
            />
          ))}
        </div>
        <span>{pixelCount - 1}</span>
      </div>

      {showTimeline ? (
        <div className="space-y-1">
          <Slider
            value={[progress]}
            max={100}
            step={0.5}
            onPointerDown={() => {
              draggingRef.current = true;
              setScrubbing(true);
            }}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            onLostPointerCapture={endScrub}
            onValueChange={([value]) => {
              if (!draggingRef.current) return;
              setElapsedMs(((value ?? 0) / 100) * durationMs);
            }}
          />
          <div className="flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
            <span>{Math.round(elapsedMs)}ms</span>
            <span>{durationMs}ms loop</span>
          </div>
        </div>
      ) : null}
    </div>
  );
});
