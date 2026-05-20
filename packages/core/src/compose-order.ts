import type { ActiveEffect } from "./types.js";

export function compareActiveEffects(a: ActiveEffect, b: ActiveEffect): number {
  return a.keyLayer - b.keyLayer || a.slotLayer - b.slotLayer || a.startedAt - b.startedAt;
}
