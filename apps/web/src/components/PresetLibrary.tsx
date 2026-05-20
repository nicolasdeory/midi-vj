import { memo, useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Download, MoreHorizontal, Upload } from "lucide-react";
import type { EffectPreset } from "@midi-vj/core";
import { parsePresetExport, serializePreset } from "@midi-vj/core";
import { AnimatedPresetPreview } from "@/components/AnimatedPresetPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dndId } from "@/lib/dnd";
import { addUserPreset, downloadJson, pickJsonFile } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Props {
  presets: EffectPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: EffectPreset) => void;
  onImportPreset?: (preset: EffectPreset) => void;
}

const PresetCard = memo(function PresetCard({
  preset,
  selected,
  hovered,
  menuOpen,
  onSelect,
  onHover,
  onHoverEnd,
  onToggleMenu,
  onExport,
  onSaveToLibrary,
}: {
  preset: EffectPreset;
  selected: boolean;
  hovered: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
  onToggleMenu: () => void;
  onExport: () => void;
  onSaveToLibrary: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId.preset(preset.id),
    data: { type: "preset", presetId: preset.id },
  });

  return (
    <div
      ref={setNodeRef}
      className="relative"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : undefined,
      }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      <button
        type="button"
        className={cn(
          "w-full cursor-grab rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-accent/30 active:cursor-grabbing",
          selected && "border-primary/50 ring-1 ring-primary/30",
          hovered && "bg-accent/20",
        )}
        onClick={onSelect}
        {...attributes}
        {...listeners}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 pr-6">
            <p className="text-sm font-medium">{preset.name}</p>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </div>
          <Badge variant="secondary" className="capitalize">
            {preset.triggerMode}
          </Badge>
        </div>
        <AnimatedPresetPreview
          effect={preset.effect}
          playing={hovered}
          showTimeline={false}
          pixelCount={32}
        />
      </button>
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-8 w-8"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onToggleMenu();
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {menuOpen ? (
        <div className="absolute right-2 top-10 z-10 min-w-[9rem] rounded-md border border-border bg-popover p-1 shadow-md">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={onSaveToLibrary}
          >
            Save to library
          </button>
        </div>
      ) : null}
    </div>
  );
});

export const PresetLibrary = memo(function PresetLibrary({
  presets,
  selectedPresetId,
  onSelectPreset,
  onImportPreset,
}: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const filtered =
      filter === "all" ? presets : presets.filter((p) => p.effect.type === filter);
    const map = new Map<string, EffectPreset[]>();
    for (const preset of filtered) {
      const list = map.get(preset.effect.type) ?? [];
      list.push(preset);
      map.set(preset.effect.type, list);
    }
    return map;
  }, [filter, presets]);

  const types = useMemo(() => [...new Set(presets.map((p) => p.effect.type))], [presets]);

  return (
    <aside className="flex min-h-0 w-[320px] shrink-0 flex-col border-l border-border bg-card/30">
      <div className="border-b border-border p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Library</p>
        <h2 className="text-lg font-semibold">Presets</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag onto a key to assign · click with a key selected to replace its slot
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const text = await pickJsonFile();
              if (!text) return;
              try {
                onImportPreset?.(parsePresetExport(text));
              } catch {
                // ignore invalid files
              }
            }}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          {types.map((type) => (
            <Button
              key={type}
              size="sm"
              variant={filter === type ? "default" : "outline"}
              className="capitalize"
              onClick={() => setFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {[...groups.entries()].map(([type, items]) => (
            <section key={type}>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{type}</p>
              <div className="space-y-2">
                {items.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    selected={selectedPresetId === preset.id}
                    hovered={hoveredId === preset.id}
                    menuOpen={menuId === preset.id}
                    onSelect={() => onSelectPreset(preset)}
                    onHover={() => setHoveredId(preset.id)}
                    onHoverEnd={() => {
                      setHoveredId(null);
                      if (menuId === preset.id) setMenuId(null);
                    }}
                    onToggleMenu={() => setMenuId(menuId === preset.id ? null : preset.id)}
                    onExport={() => {
                      downloadJson(`${preset.id}.midivj-preset.json`, serializePreset(preset));
                      setMenuId(null);
                    }}
                    onSaveToLibrary={() => {
                      addUserPreset(preset);
                      setMenuId(null);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
});
