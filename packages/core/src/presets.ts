import type { EffectDefinition, EffectPreset } from "./types.js";

export const EFFECT_DEFINITIONS: EffectDefinition[] = [
  {
    type: "boom",
    label: "Boom",
    description: "Flash a span of LEDs and fade out.",
    defaultParams: {
      type: "boom",
      params: { color: [255, 40, 0], ledStart: 0, ledEnd: 49, fadeMs: 900 },
    },
    paramFields: [
      { kind: "color", key: "color", label: "Color" },
      { kind: "range", key: "ledStart", label: "Start LED", min: 0, max: 49 },
      { kind: "range", key: "ledEnd", label: "End LED", min: 0, max: 49 },
      { kind: "number", key: "fadeMs", label: "Fade (ms)", min: 100, max: 5000, step: 50 },
    ],
  },
  {
    type: "chase",
    label: "Chase",
    description: "A dot runs across the strip.",
    defaultParams: {
      type: "chase",
      params: { color: [0, 180, 255], speedMs: 35, width: 3, direction: "forward" },
    },
    paramFields: [
      { kind: "color", key: "color", label: "Color" },
      { kind: "number", key: "speedMs", label: "Speed (ms/step)", min: 10, max: 200, step: 5 },
      { kind: "range", key: "width", label: "Tail width", min: 1, max: 10 },
      {
        kind: "select",
        key: "direction",
        label: "Direction",
        options: [
          { value: "forward", label: "Forward" },
          { value: "reverse", label: "Reverse" },
        ],
      },
    ],
  },
  {
    type: "pulse",
    label: "Pulse",
    description: "Single smooth pulse across a span.",
    defaultParams: {
      type: "pulse",
      params: { color: [180, 0, 255], ledStart: 0, ledEnd: 49, durationMs: 700 },
    },
    paramFields: [
      { kind: "color", key: "color", label: "Color" },
      { kind: "range", key: "ledStart", label: "Start LED", min: 0, max: 49 },
      { kind: "range", key: "ledEnd", label: "End LED", min: 0, max: 49 },
      { kind: "number", key: "durationMs", label: "Duration (ms)", min: 200, max: 3000, step: 50 },
    ],
  },
  {
    type: "strobe",
    label: "Strobe",
    description: "Quick strobe flashes on a span.",
    defaultParams: {
      type: "strobe",
      params: { color: [255, 255, 255], ledStart: 0, ledEnd: 49, flashes: 4, intervalMs: 80 },
    },
    paramFields: [
      { kind: "color", key: "color", label: "Color" },
      { kind: "range", key: "ledStart", label: "Start LED", min: 0, max: 49 },
      { kind: "range", key: "ledEnd", label: "End LED", min: 0, max: 49 },
      { kind: "number", key: "flashes", label: "Flashes", min: 1, max: 12 },
      { kind: "number", key: "intervalMs", label: "Interval (ms)", min: 30, max: 300, step: 10 },
    ],
  },
  {
    type: "solid",
    label: "Solid",
    description: "Hold a color on a span (toggle mode).",
    defaultParams: {
      type: "solid",
      params: { color: [0, 255, 120], ledStart: 0, ledEnd: 49 },
    },
    paramFields: [
      { kind: "color", key: "color", label: "Color" },
      { kind: "range", key: "ledStart", label: "Start LED", min: 0, max: 49 },
      { kind: "range", key: "ledEnd", label: "End LED", min: 0, max: 49 },
    ],
  },
];

