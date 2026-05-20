import { createSocket } from "node:dgram";
import {
  applyLedRangeHighlight,
  buildRazerControl,
  buildRazerFrame,
  createDefaultProject,
  createGroupId,
  cycleGroup,
  DEFAULT_CONFIG,
  DEFAULT_STRIP_SETTINGS,
  EFFECT_DEFINITIONS,
  EFFECT_PRESETS,
  EffectEngine,
  setActiveGroupInProject,
  setKeyLayerOrderInProject,
  touchProject,
  toOutputFrame,
  type ActionBinding,
  type ClientMessage,
  type KeyMapping,
  type LedRangeHighlight,
  type MidiVjProject,
  type RGB,
  type ServerMessage,
  type StripSettings,
} from "@midi-vj/core";
import { WebSocketServer, type WebSocket } from "ws";

const PORT = Number(process.env.PORT ?? 8787);
const DEVICE_IP = process.env.GOVEE_IP ?? DEFAULT_CONFIG.deviceIp;
const DRY_RUN = process.env.DRY_RUN === "1";

class GoveeOutput {
  private readonly socket = createSocket("udp4");
  private modeEnabled = false;

  constructor(
    private ip: string,
    private readonly port: number,
  ) {}

  setIp(ip: string): void {
    this.ip = ip;
  }

  ensureMode(): void {
    if (DRY_RUN || this.modeEnabled) return;
    this.socket.send(buildRazerControl(true), this.port, this.ip);
    this.modeEnabled = true;
  }

  sendFrame(pixels: readonly (readonly [number, number, number])[]): void {
    if (DRY_RUN) return;
    this.ensureMode();
    this.socket.send(buildRazerFrame([...pixels]), this.port, this.ip);
  }
}

class AppState {
  project: MidiVjProject = createDefaultProject();
  performanceMode = false;
  deviceIp = DEVICE_IP;
  stripSettings: StripSettings = { ...DEFAULT_STRIP_SETTINGS };
  ledRangeHighlight: LedRangeHighlight | null = null;
  readonly engine = new EffectEngine(DEFAULT_CONFIG.pixelCount);
  readonly output = new GoveeOutput(this.deviceIp, DEFAULT_CONFIG.devicePort);

  broadcast(clients: Set<WebSocket>, message: ServerMessage): void {
    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  }

  snapshot(): ServerMessage {
    return {
      type: "state",
      project: this.project,
      performanceMode: this.performanceMode,
      deviceIp: this.deviceIp,
      activeCount: this.engine.getActiveCount(),
      stripSettings: this.stripSettings,
    };
  }

  activeGroup() {
    const { activeGroupId, defaultGroupId } = this.project.performance;
    return (
      this.project.groups.find((g) => g.id === activeGroupId) ??
      this.project.groups.find((g) => g.id === defaultGroupId) ??
      this.project.groups[0]
    );
  }

  groupById(groupId: string) {
    return this.project.groups.find((g) => g.id === groupId);
  }

  handleSpecialAction(binding: ActionBinding): void {
    switch (binding.action) {
      case "killAll":
        this.engine.killAll();
        break;
      case "switchGroup.next":
        this.project = cycleGroup(this.project, 1);
        break;
      case "switchGroup.prev":
        this.project = cycleGroup(this.project, -1);
        break;
      case "switchGroup.to":
        if (binding.targetGroupId) {
          this.project = setActiveGroupInProject(this.project, binding.targetGroupId);
        }
        break;
    }
  }

  handleSource(source: string): void {
    const special = this.project.performance.specialBindings.find((b) => b.source === source);
    if (special) {
      this.handleSpecialAction(special);
      return;
    }

    const mapping = this.activeGroup()?.mappings.find((m) => m.source === source);
    if (!mapping) return;

    for (const [slotLayer, slot] of mapping.slots.entries()) {
      this.engine.trigger(
        mapping.source,
        slot.id,
        slot.effect,
        slot.triggerMode,
        mapping.layer ?? 0,
        slotLayer,
        slot.blendMode,
      );
    }
  }

  setMapping(mapping: KeyMapping, groupId?: string): void {
    const gid = groupId ?? this.project.performance.activeGroupId;
    this.project = touchProject({
      ...this.project,
      groups: this.project.groups.map((group) => {
        if (group.id !== gid) return group;
        const rest = group.mappings.filter((m) => m.source !== mapping.source);
        return { ...group, mappings: [...rest, mapping] };
      }),
    });
  }

  clearMapping(source: string, groupId?: string): void {
    const gid = groupId ?? this.project.performance.activeGroupId;
    this.project = touchProject({
      ...this.project,
      groups: this.project.groups.map((group) => {
        if (group.id !== gid) return group;
        return { ...group, mappings: group.mappings.filter((m) => m.source !== source) };
      }),
    });
  }

