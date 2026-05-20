export type KeyContextAction = "test" | "clear" | "killAll" | "nextGroup";

export const KEY_CONTEXT_MENU_ACTIONS: {
  value: KeyContextAction;
  label: string;
}[] = [
  { value: "test", label: "Test live" },
  { value: "clear", label: "Clear mapping" },
  { value: "killAll", label: "Kill all" },
  { value: "nextGroup", label: "Next group" },
];

export const KEYBOARD_MAP_HINT =
  "Click to select · drag a preset here to assign · double-click to test live · right-click for menu";
