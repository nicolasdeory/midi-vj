import type { RGB, BlendMode } from "./types.js";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function scaleColor(color: RGB, intensity: number): RGB {
  const t = clamp(intensity, 0, 1);
  return [
    Math.round(color[0] * t),
    Math.round(color[1] * t),
    Math.round(color[2] * t),
  ] as RGB;
}

export function addColors(a: RGB, b: RGB): RGB {
  return [
    clamp(a[0] + b[0], 0, 255),
    clamp(a[1] + b[1], 0, 255),
    clamp(a[2] + b[2], 0, 255),
  ] as RGB;
}

export function parseColor(input: string): RGB {
  const hex = input.replace("#", "").trim();
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ] as RGB;
  }
  return [255, 255, 255];
}

export function colorToHex(color: RGB): string {
  return `#${color.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function emptyFrame(count: number): RGB[] {
  return Array.from({ length: count }, () => [0, 0, 0] as RGB);
}

export function fillRange(
  frame: RGB[],
  start: number,
  end: number,
  color: RGB,
): void {
  const lo = clamp(Math.min(start, end), 0, frame.length - 1);
  const hi = clamp(Math.max(start, end), 0, frame.length - 1);
  for (let i = lo; i <= hi; i += 1) {
    frame[i] = color;
  }
}

export function overColors(base: RGB, overlay: RGB, alpha: number): RGB {
  const t = clamp(alpha, 0, 1);
  const inv = 1 - t;
  return [
    Math.round(base[0] * inv + overlay[0] * t),
    Math.round(base[1] * inv + overlay[1] * t),
    Math.round(base[2] * inv + overlay[2] * t),
  ] as RGB;
}

export function blendRange(
  frame: RGB[],
  start: number,
  end: number,
  color: RGB,
  mode: BlendMode = "add",
  alpha = 1,
): void {
  const lo = clamp(Math.min(start, end), 0, frame.length - 1);
  const hi = clamp(Math.max(start, end), 0, frame.length - 1);
  for (let i = lo; i <= hi; i += 1) {
    frame[i] = blendPixel(frame[i]!, color, mode, alpha);
  }
}

export function blendPixel(base: RGB, overlay: RGB, mode: BlendMode, alpha = 1): RGB {
  switch (mode) {
    case "over":
      return overColors(base, overlay, alpha);
    case "add":
      return addColors(base, overlay);
    case "max":
      return [
        Math.max(base[0], overlay[0]),
        Math.max(base[1], overlay[1]),
        Math.max(base[2], overlay[2]),
      ] as RGB;
    case "replace":
      return overlay;
  }
}
