import { memo, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { KeyMapping } from "@midi-vj/core";
import {
  colorToHex,
  mappingSummary,
  primaryEffect,
  renderEffectPreviewAtTime,
  sortMappingsByLayer,
} from "@midi-vj/core";
import { dndId } from "@/lib/dnd";
import { cn } from "@/lib/utils";

interface Props {
  mappings: KeyMapping[];
  selectedKey: string | null;
  onSelectKey: (source: string) => void;
}

function SortableLayerRow({
  mapping,
  selectedKey,
  onSelectKey,
}: {
  mapping: KeyMapping;
  selectedKey: string | null;
  onSelectKey: (source: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dndId.keyLayer(mapping.source),
    data: { type: "key-layer", source: mapping.source },
  });

  const effect = primaryEffect(mapping);
  const preview = effect ? renderEffectPreviewAtTime(effect, 0, 50) : null;
  const accent = preview ? colorToHex(preview[Math.floor(preview.length / 2)]!) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-1 rounded-md border border-border/70 bg-background/40 p-1 transition-colors",
        mapping.source === selectedKey && "border-primary/40 bg-primary/5",
        isDragging && "z-10 border-primary/60 bg-primary/10 opacity-90 shadow-md",
      )}
    >
      <button
        type="button"
        title="Drag to reorder key layer"
        className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-accent/40"
        onClick={() => onSelectKey(mapping.source)}
      >
        {accent ? (
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-white/10"
            style={{ backgroundColor: accent }}
          />
        ) : (
          <span className="h-3 w-3 shrink-0 rounded-full bg-muted" />
        )}
        <span className="truncate text-xs font-medium">{mapping.label}</span>
        <span className="min-w-0 flex-1 truncate text-[10px] capitalize text-muted-foreground">
          {mappingSummary(mapping)}
        </span>
      </button>
    </div>
  );
}

export const KeyLayerStack = memo(function KeyLayerStack({
  mappings,
  selectedKey,
  onSelectKey,
}: Props) {
  const layeredMappings = useMemo(
    () => sortMappingsByLayer(mappings.filter((mapping) => mapping.slots.length > 0)),
    [mappings],
  );

  if (layeredMappings.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Map keys to build the layer stack
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
      <div className="mb-3">
        <p className="text-xs font-medium">Key layers</p>
        <p className="text-[10px] text-muted-foreground">Back → front · drag to reorder</p>
      </div>
      <div className="space-y-1">
        {layeredMappings.map((mapping) => (
          <SortableLayerRow
            key={mapping.source}
            mapping={mapping}
            selectedKey={selectedKey}
            onSelectKey={onSelectKey}
          />
        ))}
      </div>
    </div>
  );
});
