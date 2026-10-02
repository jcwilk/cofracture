import { CANONICAL_BOUNDS, type Bounds } from "../bounds";
import { formNewMesh, type MeshCandidate, type MeshState } from "../mesh-discovery";
import { formatActivityLine, type ActivityRecord } from "./activity";
import { DiscoveryAdapter } from "./discovery-adapter";
import {
  colorForEndpoint,
  discardStoredEndpointSecret,
  endpointKey,
  pruneStalePeers,
  type PeerPresence,
} from "./peers";
import {
  announceInScope,
  forgetInScope,
  isPublicScope,
  meshIdForPrivateScope,
  PUBLIC_COLLABORATION_SCOPE,
  waitForScopePeers,
} from "./scope";
import type { NetworkingSessionApi, SessionPhase } from "./types";

const TAB_CHANNEL = "cofracture-presence-tabs";
const DISCOVERY_MS = 800;
const RELAY_SETTLE_MS = 3_500;
const NEIGHBOR_WAIT_MS = 4_000;

export interface SessionStartOptions {
  listenWindowMs?: number;
  /** Collaboration scope. Omitted or "public" uses the site discovery channel. */
  scope?: string;
  now?: () => number;
}

type PresenceSlot = {
  session: NetworkingSession | null;
  starting: Promise<NetworkingSession> | null;
};

function presenceSlot(): PresenceSlot {
  const g = globalThis as typeof globalThis & { __cofracturePresence?: PresenceSlot };
  if (!g.__cofracturePresence) {
    g.__cofracturePresence = { session: null, starting: null };
  }
  return g.__cofracturePresence;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function discoverSiblingEndpoints(myEndpointId: string): Promise<string[]> {
  if (typeof BroadcastChannel === "undefined" || typeof window === "undefined") return [];
  const found = new Set<string>();
  const channel = new BroadcastChannel(TAB_CHANNEL);

  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      channel.close();
      resolve();
    }, DISCOVERY_MS);

    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; endpointId?: string };
      const id = endpointKey(data.endpointId);
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
  const mine = endpointKey(myEndpointId);
  const ids = [...discoveryIds, ...siblings]
    .map((id) => endpointKey(id))
    .filter((id): id is string => !!id && id !== mine);
  return [...new Set(ids)];
}

export function assertActiveRemotes(active: readonly string[], expected: readonly string[]): void {
  const actualIds = [...active].sort();
  const expectedIds = [...expected].sort();
  const same =
    actualIds.length === expectedIds.length &&
    actualIds.every((id, index) => id === expectedIds[index]);
  if (!same) {
    throw new Error(
      `active remotes [${actualIds.join(", ")}] expected [${expectedIds.join(", ")}]`,
    );
  }
}

export class NetworkingSession implements NetworkingSessionApi {
  private phaseInternal: SessionPhase = "idle";
  private readonly peersInternal = new Map<string, PeerPresence>();
  private myEndpointIdInternal = "";
  private myColorInternal = "#888";
  private localRegionInternal: Bounds = { ...CANONICAL_BOUNDS };
  private onPeersChangedCb: (() => void) | null = null;
  private readonly listeners = new Set<(record: ActivityRecord) => void>();
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
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private pumpGeneration = 0;
  private readonly announced = new Set<string>();
  private readonly connected = new Set<string>();
  private scopeInternal: string = PUBLIC_COLLABORATION_SCOPE;
  private nowFn: () => number = Date.now;
  private neighborArrived: (() => void) | null = null;
  private sawNeighbor = false;

  constructor(options: SessionStartOptions = {}) {
    if (options.scope) this.scopeInternal = options.scope;
    if (options.now) this.nowFn = options.now;
  }

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

  get localRegion(): Bounds {
    return { ...this.localRegionInternal };
  }

  get scope(): string {
    return this.scopeInternal;
  }

  get onPeersChanged(): (() => void) | null {
    return this.onPeersChangedCb;
  }

  set onPeersChanged(cb: (() => void) | null) {
    this.onPeersChangedCb = cb;
  }

