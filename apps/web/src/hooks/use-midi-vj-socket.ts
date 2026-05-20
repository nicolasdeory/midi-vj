import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type {
  ClientMessage,
  EffectDefinition,
  EffectPreset,
  MidiVjProject,
  RGB,
  ServerMessage,
  StripSettings,
} from "@midi-vj/core";
import { loadStripProfile } from "@/lib/storage";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

const WS_URL =
  import.meta.env.VITE_WS_URL ??
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:8787`;

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8000;

const frameStore = {
  pixels: [] as RGB[],
  listeners: new Set<() => void>(),
};

function setFramePixels(pixels: RGB[]) {
  frameStore.pixels = pixels;
  for (const listener of frameStore.listeners) {
    listener();
  }
}

export function useLivePixels(): RGB[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      frameStore.listeners.add(onStoreChange);
      return () => frameStore.listeners.delete(onStoreChange);
    },
    () => frameStore.pixels,
    () => frameStore.pixels,
  );
}

function nextBackoffMs(attempt: number): number {
  return Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
}

function handleServerMessage(
  message: ServerMessage,
  setters: {
    setProject: (project: MidiVjProject) => void;
    setPerformanceMode: (value: boolean) => void;
    setDeviceIp: (ip: string) => void;
    setStripSettings: (settings: StripSettings) => void;
    setActiveCount: (count: number) => void;
    setPresets: (presets: EffectPreset[]) => void;
    setEffects: (effects: EffectDefinition[]) => void;
  },
): void {
  switch (message.type) {
    case "frame":
      setFramePixels(message.pixels);
      break;
    case "state":
      setters.setProject(message.project);
      setters.setPerformanceMode(message.performanceMode);
      setters.setDeviceIp(message.deviceIp);
      setters.setStripSettings(message.stripSettings);
      setters.setActiveCount(message.activeCount);
      break;
    case "presets":
      setters.setPresets(message.presets);
      break;
    case "effects":
      setters.setEffects(message.effects);
      break;
    default:
      break;
  }
}

export function useMidiVjSocket(url = WS_URL) {
  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<ClientMessage[]>([]);
  const reconnectTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const onConnectRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [performanceMode, setPerformanceMode] = useState(false);
  const [project, setProject] = useState<MidiVjProject | null>(null);
  const [presets, setPresets] = useState<EffectPreset[]>([]);
  const [effects, setEffects] = useState<EffectDefinition[]>([]);
  const [deviceIp, setDeviceIp] = useState(() => loadStripProfile().deviceIp);
  const [stripSettings, setStripSettings] = useState(() => loadStripProfile().stripSettings);
  const [activeCount, setActiveCount] = useState(0);

  const messageSetters = {
    setProject,
    setPerformanceMode,
    setDeviceIp,
    setStripSettings,
    setActiveCount,
    setPresets,
    setEffects,
  };

  const flushQueue = useCallback((ws: WebSocket) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const pending = queueRef.current;
    queueRef.current = [];
    for (const message of pending) {
      ws.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const generation = ++generationRef.current;
    wsRef.current?.close();
    setStatus(attemptRef.current === 0 ? "connecting" : "reconnecting");

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current || generationRef.current !== generation) return;
      attemptRef.current = 0;
      setStatus("connected");
      flushQueue(ws);
      onConnectRef.current?.();
    };

    ws.onmessage = (event) => {
      if (generationRef.current !== generation) return;
      try {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        handleServerMessage(message, messageSetters);
      } catch {
        // ignore malformed payloads
      }
    };

    ws.onerror = () => {
      // close will handle reconnect
    };

    ws.onclose = () => {
      if (generationRef.current !== generation) return;
      wsRef.current = null;
      if (!mountedRef.current) return;

      setStatus("reconnecting");
      const delay = nextBackoffMs(attemptRef.current);
      attemptRef.current += 1;
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };
  }, [flushQueue, url]);

  useEffect(() => {
    mountedRef.current = true;
    attemptRef.current = 0;
    connect();

    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return;
    }
    queueRef.current.push(message);
  }, []);

  const reconnectNow = useCallback(() => {
    attemptRef.current = 0;
    connect();
  }, [connect]);

  const setOnConnect = useCallback((handler: (() => void) | null) => {
    onConnectRef.current = handler;
  }, []);

  return {
    status,
    connected: status === "connected",
    performanceMode,
    project,
    presets,
    effects,
    deviceIp,
    stripSettings,
    activeCount,
    send,
    reconnectNow,
    setOnConnect,
  };
}
