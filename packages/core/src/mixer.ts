import { compareActiveEffects } from "./compose-order.js";
import { blendRange, scaleColor } from "./color.js";
import { getEffectDurationMs, loopedElapsedMs, shouldLoopEffect } from "./effect-timing.js";
import { FrameBuffer } from "./frame.js";
import type { ActiveEffect, EffectParams } from "./types.js";

function resolveElapsedMs(active: ActiveEffect, now: number, pixelCount: number): number {
  const elapsedMs = now - active.startedAt;
  if (shouldLoopEffect(active.triggerMode, active.toggledOn, active.effect.type)) {
    return loopedElapsedMs(elapsedMs, getEffectDurationMs(active.effect, pixelCount));
  }
  return elapsedMs;
}

function renderBoom(
  buffer: FrameBuffer,
  effect: Extract<EffectParams, { type: "boom" }>,
  elapsedMs: number,
  blendMode: ActiveEffect["blendMode"],
): boolean {
  const { color, ledStart, ledEnd, fadeMs } = effect.params;
  const intensity = Math.max(0, 1 - elapsedMs / fadeMs);
  if (intensity <= 0) return true;
  if (blendMode === "over") {
    blendRange(buffer.pixels, ledStart, ledEnd, color, "over", intensity);
  } else {
    blendRange(buffer.pixels, ledStart, ledEnd, scaleColor(color, intensity), blendMode);
  }
  return false;
}

function renderChase(
  buffer: FrameBuffer,
  effect: Extract<EffectParams, { type: "chase" }>,
  elapsedMs: number,
  blendMode: ActiveEffect["blendMode"],
): boolean {
  const { color, speedMs, width, direction = "forward" } = effect.params;
  const travel = buffer.count + width;
  const position = (elapsedMs / speedMs) % travel;
  const reverse = direction === "reverse";
  for (let w = 0; w < width; w += 1) {
    const head = Math.floor(position) - w;
    const index = reverse ? buffer.count - 1 - head : head;
    if (index >= 0 && index < buffer.count) {
      const tail = 1 - w / width;
      blendRange(buffer.pixels, index, index, scaleColor(color, tail), blendMode);
    }
  }
  return elapsedMs >= speedMs * travel;
}

function renderPulse(
  buffer: FrameBuffer,
  effect: Extract<EffectParams, { type: "pulse" }>,
  elapsedMs: number,
  blendMode: ActiveEffect["blendMode"],
): boolean {
  const { color, ledStart, ledEnd, durationMs } = effect.params;
  const t = elapsedMs / durationMs;
  if (t >= 1) return true;
  const intensity = Math.sin(t * Math.PI);
  blendRange(buffer.pixels, ledStart, ledEnd, scaleColor(color, intensity), blendMode);
  return false;
}

function renderStrobe(
  buffer: FrameBuffer,
  effect: Extract<EffectParams, { type: "strobe" }>,
  elapsedMs: number,
  blendMode: ActiveEffect["blendMode"],
): boolean {
  const { color, ledStart, ledEnd, flashes, intervalMs } = effect.params;
  const totalMs = flashes * intervalMs * 2;
  if (elapsedMs >= totalMs) return true;
  const phase = Math.floor(elapsedMs / intervalMs) % 2;
  if (phase === 0) {
    blendRange(buffer.pixels, ledStart, ledEnd, color, blendMode);
  }
  return false;
}

function renderSolid(
  buffer: FrameBuffer,
  effect: Extract<EffectParams, { type: "solid" }>,
  blendMode: ActiveEffect["blendMode"],
): boolean {
  const { color, ledStart, ledEnd } = effect.params;
  blendRange(buffer.pixels, ledStart, ledEnd, color, blendMode);
  return false;
}

export function renderEffect(
  buffer: FrameBuffer,
  active: ActiveEffect,
  now: number,
): boolean {
  if (active.effect.type === "solid") {
    if (active.triggerMode === "toggle" && !active.toggledOn) return true;
    return renderSolid(buffer, active.effect, active.blendMode);
  }

  const elapsedMs = resolveElapsedMs(active, now, buffer.count);
  switch (active.effect.type) {
    case "boom":
      return renderBoom(buffer, active.effect, elapsedMs, active.blendMode);
    case "chase":
      return renderChase(buffer, active.effect, elapsedMs, active.blendMode);
    case "pulse":
      return renderPulse(buffer, active.effect, elapsedMs, active.blendMode);
    case "strobe":
      return renderStrobe(buffer, active.effect, elapsedMs, active.blendMode);
    default:
      return true;
  }
}

export class Mixer {
  private readonly scratch: FrameBuffer;

  constructor(private readonly pixelCount: number) {
    this.scratch = new FrameBuffer(pixelCount);
  }

  compose(activeEffects: ActiveEffect[], now: number): FrameBuffer {
    this.scratch.clear();
    const sorted = [...activeEffects].sort(compareActiveEffects);
    for (const active of sorted) {
      renderEffect(this.scratch, active, now);
    }
    return this.scratch;
  }
}

export function isEffectComplete(
  active: ActiveEffect,
  now: number,
  pixelCount: number,
): boolean {
  if (active.triggerMode === "toggle") {
    return !active.toggledOn;
  }
  if (active.triggerMode === "hold") {
    return false;
  }
  const scratch = new FrameBuffer(pixelCount);
  return renderEffect(scratch, active, now);
}
