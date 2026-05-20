import type { SpecialAction } from "@midi-vj/core";

export const SPECIAL_ACTION_OPTIONS: { value: SpecialAction; label: string }[] = [
  { value: "killAll", label: "Kill all" },
  { value: "switchGroup.next", label: "Next group" },
  { value: "switchGroup.prev", label: "Previous group" },
];

export function specialActionLabel(action: SpecialAction): string {
  return SPECIAL_ACTION_OPTIONS.find((option) => option.value === action)?.label ?? action;
}
