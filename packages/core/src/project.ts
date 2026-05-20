import { EFFECT_PRESETS, getPreset } from "./presets.js";
import type {
  ActionBinding,
  EffectParams,
  EffectPreset,
  EffectSlot,
  KeyMapping,
  MappingGroup,
  MidiVjProject,
  ProjectClock,
  TriggerMode,
} from "./types.js";

export const PROJECT_FORMAT = "midi-vj-project" as const;
export const PRESET_FORMAT = "midi-vj-preset" as const;
export const PROJECT_VERSION = 1;
export const PRESET_VERSION = 1;

/** @deprecated v0 flat mapping — migrated on import */
export interface LegacyKeyMapping {
  key: string;
  label: string;
  presetId: string | null;
  effect: EffectParams;
  triggerMode: TriggerMode;
}

let idSeq = 0;

function randomSuffix(): string {
  idSeq += 1;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `${Date.now().toString(36)}-${idSeq.toString(36)}`;
}

export function createSlotId(): string {
  return `slot-${randomSuffix()}`;
}

export function createGroupId(): string {
  return `group-${randomSuffix()}`;
}

export function labelForSource(source: string): string {
  if (source === "Space") return "Space";
  if (source.startsWith("midi:")) return source.replace("midi:", "").toUpperCase();
  return source.toUpperCase();
}

export function migrateLegacyMapping(legacy: LegacyKeyMapping): KeyMapping {
  return {
    source: legacy.key,
    label: legacy.label,
    slots: [
      {
        id: createSlotId(),
        triggerMode: legacy.triggerMode,
        presetId: legacy.presetId,
        effect: legacy.effect,
      },
    ],
  };
}

function defaultMainGroup(): MappingGroup {
  const presetKeys: { source: string; presetId: string; triggerMode?: TriggerMode }[] = [
    { source: "a", presetId: "boom-red-blast" },
    { source: "s", presetId: "boom-blue-wash" },
    { source: "d", presetId: "boom-center-white" },
    { source: "f", presetId: "boom-magenta-snap" },
    { source: "g", presetId: "chase-cyan" },
    { source: "h", presetId: "pulse-purple" },
    { source: "j", presetId: "strobe-white" },
    { source: "k", presetId: "solid-green-wash", triggerMode: "toggle" },
  ];

  const mappings: KeyMapping[] = presetKeys.flatMap(({ source, presetId, triggerMode }) => {
    const preset = getPreset(presetId);
    if (!preset) return [];
    return [
      {
        source,
        label: labelForSource(source),
        slots: [
          {
            id: createSlotId(),
            triggerMode: triggerMode ?? preset.triggerMode,
            presetId,
            effect: preset.effect,
          },
        ],
      },
    ];
  });

  const groupId = "group-main";
  return { id: groupId, name: "Main", order: 0, mappings };
}

export function createDefaultProject(name = "Untitled"): MidiVjProject {
  const now = new Date().toISOString();
  const main = defaultMainGroup();
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    meta: { name, createdAt: now, updatedAt: now },
    clock: { bpm: 120, enabled: false },
    presets: [],
    groups: [main],
    performance: {
      defaultGroupId: main.id,
      activeGroupId: main.id,
      specialBindings: [],
    },
  };
}

export function touchProject(project: MidiVjProject): MidiVjProject {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
  };
}

export function serializeProject(project: MidiVjProject): string {
  return JSON.stringify(project, null, 2);
}

export function serializePreset(preset: EffectPreset): string {
  return JSON.stringify(
    { format: PRESET_FORMAT, version: PRESET_VERSION, preset },
    null,
    2,
  );
}

function isLegacyMapping(value: unknown): value is LegacyKeyMapping {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.key === "string" && !Array.isArray(record.slots);
}

