import type { Instance, Torrent } from "webtorrent";

export const SWARM_NAME = "cofracture-presence-discovery-v1";
export const LISTEN_WINDOW_MS = 10_000;
export const ADVERTISE_BASE_MS = 2_000;
export const VALIDITY_WINDOW_MS = 45_000;
export const BACKOFF_K0 = 5;
export const SEQ_STORAGE_KEY = "cofracture-mesh-discovery-seq";

export interface MeshAdvertisement {
  endpoint_id: string;
  mesh_id: string;
  mesh_formed_at: number;
  seq: number;
}

export interface MeshState {
  meshId: string;
  meshFormedAt: number;
}

export interface EndpointRecord {
  seq: number;
  lastSeen: number;
}

export interface MeshCandidate {
  meshId: string;
  meshFormedAt: number;
  endpoints: Map<string, EndpointRecord>;
}

export interface MeshListenResult {
  mesh: MeshState | null;
  bootstrapEndpointIds: string[];
}

function isValidAdvertisement(value: unknown): value is MeshAdvertisement {
  if (!value || typeof value !== "object") return false;
  const ad = value as Record<string, unknown>;
  return (
    typeof ad.endpoint_id === "string" &&
    ad.endpoint_id.length > 0 &&
    typeof ad.mesh_id === "string" &&
    ad.mesh_id.length > 0 &&
    typeof ad.mesh_formed_at === "number" &&
    Number.isFinite(ad.mesh_formed_at) &&
    typeof ad.seq === "number" &&
    Number.isInteger(ad.seq) &&
    ad.seq >= 0
  );
}