  subscribe(listener: (record: ActivityRecord) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  activeRemoteIds(): string[] {
    return [...this.peersInternal.keys()];
  }

  private notify(): void {
    this.onPeersChangedCb?.();
  }

  private setPhase(phase: SessionPhase): void {
    this.phaseInternal = phase;
  }

  private emit(record: ActivityRecord): void {
    console.info(formatActivityLine(record));
    for (const listener of this.listeners) listener(record);
  }

  private emitFor(kind: ActivityRecord["kind"], identity: string, reason?: string): void {
    const key = endpointKey(identity);
    if (!key) return;
    this.emit({
      kind,
      identity: key,
      color: colorForEndpoint(key),
      ...(reason ? { reason } : {}),
    });
  }

  async start(options: SessionStartOptions = {}): Promise<void> {
    if (this.phaseInternal === "active" || this.phaseInternal === "joining" || this.phaseInternal === "discovering") {
      return;
    }
    if (this.phaseInternal !== "idle" && this.phaseInternal !== "stopped" && this.phaseInternal !== "failed") {
      await this.stop();
    }

    if (options.scope) this.scopeInternal = options.scope;
    if (options.now) this.nowFn = options.now;

    this.setPhase("discovering");
    this.peersInternal.clear();
    this.announced.clear();
    this.connected.clear();
    discardStoredEndpointSecret();

    try {
      const wasm = await import("presence-wasm");
      const node = await wasm.PresenceNode.spawn();
      this.node = node;
      this.myEndpointIdInternal = endpointKey(node.endpoint_id()) ?? node.endpoint_id();
      this.myColorInternal = colorForEndpoint(this.myEndpointIdInternal);
      this.emitFor("self", this.myEndpointIdInternal);
      this.bindLifecycle();
      this.startStaleSweep();

      const bootstrapIds = isPublicScope(this.scopeInternal)
        ? await this.discoverPublic(options.listenWindowMs)
        : await this.discoverPrivate(options.listenWindowMs ?? 2_000);

      if (bootstrapIds === null || this.isStopping()) return;

      this.setPhase("joining");
      await this.joinGossip(this.mesh?.meshId ?? meshIdForPrivateScope(this.scopeInternal), bootstrapIds);
      if (this.isStopping()) return;

      if (isPublicScope(this.scopeInternal)) {
        const advertise = await this.discoveryAdapter.startAdvertising();
        if (this.isStopping()) return;
        if (!advertise.ok) {
          console.warn("discovery advertise failed:", advertise.error);
        }
        this.discoveryAdapter.onOlderMesh((older) => {
          void this.attemptMerge(older);
        });
        this.discoveryAdapter.onCapacityLeave((next) => {
          void this.leaveOverCapacity(next);
        });
      }

      this.setPhase("active");
      if (this.latestBounds) await this.broadcastBounds(this.latestBounds);
      this.notify();
    } catch (err) {
      if (this.isStopping()) return;
      console.warn("networking session start failed:", err);
      this.setPhase("failed");
      await this.stop();
    }
  }

  private async discoverPublic(listenWindowMs?: number): Promise<string[] | null> {
    const siblingsPromise = discoverSiblingEndpoints(this.myEndpointIdInternal);
    const listenResult = await this.discoveryAdapter.startListen(
      this.myEndpointIdInternal,
      listenWindowMs,
    );
    if (!listenResult.ok) {
      console.warn("discovery listen failed:", listenResult.error);
      this.setPhase("failed");
      this.stopStaleSweep();
      await this.discoveryAdapter.stop();
      await this.shutdownNode();
      return null;
    }
    this.mesh = listenResult.value.mesh;
    const siblings = await siblingsPromise;
    const bootstrapIds = mergeBootstrapIds(
      this.myEndpointIdInternal,
      listenResult.value.bootstrapEndpointIds,
      siblings,
    );
    for (const id of bootstrapIds) this.noteDiscovered(id);
    return bootstrapIds;
  }

  private async discoverPrivate(listenWindowMs: number): Promise<string[]> {
    const meshId = meshIdForPrivateScope(this.scopeInternal);
    this.mesh = { meshId, meshFormedAt: this.nowFn() };
    announceInScope(this.scopeInternal, this.myEndpointIdInternal);
    const others = await waitForScopePeers(
      this.scopeInternal,
      this.myEndpointIdInternal,
      listenWindowMs,
    );
    for (const id of others) this.noteDiscovered(id);
    return others;
  }

  private noteDiscovered(identity: string): void {
    const key = endpointKey(identity);
    if (!key || key === this.myEndpointIdInternal || this.announced.has(key)) return;
    this.announced.add(key);
    this.emitFor("discovered", key);
  }

  private async joinGossip(meshId: string, bootstrapIds: string[]): Promise<void> {
    const node = this.node;
    if (!node) return;
    const attempts = bootstrapIds.length === 0 ? 1 : 2;
    if (bootstrapIds.length > 0) await delay(RELAY_SETTLE_MS);
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await delay(1_500);
      if (this.isStopping()) return;
      this.releaseGossip();
      this.sawNeighbor = false;
      const next = await node.join_mesh(meshId, bootstrapIds);
      if (this.isStopping()) return;
      this.session = next;
      this.sender = next.sender;
      this.eventReader = next.receiver.getReader();
      this.pumpEvents();
      if (bootstrapIds.length === 0) return;
      const connected = await this.waitForNeighbor(NEIGHBOR_WAIT_MS);
      if (connected) return;
    }
    for (const id of bootstrapIds) {
      if (!this.connected.has(id)) this.noteConnectFailed(id, "bootstrap dial did not connect");
    }
  }

