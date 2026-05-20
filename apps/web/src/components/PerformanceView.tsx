import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { ActionBinding, KeyMapping, MappingGroup, StripSettings, TriggerMode } from "@midi-vj/core";
import {
  colorToHex,
  mappingSummary,
  primaryEffect,
  primarySlot,
  renderEffectPreviewAtTime,
} from "@midi-vj/core";
import { StripPreview } from "@/components/StripPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { specialActionLabel } from "@/lib/key-actions";
import { KEYBOARD_ROWS, type KeyboardKeyDef } from "@/lib/keyboard-layout";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/hooks/use-midi-vj-socket";

interface Props {
  status: ConnectionStatus;
  connected: boolean;
  mappings: KeyMapping[];
  specialBindings: ActionBinding[];
  activeGroup: MappingGroup;
  groupIndex: number;
  groupCount: number;
  activeCount: number;
  stripSettings: StripSettings;
  onExit: () => void;
  onTrigger: (source: string) => void;
  onKeyDown: (source: string) => void;
  onKeyUp: (source: string) => void;
  onReconnect: () => void;
}

function normalizeKey(event: KeyboardEvent): string | null {
  if (event.repeat) return null;
  if (event.key === " ") return "Space";
  if (event.key.length === 1) return event.key.toLowerCase();
  return null;
}

function triggerModeForSource(mappings: KeyMapping[], source: string): TriggerMode | null {
  const mapping = mappings.find((item) => item.source === source);
  return mapping ? (primarySlot(mapping)?.triggerMode ?? null) : null;
}

