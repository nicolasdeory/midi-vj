import type { LedRangeHighlight, RGB, StripSettings } from "./types.js";

/** Matches UI primary — used when previewing LED range on the physical strip. */
export const LED_RANGE_HIGHLIGHT_COLOR: RGB = [236, 196, 90];

export const DEFAULT_STRIP_SETTINGS: StripSettings = {
  inverted: false,
  gradientPreview: false,
};

export function applyStripTransform(
  pixels: readonly RGB[],
  settings: Pick<StripSettings, "inverted">,
): RGB[] {
  const copy = pixels.map((p) => [p[0], p[1], p[2]] as RGB);
  if (!settings.inverted) return copy;
  return copy.reverse();
}

export function buildGradientFrame(count: number): RGB[] {
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0 : index / (count - 1);
    return hslToRgb(t * 300, 0.95, 0.52);
  });
}

/** Engine-space frame for UI preview (gradient only — never inverted). */
export function toDisplayFrame(
  pixels: readonly RGB[],
  settings: Pick<StripSettings, "gradientPreview">,
): RGB[] {
  if (settings.gradientPreview) {
    return buildGradientFrame(pixels.length);
  }
  return pixels.map((p) => [p[0], p[1], p[2]] as RGB);
}

export function applyLedRangeHighlight(
  pixels: readonly RGB[],
  range: LedRangeHighlight | null,
  color: RGB = LED_RANGE_HIGHLIGHT_COLOR,
): RGB[] {
  if (!range) {
    return pixels.map((p) => [p[0], p[1], p[2]] as RGB);
  }

  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);

  return pixels.map((pixel, index) => {
    if (index < start || index > end) {
      return [pixel[0], pixel[1], pixel[2]] as RGB;
    }
    return color;
  });
}

/** Engine-space pixels → wire-order output frame (gradient override + invert). */
export function toOutputFrame(
  pixels: readonly RGB[],
  settings: StripSettings,
): RGB[] {
  const source = settings.gradientPreview
    ? buildGradientFrame(pixels.length)
    : pixels;
  return applyStripTransform(source, settings);
}

/** @deprecated Use toOutputFrame */
export const previewFrame = toOutputFrame;

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ] as RGB;
}
