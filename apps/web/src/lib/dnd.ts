export type PresetDragData = { type: "preset"; presetId: string };
export type KeyLayerDragData = { type: "key-layer"; source: string };
export type SlotDragData = { type: "slot"; slotId: string };
export type KeyboardKeyDropData = { type: "keyboard-key"; source: string };

export const dndId = {
  preset: (presetId: string) => `preset:${presetId}`,
  keyLayer: (source: string) => `key-layer:${source}`,
  slot: (slotId: string) => `slot:${slotId}`,
  keyboardKey: (source: string) => `keyboard-key:${source}`,
} as const;

export function isDndId(value: unknown, prefix: string): value is string {
  return typeof value === "string" && value.startsWith(`${prefix}:`);
}

export function dndIdSuffix(id: string, prefix: string): string {
  return id.slice(prefix.length + 1);
}