  private waitForNeighbor(ms: number): Promise<boolean> {
    if (this.sawNeighbor || this.peersInternal.size > 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.neighborArrived = null;
        resolve(this.sawNeighbor || this.peersInternal.size > 0);
      }, ms);
      this.neighborArrived = () => {
        clearTimeout(timer);
        this.neighborArrived = null;
        resolve(true);
      };
    });
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

  private async leaveOverCapacity(next: MeshCandidate | null): Promise<void> {
    if (next) {
      await this.joinMesh(next);
      return;
    }
    await this.joinMesh(formNewMesh(), []);
  }

  private async attemptMerge(older: MeshCandidate): Promise<void> {
    if (!this.mesh) return;
    if (older.meshFormedAt >= this.mesh.meshFormedAt) return;
    await this.joinMesh(older);
  }

  private async joinMesh(target: MeshCandidate | MeshState, bootstrapIds?: string[]): Promise<void> {
    if (!this.node || !this.mesh || this.merging) return;
    if (this.phaseInternal !== "active" && this.phaseInternal !== "merging") return;

    this.merging = true;
    this.setPhase("merging");
    try {
      const bootstrap =
        bootstrapIds ??
        mergeBootstrapIds(
          this.myEndpointIdInternal,
          this.discoveryAdapter.bootstrapForMesh(target.meshId),
          await discoverSiblingEndpoints(this.myEndpointIdInternal),
        );
      for (const id of bootstrap) this.noteDiscovered(id);
      this.releaseGossip();
      const nextSession = await this.node.join_mesh(target.meshId, bootstrap);
      this.session = nextSession;
      this.sender = nextSession.sender;
      this.eventReader = nextSession.receiver.getReader();
      this.mesh = {
        meshId: target.meshId,
        meshFormedAt: target.meshFormedAt,
      };
      this.discoveryAdapter.adoptMesh(this.mesh);
      this.dropAllRemotes();
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

  private releaseGossip(): void {
    this.pumpGeneration += 1;
    const reader = this.eventReader;
    this.eventReader = null;
    this.sender = null;
    this.session = null;
    void reader?.cancel().catch(() => {});
  }

  private pumpEvents(): void {
    const generation = ++this.pumpGeneration;
    const reader = this.eventReader;
    if (!reader) return;
    const pump = async () => {
      try {
        while (generation === this.pumpGeneration) {
          const { value, done } = await reader.read();
          if (generation !== this.pumpGeneration || done) break;
          if (!value) continue;
          if (this.phaseInternal === "draining" || this.phaseInternal === "stopped") break;
          this.applyTransportEvent(value);
        }
      } catch (err) {
        if (
          generation === this.pumpGeneration &&
          this.phaseInternal !== "draining" &&
          this.phaseInternal !== "stopped"
        ) {
          console.warn("presence event stream ended:", err);
        }
      }
    };
    void pump();
  }

  /** Applies one delivered gossip or dial fact. Safe to call with no document. */
  applyTransportEvent(event: Record<string, unknown>): void {
    const type = event.type as string;
    const mine = this.myEndpointIdInternal;
    if (type === "presence") {
      const from = endpointKey(event.from);
      if (!from || from === mine) return;
      const bounds = event.bounds as {
        re_min: number;
        re_max: number;
        im_min: number;
        im_max: number;
      };
      this.noteConnected(from);
      const existing = this.peersInternal.get(from);
      this.peersInternal.set(from, {
        endpointId: from,
        bounds: {
          reMin: bounds.re_min,
          reMax: bounds.re_max,
          imMin: bounds.im_min,
          imMax: bounds.im_max,
        },
        color: colorForEndpoint(from),
        lastSeen: existing ? this.nowFn() : this.nowFn(),
      });
      this.peersInternal.get(from)!.lastSeen = this.nowFn();
      this.notify();
      return;
    }
    if (type === "joined") {
      const neighbors = event.neighbors;
      if (Array.isArray(neighbors)) {
        for (const raw of neighbors) {
          const id = endpointKey(raw);
          if (id && id !== mine) this.noteConnected(id);
        }
      }
      this.notify();
      return;
    }
    if (type === "neighborUp") {
      const id = endpointKey(event.endpointId);
      if (id && id !== mine) this.noteConnected(id);
      this.notify();
      return;
    }
    if (type === "neighborDown") {
      const id = endpointKey(event.endpointId);
      if (id) this.noteRemoved(id);
      this.notify();
      return;
    }
    if (type === "discovered") {
      const id = endpointKey(event.endpointId);
      if (id && id !== mine) this.noteDiscovered(id);
      return;
    }
    if (type === "connectFailed") {
      const id = endpointKey(event.endpointId);
      if (id) this.noteConnectFailed(id, typeof event.reason === "string" ? event.reason : "connect failed");
    }
  }

  private noteConnected(identity: string): void {
    this.sawNeighbor = true;
    this.neighborArrived?.();
    if (this.connected.has(identity)) return;
    this.connected.add(identity);
    this.announced.add(identity);
    if (!this.peersInternal.has(identity)) {
      this.peersInternal.set(identity, {
        endpointId: identity,
        bounds: { ...CANONICAL_BOUNDS },
        color: colorForEndpoint(identity),
        lastSeen: this.nowFn(),
      });
    }
    this.emitFor("connected", identity);
  }

  private noteConnectFailed(identity: string, reason: string): void {
    if (this.connected.has(identity) || this.peersInternal.has(identity)) return;
    this.emitFor("connect-failed", identity, reason);
  }

  private noteRemoved(identity: string): void {
    if (!this.peersInternal.has(identity) && !this.connected.has(identity)) return;
    this.peersInternal.delete(identity);
    this.connected.delete(identity);
    this.announced.delete(identity);
    this.emitFor("removed", identity);
  }

  private dropAllRemotes(): void {
    for (const id of [...this.peersInternal.keys()]) this.noteRemoved(id);
  }

  async setLocalRegion(bounds: Bounds): Promise<void> {
    this.localRegionInternal = { ...bounds };
    await this.broadcastBounds(bounds);
  }

  async broadcastBounds(bounds: Bounds): Promise<void> {
    this.localRegionInternal = { ...bounds };
    this.latestBounds = bounds;
    if (!this.sender || (this.phaseInternal !== "active" && this.phaseInternal !== "joining")) return;
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

  /** Test clock entry. Silence at or past 15s removes the participant. */
  pruneAt(now: number): string[] {
    const removed = pruneStalePeers(this.peersInternal, now);
    for (const id of removed) {
      this.connected.delete(id);
      this.announced.delete(id);
      this.emitFor("removed", id);
    }
    if (removed.length > 0) this.notify();
    return removed;
  }

  private startStaleSweep(): void {
    this.stopStaleSweep();
    this.staleTimer = setInterval(() => {
      this.pruneAt(this.nowFn());
    }, 2_000);
  }

  private stopStaleSweep(): void {
    if (this.staleTimer === null) return;
    clearInterval(this.staleTimer);
    this.staleTimer = null;
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
    this.stopStaleSweep();

    if (this.pagehideHandler && typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.pagehideHandler);
      this.pagehideHandler = null;
    }

    this.releaseGossip();
    this.dropAllRemotes();
    this.notify();

    if (!isPublicScope(this.scopeInternal) && this.myEndpointIdInternal) {
      forgetInScope(this.scopeInternal, this.myEndpointIdInternal);
    }

    const discoveryStop = await this.discoveryAdapter.stop();
    if (!discoveryStop.ok) {
      console.warn("discovery stop contained:", discoveryStop.error);
    }

    await this.shutdownNode();
    this.stopStaleSweep();

    this.mesh = null;
    this.latestBounds = null;
    this.setPhase("stopped");
  }

  /** Expose discovery adapter for harness-only stress (not for viewport). */
  getDiscoveryAdapter(): DiscoveryAdapter {
    return this.discoveryAdapter;
  }
}

function sessionIsReusable(session: NetworkingSession): boolean {
  return (
    session.phase === "discovering" ||
    session.phase === "joining" ||
    session.phase === "active" ||
    session.phase === "merging"
  );
}

/**
 * Start the page's process-wide session, or return it if this run is already active.
 * A new call after stop is a new run and a new identity.
 */
export async function startNetworkingSession(
  options: SessionStartOptions = {},
): Promise<NetworkingSession> {
  const slot = presenceSlot();
  if (slot.session && sessionIsReusable(slot.session)) return slot.session;
  if (slot.starting) return slot.starting;

  slot.starting = (async () => {
    if (slot.session) {
      await slot.session.stop();
      slot.session = null;
    }
    const session = new NetworkingSession(options);
    slot.session = session;
    await session.start(options);
    return session;
  })();

  try {
    return await slot.starting;
  } finally {
    slot.starting = null;
  }
}

/** A separate run. Does not replace the page session. */
export async function startParticipantSession(
  options: SessionStartOptions = {},
): Promise<NetworkingSession> {
  const session = new NetworkingSession(options);
  await session.start(options);
  return session;
}

export async function stopNetworkingSession(): Promise<void> {
  const slot = presenceSlot();
  const session = slot.session;
  if (!session) return;
  slot.session = null;
  await session.stop();
}

export function getActiveNetworkingSession(): NetworkingSessionApi | null {
  return presenceSlot().session;
}
