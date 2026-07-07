import type { Bounds } from "./bounds";
import {
  MeshDiscovery,
  runInitialDiscovery,
  type MeshCandidate,
  type MeshState,
} from "./mesh-discovery";

export interface PeerPresence {
  endpointId: string;
  bounds: Bounds;
  color: string;
  lastSeen: number;
}

const PALETTE = [
  "#e6194b",
  "#3cb44b",
  "#ffe119",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#42d4f4",
  "#f032e6",
  "#bfef45",
  "#fabed4",
  "#469990",
  "#dcbeff",
  "#9a6324",
  "#fffac8",
  "#800000",
  "#aaffc3",
];

export function colorForEndpoint(endpointId: string): string {
  let hash = 0;
  for (let i = 0; i < endpointId.length; i++) {
    hash = (hash * 31 + endpointId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export interface PresenceManager {
  peers: Map<string, PeerPresence>;
  myEndpointId: string;
  myColor: string;
  broadcastBounds: (bounds: Bounds) => Promise<void>;
  onPeersChanged: (() => void) | null;
}

const TAB_CHANNEL = "cofracture-presence-tabs";
const DISCOVERY_MS = 800;

let activeNode: import("presence-wasm").PresenceNode | null = null;

async function discoverSiblingEndpoints(myEndpointId: string): Promise<string[]> {
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

async function shutdownActiveNode(): Promise<void> {
  if (!activeNode) return;
  const node = activeNode;
  activeNode = null;
  try {
    await node.shutdown();
  } catch (err) {
    console.warn("presence shutdown failed:", err);
  }
}

function bindLifecycle(
  node: import("presence-wasm").PresenceNode,
  discovery: MeshDiscovery | null,
): void {
  const shutdown = () => {
    discovery?.stop();
    void node.shutdown();
  };
  window.addEventListener("pagehide", shutdown);
  const hot = (import.meta as ImportMeta & { hot?: { dispose(cb: () => void): void } }).hot;
  if (hot) {
    hot.dispose(() => {
      discovery?.stop();
      void shutdownActiveNode();
    });
  }
}

export async function initPresence(): Promise<PresenceManager> {
  await shutdownActiveNode();

  const peers = new Map<string, PeerPresence>();
  let myEndpointId = "";
  let myColor = "#888";
  let session: import("presence-wasm").Session;
  let sender: import("presence-wasm").SessionSender;
  let onPeersChanged: (() => void) | null = null;
  let latestBounds: Bounds | null = null;
  let merging = false;

  const notify = () => onPeersChanged?.();

  const wasm = await import("presence-wasm");
  const node = await wasm.PresenceNode.spawn();
  activeNode = node;

  myEndpointId = node.endpoint_id();
  myColor = colorForEndpoint(myEndpointId);

  const siblingsPromise = discoverSiblingEndpoints(myEndpointId);
  const initialDiscovery = await runInitialDiscovery(myEndpointId);
  const discovery = initialDiscovery.discovery;
  bindLifecycle(node, discovery);

  const siblings = await siblingsPromise;
  let mesh: MeshState = initialDiscovery.mesh;
  const bootstrapIds = mergeBootstrapIds(
    myEndpointId,
    initialDiscovery.bootstrapEndpointIds,
    siblings,
  );

  session = await node.join_mesh(mesh.meshId, bootstrapIds);
  sender = session.sender;
  let eventReader = session.receiver.getReader();

  await discovery.startAdvertising();

  discovery.onOlderMesh((older: MeshCandidate) => {
    void attemptMerge(older);
  });

  async function attemptMerge(older: MeshCandidate): Promise<void> {
    if (merging || older.meshFormedAt >= mesh.meshFormedAt) return;
    merging = true;
    try {
      const bootstrap = mergeBootstrapIds(
        myEndpointId,
        discovery.bootstrapForMesh(older.meshId),
        await discoverSiblingEndpoints(myEndpointId),
      );
      const nextSession = await node.join_mesh(older.meshId, bootstrap);
      eventReader.cancel().catch(() => {});
      session = nextSession;
      sender = nextSession.sender;
      eventReader = nextSession.receiver.getReader();
      mesh = {
        meshId: older.meshId,
        meshFormedAt: older.meshFormedAt,
      };
      discovery.adoptMesh(mesh);
      peers.clear();
      pumpEvents();
      notify();
      if (latestBounds) {
        await sender.broadcast_presence(
          latestBounds.reMin,
          latestBounds.reMax,
          latestBounds.imMin,
          latestBounds.imMax,
          myColor,
        );
      }
    } catch (err) {
      console.warn("mesh merge failed:", err);
    } finally {
      merging = false;
    }
  }

  function pumpEvents(): void {
    const pump = async () => {
      try {
        while (true) {
          const { value, done } = await eventReader.read();
          if (done) break;
          if (!value) continue;
          handleEvent(value, peers, myEndpointId, notify);
        }
      } catch (err) {
        console.warn("presence event stream ended:", err);
      }
    };
    pump();
  }

  pumpEvents();
  notify();

  return {
    get peers() {
      return peers;
    },
    get myEndpointId() {
      return myEndpointId;
    },
    get myColor() {
      return myColor;
    },
    get onPeersChanged() {
      return onPeersChanged;
    },
    set onPeersChanged(cb: (() => void) | null) {
      onPeersChanged = cb;
    },
    async broadcastBounds(bounds: Bounds): Promise<void> {
      latestBounds = bounds;
      try {
        await sender.broadcast_presence(
          bounds.reMin,
          bounds.reMax,
          bounds.imMin,
          bounds.imMax,
          myColor,
        );
      } catch (err) {
        console.warn("broadcast failed:", err);
      }
    },
  };
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
