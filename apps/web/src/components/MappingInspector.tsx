import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Keyboard, Layers, Play, Plus, Trash2 } from "lucide-react";
import type {
  ActionBinding,
  BlendMode,
  EffectDefinition,
  EffectParams,
  EffectSlot,
  KeyMapping,
  LedRangeHighlight,
  SpecialAction,
  TriggerMode,
} from "@midi-vj/core";
import {
  BLEND_MODE_LABELS,
  createSlotId,
  defaultBlendMode,
  getEffectDefinition,
  labelForSource,
  primarySlot,
  resolveBlendMode,
  sortMappingsByLayer,
} from "@midi-vj/core";
import { AnimatedPresetPreview } from "@/components/AnimatedPresetPreview";
import { EffectParamsEditor } from "@/components/effect-params-editor";
import { KeyLayerStack } from "@/components/KeyLayerStack";
import { KeyboardShortcut } from "@/components/keyboard-shortcut";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dndId, dndIdSuffix, isDndId } from "@/lib/dnd";
import { SPECIAL_ACTION_OPTIONS } from "@/lib/key-actions";
import { cn } from "@/lib/utils";

type SidebarPanel = "key" | "layers";

interface Props {
  mappings: KeyMapping[];
  selectedKey: string | null;
  mapping: KeyMapping | null;
  specialBinding: ActionBinding | null;
  effects: EffectDefinition[];
  previewPlaying: boolean;
  onSelectKey: (source: string) => void;
  onSave: (mapping: KeyMapping) => void;
  onClear: (source: string) => void;
  onTest: (source: string) => void;
  onReorderKeyLayers: (orderedSources: string[]) => void;
  selectedSlotId: string | null;
  onSelectedSlotIdChange: (slotId: string | null) => void;
  onSetSpecialBinding: (binding: ActionBinding) => void;
  onClearSpecialBinding: (source: string) => void;
  onLedRangeHighlight?: (range: LedRangeHighlight | null) => void;
}

const TRIGGER_MODES: { value: TriggerMode; label: string }[] = [
  { value: "oneshot", label: "Oneshot" },
  { value: "toggle", label: "Toggle" },
  { value: "hold", label: "Hold" },
];

function presetLabel(slot: EffectSlot): string {
  if (slot.presetId) return slot.presetId.replace(/-/g, " ");
  return `${slot.effect.type} (custom)`;
}

