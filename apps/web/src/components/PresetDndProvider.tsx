import { useCallback, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

interface Props {
  children: ReactNode;
  onAssignPreset: (source: string, presetId: string) => void;
}

export function PresetDndProvider({ children, onAssignPreset }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      if (activeData?.type !== "preset") return;

      const overData = over.data.current;
      if (overData?.type !== "keyboard-key") return;

      onAssignPreset(overData.source, activeData.presetId);
    },
    [onAssignPreset],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