  handleMessage(message: ClientMessage): void {
    switch (message.type) {
      case "keydown":
      case "trigger":
        this.handleSource(message.source);
        break;
      case "keyup":
        this.engine.releaseHold(message.source);
        break;
      case "loadProject":
        this.project = message.project;
        break;
      case "setMapping":
        this.setMapping(message.mapping, message.groupId);
        break;
      case "setKeyLayerOrder":
        this.project = setKeyLayerOrderInProject(
          this.project,
          message.orderedSources,
          message.groupId,
        );
        break;
      case "clearMapping":
        this.clearMapping(message.source, message.groupId);
        break;
      case "setActiveGroup":
        this.project = setActiveGroupInProject(this.project, message.groupId);
        break;
      case "setSpecialBinding": {
        const rest = this.project.performance.specialBindings.filter(
          (b) => b.source !== message.binding.source,
        );
        this.project = touchProject({
          ...this.project,
          performance: {
            ...this.project.performance,
            specialBindings: [...rest, message.binding],
          },
        });
        break;
      }
      case "removeSpecialBinding":
        this.project = touchProject({
          ...this.project,
          performance: {
            ...this.project.performance,
            specialBindings: this.project.performance.specialBindings.filter(
              (b) => b.source !== message.source,
            ),
          },
        });
        break;
      case "addGroup": {
        const id = createGroupId();
        const order = this.project.groups.length;
        this.project = touchProject({
          ...this.project,
          groups: [...this.project.groups, { id, name: message.name, order, mappings: [] }],
        });
        break;
      }
      case "renameGroup":
        this.project = touchProject({
          ...this.project,
          groups: this.project.groups.map((g) =>
            g.id === message.groupId ? { ...g, name: message.name } : g,
          ),
        });
        break;
      case "removeGroup": {
        if (this.project.groups.length <= 1) break;
        const groups = this.project.groups.filter((g) => g.id !== message.groupId);
        const fallback = groups[0]!;
        this.project = touchProject({
          ...this.project,
          groups,
          performance: {
            ...this.project.performance,
            defaultGroupId:
              this.project.performance.defaultGroupId === message.groupId
                ? fallback.id
                : this.project.performance.defaultGroupId,
            activeGroupId:
              this.project.performance.activeGroupId === message.groupId
                ? fallback.id
                : this.project.performance.activeGroupId,
          },
        });
        break;
      }
      case "setPerformanceMode":
        this.performanceMode = message.enabled;
        break;
      case "setDeviceIp":
        this.deviceIp = message.ip;
        this.output.setIp(message.ip);
        break;
      case "setStripSettings":
        this.stripSettings = message.settings;
        break;
      case "setLedRangeHighlight":
        this.ledRangeHighlight = message.range;
        break;
      case "killAll":
        this.engine.killAll();
        break;
      case "cycleGroup":
        this.project = cycleGroup(this.project, message.direction);
        break;
      default:
        break;
    }
  }
}

const state = new AppState();
const clients = new Set<WebSocket>();
const wss = new WebSocketServer({ port: PORT });

function sendCatalog(ws: WebSocket): void {
  ws.send(JSON.stringify({ type: "presets", presets: EFFECT_PRESETS } satisfies ServerMessage));
  ws.send(JSON.stringify({ type: "effects", effects: EFFECT_DEFINITIONS } satisfies ServerMessage));
  ws.send(JSON.stringify(state.snapshot()));
}

wss.on("connection", (ws) => {
  clients.add(ws);
  sendCatalog(ws);

  ws.on("message", (raw) => {
    try {
      const message = JSON.parse(String(raw)) as ClientMessage;
      state.handleMessage(message);
      if (message.type !== "setLedRangeHighlight") {
        state.broadcast(clients, state.snapshot());
      }
    } catch {
      // ignore malformed messages
    }
  });

  ws.on("close", () => clients.delete(ws));
});

const frameMs = 1000 / DEFAULT_CONFIG.fps;

setInterval(() => {
  const now = performance.now();
  const frame = state.engine.tick(now);
  const enginePixels = frame.pixels.map((p) => [p[0], p[1], p[2]] as RGB);
  const outputPixels = applyLedRangeHighlight(enginePixels, state.ledRangeHighlight);
  state.output.sendFrame(toOutputFrame(outputPixels, state.stripSettings));
  state.broadcast(clients, {
    type: "frame",
    pixels: enginePixels,
    timestamp: now,
  });
}, frameMs);

console.log(`midi-vj server ws://localhost:${PORT} -> ${state.deviceIp}:${DEFAULT_CONFIG.devicePort}${DRY_RUN ? " (dry run)" : ""}`);
