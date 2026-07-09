import {
  MeshDiscovery,
  formNewMesh,
  runInitialDiscovery,
  type MeshCandidate,
  type MeshListenResult,
  type MeshState,
} from "../mesh-discovery";
import type { AdapterResult } from "./types";

/**
 * Thin transport adapter around MeshDiscovery.
 * start/stop never throw across the session boundary.
 */
export class DiscoveryAdapter {
  private discovery: MeshDiscovery | null = null;
  private started = false;

  get underlying(): MeshDiscovery | null {
    return this.discovery;
  }

  get currentMesh(): MeshState | null {
    return this.discovery?.currentMesh ?? null;
  }

  async startListen(
    endpointId: string,
    listenWindowMs?: number,
  ): Promise<
    AdapterResult<{ mesh: MeshState; bootstrapEndpointIds: string[]; discovery: MeshDiscovery }>
  > {
    try {
      const initial = await runInitialDiscovery(endpointId, listenWindowMs);
      this.discovery = initial.discovery;
      this.started = true;
      return {
        ok: true,
        value: {
          mesh: initial.mesh,
          bootstrapEndpointIds: initial.bootstrapEndpointIds,
          discovery: initial.discovery,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** Create a discovery instance without the listen window (for harness stress). */
  create(endpointId: string, mesh?: MeshState): MeshDiscovery {
    const discovery = new MeshDiscovery(endpointId, mesh ?? formNewMesh());
    this.discovery = discovery;
    this.started = true;
    return discovery;
  }

  async startAdvertising(): Promise<AdapterResult> {
    if (!this.discovery) {
      return { ok: false, error: "discovery not started" };
    }
    try {
      await this.discovery.startAdvertising();
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  onOlderMesh(callback: (older: MeshCandidate) => void): void {
    this.discovery?.onOlderMesh(callback);
  }

  adoptMesh(mesh: MeshState): void {
    this.discovery?.adoptMesh(mesh);
  }

  bootstrapForMesh(meshId: string): string[] {
    return this.discovery?.bootstrapForMesh(meshId) ?? [];
  }

  async listen(windowMs?: number): Promise<AdapterResult<MeshListenResult>> {
    if (!this.discovery) {
      return { ok: false, error: "discovery not started" };
    }
    try {
      const result = await this.discovery.listen(windowMs);
      return { ok: true, value: result };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async stop(): Promise<AdapterResult> {
    const discovery = this.discovery;
    this.discovery = null;
    this.started = false;
    if (!discovery) {
      return { ok: true, value: undefined };
    }
    try {
      await discovery.stop();
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  get isStarted(): boolean {
    return this.started && this.discovery !== null;
  }
}
