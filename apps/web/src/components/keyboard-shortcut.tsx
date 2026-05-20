import { ShiftKeyIcon } from "@/components/icons/modifier-key-icons";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type ShortcutKey = "shift" | "space" | (string & {});

interface KeyboardShortcutProps {
  keys: ShortcutKey[];
  variant?: "default" | "on-primary";
  className?: string;
}

const LETTER_CLASS =
  "font-[system-ui,-apple-system,BlinkMacSystemFont,sans-serif] text-[10px] font-semibold leading-none tracking-normal";

function keycapClass(variant: KeyboardShortcutProps["variant"]) {
  if (variant === "on-primary") {
    return "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/95";
  }
  return undefined;
}

export function KeyboardShortcut({
  keys,
  variant = "default",
  className,
}: KeyboardShortcutProps) {
  const keycap = keycapClass(variant);

  return (
    <KbdGroup
      className={cn(
        "[&_svg]:pointer-events-none [&_svg]:!size-[10px]",
        className,
      )}
    >
      {keys.map((key) => {
        if (key === "shift") {
          return (
            <Kbd key="shift" className={keycap}>
              <ShiftKeyIcon />
            </Kbd>
          );
        }

        if (key === "space") {
          return (
            <Kbd key="space" className={cn("min-w-[42px] px-1.5", LETTER_CLASS, keycap)}>
              Space
            </Kbd>
          );
        }

        const label = key.length === 1 ? key.toUpperCase() : key;
        return (
          <Kbd key={key} className={cn(LETTER_CLASS, keycap)}>
            {label}
          </Kbd>
        );
      })}
    </KbdGroup>
  );
}