function SortableSlotRow({
  slot,
  index,
  selected,
  mapping,
  onSelect,
  onSave,
  onRemove,
}: {
  slot: EffectSlot;
  index: number;
  selected: boolean;
  mapping: KeyMapping;
  onSelect: () => void;
  onSave: (mapping: KeyMapping) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dndId.slot(slot.id),
    data: { type: "slot", slotId: slot.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-start gap-1.5 rounded-md border border-border p-2 transition-colors",
        selected && "border-primary/40 bg-primary/5",
        isDragging && "z-10 border-primary/60 bg-primary/10 opacity-90 shadow-md",
      )}
    >
      <button
        type="button"
        title="Drag to reorder slots"
        className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-xs font-medium capitalize"
            onClick={onSelect}
          >
            {presetLabel(slot)}
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <TriggerModeMenu
            value={slot.triggerMode}
            onChange={(mode) => {
              onSave({
                ...mapping,
                slots: mapping.slots.map((item) =>
                  item.id === slot.id ? { ...item, triggerMode: mode } : item,
                ),
              });
            }}
          />
          <BlendModeMenu
            value={resolveBlendMode(slot.effect.type, slot.blendMode)}
            onChange={(mode) => {
              const nextBlend = mode === defaultBlendMode(slot.effect.type) ? undefined : mode;
              onSave({
                ...mapping,
                slots: mapping.slots.map((item) =>
                  item.id === slot.id ? { ...item, blendMode: nextBlend } : item,
                ),
              });
            }}
          />
        </div>
      </div>
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

const BLEND_MODES: BlendMode[] = ["replace", "over", "add", "max"];

function SlotOptionMenu<T extends string>({
  value,
  options,
  label,
  disabled,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  label: string;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        title={label}
        className={cn(
          "inline-flex h-5 items-center gap-0.5 rounded-md px-2 py-0 text-xs font-medium capitalize transition-colors",
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        {options.find((option) => option.value === value)?.label ?? value}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[8.5rem] rounded-md border border-border bg-popover p-1 shadow-md">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex w-full rounded-sm px-2 py-1.5 text-left text-sm capitalize transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                value === option.value && "bg-accent/60",
              )}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TriggerModeMenu({
  value,
  disabled,
  onChange,
}: {
  value: TriggerMode;
  disabled?: boolean;
  onChange: (mode: TriggerMode) => void;
}) {
  return (
    <SlotOptionMenu
      value={value}
      label="Trigger mode"
      disabled={disabled}
      options={TRIGGER_MODES}
      onChange={onChange}
    />
  );
}

function BlendModeMenu({
  value,
  disabled,
  onChange,
}: {
  value: BlendMode;
  disabled?: boolean;
  onChange: (mode: BlendMode) => void;
}) {
  return (
    <SlotOptionMenu
      value={value}
      label="Blend mode"
      disabled={disabled}
      options={BLEND_MODES.map((mode) => ({ value: mode, label: BLEND_MODE_LABELS[mode] }))}
      onChange={onChange}
    />
  );
}

export const MappingInspector = memo(function MappingInspector({
  mappings,
  selectedKey,
  mapping,
  specialBinding,
  effects,
  previewPlaying,
  onSelectKey,
  onSave,
  onClear,
  onTest,
  onReorderKeyLayers,
  selectedSlotId,
  onSelectedSlotIdChange,
  onSetSpecialBinding,
  onClearSpecialBinding,
  onLedRangeHighlight,
}: Props) {
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>("key");
  const [editorMode, setEditorMode] = useState<"effect" | "action">("effect");
  const [effectType, setEffectType] = useState("boom");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [testImpact, setTestImpact] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const layeredSources = useMemo(
    () => sortMappingsByLayer(mappings.filter((item) => item.slots.length > 0)).map((item) => item.source),
    [mappings],
  );
  const layerSortableIds = useMemo(() => layeredSources.map((source) => dndId.keyLayer(source)), [layeredSources]);
  const slotSortableIds = useMemo(
    () => mapping?.slots.map((slot) => dndId.slot(slot.id)) ?? [],
    [mapping],
  );
  const selectedSlot =
    mapping?.slots.find((slot) => slot.id === selectedSlotId) ??
    (mapping ? primarySlot(mapping) : null);

  useEffect(() => {
    if (specialBinding) {
      setEditorMode("action");
      return;
    }
    setEditorMode("effect");
    if (!mapping || mapping.slots.length === 0) {
      onSelectedSlotIdChange(null);
      setEffectType("boom");
      setParams((getEffectDefinition("boom")?.defaultParams.params ?? {}) as Record<string, unknown>);
      return;
    }
    const slot = primarySlot(mapping)!;
    onSelectedSlotIdChange(slot.id);
    setEffectType(slot.effect.type);
    setParams({ ...slot.effect.params } as Record<string, unknown>);
  }, [selectedKey, mapping, specialBinding, onSelectedSlotIdChange]);

  useEffect(() => {
    if (!selectedSlot) return;
    setEffectType(selectedSlot.effect.type);
    setParams({ ...selectedSlot.effect.params } as Record<string, unknown>);
  }, [selectedSlot?.id]);

  const displayEffect = selectedSlot?.effect ?? null;
  const effectDefinition = getEffectDefinition(effectType) ?? effects[0];

  const saveSlot = (
    slotId: string,
    nextType: string,
    nextParams: Record<string, unknown>,
    nextTrigger = selectedSlot?.triggerMode ?? "oneshot",
  ) => {
    if (!mapping) return;
    onSave({
      ...mapping,
      slots: mapping.slots.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              presetId: null,
              triggerMode: nextTrigger,
              effect: { type: nextType, params: nextParams } as unknown as EffectParams,
            }
          : slot,
      ),
    });
  };

  const handleEffectTypeChange = (nextType: string) => {
    if (!selectedSlot) return;
    const definition = getEffectDefinition(nextType);
    if (!definition) return;
    const nextParams = { ...definition.defaultParams.params } as Record<string, unknown>;
    setEffectType(nextType);
    setParams(nextParams);
    saveSlot(selectedSlot.id, nextType, nextParams);
  };

  const handleParamsChange = (nextParams: Record<string, unknown>) => {
    if (!selectedSlot) return;
    setParams(nextParams);
    saveSlot(selectedSlot.id, effectType, nextParams);
  };

  const handleTriggerModeChange = (mode: TriggerMode) => {
    if (!selectedSlot || !mapping) return;
    onSave({
      ...mapping,
      slots: mapping.slots.map((slot) =>
        slot.id === selectedSlot.id ? { ...slot, triggerMode: mode } : slot,
      ),
    });
  };

  const handleAddSlot = () => {
    if (!selectedKey) return;
    const definition = getEffectDefinition("boom");
    if (!definition) return;
    const slot: EffectSlot = {
      id: createSlotId(),
      triggerMode: "oneshot",
      presetId: null,
      effect: definition.defaultParams,
    };
    if (mapping) {
      onSave({ ...mapping, slots: [...mapping.slots, slot] });
    } else {
      onSave({
        source: selectedKey,
        label: labelForSource(selectedKey),
        slots: [slot],
      });
    }
    onSelectedSlotIdChange(slot.id);
    setEditorMode("effect");
    onClearSpecialBinding(selectedKey);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (!mapping) return;
    const next = mapping.slots.filter((slot) => slot.id !== slotId);
    if (next.length === 0) {
      onClear(selectedKey!);
      return;
    }
    onSave({ ...mapping, slots: next });
  };

  const handleInspectorDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      if (isDndId(active.id, "key-layer") && isDndId(over.id, "key-layer")) {
        const oldIndex = layerSortableIds.indexOf(String(active.id));
        const newIndex = layerSortableIds.indexOf(String(over.id));
        if (oldIndex >= 0 && newIndex >= 0) {
          onReorderKeyLayers(arrayMove(layeredSources, oldIndex, newIndex));
        }
        return;
      }

      if (isDndId(active.id, "slot") && isDndId(over.id, "slot") && mapping) {
        const activeSlotId = dndIdSuffix(String(active.id), "slot");
        const overSlotId = dndIdSuffix(String(over.id), "slot");
        const oldIndex = mapping.slots.findIndex((slot) => slot.id === activeSlotId);
        const newIndex = mapping.slots.findIndex((slot) => slot.id === overSlotId);
        if (oldIndex >= 0 && newIndex >= 0) {
          onSave({ ...mapping, slots: arrayMove(mapping.slots, oldIndex, newIndex) });
        }
      }
    },
    [layerSortableIds, layeredSources, mapping, onReorderKeyLayers, onSave],
  );

  const handleAssignAction = (action: SpecialAction) => {
    if (!selectedKey) return;
    if (mapping) onClear(selectedKey);
    onSetSpecialBinding({
      source: selectedKey,
      label: labelForSource(selectedKey),
      action,
    });
  };

  const handleTestLive = () => {
    if (!selectedKey) return;
    if (editorMode === "action" && specialBinding) {
      onTest(selectedKey);
    } else if (mapping && mapping.slots.length > 0) {
      onTest(selectedKey);
    }
    setTestImpact(false);
    requestAnimationFrame(() => setTestImpact(true));
  };

  return (
    <aside className="flex min-h-0 w-[356px] shrink-0 border-r border-border bg-card/30">
      <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-muted/20 py-3">
        <button
          type="button"
          title="Key editor"
          className={cn(
            "rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            sidebarPanel === "key" && "bg-accent text-foreground",
          )}
          onClick={() => setSidebarPanel("key")}
        >
          <Keyboard className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Key layers"
          className={cn(
            "rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            sidebarPanel === "layers" && "bg-accent text-foreground",
          )}
          onClick={() => setSidebarPanel("layers")}
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleInspectorDragEnd}>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Mapping</p>
            <h2 className="text-lg font-semibold">
              {sidebarPanel === "layers" ? "Key layers" : "Key editor"}
            </h2>
          </div>

          {sidebarPanel === "layers" ? (
            <SortableContext items={layerSortableIds} strategy={verticalListSortingStrategy}>
              <KeyLayerStack
                mappings={mappings}
                selectedKey={selectedKey}
                onSelectKey={(source) => {
                  onSelectKey(source);
                  setSidebarPanel("key");
                }}
              />
            </SortableContext>
          ) : !selectedKey ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Select a key to edit it
            </div>
          ) : (
        <>
          <div className="space-y-3 border-b border-border/60 p-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Selected</p>
              <h3 className="mt-1 text-base font-semibold">Key {labelForSource(selectedKey)}</h3>
              <div className="mt-2 flex gap-1">
                <Button
                  size="sm"
                  variant={editorMode === "effect" ? "default" : "outline"}
                  onClick={() => setEditorMode("effect")}
                >
                  Effects
                </Button>
                <Button
                  size="sm"
                  variant={editorMode === "action" ? "default" : "outline"}
                  onClick={() => setEditorMode("action")}
                >
                  Action
                </Button>
              </div>
            </div>

            {editorMode === "effect" ? (
              <div className="space-y-2">
                {mapping && mapping.slots.length > 0 ? (
                  <p className="text-xs text-muted-foreground">Slots · back → front</p>
                ) : null}
                <SortableContext items={slotSortableIds} strategy={verticalListSortingStrategy}>
                  {mapping?.slots.map((slot, index) => (
                    <SortableSlotRow
                      key={slot.id}
                      slot={slot}
                      index={index}
                      selected={slot.id === selectedSlot?.id}
                      mapping={mapping}
                      onSelect={() => onSelectedSlotIdChange(slot.id)}
                      onSave={onSave}
                      onRemove={() => handleRemoveSlot(slot.id)}
                    />
                  ))}
                </SortableContext>
                <Button size="sm" variant="outline" className="w-full" onClick={handleAddSlot}>
                  <Plus className="h-4 w-4" />
                  Add effect
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {SPECIAL_ACTION_OPTIONS.map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={specialBinding?.action === item.value ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleAssignAction(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
                {specialBinding ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => onClearSpecialBinding(selectedKey)}
                  >
                    Clear action
                  </Button>
                ) : null}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className={cn("flex-1", testImpact && "test-live-impact")}
                disabled={editorMode === "effect" ? !mapping?.slots.length : !specialBinding}
                onClick={handleTestLive}
                onAnimationEnd={() => setTestImpact(false)}
              >
                <Play />
                Test live
              </Button>
              {mapping ? (
                <Button size="sm" variant="outline" onClick={() => onClear(selectedKey)}>
                  <Trash2 />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {editorMode === "effect" && displayEffect ? (
            <>
              <div className="border-b border-border/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Preview</p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {previewPlaying ? "Playing" : "Paused"}
                    <KeyboardShortcut keys={["space"]} />
                  </span>
                </div>
                <AnimatedPresetPreview
                  key={`${selectedKey}-${selectedSlot?.id}`}
                  effect={displayEffect}
                  playing={previewPlaying}
                  showTimeline
                  pixelCount={32}
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="effect-type">Effect type</Label>
                    <select
                      id="effect-type"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={effectType}
                      onChange={(event) => handleEffectTypeChange(event.target.value)}
                    >
                      {effects.map((effect) => (
                        <option key={effect.type} value={effect.type}>
                          {effect.label}
                        </option>
                      ))}
                    </select>
                    {effectDefinition ? (
                      <p className="text-xs text-muted-foreground">{effectDefinition.description}</p>
                    ) : null}
                  </div>
                  {selectedSlot ? (
                    <div className="flex items-center gap-2">
                      <Label>Trigger</Label>
                      <TriggerModeMenu
                        value={selectedSlot.triggerMode}
                        onChange={handleTriggerModeChange}
                      />
                    </div>
                  ) : null}
                  {effectDefinition ? (
                    <EffectParamsEditor
                      fields={effectDefinition.paramFields}
                      params={params}
                      onChange={handleParamsChange}
                      onLedRangeHighlight={onLedRangeHighlight}
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : editorMode === "effect" ? (
            <div className="p-4 text-sm text-muted-foreground">
              Add an effect or pick a preset from the library.
            </div>
          ) : null}
            </>
          )}
        </div>
      </DndContext>
    </aside>
  );
});
