import type { EffectParams, TriggerMode } from "./types.js";

export function getEffectDurationMs(effect: EffectParams, pixelCount = 50): number {
  switch (effect.type) {
    case "boom":
      return effect.params.fadeMs;
    case "chase":
      return effect.params.speedMs * (pixelCount + effect.params.width);
    case "pulse":
      return effect.params.durationMs;
    case "strobe":
      return effect.params.flashes * effect.params.intervalMs * 2;
    case "solid":
      return 1400;
    default:
      return 1000;
  }
}

export function loopedElapsedMs(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return elapsedMs % durationMs;
}

export function shouldLoopEffect(
  triggerMode: TriggerMode,
  toggledOn: boolean,
  effectType: EffectParams["type"],
): boolean {
  if (effectType === "solid") return false;
  return (triggerMode === "toggle" && toggledOn) || triggerMode === "hold";
}
