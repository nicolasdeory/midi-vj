import type { RGB } from "./types.js";
import { emptyFrame } from "./color.js";

export class FrameBuffer {
  readonly pixels: RGB[];

  constructor(public readonly count: number) {
    this.pixels = emptyFrame(count);
  }

  clear(): void {
    for (let i = 0; i < this.count; i += 1) {
      this.pixels[i] = [0, 0, 0];
    }
  }

  clonePixels(): RGB[] {
    return this.pixels.map((p) => [...p] as RGB);
  }
}
