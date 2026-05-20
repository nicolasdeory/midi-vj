import type { EffectParams, EffectPreset, RGB } from "./types.js";
import { scaleColor } from "./color.js";
import { buildGradientFrame } from "./strip.js";

const PREVIEW_PIXELS = 32;

export function renderPresetPreview(preset: EffectPreset, count = PREVIEW_PIXELS): RGB[] {
  return renderEffectPreview(preset.effect, count);
}

export function renderEffectPreview(effect: EffectParams, count = PREVIEW_PIXELS): RGB[] {
  switch (effect.type) {
    case "boom":
      return previewBoom(effect.params, count);
    case "chase":
      return previewChase(effect.params, count);
    case "pulse":
      return previewPulse(effect.params, count);
    case "strobe":
      return previewStrobe(effect.params, count);
    case "solid":
      return previewSolid(effect.params, count);
    default:
      return buildGradientFrame(count);
  }
}

function previewBoom(
  params: Extract<EffectParams, { type: "boom" }>["params"],
  count: number,
): RGB[] {
  const frame = Array.from({ length: count }, () => [0, 0, 0] as RGB);
  const scale = count / 50;
  const start = Math.round(params.ledStart * scale);
  const end = Math.round(params.ledEnd * scale);
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  for (let i = lo; i <= hi; i += 1) {
    const edge = Math.min(i - lo, hi - i) / Math.max(1, (hi - lo) / 2);
    frame[i] = scaleColor(params.color, 0.35 + edge * 0.65);
  }
  return frame;
}

function previewChase(
  params: Extract<EffectParams, { type: "chase" }>["params"],
  count: number,
): RGB[] {
  const frame = Array.from({ length: count }, () => [0, 0, 0] as RGB);
  const reverse = params.direction === "reverse";
  const head = reverse ? Math.floor(count * 0.38) : Math.floor(count * 0.62);
  for (let w = 0; w < params.width; w += 1) {
    const index = reverse ? head + w : head - w;
    if (index >= 0 && index < count) {
      frame[index] = scaleColor(params.color, 1 - w / params.width);
    }
  }
  return frame;
}

function previewPulse(
  params: Extract<EffectParams, { type: "pulse" }>["params"],
  count: number,
): RGB[] {
  const frame = Array.from({ length: count }, () => [0, 0, 0] as RGB);
  const scale = count / 50;
  const start = Math.round(params.ledStart * scale);
  const end = Math.round(params.ledEnd * scale);
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  for (let i = lo; i <= hi; i += 1) {
    frame[i] = scaleColor(params.color, 0.75);
  }
  return frame;
}

function previewStrobe(
  params: Extract<EffectParams, { type: "strobe" }>["params"],
  count: number,
): RGB[] {
  const frame = Array.from({ length: count }, () => [0, 0, 0] as RGB);
  const scale = count / 50;
  const start = Math.round(params.ledStart * scale);
  const end = Math.round(params.ledEnd * scale);
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  for (let i = lo; i <= hi; i += 1) {
    frame[i] = i % 2 === 0 ? params.color : scaleColor(params.color, 0.15);
  }
  return frame;
}

function previewSolid(
  params: Extract<EffectParams, { type: "solid" }>["params"],
  count: number,
): RGB[] {
  const frame = Array.from({ length: count }, () => [0, 0, 0] as RGB);
  const scale = count / 50;
  const start = Math.round(params.ledStart * scale);
  const end = Math.round(params.ledEnd * scale);
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  for (let i = lo; i <= hi; i += 1) {
    frame[i] = params.color;
  }
  return frame;
}
