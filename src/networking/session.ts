import type { Bounds } from "../bounds";
import type { MeshCandidate, MeshState } from "../mesh-discovery";
import { DiscoveryAdapter } from "./discovery-adapter";
import { colorForEndpoint, type PeerPresence } from "./peers";
import type { NetworkingSessionApi, SessionPhase } from "./types";

const TAB_CHANNEL = "cofracture-presence-tabs";
const DISCOVERY_MS = 800;

let activeSession: NetworkingSession | null = null;

async function discoverSiblingEndpoints(myEndpointId: string): Promise<string[]> {
  if (typeof BroadcastChannel === "undefined") return [];
  const found = new Set<string>();
  const channel = new BroadcastChannel(TAB_CHANNEL);

  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      channel.close();
      resolve();
    }, DISCOVERY_MS);

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; endpointId?: string };
      const id = data.endpointId;
      if (!id || id === myEndpointId) return;

      if (data.type === "announce" || data.type === "hello") {
        found.add(id);
        channel.postMessage({ type: "hello", endpointId: myEndpointId });
      }
    };

    channel.postMessage({ type: "announce", endpointId: myEndpointId });
  });

  return [...found];
}

function mergeBootstrapIds(
  myEndpointId: string,
  discoveryIds: string[],
  siblings: string[],
): string[] {
  return [
    ...new Set(
      [...discoveryIds, ...siblings].filter((id) => id && id !== myEndpointId),
    ),
  ];
}

function handleEvent(
  event: Record<string, unknown>,
  peers: Map<string, PeerPresence>,
  myEndpointId: string,
  notify: () => void,
): void {
  const type = event.type as string;
  switch (type) {
    case "presence": {
      const from = event.from as string;
      if (from === myEndpointId) return;
      const bounds = event.bounds as {
        re_min: number;
        re_max: number;
        im_min: number;
        im_max: number;
      };
      peers.set(from, {
        endpointId: from,
        bounds: {
          reMin: bounds.re_min,
          reMax: bounds.re_max,
          imMin: bounds.im_min,
          imMax: bounds.im_max,
        },
        color: event.color as string,
        lastSeen: Date.now(),
      });
      notify();
      break;
    }
    case "neighborUp":
    case "joined":
    case "neighborDown": {
      if (type === "neighborDown") {
        peers.delete(event.endpointId as string);
      }
      notify();
      break;
    }
    default:
      break;
  }
}

export class NetworkingSession implements NetworkingSessionApi {
  private phaseInternal: SessionPhase = "idle";
  private readonly peersInternal = new Map<string, PeerPresence>();
  private myEndpointIdInternal = "";
  private myColorInternal = "#888";
  private onPeersChangedCb: (() => void) | null = null;
  private readonly discoveryAdapter = new DiscoveryAdapter();
  private node: import("presence-wasm").PresenceNode | null = null;
  private session: import("presence-wasm").Session | null = null;
  private sender: import("presence-wasm").SessionSender | null = null;
  private eventReader: ReadableStreamDefaultReader<Record<string, unknown>> | null = null;
  private latestBounds: Bounds | null = null;
  private merging = false;
  private mesh: MeshState | null = null;
  private pagehideHandler: (() => void) | null = null;
  private stopPromise: Promise<void> | null = null;

  get phase(): SessionPhase {
    return this.phaseInternal;
  }

  get peers(): Map<string, PeerPresence> {
    return this.peersInternal;
  }

  get myEndpointId(): string {
    return this.myEndpointIdInternal;
  }

  get myColor(): string {
    return this.myColorInternal;
  }

  get onPeersChanged(): (() => void) | null {
    return this.onPeersChangedCb;
  }

  set onPeersChanged(cb: (() => void) | null) {
    this.onPeersChangedCb = cb;
  }

  private notify(): void {
    this.onPeersChangedCb?.();
  }

  private setPhase(phase: SessionPhase): void {
    this.phaseInternal = phase;
  }

  async start(options: { listenWindowMs?: number } = {}): Promise<void> {
    if (this.phaseInternal !== "idle" && this.phaseInternal !== "stopped") {
      await this.stop();
    }

    this.setPhase("discovering");
    this.peersInternal.clear();

    try {
      const wasm = await import("presence-wasm");
      const node = await wasm.PresenceNode.spawn();
      this.node = node;
      this.myEndpointIdInternal = node.endpoint_id();
      this.myColorInternal = colorForEndpoint(this.myEndpointIdInternal);

      const siblingsPromise = discoverSiblingEndpoints(this.myEndpointIdInternal);
      const listenResult = await this.discoveryAdapter.startListen(
        this.myEndpointIdInternal,
        options.listenWindowMs,
      );

      if (this.isStopping()) return;

      if (!listenResult.ok) {
        console.warn("discovery listen failed:", listenResult.error);
        this.setPhase("failed");
        await this.discoveryAdapter.stop();
        await this.shutdownNode();
        return;
      }

      this.mesh = listenResult.value.mesh;
      this.bindLifecycle();

      const siblings = await siblingsPromise;
      if (this.isStopping()) return;

      const bootstrapIds = mergeBootstrapIds(
        this.myEndpointIdInternal,
        listenResult.value.bootstrapEndpointIds,
        siblings,
      );

      this.setPhase("joining");
      const session = await node.join_mesh(this.mesh.meshId, bootstrapIds);
      if (this.isStopping()) return;

      this.session = session;
      this.sender = session.sender;
      this.eventReader = session.receiver.getReader();

      const advertise = await this.discoveryAdapter.startAdvertising();
      if (this.isStopping()) return;
      if (!advertise.ok) {
        console.warn("discovery advertise failed:", advertise.error);
      }

      this.discoveryAdapter.onOlderMesh((older) => {
        void this.attemptMerge(older);
      });

      this.setPhase("active");
      this.pumpEvents();
      this.notify();
    } catch (err) {
      if (this.isStopping()) return;
      console.warn("networking session start failed:", err);
      this.setPhase("failed");
      await this.stop();
    }
  }