const PerformanceKey = memo(function PerformanceKey({
  keyDef,
  mapping,
  specialBinding,
  lit,
  impact,
  onPress,
  onRelease,
  onImpactEnd,
}: {
  keyDef: KeyboardKeyDef;
  mapping?: KeyMapping;
  specialBinding?: ActionBinding;
  lit: boolean;
  impact: boolean;
  onPress: () => void;
  onRelease: () => void;
  onImpactEnd: () => void;
}) {
  const interactive = Boolean((mapping && mapping.slots.length > 0) || specialBinding);
  const slot = mapping ? primarySlot(mapping) : null;
  const effect = mapping ? primaryEffect(mapping) : null;
  const accent = useMemo(() => {
    if (!effect) return undefined;
    const preview = renderEffectPreviewAtTime(effect, 0, 50);
    return colorToHex(preview[Math.floor(preview.length / 2)]!);
  }, [effect]);

  const subtitle = specialBinding
    ? specialActionLabel(specialBinding.action)
    : mapping
      ? mappingSummary(mapping)
      : null;

  return (
    <button
      type="button"
      disabled={!interactive}
      className={cn(
        "performance-key flex min-h-[88px] flex-col justify-between rounded-xl border px-3 py-3 text-left transition-all touch-none select-none",
        interactive
          ? "border-border bg-card hover:bg-accent/30 active:scale-[0.98]"
          : "cursor-default border-border/30 bg-muted/15 opacity-30",
        mapping && mapping.slots.length > 0 && "border-primary/30 bg-primary/5",
        specialBinding && "border-dashed border-amber-500/35 bg-amber-500/5",
        lit && "performance-key-lit",
        impact && "test-live-impact",
      )}
      style={{
        flex: keyDef.width ?? 1,
        ...(accent ? ({ "--key-accent": accent } as CSSProperties) : {}),
      }}
      onPointerDown={(event) => {
        if (!interactive || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress();
      }}
      onPointerUp={(event) => {
        if (!interactive) return;
        onRelease();
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => onRelease()}
      onLostPointerCapture={() => onRelease()}
      onAnimationEnd={onImpactEnd}
    >
      <span className="text-base font-semibold tracking-wide">{keyDef.label}</span>
      <div className="min-h-[2.5rem]">
        {subtitle ? (
          <p className="line-clamp-2 text-xs capitalize text-muted-foreground">{subtitle}</p>
        ) : (
          <p className="text-xs text-muted-foreground/70">—</p>
        )}
      </div>
      {accent ? (
        <span className="mt-1 h-1 w-full rounded-full" style={{ backgroundColor: accent }} />
      ) : specialBinding ? (
        <Badge variant="outline" className="mt-1 w-fit text-[10px]">
          Action
        </Badge>
      ) : (
        <span className="mt-1 h-1" />
      )}
      {slot && mapping && mapping.slots.length === 1 ? (
        <Badge variant="secondary" className="mt-2 w-fit text-[10px] capitalize">
          {slot.triggerMode}
        </Badge>
      ) : mapping && mapping.slots.length > 1 ? (
        <Badge variant="secondary" className="mt-2 w-fit text-[10px]">
          {mapping.slots.length} slots
        </Badge>
      ) : null}
    </button>
  );
});

export function PerformanceView({
  status,
  connected,
  mappings,
  specialBindings,
  activeGroup,
  groupIndex,
  groupCount,
  activeCount,
  stripSettings,
  onExit,
  onTrigger,
  onKeyDown,
  onKeyUp,
  onReconnect,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [impactSources, setImpactSources] = useState<Set<string>>(() => new Set());
  const [toggledOn, setToggledOn] = useState<Set<string>>(() => new Set());
  const [heldSources, setHeldSources] = useState<Set<string>>(() => new Set());

  const mappingByKey = useMemo(() => new Map(mappings.map((mapping) => [mapping.source, mapping])), [mappings]);
  const actionByKey = useMemo(
    () => new Map(specialBindings.map((binding) => [binding.source, binding])),
    [specialBindings],
  );
  const mappedCount = useMemo(
    () => mappings.filter((mapping) => mapping.slots.length > 0).length + specialBindings.length,
    [mappings, specialBindings],
  );

  const flashImpact = useCallback((source: string) => {
    setImpactSources((prev) => {
      const next = new Set(prev);
      next.delete(source);
      return next;
    });
    requestAnimationFrame(() => {
      setImpactSources((prev) => new Set(prev).add(source));
    });
  }, []);

  const clearImpact = useCallback((source: string) => {
    setImpactSources((prev) => {
      if (!prev.has(source)) return prev;
      const next = new Set(prev);
      next.delete(source);
      return next;
    });
  }, []);

  const pressSource = useCallback(
    (source: string) => {
      const triggerMode = triggerModeForSource(mappings, source);

      if (triggerMode === "toggle") {
        setToggledOn((prev) => {
          const next = new Set(prev);
          if (next.has(source)) next.delete(source);
          else next.add(source);
          return next;
        });
      } else if (triggerMode === "hold") {
        setHeldSources((prev) => new Set(prev).add(source));
      } else {
        flashImpact(source);
      }

      onKeyDown(source);
    },
    [flashImpact, mappings, onKeyDown],
  );

  const releaseSource = useCallback(
    (source: string) => {
      const triggerMode = triggerModeForSource(mappings, source);
      if (triggerMode !== "hold") return;
      setHeldSources((prev) => {
        if (!prev.has(source)) return prev;
        const next = new Set(prev);
        next.delete(source);
        return next;
      });
      onKeyUp(source);
    },
    [mappings, onKeyUp],
  );

  const pressAction = useCallback(
    (source: string) => {
      flashImpact(source);
      onTrigger(source);
    },
    [flashImpact, onTrigger],
  );

  const handleKeyPress = useCallback(
    (source: string) => {
      if (actionByKey.has(source)) {
        pressAction(source);
        return;
      }
      if (mappingByKey.get(source)?.slots.length) {
        pressSource(source);
      }
    },
    [actionByKey, mappingByKey, pressAction, pressSource],
  );

  const handleKeyRelease = useCallback(
    (source: string) => {
      if (actionByKey.has(source)) return;
      releaseSource(source);
    },
    [actionByKey, releaseSource],
  );

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activeCount === 0) {
      setToggledOn(new Set());
    }
  }, [activeCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onExit();
        return;
      }
      const key = normalizeKey(event);
      if (!key) return;
      event.preventDefault();
      handleKeyPress(key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = normalizeKey(event);
      if (!key) return;
      handleKeyRelease(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyPress, handleKeyRelease, onExit]);

  const isLit = (source: string) => toggledOn.has(source) || heldSources.has(source);

  return (
    <div
      className="flex h-full flex-col bg-background outline-none"
      tabIndex={0}
      ref={rootRef}
      onClick={() => rootRef.current?.focus()}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onExit}>
            <ArrowLeft />
            Exit
          </Button>
          <div>
            <p className="text-sm font-medium">Performance</p>
            <p className="text-xs text-muted-foreground">
              {activeGroup.name} · {groupIndex + 1}/{groupCount} · {mappedCount} mapped · Esc to exit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "live" : "secondary"}>
            {status === "connected"
              ? "Live"
              : status === "connecting"
                ? "Connecting…"
                : "Reconnecting…"}
          </Badge>
          {!connected ? (
            <Button size="sm" variant="outline" onClick={onReconnect}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </header>

      <div className="shrink-0">
        <StripPreview activeCount={activeCount} stripSettings={stripSettings} variant="performance" />
      </div>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-6">
        <div className="flex w-full max-w-6xl flex-col gap-3">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex gap-2.5"
              style={{ paddingLeft: `${(row[0]?.indent ?? 0) * 24}px` }}
            >
              {row.map((keyDef) => (
                <PerformanceKey
                  key={keyDef.key}
                  keyDef={keyDef}
                  mapping={mappingByKey.get(keyDef.key)}
                  specialBinding={actionByKey.get(keyDef.key)}
                  lit={isLit(keyDef.key)}
                  impact={impactSources.has(keyDef.key)}
                  onPress={() => handleKeyPress(keyDef.key)}
                  onRelease={() => handleKeyRelease(keyDef.key)}
                  onImpactEnd={() => clearImpact(keyDef.key)}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Tap or press mapped keys · toggle and hold stay lit
        </p>
      </main>
    </div>
  );
}
