import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redo2, Undo2, Zap } from "lucide-react";
import type { EffectPreset, KeyMapping, LedRangeHighlight, MidiVjProject } from "@midi-vj/core";
import {
  createDefaultProject,
  createSlotId,
  findMapping,
  getActiveGroup,
  getGroupMappings,
  labelForSource,
  mergeBuiltinPresets,
  nextKeyLayer,
  touchProject,
} from "@midi-vj/core";
import { KeyboardMap } from "@/components/KeyboardMap";
import { MappingInspector } from "@/components/MappingInspector";
import { PerformanceView } from "@/components/PerformanceView";
import { PresetLibrary } from "@/components/PresetLibrary";
import { PresetDndProvider } from "@/components/PresetDndProvider";
import { ProjectMenu } from "@/components/ProjectMenu";
import { StripPreview } from "@/components/StripPreview";
import { KeyboardShortcut } from "@/components/keyboard-shortcut";
import { StripSettingsSheet } from "@/components/StripSettingsSheet";
import { Button } from "@/components/ui/button";
import { useProjectUndo } from "@/hooks/use-project-undo";
import { useMidiVjSocket } from "@/hooks/use-midi-vj-socket";
import {
  addUserPreset,
  createProjectId,
  loadActiveProject,
  loadStripProfile,
  loadUserPresets,
  saveStripProfile,
  setActiveProjectId,
  upsertProjectRecord,
  type ProjectRecord,
} from "@/lib/storage";
import type { KeyContextAction } from "@/lib/key-gestures";

