import type { Bounds } from "./bounds";

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

export type ConnectionStatus = "connecting" | "connected" | "solo";

export interface PresenceManager {
  peers: Map<string, PeerPresence>;
  status: ConnectionStatus;
  myEndpointId: string;
  myColor: string;
  shareUrl: () => string;
  broadcastBounds: (bounds: Bounds) => Promise<void>;
  onPeersChanged: (() => void) | null;
}

const TICKET_PARAM = "ticket";
const JOIN_TIMEOUT_MS = 15_000;

export async function initPresence(): Promise<PresenceManager> {
  const peers = new Map<string, PeerPresence>();
  let status: ConnectionStatus = "connecting";
  let myEndpointId = "";
  let myColor = "#888";
  let session: import("presence-wasm").Session | null = null;
  let sender: import("presence-wasm").SessionSender | null = null;
  let onPeersChanged: (() => void) | null = null;

  const notify = () => onPeersChanged?.();

  try {
    const wasm = await import("presence-wasm");
    const node = await wasm.PresenceNode.spawn();
    myEndpointId = node.endpoint_id();
    myColor = colorForEndpoint(myEndpointId);

    const params = new URLSearchParams(window.location.search);
    const ticketFromUrl = params.get(TICKET_PARAM);

    if (ticketFromUrl) {
      session = await node.join(ticketFromUrl);
    } else {
      session = await node.create();
      updateUrlWithTicket(session);
    }

    sender = session.sender;
    listenForEvents(session, peers, myEndpointId, notify);

    const joined = await waitForJoin(session, JOIN_TIMEOUT_MS);
    status = joined ? "connected" : "solo";
  } catch (err) {
    console.warn("Presence unavailable, solo mode:", err);
    status = "solo";
  }

  notify();

  return {
    get peers() {
      return peers;
    },
    get status() {
      return status;
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
    shareUrl(): string {
      if (!session) return window.location.href;
      const ticket = session.ticket({
        includeMyself: true,
        includeBootstrap: true,
        includeNeighbors: true,
      });
      const url = new URL(window.location.href);
      url.searchParams.set(TICKET_PARAM, ticket);
      return url.toString();
    },
    async broadcastBounds(bounds: Bounds): Promise<void> {
      if (!sender) return;
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

function updateUrlWithTicket(session: import("presence-wasm").Session): void {
  const ticket = session.ticket({
    includeMyself: true,
    includeBootstrap: false,
    includeNeighbors: false,
  });
  const url = new URL(window.location.href);
  url.searchParams.set(TICKET_PARAM, ticket);
  window.history.replaceState({}, "", url.toString());
}

async function waitForJoin(
  session: import("presence-wasm").Session,
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (session.neighbors().length > 0) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return session.neighbors().length > 0;
}

function listenForEvents(
  session: import("presence-wasm").Session,
  peers: Map<string, PeerPresence>,
  myEndpointId: string,
  notify: () => void,
): void {
  const receiver = session.receiver;
  const reader = receiver.getReader();

  const pump = async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        handleEvent(value, peers, myEndpointId, notify);
      }
    } catch (err) {
      console.warn("event stream ended:", err);
    }
  };
  pump();
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
    case "neighborDown": {
      const id = event.endpointId as string;
      peers.delete(id);
      notify();
      break;
    }
    default:
      break;
  }
}
