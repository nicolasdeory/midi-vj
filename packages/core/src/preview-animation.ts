import type { EffectParams } from "./types.js";
import { FrameBuffer } from "./frame.js";
import { renderEffect } from "./mixer.js";
import type { ActiveEffect } from "./types.js";
import { getEffectDurationMs, loopedElapsedMs } from "./effect-timing.js";
import { resolveBlendMode } from "./blend.js";

const PREVIEW_PIXELS = 32;

export { getEffectDurationMs, loopedElapsedMs } from "./effect-timing.js";

export function renderEffectPreviewAtTime(
  effect: EffectParams,
  elapsedMs: number,
  count = PREVIEW_PIXELS,
): ReturnType<FrameBuffer["clonePixels"]> {
  const buffer = new FrameBuffer(count);
  const active: ActiveEffect = {
    instanceId: "preview",
    mappingKey: "preview",
    slotId: "preview",
    effect,
    triggerMode: effect.type === "solid" ? "toggle" : "oneshot",
    blendMode: resolveBlendMode(effect.type),
    keyLayer: 0,
    slotLayer: 0,
    startedAt: 0,
    toggledOn: true,
  };
  renderEffect(buffer, active, elapsedMs);
  return buffer.clonePixels();
}
