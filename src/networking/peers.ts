import type { Bounds } from "../bounds";

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