function normalizeMapping(raw: unknown): KeyMapping {
  if (isLegacyMapping(raw)) return migrateLegacyMapping(raw);
  const record = raw as KeyMapping;
  return {
    source: record.source,
    label: record.label ?? labelForSource(record.source),
    layer: typeof record.layer === "number" ? record.layer : 0,
    slots: record.slots.map((slot) => ({
      id: slot.id || createSlotId(),
      triggerMode: slot.triggerMode,
      presetId: slot.presetId ?? null,
      effect: slot.effect,
      blendMode: slot.blendMode,
    })),
  };
}

function normalizeGroup(raw: unknown): MappingGroup {
  const record = raw as MappingGroup;
  return {
    id: record.id || createGroupId(),
    name: record.name || "Group",
    order: record.order ?? 0,
    mappings: (record.mappings ?? []).map(normalizeMapping),
  };
}

function normalizeBinding(raw: unknown): ActionBinding {
  const record = raw as ActionBinding;
  return {
    source: record.source,
    label: record.label ?? labelForSource(record.source),
    action: record.action,
    targetGroupId: record.targetGroupId,
  };
}

export function parseProject(json: string): MidiVjProject {
  const raw = JSON.parse(json) as Record<string, unknown>;

  if (raw.format === PROJECT_FORMAT && raw.version === PROJECT_VERSION) {
    const project = raw as unknown as MidiVjProject;
    const groups = (project.groups ?? []).map(normalizeGroup);
    if (groups.length === 0) groups.push(defaultMainGroup());

    const defaultGroupId = project.performance?.defaultGroupId ?? groups[0]!.id;
    const activeGroupId = project.performance?.activeGroupId ?? defaultGroupId;

    return {
      format: PROJECT_FORMAT,
      version: PROJECT_VERSION,
      meta: {
        name: project.meta?.name ?? "Imported",
        createdAt: project.meta?.createdAt ?? new Date().toISOString(),
        updatedAt: project.meta?.updatedAt ?? new Date().toISOString(),
      },
      clock: project.clock ?? { bpm: 120, enabled: false },
      presets: project.presets ?? [],
      groups,
      performance: {
        defaultGroupId,
        activeGroupId,
        specialBindings: (project.performance?.specialBindings ?? []).map(normalizeBinding),
      },
    };
  }

  // Legacy: array of flat mappings
  if (Array.isArray(raw)) {
    const project = createDefaultProject("Imported");
    project.groups[0]!.mappings = raw.map((item) => normalizeMapping(item));
    return project;
  }

  if (Array.isArray(raw.mappings)) {
    const project = createDefaultProject(String(raw.name ?? "Imported"));
    project.groups[0]!.mappings = (raw.mappings as unknown[]).map(normalizeMapping);
    return project;
  }

  throw new Error("Unrecognized project file format");
}

export function parsePresetExport(json: string): EffectPreset {
  const raw = JSON.parse(json) as Record<string, unknown>;
  if (raw.format === PRESET_FORMAT && raw.version === PRESET_VERSION) {
    return (raw as { preset: EffectPreset }).preset;
  }
  if (raw.id && raw.effect) {
    return raw as unknown as EffectPreset;
  }
  throw new Error("Unrecognized preset file format");
}

export function getActiveGroup(project: MidiVjProject): MappingGroup {
  return (
    project.groups.find((g) => g.id === project.performance.activeGroupId) ??
    project.groups.find((g) => g.id === project.performance.defaultGroupId) ??
    project.groups[0]!
  );
}

export function getGroupMappings(project: MidiVjProject, groupId?: string): KeyMapping[] {
  const id = groupId ?? project.performance.activeGroupId;
  return project.groups.find((g) => g.id === id)?.mappings ?? [];
}

export function findMapping(
  project: MidiVjProject,
  source: string,
  groupId?: string,
): KeyMapping | null {
  return getGroupMappings(project, groupId).find((m) => m.source === source) ?? null;
}

export function mappingLayer(mapping: KeyMapping): number {
  return mapping.layer ?? 0;
}

