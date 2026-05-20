import { useEffect, useState } from "react";
import type { LedRangeHighlight, ParamField } from "@midi-vj/core";
import { colorToHex, parseColor, type RGB } from "@midi-vj/core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type ParamRecord = Record<string, unknown>;

type ParamGroup =
  | ParamField
  | {
      kind: "ledRange";
      label: string;
      startKey: string;
      endKey: string;
      min: number;
      max: number;
    };

function groupParamFields(fields: ParamField[]): ParamGroup[] {
  const groups: ParamGroup[] = [];

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]!;
    const next = fields[index + 1];

    if (
      field.kind === "range" &&
      field.key === "ledStart" &&
      next?.kind === "range" &&
      next.key === "ledEnd"
    ) {
      groups.push({
        kind: "ledRange",
        label: "LED range",
        startKey: field.key,
        endKey: next.key,
        min: field.min,
        max: field.max,
      });
      index += 1;
      continue;
    }

    groups.push(field);
  }

  return groups;
}

function readNumber(params: ParamRecord, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" ? value : fallback;
}

interface Props {
  fields: ParamField[];
  params: ParamRecord;
  onChange: (params: ParamRecord) => void;
  onLedRangeHighlight?: (range: LedRangeHighlight | null) => void;
}

export function EffectParamsEditor({ fields, params, onChange, onLedRangeHighlight }: Props) {
  const groups = groupParamFields(fields);
  const ledRangeGroup = groups.find((group) => group.kind === "ledRange");
  const [editingLedRange, setEditingLedRange] = useState(false);

  useEffect(() => {
    if (!editingLedRange || !ledRangeGroup || ledRangeGroup.kind !== "ledRange") {
      onLedRangeHighlight?.(null);
      return;
    }

    const start = readNumber(params, ledRangeGroup.startKey, ledRangeGroup.min);
    const end = readNumber(params, ledRangeGroup.endKey, ledRangeGroup.max);
    onLedRangeHighlight?.({ start: Math.min(start, end), end: Math.max(start, end) });
  }, [editingLedRange, ledRangeGroup, params, onLedRangeHighlight]);

  useEffect(() => {
    if (!editingLedRange) return;

    const stopEditing = () => setEditingLedRange(false);
    window.addEventListener("pointerup", stopEditing);
    window.addEventListener("pointercancel", stopEditing);
    return () => {
      window.removeEventListener("pointerup", stopEditing);
      window.removeEventListener("pointercancel", stopEditing);
    };
  }, [editingLedRange]);

  useEffect(() => {
    return () => onLedRangeHighlight?.(null);
  }, [onLedRangeHighlight]);

  const update = (patch: ParamRecord) => {
    onChange({ ...params, ...patch });
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        if (group.kind === "ledRange") {
          const start = readNumber(params, group.startKey, group.min);
          const end = readNumber(params, group.endKey, group.max);
          const ledMin = Math.min(start, end);
          const ledMax = Math.max(start, end);

          return (
            <div
              key={`${group.startKey}-${group.endKey}`}
              className="space-y-2"
              onPointerDown={() => setEditingLedRange(true)}
            >
              <div className="flex items-center justify-between gap-2">
                <Label>{group.label}</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {ledMin}–{ledMax}
                </span>
              </div>
              <Slider
                value={[ledMin, ledMax]}
                min={group.min}
                max={group.max}
                step={1}
                onValueChange={([nextStart, nextEnd]) => {
                  update({
                    [group.startKey]: nextStart,
                    [group.endKey]: nextEnd,
                  });
                }}
              />
              <LedRangeStrip start={ledMin} end={ledMax} max={group.max} />
            </div>
          );
        }

        if (group.kind === "color") {
          const color = (params[group.key] as RGB | undefined) ?? [255, 255, 255];
          return (
            <div key={group.key} className="space-y-2">
              <Label>{group.label}</Label>
              <Input
                type="color"
                className="h-10 w-full cursor-pointer p-1"
                value={colorToHex(color)}
                onChange={(event) => update({ [group.key]: [...parseColor(event.target.value)] })}
              />
            </div>
          );
        }

        if (group.kind === "range") {
          const value = readNumber(params, group.key, group.min);
          return (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{group.label}</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}</span>
              </div>
              <Slider
                value={[value]}
                min={group.min}
                max={group.max}
                step={group.step ?? 1}
                onValueChange={([nextValue]) => update({ [group.key]: nextValue })}
              />
            </div>
          );
        }

        if (group.kind === "select") {
          const value = String(params[group.key] ?? group.options[0]?.value ?? "");
          return (
            <div key={group.key} className="space-y-2">
              <Label htmlFor={group.key}>{group.label}</Label>
              <select
                id={group.key}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={value}
                onChange={(event) => update({ [group.key]: event.target.value })}
              >
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (group.kind === "number") {
          const value = readNumber(params, group.key, group.min);
          return (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{group.label}</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}</span>
              </div>
              <Slider
                value={[value]}
                min={group.min}
                max={group.max}
                step={group.step ?? 1}
                onValueChange={([nextValue]) => update({ [group.key]: nextValue })}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function LedRangeStrip({ start, end, max }: { start: number; end: number; max: number }) {
  const left = (start / max) * 100;
  const width = ((end - start) / max) * 100;

  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-secondary/80">
      <div
        className="absolute inset-y-0 rounded-full bg-primary/70"
        style={{ left: `${left}%`, width: `${Math.max(width, 100 / max)}%` }}
      />
      <div
        className="absolute inset-0 grid gap-px"
        style={{ gridTemplateColumns: `repeat(${max + 1}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: max + 1 }).map((_, index) => (
          <div key={index} className="border-r border-background/20 last:border-r-0" />
        ))}
      </div>
    </div>
  );
}
