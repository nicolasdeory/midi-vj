import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import { createPortal } from "react-dom";
import type { ActionBinding, KeyMapping, MappingGroup } from "@midi-vj/core";
import { colorToHex, mappingSummary, primaryEffect, renderEffectPreviewAtTime } from "@midi-vj/core";
import {
  KEYBOARD_MAP_HINT,
  KEY_CONTEXT_MENU_ACTIONS,
  type KeyContextAction,
} from "@/lib/key-gestures";
import { specialActionLabel } from "@/lib/key-actions";
import { KEYBOARD_ROWS, type KeyboardKeyDef } from "@/lib/keyboard-layout";
import { dndId } from "@/lib/dnd";
import { cn } from "@/lib/utils";

interface KeyMenuState {
  source: string;
  x: number;
  y: number;
}

interface Props {
  mappings: KeyMapping[];
  specialBindings: ActionBinding[];
  selectedKey: string | null;
  groups: MappingGroup[];
  activeGroupId: string;
  onSelectKey: (key: string) => void;
  onKeyTestLive: (source: string) => void;
  onKeyAction: (source: string, action: KeyContextAction) => void;
  onSetActiveGroup: (groupId: string) => void;
  onAddGroup: () => void;
  onRemoveGroup: (groupId: string) => void;
}

function KeyContextMenu({
  state,
  onSelect,
  onClose,
}: {
  state: KeyMenuState;
  onSelect: (action: KeyContextAction) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[10.5rem] rounded-md border border-border bg-popover p-1 shadow-md"
      style={{ left: state.x, top: state.y }}
    >
      {KEY_CONTEXT_MENU_ACTIONS.map((action) => (
        <button
          key={action.value}
          type="button"
          className="flex w-full select-none rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            onSelect(action.value);
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

const KeyButton = memo(function KeyButton({
  keyDef,
  mapping,
  specialBinding,
  selected,
  onSelectKey,
  onKeyTestLive,
  onOpenMenu,
}: {
  keyDef: KeyboardKeyDef;
  mapping?: KeyMapping;
  specialBinding?: ActionBinding;
  selected: boolean;
  onSelectKey: (key: string) => void;
  onKeyTestLive: (source: string) => void;
  onOpenMenu: (source: string, x: number, y: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dndId.keyboardKey(keyDef.key),
    data: { type: "keyboard-key", source: keyDef.key },
  });

  const effect = mapping ? primaryEffect(mapping) : null;
  const accent = useMemo(() => {
    if (!effect) return undefined;
    const preview = renderEffectPreviewAtTime(effect, 0, 50);
    return colorToHex(preview[Math.floor(preview.length / 2)]!);
  }, [effect]);

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    onKeyTestLive(keyDef.key);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    onOpenMenu(keyDef.key, event.clientX, event.clientY);
  };

  const hasMapping = Boolean(mapping && mapping.slots.length > 0);
  const subtitle = specialBinding
    ? specialActionLabel(specialBinding.action)
    : hasMapping
      ? mappingSummary(mapping!)
      : "—";

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-key-source={keyDef.key}
      className={cn(
        "flex min-h-[52px] select-none flex-col justify-between rounded-md border border-border bg-card px-2 py-1.5 text-left transition-colors hover:bg-accent/40",
        hasMapping && "border-primary/30 bg-primary/5",
        specialBinding && "border-dashed border-amber-500/35 bg-amber-500/5",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isOver && "border-primary bg-primary/10 ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
      )}
      style={{
        flex: keyDef.width ?? 1,
        ...(accent ? ({ "--key-accent": accent } as CSSProperties) : {}),
      }}
      onClick={() => onSelectKey(keyDef.key)}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      title={specialBinding ? subtitle : hasMapping ? subtitle : "Drop preset here"}
    >
      <span className="text-xs font-semibold">{keyDef.label}</span>
      <span className="line-clamp-2 text-[10px] capitalize text-muted-foreground">{subtitle}</span>
      {accent ? (
        <span className="mt-1 h-0.5 w-full rounded-full" style={{ backgroundColor: accent }} />
      ) : specialBinding ? (
        <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-amber-600/80 dark:text-amber-400/80">
          Action
        </span>
      ) : null}
    </button>
  );
});

const KeyboardRow = memo(function KeyboardRow({
  row,
  byKey,
  actionByKey,
  selectedKey,
  onSelectKey,
  onKeyTestLive,
  onOpenMenu,
}: {
  row: KeyboardKeyDef[];
  byKey: Map<string, KeyMapping>;
  actionByKey: Map<string, ActionBinding>;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onKeyTestLive: (source: string) => void;
  onOpenMenu: (source: string, x: number, y: number) => void;
}) {
  return (
    <div
      className="flex gap-2"
      style={{ paddingLeft: `${(row[0]?.indent ?? 0) * 18}px` }}
    >
      {row.map((keyDef) => (
        <KeyButton
          key={keyDef.key}
          keyDef={keyDef}
          mapping={byKey.get(keyDef.key)}
          specialBinding={actionByKey.get(keyDef.key)}
          selected={selectedKey === keyDef.key}
          onSelectKey={onSelectKey}
          onKeyTestLive={onKeyTestLive}
          onOpenMenu={onOpenMenu}
        />
      ))}
    </div>
  );
});

export const KeyboardMap = memo(function KeyboardMap({
  mappings,
  specialBindings,
  selectedKey,
  groups,
  activeGroupId,
  onSelectKey,
  onKeyTestLive,
  onKeyAction,
  onSetActiveGroup,
  onAddGroup,
  onRemoveGroup,
}: Props) {
  const [menu, setMenu] = useState<KeyMenuState | null>(null);
  const byKey = useMemo(() => new Map(mappings.map((m) => [m.source, m])), [mappings]);
  const actionByKey = useMemo(
    () => new Map(specialBindings.map((binding) => [binding.source, binding])),
    [specialBindings],
  );
  const sortedGroups = useMemo(() => [...groups].sort((a, b) => a.order - b.order), [groups]);

  return (
    <section className="flex min-h-0 flex-1 flex-col p-4">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Layout</p>
        <h2 className="text-lg font-semibold">Keyboard map</h2>
        <div className="mt-2 flex flex-wrap gap-1">
          {sortedGroups.map((group) => (
            <span
              key={group.id}
              className={cn(
                "inline-flex items-center rounded-md text-xs",
                group.id === activeGroupId
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              <button
                type="button"
                className="select-none px-2 py-0.5 transition-colors hover:opacity-90"
                onClick={() => onSetActiveGroup(group.id)}
              >
                {group.name}
              </button>
              {sortedGroups.length > 1 ? (
                <button
                  type="button"
                  className="select-none border-l border-white/10 px-1.5 py-0.5 opacity-70 transition-opacity hover:opacity-100"
                  title={`Delete ${group.name}`}
                  onClick={() => onRemoveGroup(group.id)}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
          <button
            type="button"
            className="select-none rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/80"
            onClick={onAddGroup}
          >
            +
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{KEYBOARD_MAP_HINT}</p>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <KeyboardRow
            key={rowIndex}
            row={row}
            byKey={byKey}
            actionByKey={actionByKey}
            selectedKey={selectedKey}
            onSelectKey={onSelectKey}
            onKeyTestLive={onKeyTestLive}
            onOpenMenu={(source, x, y) => setMenu({ source, x, y })}
          />
        ))}
      </div>

      {menu ? (
        <KeyContextMenu
          state={menu}
          onSelect={(action) => onKeyAction(menu.source, action)}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </section>
  );
});
