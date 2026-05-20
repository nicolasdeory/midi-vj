import type { BlendMode, EffectType } from "./types.js";

const DEFAULT_BLEND_BY_EFFECT: Record<EffectType, BlendMode> = {
  boom: "over",
  pulse: "replace",
  strobe: "replace",
  solid: "replace",
  chase: "add",
};

export function defaultBlendMode(effectType: EffectType): BlendMode {
  return DEFAULT_BLEND_BY_EFFECT[effectType];
}

export function resolveBlendMode(
  effectType: EffectType,
  slotBlendMode?: BlendMode,
): BlendMode {
  return slotBlendMode ?? defaultBlendMode(effectType);
}

export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  replace: "Replace",
  add: "Add",
  max: "Max",
  over: "Over",
};
