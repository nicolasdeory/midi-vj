import type { EffectPreset, MidiVjProject, StripSettings } from "@midi-vj/core";
import { DEFAULT_STRIP_SETTINGS } from "@midi-vj/core";

const STRIP_PROFILE_KEY = "midi-vj:strip-profile";
const PROJECTS_KEY = "midi-vj:projects";
const ACTIVE_PROJECT_KEY = "midi-vj:active-project-id";
const USER_PRESETS_KEY = "midi-vj:user-presets";

export interface StripProfile {
  deviceIp: string;
  stripSettings: StripSettings;
}

export interface ProjectRecord {
  id: string;
  project: MidiVjProject;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadStripProfile(): StripProfile {
  const raw = readJson<Partial<StripProfile>>(STRIP_PROFILE_KEY, {});
  return {
    deviceIp: raw.deviceIp ?? "10.0.0.90",
    stripSettings: raw.stripSettings ?? { ...DEFAULT_STRIP_SETTINGS },
  };
}

export function saveStripProfile(profile: StripProfile): void {
  writeJson(STRIP_PROFILE_KEY, profile);
}

export function loadProjectRecords(): ProjectRecord[] {
  return readJson<ProjectRecord[]>(PROJECTS_KEY, []);
}

export function saveProjectRecords(records: ProjectRecord[]): void {
  writeJson(PROJECTS_KEY, records);
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string): void {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

export function loadActiveProject(): ProjectRecord | null {
  const id = getActiveProjectId();
  if (!id) return null;
  return loadProjectRecords().find((record) => record.id === id) ?? null;
}

export function upsertProjectRecord(record: ProjectRecord): void {
  const records = loadProjectRecords();
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) records[index] = record;
  else records.push(record);
  saveProjectRecords(records);
}

export function deleteProjectRecord(id: string): void {
  saveProjectRecords(loadProjectRecords().filter((record) => record.id !== id));
  if (getActiveProjectId() === id) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function loadUserPresets(): EffectPreset[] {
  return readJson<EffectPreset[]>(USER_PRESETS_KEY, []);
}

export function saveUserPresets(presets: EffectPreset[]): void {
  writeJson(USER_PRESETS_KEY, presets);
}

export function addUserPreset(preset: EffectPreset): void {
  const presets = loadUserPresets().filter((item) => item.id !== preset.id);
  saveUserPresets([...presets, preset]);
}

export function createProjectId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `proj-${Date.now().toString(36)}`;
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve(await file.text());
    };
    input.click();
  });
}
