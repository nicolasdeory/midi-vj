import { useEffect, useState } from "react";
import { RefreshCw, Settings2 } from "lucide-react";
import type { StripSettings } from "@midi-vj/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { ConnectionStatus } from "@/hooks/use-midi-vj-socket";

interface Props {
  status: ConnectionStatus;
  connected: boolean;
  deviceIp: string;
  stripSettings: StripSettings;
  onDeviceIpCommit: (ip: string) => void;
  onStripSettingsChange: (settings: StripSettings) => void;
  onReconnect: () => void;
}

function statusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "reconnecting":
      return "Reconnecting…";
  }
}

export function StripSettingsSheet({
  status,
  connected,
  deviceIp,
  stripSettings,
  onDeviceIpCommit,
  onStripSettingsChange,
  onReconnect,
}: Props) {
  const [draftIp, setDraftIp] = useState(deviceIp);

  useEffect(() => {
    setDraftIp(deviceIp);
  }, [deviceIp]);

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open && stripSettings.gradientPreview) {
          onStripSettingsChange({ ...stripSettings, gradientPreview: false });
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 />
          Strip
          <Badge variant={connected ? "live" : "secondary"} className="ml-0.5 font-normal">
            {statusLabel(status)}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Strip settings</SheetTitle>
          <SheetDescription>Device and calibration.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!connected ? (
            <Button size="sm" variant="outline" className="w-full" onClick={onReconnect}>
              <RefreshCw className="h-4 w-4" />
              Retry connection
            </Button>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="invert">Invert strip</Label>
              <p className="text-xs text-muted-foreground">Flip wire-order on output</p>
            </div>
            <Switch
              id="invert"
              checked={stripSettings.inverted}
              onCheckedChange={(inverted) =>
                onStripSettingsChange({ ...stripSettings, inverted })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="gradient">Gradient preview</Label>
              <p className="text-xs text-muted-foreground">Rainbow calibration on output bar</p>
            </div>
            <Switch
              id="gradient"
              checked={stripSettings.gradientPreview}
              onCheckedChange={(gradientPreview) =>
                onStripSettingsChange({ ...stripSettings, gradientPreview })
              }
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="device-ip">Device IP</Label>
            <Input
              id="device-ip"
              className="font-mono tabular-nums"
              value={draftIp}
              onChange={(e) => setDraftIp(e.target.value)}
              onBlur={(e) => onDeviceIpCommit(e.target.value)}
              placeholder="10.0.0.90"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
