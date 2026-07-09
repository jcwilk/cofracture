import type { Bounds } from "./bounds";
import {
  startNetworkingSession,
  stopNetworkingSession,
} from "./networking/session";
import { colorForEndpoint, type PeerPresence } from "./networking/peers";
import type { NetworkingSessionApi } from "./networking/types";

export type { PeerPresence };
export { colorForEndpoint };

export interface PresenceManager {
  peers: Map<string, PeerPresence>;
  myEndpointId: string;
  myColor: string;
  broadcastBounds: (bounds: Bounds) => Promise<void>;
  onPeersChanged: (() => void) | null;
  /** Stop the networking session; clears peer highlights. */
  stop: () => Promise<void>;
}

/**
 * Application entry into collaborative presence.
 * Routes through the networking session façade (no viewport ownership of transports).
 */
export async function initPresence(): Promise<PresenceManager> {
  const session = await startNetworkingSession();
  return wrapSession(session);
}

export async function stopPresence(): Promise<void> {
  await stopNetworkingSession();
}

function wrapSession(session: NetworkingSessionApi): PresenceManager {
  return {
    get peers() {
      return session.peers;
    },
    get myEndpointId() {
      return session.myEndpointId;
    },
    get myColor() {
      return session.myColor;
    },
    get onPeersChanged() {
      return session.onPeersChanged;
    },
    set onPeersChanged(cb: (() => void) | null) {
      session.onPeersChanged = cb;
    },
    async broadcastBounds(bounds: Bounds): Promise<void> {
      await session.broadcastBounds(bounds);
    },
    async stop(): Promise<void> {
      await stopNetworkingSession();
    },
  };
}
