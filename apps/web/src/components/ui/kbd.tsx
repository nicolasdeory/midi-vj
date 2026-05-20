import * as React from "react";
import { cn } from "@/lib/utils";

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-border/60 bg-muted/80 px-0 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
