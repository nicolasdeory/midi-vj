import { useCallback, useState } from "react";
import type { MidiVjProject } from "@midi-vj/core";

const MAX_UNDO = 50;

export function useProjectUndo() {
  const [past, setPast] = useState<MidiVjProject[]>([]);
  const [future, setFuture] = useState<MidiVjProject[]>([]);

  const remember = useCallback((snapshot: MidiVjProject) => {
    setPast((items) => [...items.slice(-MAX_UNDO + 1), snapshot]);
    setFuture([]);
  }, []);

  const undo = useCallback((present: MidiVjProject | null): MidiVjProject | null => {
    if (!present || past.length === 0) return null;
    const previous = past[past.length - 1]!;
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [present, ...items]);
    return previous;
  }, [past]);

  const redo = useCallback((present: MidiVjProject | null): MidiVjProject | null => {
    if (!present || future.length === 0) return null;
    const next = future[0]!;
    setFuture((items) => items.slice(1));
    setPast((items) => [...items, present]);
    return next;
  }, [future]);

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    remember,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
