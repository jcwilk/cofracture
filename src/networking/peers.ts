import type { Bounds } from "../bounds";

export interface PeerPresence {
  endpointId: string;
  bounds: Bounds;
  color: string;
  lastSeen: number;
}

/** Drop a peer after this long without a presence share (heartbeats are 5s). */
export const PEER_STALE_MS = 15_000;

/** Identity persisted by earlier experiments. A run must not read it. */
export const STORED_ENDPOINT_SECRET_KEY = "cofracture-endpoint-secret";

export function discardStoredEndpointSecret(): void {
  try {
    globalThis.sessionStorage?.removeItem(STORED_ENDPOINT_SECRET_KEY);
  } catch {
    // storage unavailable
  }
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

/** Stable map key for an endpoint id (hex string or raw 32 bytes). */
export function endpointKey(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    const trimmed = value.trim().toLowerCase();
    const wrapped = /^publickey\(([0-9a-f]+)\)$/.exec(trimmed);
    const hex = wrapped ? wrapped[1] : trimmed;
    return hex.length > 0 ? hex : null;
  }
  let list: ArrayLike<number> | null = null;
  if (value instanceof Uint8Array) list = value;
  else if (ArrayBuffer.isView(value)) {
    list = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  } else if (Array.isArray(value)) list = value;
  if (!list || list.length === 0) return null;
  let hex = "";
  for (let i = 0; i < list.length; i++) {
    const byte = list[i];
    if (typeof byte !== "number" || !Number.isInteger(byte) || byte < 0 || byte > 255) return null;
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

/** Fingerprint color. Only the public identity is an input. */
export function colorForEndpoint(endpointId: string): string {
  const key = endpointKey(endpointId) ?? endpointId;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function isFreshPeer(peer: PeerPresence, now = Date.now()): boolean {
  return now - peer.lastSeen < PEER_STALE_MS;
}

/** Removes peers that stopped sharing. Returns the ids removed. */
export function pruneStalePeers(
  peers: Map<string, PeerPresence>,
  now = Date.now(),
): string[] {
  const removed: string[] = [];
  for (const [id, peer] of peers) {
    if (!isFreshPeer(peer, now)) {
      peers.delete(id);
      removed.push(id);
    }
  }
  return removed;
}
