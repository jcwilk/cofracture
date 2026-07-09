import type { Bounds } from "../bounds";
import type { PeerPresence } from "./peers";

/** Observable networking session phases. */
export type SessionPhase =
  | "idle"
  | "discovering"
  | "joining"
  | "active"
  | "merging"
  | "draining"
  | "stopped"
  | "failed";

export type AdapterResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface NetworkingSessionApi {
  readonly phase: SessionPhase;
  readonly peers: Map<string, PeerPresence>;
  readonly myEndpointId: string;
  readonly myColor: string;
  onPeersChanged: (() => void) | null;
  broadcastBounds: (bounds: Bounds) => Promise<void>;
  /** Stop discovery + presence; clears peers; leaves local exploration intact. */
  stop: () => Promise<void>;
}