export const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: "boom-red-blast",
    name: "Red Blast",
    description: "Full strip red impact, fast fade",
    effect: { type: "boom", params: { color: [255, 30, 0], ledStart: 0, ledEnd: 49, fadeMs: 700 } },
    triggerMode: "oneshot",
  },
  {
    id: "boom-blue-wash",
    name: "Blue Wash",
    description: "Full strip blue, slow fade",
    effect: { type: "boom", params: { color: [0, 80, 255], ledStart: 0, ledEnd: 49, fadeMs: 2200 } },
    triggerMode: "oneshot",
  },
  {
    id: "boom-center-white",
    name: "Center White",
    description: "White flash in the middle",
    effect: { type: "boom", params: { color: [255, 255, 255], ledStart: 20, ledEnd: 29, fadeMs: 900 } },
    triggerMode: "oneshot",
  },
  {
    id: "boom-green-edge",
    name: "Green Edge",
    description: "Green hit on both ends",
    effect: { type: "boom", params: { color: [0, 255, 80], ledStart: 0, ledEnd: 8, fadeMs: 1100 } },
    triggerMode: "oneshot",
  },
  {
    id: "boom-magenta-snap",
    name: "Magenta Snap",
    description: "Short punchy full strip",
    effect: { type: "boom", params: { color: [255, 0, 180], ledStart: 0, ledEnd: 49, fadeMs: 450 } },
    triggerMode: "oneshot",
  },
  {
    id: "chase-cyan",
    name: "Cyan Runner",
    description: "Fast cyan dot across strip",
    effect: {
      type: "chase",
      params: { color: [0, 220, 255], speedMs: 30, width: 4, direction: "forward" },
    },
    triggerMode: "oneshot",
  },
  {
    id: "chase-amber-forward",
    name: "Amber Sprint",
    description: "Quick amber chase, forward",
    effect: {
      type: "chase",
      params: { color: [255, 160, 0], speedMs: 22, width: 3, direction: "forward" },
    },
    triggerMode: "toggle",
  },
  {
    id: "chase-red-reverse",
    name: "Red Rewind",
    description: "Red comet running reverse",
    effect: {
      type: "chase",
      params: { color: [255, 40, 0], speedMs: 40, width: 5, direction: "reverse" },
    },
    triggerMode: "toggle",
  },
  {
    id: "chase-green-reverse",
    name: "Green Return",
    description: "Wide green tail, reverse",
    effect: {
      type: "chase",
      params: { color: [0, 255, 90], speedMs: 55, width: 6, direction: "reverse" },
    },
    triggerMode: "toggle",
  },
  {
    id: "chase-violet-forward",
    name: "Violet Stream",
    description: "Slow violet sweep forward",
    effect: {
      type: "chase",
      params: { color: [140, 0, 255], speedMs: 65, width: 4, direction: "forward" },
    },
    triggerMode: "toggle",
  },
  {
    id: "chase-white-spark-reverse",
    name: "White Spark",
    description: "Tight white dot, fast reverse",
    effect: {
      type: "chase",
      params: { color: [255, 255, 255], speedMs: 18, width: 2, direction: "reverse" },
    },
    triggerMode: "oneshot",
  },
  {
    id: "pulse-purple",
    name: "Purple Pulse",
    description: "Full strip purple breath",
    effect: { type: "pulse", params: { color: [160, 0, 255], ledStart: 0, ledEnd: 49, durationMs: 800 } },
    triggerMode: "oneshot",
  },
  {
    id: "pulse-orange-slow",
    name: "Orange Breath",
    description: "Slow warm full-strip pulse",
    effect: { type: "pulse", params: { color: [255, 120, 0], ledStart: 0, ledEnd: 49, durationMs: 1400 } },
    triggerMode: "toggle",
  },
  {
    id: "pulse-cyan-center",
    name: "Cyan Core",
    description: "Tight cyan pulse in the middle",
    effect: { type: "pulse", params: { color: [0, 200, 255], ledStart: 18, ledEnd: 31, durationMs: 600 } },
    triggerMode: "oneshot",
  },
  {
    id: "pulse-red-snap",
    name: "Red Snap",
    description: "Fast red punch on full strip",
    effect: { type: "pulse", params: { color: [255, 0, 60], ledStart: 0, ledEnd: 49, durationMs: 350 } },
    triggerMode: "oneshot",
  },
  {
    id: "pulse-white-hold",
    name: "White Hold",
    description: "Gentle white full-strip swell",
    effect: { type: "pulse", params: { color: [255, 255, 255], ledStart: 0, ledEnd: 49, durationMs: 1200 } },
    triggerMode: "toggle",
  },
  {
    id: "pulse-green-edge",
    name: "Green Edge",
    description: "Pulse on both strip ends",
    effect: { type: "pulse", params: { color: [0, 255, 120], ledStart: 0, ledEnd: 10, durationMs: 700 } },
    triggerMode: "oneshot",
  },
  {
    id: "strobe-white",
    name: "White Strobe",
    description: "Full strip white strobe",
    effect: { type: "strobe", params: { color: [255, 255, 255], ledStart: 0, ledEnd: 49, flashes: 5, intervalMs: 70 } },
    triggerMode: "oneshot",
  },
  {
    id: "solid-green-wash",
    name: "Green Wash",
    description: "Toggle full green hold",
    effect: { type: "solid", params: { color: [0, 255, 100], ledStart: 0, ledEnd: 49 } },
    triggerMode: "toggle",
  },
];

export function getPreset(id: string): EffectPreset | undefined {
  return EFFECT_PRESETS.find((p) => p.id === id);
}

export function getEffectDefinition(type: string): EffectDefinition | undefined {
  return EFFECT_DEFINITIONS.find((e) => e.type === type);
}