  private isStopping(): boolean {
    return this.phaseInternal === "draining" || this.phaseInternal === "stopped";
  }

  private bindLifecycle(): void {
    if (typeof window === "undefined") return;
    if (this.pagehideHandler) {
      window.removeEventListener("pagehide", this.pagehideHandler);
    }
    this.pagehideHandler = () => {
      void this.stop();
    };
    window.addEventListener("pagehide", this.pagehideHandler);

    const hot = (import.meta as ImportMeta & { hot?: { dispose(cb: () => void): void } }).hot;
    if (hot) {
      hot.dispose(() => {
        void this.stop();
      });
    }
  }

  private async attemptMerge(older: MeshCandidate): Promise<void> {
    if (!this.node || !this.mesh || this.merging) return;
    if (older.meshFormedAt >= this.mesh.meshFormedAt) return;
    if (this.phaseInternal !== "active" && this.phaseInternal !== "merging") return;

    this.merging = true;
    this.setPhase("merging");
    try {
      const bootstrap = mergeBootstrapIds(
        this.myEndpointIdInternal,
        this.discoveryAdapter.bootstrapForMesh(older.meshId),
        await discoverSiblingEndpoints(this.myEndpointIdInternal),
      );
      const nextSession = await this.node.join_mesh(older.meshId, bootstrap);
      this.eventReader?.cancel().catch(() => {});
      this.session = nextSession;
      this.sender = nextSession.sender;
      this.eventReader = nextSession.receiver.getReader();
      this.mesh = {
        meshId: older.meshId,
        meshFormedAt: older.meshFormedAt,
      };
      this.discoveryAdapter.adoptMesh(this.mesh);
      this.peersInternal.clear();
      this.pumpEvents();
      this.notify();
      if (this.latestBounds && this.sender) {
        await this.sender.broadcast_presence(
          this.latestBounds.reMin,
          this.latestBounds.reMax,
          this.latestBounds.imMin,
          this.latestBounds.imMax,
          this.myColorInternal,
        );
      }
      this.setPhase("active");
    } catch (err) {
      console.warn("mesh merge failed:", err);
      if (this.phaseInternal === "merging") {
        this.setPhase("active");
      }
    } finally {
      this.merging = false;
    }
  }

  private pumpEvents(): void {
    const reader = this.eventReader;
    if (!reader) return;
    const pump = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          if (this.phaseInternal === "draining" || this.phaseInternal === "stopped") break;
          handleEvent(value, this.peersInternal, this.myEndpointIdInternal, () => this.notify());
        }
      } catch (err) {
        if (this.phaseInternal !== "draining" && this.phaseInternal !== "stopped") {
          console.warn("presence event stream ended:", err);
        }
      }
    };
    void pump();
  }

  async broadcastBounds(bounds: Bounds): Promise<void> {
    this.latestBounds = bounds;
    if (!this.sender || this.phaseInternal !== "active") return;
    try {
      await this.sender.broadcast_presence(
        bounds.reMin,
        bounds.reMax,
        bounds.imMin,
        bounds.imMax,
        this.myColorInternal,
      );
    } catch (err) {
      console.warn("broadcast failed:", err);
    }
  }

  private async shutdownNode(): Promise<void> {
    const node = this.node;
    this.node = null;
    if (!node) return;
    try {
      await node.shutdown();
    } catch (err) {
      console.warn("presence shutdown failed:", err);
    }
  }

  async stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    if (this.phaseInternal === "stopped" || this.phaseInternal === "idle") {
      this.setPhase("stopped");
      return;
    }

    this.stopPromise = this.drainAndStop();
    try {
      await this.stopPromise;
    } finally {
      this.stopPromise = null;
    }
  }

  private async drainAndStop(): Promise<void> {
    this.setPhase("draining");

    if (this.pagehideHandler && typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.pagehideHandler);
      this.pagehideHandler = null;
    }

    try {
      await this.eventReader?.cancel();
    } catch {
      // contained
    }
    this.eventReader = null;
    this.sender = null;
    this.session = null;

    this.peersInternal.clear();
    this.notify();

    const discoveryStop = await this.discoveryAdapter.stop();
    if (!discoveryStop.ok) {
      console.warn("discovery stop contained:", discoveryStop.error);
    }

    await this.shutdownNode();

    this.mesh = null;
    this.latestBounds = null;
    this.setPhase("stopped");
  }

  /** Expose discovery adapter for harness-only stress (not for viewport). */
  getDiscoveryAdapter(): DiscoveryAdapter {
    return this.discoveryAdapter;
  }
}

/**
 * Start (or replace) the process-wide networking session.
 * Callable without the fractal viewport.
 */
export async function startNetworkingSession(
  options: { listenWindowMs?: number } = {},
): Promise<NetworkingSessionApi> {
  if (activeSession) {
    await activeSession.stop();
    activeSession = null;
  }
  const session = new NetworkingSession();
  activeSession = session;
  await session.start(options);
  return session;
}

export async function stopNetworkingSession(): Promise<void> {
  if (!activeSession) return;
  const session = activeSession;
  activeSession = null;
  await session.stop();
}

export function getActiveNetworkingSession(): NetworkingSessionApi | null {
  return activeSession;
}