export function parseAdvertisement(data: Uint8Array | string): MeshAdvertisement | null {
  try {
    const text = typeof data === "string" ? data : new TextDecoder().decode(data);
    const parsed: unknown = JSON.parse(text);
    return isValidAdvertisement(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function encodeAdvertisement(ad: MeshAdvertisement): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(ad));
}

export function shouldAcceptAdvertisement(
  ad: MeshAdvertisement,
  lastSeq: number | undefined,
): boolean {
  if (!isValidAdvertisement(ad)) return false;
  if (lastSeq !== undefined && ad.seq <= lastSeq) return false;
  return true;
}

export function recordAdvertisement(
  ad: MeshAdvertisement,
  lastSeqByEndpoint: Map<string, number>,
  meshes: Map<string, MeshCandidate>,
  now: number,
): boolean {
  const lastSeq = lastSeqByEndpoint.get(ad.endpoint_id);
  if (!shouldAcceptAdvertisement(ad, lastSeq)) return false;

  lastSeqByEndpoint.set(ad.endpoint_id, ad.seq);

  let mesh = meshes.get(ad.mesh_id);
  if (!mesh) {
    mesh = {
      meshId: ad.mesh_id,
      meshFormedAt: ad.mesh_formed_at,
      endpoints: new Map(),
    };
    meshes.set(ad.mesh_id, mesh);
  } else {
    mesh.meshFormedAt = Math.min(mesh.meshFormedAt, ad.mesh_formed_at);
  }

  mesh.endpoints.set(ad.endpoint_id, { seq: ad.seq, lastSeen: now });
  return true;
}

export function liveEndpointsForMesh(
  mesh: MeshCandidate,
  now: number,
  validityMs = VALIDITY_WINDOW_MS,
): Map<string, EndpointRecord> {
  const live = new Map<string, EndpointRecord>();
  for (const [endpointId, record] of mesh.endpoints) {
    if (now - record.lastSeen <= validityMs) {
      live.set(endpointId, record);
    }
  }
  return live;
}

export function countLiveAdvertisersForMesh(
  mesh: MeshCandidate,
  now: number,
  validityMs = VALIDITY_WINDOW_MS,
): number {
  return liveEndpointsForMesh(mesh, now, validityMs).size;
}

export function selectOldestMesh(
  meshes: Map<string, MeshCandidate>,
  now: number,
  validityMs = VALIDITY_WINDOW_MS,
): MeshCandidate | null {
  let best: MeshCandidate | null = null;
  for (const mesh of meshes.values()) {
    if (liveEndpointsForMesh(mesh, now, validityMs).size === 0) continue;
    if (!best || mesh.meshFormedAt < best.meshFormedAt) {
      best = mesh;
    }
  }
  return best;
}

export function bootstrapEndpointIdsForMesh(
  mesh: MeshCandidate,
  myEndpointId: string,
  now: number,
  validityMs = VALIDITY_WINDOW_MS,
): string[] {
  return [...liveEndpointsForMesh(mesh, now, validityMs).entries()]
    .filter(([endpointId]) => endpointId !== myEndpointId)
    .sort((a, b) => b[1].seq - a[1].seq)
    .map(([endpointId]) => endpointId);
}

export function calculateBackoffMultiplier(
  distinctAdvertisers: number,
  k0 = BACKOFF_K0,
): number {
  return Math.max(1, Math.ceil(distinctAdvertisers / k0));
}

export function calculateAdvertiseInterval(
  distinctAdvertisers: number,
  baseMs = ADVERTISE_BASE_MS,
  k0 = BACKOFF_K0,
): number {
  return baseMs * calculateBackoffMultiplier(distinctAdvertisers, k0);
}

export function applyJitter(intervalMs: number, random = Math.random): number {
  const jitter = random() * 0.2 - 0.1;
  return Math.round(intervalMs * (1 + jitter));
}

export function loadSeq(): number {
  try {
    const raw = localStorage.getItem(SEQ_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveSeq(seq: number): void {
  localStorage.setItem(SEQ_STORAGE_KEY, String(seq));
}

export function nextSeq(): number {
  const seq = loadSeq() + 1;
  saveSeq(seq);
  return seq;
}

export function generateMeshId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function formNewMesh(): MeshState {
  return {
    meshId: generateMeshId(),
    meshFormedAt: Date.now(),
  };
}

type WebTorrentClient = Instance;

async function loadWebTorrent(): Promise<new () => WebTorrentClient> {
  const mod = await import("webtorrent/dist/webtorrent.min.js");
  return mod.default;
}

export class MeshDiscovery {
  private client: WebTorrentClient | null = null;
  private seedTorrent: Torrent | null = null;
  private readonly lastSeqByEndpoint = new Map<string, number>();
  private readonly meshes = new Map<string, MeshCandidate>();
  private advertiseTimer: number | null = null;
  private mergeCallback: ((older: MeshCandidate) => void) | null = null;
  private stopped = false;

  constructor(
    private readonly endpointId: string,
    private mesh: MeshState,
  ) {}

  get currentMesh(): MeshState {
    return this.mesh;
  }

  adoptMesh(mesh: MeshState): void {
    this.mesh = mesh;
  }

  onOlderMesh(callback: (older: MeshCandidate) => void): void {
    this.mergeCallback = callback;
  }

  async listen(windowMs = LISTEN_WINDOW_MS): Promise<MeshListenResult> {
    await this.ensureClient();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, windowMs);
    });

    const now = Date.now();
    const selected = selectOldestMesh(this.meshes, now);
    if (!selected) {
      return { mesh: null, bootstrapEndpointIds: [] };
    }

    return {
      mesh: {
        meshId: selected.meshId,
        meshFormedAt: selected.meshFormedAt,
      },
      bootstrapEndpointIds: bootstrapEndpointIdsForMesh(
        selected,
        this.endpointId,
        now,
      ),
    };
  }

  async startAdvertising(): Promise<void> {
    this.stopped = false;
    await this.ensureClient();
    await this.publishOnce();
    this.scheduleNextAdvertise();
  }

  stop(): void {
    this.stopped = true;
    if (this.advertiseTimer !== null) {
      clearTimeout(this.advertiseTimer);
      this.advertiseTimer = null;
    }
    if (this.seedTorrent) {
      this.seedTorrent.destroy();
      this.seedTorrent = null;
    }
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }

  bootstrapForMesh(meshId: string): string[] {
    const mesh = this.meshes.get(meshId);
    if (!mesh) return [];
    return bootstrapEndpointIdsForMesh(mesh, this.endpointId, Date.now());
  }

  private async ensureClient(): Promise<void> {
    if (this.client) return;
    const WebTorrent = await loadWebTorrent();
    const client = new WebTorrent();
    client.on("torrent", (torrent) => {
      void this.handleTorrent(torrent);
    });
    this.client = client;
  }

  private async handleTorrent(torrent: Torrent): Promise<void> {
    if (torrent.name !== SWARM_NAME) return;
    const file = torrent.files[0];
    if (!file) return;

    await new Promise<void>((resolve) => {
      file.getBuffer((err, buffer) => {
        if (err) {
          resolve();
          return;
        }
        const bytes =
          buffer instanceof Uint8Array
            ? buffer
            : new Uint8Array(buffer as unknown as ArrayBuffer);
        const ad = parseAdvertisement(bytes);
        if (!ad) {
          resolve();
          return;
        }

        const now = Date.now();
        const accepted = recordAdvertisement(ad, this.lastSeqByEndpoint, this.meshes, now);
        if (accepted) {
          this.maybeTriggerMerge(ad.mesh_id, now);
        }
        resolve();
      });
    });
  }

  private maybeTriggerMerge(meshId: string, now: number): void {
    if (!this.mergeCallback) return;
    const candidate = this.meshes.get(meshId);
    if (!candidate) return;
    if (candidate.meshFormedAt >= this.mesh.meshFormedAt) return;
    if (liveEndpointsForMesh(candidate, now).size === 0) return;
    this.mergeCallback(candidate);
  }

  private scheduleNextAdvertise(): void {
    if (this.stopped) return;
    const mesh = this.meshes.get(this.mesh.meshId);
    const advertisers = mesh ? countLiveAdvertisersForMesh(mesh, Date.now()) : 1;
    const interval = applyJitter(
      calculateAdvertiseInterval(Math.max(advertisers, 1)),
    );
    this.advertiseTimer = window.setTimeout(() => {
      void this.publishOnce().finally(() => this.scheduleNextAdvertise());
    }, interval);
  }

  private async publishOnce(): Promise<void> {
    if (!this.client || this.stopped) return;

    const ad: MeshAdvertisement = {
      endpoint_id: this.endpointId,
      mesh_id: this.mesh.meshId,
      mesh_formed_at: this.mesh.meshFormedAt,
      seq: nextSeq(),
    };

    const now = Date.now();
    recordAdvertisement(ad, this.lastSeqByEndpoint, this.meshes, now);

    if (this.seedTorrent) {
      this.seedTorrent.destroy();
      this.seedTorrent = null;
    }

    const payload = new File([JSON.stringify(ad)], SWARM_NAME, {
      type: "application/json",
    });

    await new Promise<void>((resolve) => {
      const seed = this.client!.seed as unknown as (
        input: File,
        opts: { name: string },
        cb: (torrent: Torrent) => void,
      ) => Torrent;
      seed(payload, { name: SWARM_NAME }, (torrent) => {
        this.seedTorrent = torrent;
        resolve();
      });
    });
  }
}

export async function runInitialDiscovery(
  endpointId: string,
): Promise<{ discovery: MeshDiscovery; mesh: MeshState; bootstrapEndpointIds: string[] }> {
  const discovery = new MeshDiscovery(endpointId, formNewMesh());
  const listenResult = await discovery.listen();

  if (listenResult.mesh) {
    discovery.adoptMesh(listenResult.mesh);
    return {
      discovery,
      mesh: listenResult.mesh,
      bootstrapEndpointIds: listenResult.bootstrapEndpointIds,
    };
  }

  const mesh = formNewMesh();
  discovery.adoptMesh(mesh);
  return {
    discovery,
    mesh,
    bootstrapEndpointIds: [],
  };
}
