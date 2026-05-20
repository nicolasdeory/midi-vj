export type RGB = readonly [number, number, number];

export type TriggerMode = "oneshot" | "toggle" | "hold";

export type BlendMode = "replace" | "add" | "max" | "over";

export type EffectType = "boom" | "chase" | "pulse" | "strobe" | "solid";

export type SourceId = string;

export type SpecialAction =
  | "switchGroup.next"
  | "switchGroup.prev"
  | "switchGroup.to"
  | "killAll";

export interface BoomParams {
  color: RGB;
  ledStart: number;
  ledEnd: number;
  fadeMs: number;
}

export type ChaseDirection = "forward" | "reverse";

export interface ChaseParams {
  color: RGB;
  speedMs: number;
  width: number;
  direction?: ChaseDirection;
}

export interface PulseParams {
  color: RGB;
  ledStart: number;
  ledEnd: number;
  durationMs: number;
}

export interface StrobeParams {
  color: RGB;
  ledStart: number;
  ledEnd: number;
  flashes: number;
  intervalMs: number;
}

export interface SolidParams {
  color: RGB;
  ledStart: number;
  ledEnd: number;
}

export type EffectParams =
  | { type: "boom"; params: BoomParams }
  | { type: "chase"; params: ChaseParams }
  | { type: "pulse"; params: PulseParams }
  | { type: "strobe"; params: StrobeParams }
  | { type: "solid"; params: SolidParams };

export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  effect: EffectParams;
  triggerMode: TriggerMode;
}

export interface EffectSlot {
  id: string;
  triggerMode: TriggerMode;
  presetId: string | null;
  effect: EffectParams;
  blendMode?: BlendMode;
}

export interface KeyMapping {
  source: SourceId;
  label: string;
  /** Cross-key draw priority — higher draws on top. */
  layer?: number;
  slots: EffectSlot[];
}

export interface ActionBinding {
  source: SourceId;
  label: string;
  action: SpecialAction;
  targetGroupId?: string;
}

export interface MappingGroup {
  id: string;
  name: string;
  order: number;
  mappings: KeyMapping[];
}

export interface ProjectClock {
  bpm: number;
  enabled: boolean;
}

export interface ProjectMeta {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPerformance {
  defaultGroupId: string;
  activeGroupId: string;
  specialBindings: ActionBinding[];
}

export interface MidiVjProject {
  format: "midi-vj-project";
  version: 1;
  meta: ProjectMeta;
  clock?: ProjectClock;
  presets: EffectPreset[];
  groups: MappingGroup[];
  performance: ProjectPerformance;
}

export interface ActiveEffect {
  instanceId: string;
  mappingKey: string;
  slotId: string;
  effect: EffectParams;
  triggerMode: TriggerMode;
  blendMode: BlendMode;
  keyLayer: number;
  slotLayer: number;
  startedAt: number;
  toggledOn: boolean;
}

export interface EngineConfig {
  pixelCount: number;
  fps: number;
  deviceIp: string;
  devicePort: number;
}

export interface StripSettings {
  inverted: boolean;
  gradientPreview: boolean;
}

export const DEFAULT_CONFIG: EngineConfig = {
  pixelCount: 50,
  fps: 60,
  deviceIp: "10.0.0.90",
  devicePort: 4003,
};

export interface EffectDefinition {
  type: EffectType;
  label: string;
  description: string;
  defaultParams: EffectParams;
  paramFields: ParamField[];
}

export type ParamField =
  | { kind: "color"; key: string; label: string }
  | { kind: "range"; key: string; label: string; min: number; max: number; step?: number }
  | { kind: "number"; key: string; label: string; min: number; max: number; step?: number }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] };

export interface LedRangeHighlight {
  start: number;
  end: number;
}

export type ClientMessage =
  | { type: "keydown"; source: string }
  | { type: "keyup"; source: string }
  | { type: "trigger"; source: string }
  | { type: "loadProject"; project: MidiVjProject }
  | { type: "setMapping"; mapping: KeyMapping; groupId?: string }
  | { type: "setKeyLayerOrder"; orderedSources: string[]; groupId?: string }
  | { type: "clearMapping"; source: string; groupId?: string }
  | { type: "setActiveGroup"; groupId: string }
  | { type: "setSpecialBinding"; binding: ActionBinding }
  | { type: "removeSpecialBinding"; source: string }
  | { type: "addGroup"; name: string }
  | { type: "renameGroup"; groupId: string; name: string }
  | { type: "removeGroup"; groupId: string }
  | { type: "setPerformanceMode"; enabled: boolean }
  | { type: "setDeviceIp"; ip: string }
  | { type: "setStripSettings"; settings: StripSettings }
  | { type: "setLedRangeHighlight"; range: LedRangeHighlight | null }
  | { type: "killAll" }
  | { type: "cycleGroup"; direction: 1 | -1 };

export type ServerMessage =
  | { type: "frame"; pixels: RGB[]; timestamp: number }
  | {
      type: "state";
      project: MidiVjProject;
      performanceMode: boolean;
      deviceIp: string;
      activeCount: number;
      stripSettings: StripSettings;
    }
  | { type: "presets"; presets: EffectPreset[] }
  | { type: "effects"; effects: EffectDefinition[] };
