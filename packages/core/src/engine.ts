import { isEffectComplete, Mixer, renderEffect } from "./mixer.js";
import { resolveBlendMode } from "./blend.js";
import type { ActiveEffect } from "./types.js";

export { isEffectComplete, renderEffect };

export class EffectEngine {
  private readonly mixer: Mixer;
  private active: ActiveEffect[] = [];
  private seq = 0;

  constructor(private readonly pixelCount: number) {
    this.mixer = new Mixer(pixelCount);
  }

  getActiveCount(): number {
    return this.active.length;
  }

  killAll(): void {
    this.active = [];
  }

  releaseHold(mappingKey: string): void {
    this.active = this.active.filter(
      (active) => !(active.mappingKey === mappingKey && active.triggerMode === "hold"),
    );
  }

  trigger(
    mappingKey: string,
    slotId: string,
    effect: ActiveEffect["effect"],
    triggerMode: ActiveEffect["triggerMode"],
    keyLayer = 0,
    slotLayer = 0,
    blendMode?: ActiveEffect["blendMode"],
  ): void {
    const now = performance.now();
    const resolvedBlend = resolveBlendMode(effect.type, blendMode);

    const createActive = (): ActiveEffect => ({
      instanceId: `${mappingKey}-${slotId}-${++this.seq}`,
      mappingKey,
      slotId,
      effect,
      triggerMode,
      blendMode: resolvedBlend,
      keyLayer,
      slotLayer,
      startedAt: now,
      toggledOn: true,
    });

    if (triggerMode === "hold") {
      this.active = this.active.filter(
        (active) =>
          !(
            active.mappingKey === mappingKey &&
            active.slotId === slotId &&
            active.triggerMode === "hold"
          ),
      );
      this.active.push(createActive());
      return;
    }

    if (triggerMode === "toggle") {
      const existing = this.active.find(
        (active) =>
          active.mappingKey === mappingKey &&
          active.slotId === slotId &&
          active.effect.type === effect.type &&
          active.triggerMode === "toggle",
      );
      if (existing) {
        existing.toggledOn = !existing.toggledOn;
        if (existing.toggledOn) {
          existing.startedAt = now;
          existing.keyLayer = keyLayer;
          existing.slotLayer = slotLayer;
        } else if (effect.type !== "solid") {
          this.active = this.active.filter((active) => active.instanceId !== existing.instanceId);
        }
        return;
      }
      this.active.push(createActive());
      return;
    }

    this.active.push(createActive());
  }

  tick(now: number) {
    this.active = this.active.filter((active) => {
      if (active.triggerMode === "toggle") {
        return active.toggledOn;
      }
      if (active.triggerMode === "hold") {
        return true;
      }
      return !isEffectComplete(active, now, this.pixelCount);
    });
    return this.mixer.compose(this.active, now);
  }
}