export function App() {
  const {
    status,
    connected,
    performanceMode,
    project,
    effects,
    deviceIp,
    stripSettings,
    activeCount,
    send,
    reconnectNow,
    setOnConnect,
  } = useMidiVjSocket();

  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => loadActiveProject()?.id ?? null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [ledRangeHighlight, setLedRangeHighlight] = useState<LedRangeHighlight | null>(null);
  const [userPresets, setUserPresets] = useState(() => loadUserPresets());
  const hydratedRef = useRef(false);
  const skipRememberRef = useRef(false);
  const skipPersistRef = useRef(false);
  const storageSyncedRef = useRef(false);
  const prevProjectRef = useRef<MidiVjProject | null>(null);

  const { remember, undo, redo, reset, canUndo, canRedo } = useProjectUndo();

  const activeGroup = useMemo(() => (project ? getActiveGroup(project) : null), [project]);
  const mappings = useMemo(() => (project ? getGroupMappings(project) : []), [project]);
  const selectedMapping = useMemo(
    () => (project && selectedKey ? findMapping(project, selectedKey) : null),
    [project, selectedKey],
  );
  const selectedSpecial = useMemo(
    () =>
      project && selectedKey
        ? project.performance.specialBindings.find((b) => b.source === selectedKey) ?? null
        : null,
    [project, selectedKey],
  );
  const libraryPresets = useMemo(() => {
    if (!project) return mergeBuiltinPresets(userPresets);
    return mergeBuiltinPresets([...userPresets, ...project.presets]);
  }, [project, userPresets]);
  const sortedGroups = useMemo(
    () => (project ? [...project.groups].sort((a, b) => a.order - b.order) : []),
    [project],
  );
  const groupIndex = activeGroup ? sortedGroups.findIndex((group) => group.id === activeGroup.id) : 0;
  const selectedPresetId = useMemo(() => {
    if (!selectedMapping?.slots.length) return null;
    const slot =
      selectedSlotId != null
        ? selectedMapping.slots.find((s) => s.id === selectedSlotId)
        : selectedMapping.slots[0];
    return slot?.presetId ?? null;
  }, [selectedMapping, selectedSlotId]);

  useEffect(() => {
    setSelectedSlotId(null);
  }, [selectedKey]);

  const persistProject = useCallback((record: ProjectRecord) => {
    upsertProjectRecord(record);
    setActiveProjectId(record.id);
    setActiveProjectIdState(record.id);
  }, []);

  const loadProjectOnServer = useCallback(
    (next: MidiVjProject, projectId = activeProjectId) => {
      skipRememberRef.current = true;
      send({ type: "loadProject", project: next });
      if (projectId) persistProject({ id: projectId, project: next });
    },
    [activeProjectId, persistProject, send],
  );

  useEffect(() => {
    if (status !== "connected") {
      storageSyncedRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    setOnConnect(() => {
      storageSyncedRef.current = false;

      const profile = loadStripProfile();
      send({ type: "setDeviceIp", ip: profile.deviceIp });
      send({ type: "setStripSettings", settings: profile.stripSettings });

      let record = loadActiveProject();
      if (!record) {
        const id = createProjectId();
        record = { id, project: createDefaultProject() };
        upsertProjectRecord(record);
        setActiveProjectId(record.id);
      }

      setActiveProjectIdState(record.id);
      reset();
      skipRememberRef.current = true;
      skipPersistRef.current = true;
      send({ type: "loadProject", project: record.project });
      prevProjectRef.current = record.project;
      hydratedRef.current = true;
      storageSyncedRef.current = true;
    });
  }, [reset, send, setOnConnect]);

  useEffect(() => {
    if (!project || !hydratedRef.current) return;

    if (skipRememberRef.current) {
      skipRememberRef.current = false;
      prevProjectRef.current = project;
      return;
    }

    if (prevProjectRef.current && prevProjectRef.current !== project) {
      remember(prevProjectRef.current);
    }
    prevProjectRef.current = project;
  }, [project, remember]);

  useEffect(() => {
    if (!project || !hydratedRef.current || !activeProjectId || !storageSyncedRef.current) return;

    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      if (!storageSyncedRef.current) return;
      persistProject({ id: activeProjectId, project });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [project, activeProjectId, persistProject]);

  const persistStripProfile = useCallback(
    (patch: Partial<{ deviceIp: string; stripSettings: typeof stripSettings }>) => {
      saveStripProfile({
        deviceIp: patch.deviceIp ?? deviceIp,
        stripSettings: patch.stripSettings ?? stripSettings,
      });
    },
    [deviceIp, stripSettings],
  );

  const mutateProject = useCallback(
    (message: Parameters<typeof send>[0]) => {
      send(message);
    },
    [send],
  );

  const handleUndo = useCallback(() => {
    if (!project) return;
    const previous = undo(project);
    if (previous) loadProjectOnServer(previous);
  }, [loadProjectOnServer, project, undo]);

  const handleRedo = useCallback(() => {
    if (!project) return;
    const next = redo(project);
    if (next) loadProjectOnServer(next);
  }, [loadProjectOnServer, project, redo]);

  const enterPerformance = useCallback(() => {
    send({ type: "setPerformanceMode", enabled: true });
  }, [send]);

  const exitPerformance = useCallback(() => {
    send({ type: "setPerformanceMode", enabled: false });
  }, [send]);

  useEffect(() => {
    if (performanceMode) return;
    const handler = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        setPreviewPlaying((playing) => !playing);
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [handleRedo, handleUndo, performanceMode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "p" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      if (performanceMode) exitPerformance();
      else enterPerformance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [performanceMode, enterPerformance, exitPerformance]);

  const clearKey = useCallback(
    (source: string) => {
      send({ type: "clearMapping", source });
      send({ type: "removeSpecialBinding", source });
      if (selectedKey === source) setSelectedKey(null);
    },
    [selectedKey, send],
  );

  const handleKeyAction = useCallback(
    (source: string, action: KeyContextAction) => {
      switch (action) {
        case "test":
          send({ type: "trigger", source });
          break;
        case "clear":
          clearKey(source);
          break;
        case "killAll":
          send({ type: "killAll" });
          break;
        case "nextGroup":
          send({ type: "cycleGroup", direction: 1 });
          break;
      }
    },
    [clearKey, send],
  );

  const handleKeyTestLive = useCallback(
    (source: string) => {
      setSelectedKey(source);
      send({ type: "trigger", source });
    },
    [send],
  );

  const handleRemoveGroup = useCallback(
    (groupId: string) => {
      send({ type: "removeGroup", groupId });
    },
    [send],
  );

  const assignPresetToKey = useCallback(
    (preset: EffectPreset, targetKey: string, replaceKey: boolean) => {
      if (!project) return;

      const existing = findMapping(project, targetKey);
      const slotContent = {
        triggerMode: preset.triggerMode,
        presetId: preset.id,
        effect: preset.effect,
      };

      mutateProject({ type: "removeSpecialBinding", source: targetKey });

      if (!replaceKey && existing && existing.slots.length > 0) {
        const targetId =
          selectedSlotId && existing.slots.some((s) => s.id === selectedSlotId)
            ? selectedSlotId
            : existing.slots[0]!.id;
        const mapping: KeyMapping = {
          ...existing,
          slots: existing.slots.map((slot) =>
            slot.id === targetId ? { ...slot, ...slotContent } : slot,
          ),
        };
        mutateProject({ type: "setMapping", mapping });
        return;
      }

      const slotId = createSlotId();
      const mapping: KeyMapping = {
        source: targetKey,
        label: labelForSource(targetKey),
        layer: existing ? (existing.layer ?? 0) : nextKeyLayer(getGroupMappings(project)),
        slots: [{ id: slotId, ...slotContent }],
      };
      setSelectedKey(targetKey);
      setSelectedSlotId(slotId);
      mutateProject({ type: "setMapping", mapping });
    },
    [mutateProject, project, selectedSlotId],
  );

  const assignPreset = useCallback(
    (preset: EffectPreset) => {
      if (!selectedKey) return;
      assignPresetToKey(preset, selectedKey, false);
    },
    [assignPresetToKey, selectedKey],
  );

  const assignPresetByDrop = useCallback(
    (targetKey: string, presetId: string) => {
      const preset = libraryPresets.find((item) => item.id === presetId);
      if (!preset) return;
      assignPresetToKey(preset, targetKey, true);
    },
    [assignPresetToKey, libraryPresets],
  );

  const handleOpenProject = useCallback(
    (record: ProjectRecord) => {
      setActiveProjectIdState(record.id);
      reset();
      skipRememberRef.current = true;
      prevProjectRef.current = record.project;
      loadProjectOnServer(record.project, record.id);
    },
    [loadProjectOnServer, reset],
  );

  const handleImportProject = useCallback(
    (imported: MidiVjProject) => {
      const id = createProjectId();
      const next = touchProject(imported);
      persistProject({ id, project: next });
      handleOpenProject({ id, project: next });
    },
    [handleOpenProject, persistProject],
  );

  if (performanceMode && project && activeGroup) {
    return (
      <PerformanceView
        status={status}
        connected={connected}
        mappings={mappings}
        specialBindings={project.performance.specialBindings}
        activeGroup={activeGroup}
        groupIndex={groupIndex}
        groupCount={sortedGroups.length}
        activeCount={activeCount}
        stripSettings={stripSettings}
        onExit={exitPerformance}
        onTrigger={(source) => send({ type: "trigger", source })}
        onKeyDown={(source) => send({ type: "keydown", source })}
        onKeyUp={(source) => send({ type: "keyup", source })}
        onReconnect={reconnectNow}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <ProjectMenu
            activeProjectId={activeProjectId}
            project={project}
            onOpenProject={handleOpenProject}
            onNewProject={handleOpenProject}
            onImportProject={handleImportProject}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" disabled={!canUndo} onClick={handleUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" disabled={!canRedo} onClick={handleRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <StripSettingsSheet
            status={status}
            connected={connected}
            deviceIp={deviceIp}
            stripSettings={stripSettings}
            onDeviceIpCommit={(ip) => {
              send({ type: "setDeviceIp", ip });
              persistStripProfile({ deviceIp: ip });
            }}
            onStripSettingsChange={(settings) => {
              send({ type: "setStripSettings", settings });
              persistStripProfile({ stripSettings: settings });
            }}
            onReconnect={reconnectNow}
          />
          <Button onClick={enterPerformance} className="gap-2.5">
            Performance
            <KeyboardShortcut keys={["p"]} variant="on-primary" />
          </Button>
        </div>
      </header>

      <div className="shrink-0">
        <StripPreview
          activeCount={activeCount}
          stripSettings={stripSettings}
          highlightRange={ledRangeHighlight}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <PresetDndProvider onAssignPreset={assignPresetByDrop}>
          {project && activeGroup ? (
            <MappingInspector
              mappings={mappings}
              selectedKey={selectedKey}
              mapping={selectedMapping}
              specialBinding={selectedSpecial}
              effects={effects}
              previewPlaying={previewPlaying}
              onSelectKey={setSelectedKey}
              onSave={(mapping) => send({ type: "setMapping", mapping })}
              onClear={clearKey}
              onTest={(source) => send({ type: "trigger", source })}
              onReorderKeyLayers={(orderedSources) =>
                send({ type: "setKeyLayerOrder", orderedSources })
              }
              selectedSlotId={selectedSlotId}
              onSelectedSlotIdChange={setSelectedSlotId}
              onSetSpecialBinding={(binding) => send({ type: "setSpecialBinding", binding })}
              onClearSpecialBinding={(source) => send({ type: "removeSpecialBinding", source })}
              onLedRangeHighlight={(range) => {
                setLedRangeHighlight(range);
                send({ type: "setLedRangeHighlight", range });
              }}
            />
          ) : null}

          <main className="flex min-w-0 flex-1 flex-col">
            {activeGroup && project ? (
              <KeyboardMap
                mappings={mappings}
                specialBindings={project.performance.specialBindings}
                selectedKey={selectedKey}
                groups={project.groups}
                activeGroupId={project.performance.activeGroupId}
                onSelectKey={setSelectedKey}
                onKeyTestLive={handleKeyTestLive}
                onKeyAction={handleKeyAction}
                onSetActiveGroup={(groupId) => send({ type: "setActiveGroup", groupId })}
                onAddGroup={() =>
                  send({ type: "addGroup", name: `Group ${project.groups.length + 1}` })
                }
                onRemoveGroup={handleRemoveGroup}
              />
            ) : null}
          </main>

          <PresetLibrary
            presets={libraryPresets}
            selectedPresetId={selectedPresetId}
            onSelectPreset={assignPreset}
            onImportPreset={(preset) => {
              addUserPreset(preset);
              setUserPresets(loadUserPresets());
            }}
          />
        </PresetDndProvider>
      </div>
    </div>
  );
}