export function compareMappingsByLayer(a: KeyMapping, b: KeyMapping): number {
  return mappingLayer(a) - mappingLayer(b) || a.label.localeCompare(b.label);
}

export function sortMappingsByLayer(mappings: KeyMapping[]): KeyMapping[] {
  return [...mappings].sort(compareMappingsByLayer);
}

export function nextKeyLayer(mappings: KeyMapping[]): number {
  if (mappings.length === 0) return 0;
  return Math.max(...mappings.map(mappingLayer)) + 1;
}

export function setKeyLayerOrderInProject(
  project: MidiVjProject,
  orderedSources: string[],
  groupId?: string,
): MidiVjProject {
  const gid = groupId ?? project.performance.activeGroupId;
  const layerBySource = new Map(orderedSources.map((source, index) => [source, index]));
  return touchProject({
    ...project,
    groups: project.groups.map((group) => {
      if (group.id !== gid) return group;
      return {
        ...group,
        mappings: group.mappings.map((mapping) => {
          const layer = layerBySource.get(mapping.source);
          if (layer === undefined) return mapping;
          return layer === mappingLayer(mapping) ? mapping : { ...mapping, layer };
        }),
      };
    }),
  });
}

export function setMappingInProject(
  project: MidiVjProject,
  mapping: KeyMapping,
  groupId?: string,
): MidiVjProject {
  const gid = groupId ?? project.performance.activeGroupId;
  return touchProject({
    ...project,
    groups: project.groups.map((group) => {
      if (group.id !== gid) return group;
      const rest = group.mappings.filter((m) => m.source !== mapping.source);
      return { ...group, mappings: [...rest, mapping] };
    }),
  });
}

export function clearMappingInProject(
  project: MidiVjProject,
  source: string,
  groupId?: string,
): MidiVjProject {
  const gid = groupId ?? project.performance.activeGroupId;
  return touchProject({
    ...project,
    groups: project.groups.map((group) => {
      if (group.id !== gid) return group;
      return { ...group, mappings: group.mappings.filter((m) => m.source !== source) };
    }),
  });
}

export function setActiveGroupInProject(project: MidiVjProject, groupId: string): MidiVjProject {
  if (!project.groups.some((g) => g.id === groupId)) return project;
  return touchProject({
    ...project,
    performance: { ...project.performance, activeGroupId: groupId },
  });
}

export function cycleGroup(project: MidiVjProject, direction: 1 | -1): MidiVjProject {
  const sorted = [...project.groups].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((g) => g.id === project.performance.activeGroupId);
  const next = sorted[(index + direction + sorted.length) % sorted.length]!;
  return setActiveGroupInProject(project, next.id);
}

export function duplicateProject(project: MidiVjProject, name?: string): MidiVjProject {
  const copy = structuredClone(project);
  const now = new Date().toISOString();
  copy.meta = {
    name: name ?? `${project.meta.name} copy`,
    createdAt: now,
    updatedAt: now,
  };
  return copy;
}

export function mergeBuiltinPresets(projectPresets: EffectPreset[]): EffectPreset[] {
  const byId = new Map<string, EffectPreset>();
  for (const preset of EFFECT_PRESETS) byId.set(preset.id, preset);
  for (const preset of projectPresets) byId.set(preset.id, preset);
  return [...byId.values()];
}

export function primarySlot(mapping: KeyMapping): EffectSlot | null {
  return mapping.slots.at(-1) ?? null;
}

export function primaryEffect(mapping: KeyMapping): EffectParams | null {
  return primarySlot(mapping)?.effect ?? null;
}

export function mappingSummary(mapping: KeyMapping): string {
  if (mapping.slots.length === 0) return "—";
  if (mapping.slots.length === 1) {
    const slot = mapping.slots[0]!;
    if (slot.presetId) return slot.presetId.replace(/-/g, " ");
    return slot.effect.type;
  }
  return `${mapping.slots.length} slots`;
}

export function defaultClock(): ProjectClock {
  return { bpm: 120, enabled: false };
}
