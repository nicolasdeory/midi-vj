import type { LedRangeHighlight, RGB, StripSettings } from "@midi-vj/core";
import { colorToHex, LED_RANGE_HIGHLIGHT_COLOR, toDisplayFrame } from "@midi-vj/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLivePixels } from "@/hooks/use-midi-vj-socket";
import { cn } from "@/lib/utils";

interface Props {
  activeCount: number;
  stripSettings: StripSettings;
  highlightRange?: LedRangeHighlight | null;
  variant?: "default" | "performance";
}

export function StripPreview({
  activeCount,
  stripSettings,
  highlightRange = null,
  variant = "default",
}: Props) {
  const pixels = useLivePixels();
  const engine =
    pixels.length > 0 ? pixels : Array.from({ length: 50 }, () => [0, 0, 0] as RGB);
  const display = toDisplayFrame(engine, stripSettings);
  const performance = variant === "performance";

  return (
    <Card
      className={cn(
        "rounded-lg border-border/80 bg-card/60 shadow-none",
        performance ? "mx-6 mt-4 border-primary/20 bg-card/80" : "mx-4 mt-3",
      )}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3">
        <CardTitle className={cn("font-medium", performance ? "text-base" : "text-sm")}>
          Master output
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono tabular-nums">
            {display.length}px
          </Badge>
          <Badge variant={activeCount > 0 ? "live" : "secondary"} className="font-mono tabular-nums">
            {activeCount} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "w-8 shrink-0 font-mono tabular-nums text-muted-foreground",
              performance ? "text-xs" : "text-[10px]",
            )}
          >
            0
          </span>
          <div
            className="grid min-w-0 flex-1 gap-px"
            style={{ gridTemplateColumns: `repeat(${display.length}, minmax(0, 1fr))` }}
          >
            {display.map((pixel, index) => {
              const inRange =
                highlightRange !== null &&
                index >= highlightRange.start &&
                index <= highlightRange.end;

              return (
                <div
                  key={index}
                  className={cn(
                    "relative overflow-hidden rounded-[3px] ring-1 ring-white/5",
                    performance ? "h-12" : "h-8",
                    inRange && "ring-primary/40",
                  )}
                  title={`LED ${index}`}
                >
                  <div
                    className={cn("absolute inset-0", inRange && "opacity-20")}
                    style={{ backgroundColor: colorToHex(pixel) }}
                  />
                  {inRange ? (
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: colorToHex(LED_RANGE_HIGHLIGHT_COLOR) }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <span
            className={cn(
              "w-8 shrink-0 text-right font-mono tabular-nums text-muted-foreground",
              performance ? "text-xs" : "text-[10px]",
            )}
          >
            {display.length - 1}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
