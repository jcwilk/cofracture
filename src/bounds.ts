export interface Bounds {
  reMin: number;
  reMax: number;
  imMin: number;
  imMax: number;
}

export const CANONICAL_BOUNDS: Bounds = {
  reMin: -2,
  reMax: 2,
  imMin: -2,
  imMax: 2,
};

export function lerpBounds(a: Bounds, b: Bounds, t: number): Bounds {
  return {
    reMin: a.reMin + (b.reMin - a.reMin) * t,
    reMax: a.reMax + (b.reMax - a.reMax) * t,
    imMin: a.imMin + (b.imMin - a.imMin) * t,
    imMax: a.imMax + (b.imMax - a.imMax) * t,
  };
}

export function tileBounds(parent: Bounds, row: number, col: number, gridSize = 8): Bounds {
  const reSpan = (parent.reMax - parent.reMin) / gridSize;
  const imSpan = (parent.imMax - parent.imMin) / gridSize;
  return {
    reMin: parent.reMin + col * reSpan,
    reMax: parent.reMin + (col + 1) * reSpan,
    imMin: parent.imMax - (row + 1) * imSpan,
    imMax: parent.imMax - row * imSpan,
  };
}

export function boundsEqual(a: Bounds, b: Bounds, epsilon = 1e-12): boolean {
  return (
    Math.abs(a.reMin - b.reMin) < epsilon &&
    Math.abs(a.reMax - b.reMax) < epsilon &&
    Math.abs(a.imMin - b.imMin) < epsilon &&
    Math.abs(a.imMax - b.imMax) < epsilon
  );
}

/** True when `outer` fully covers `inner` on the complex plane. */
export function boundsContains(outer: Bounds, inner: Bounds, epsilon = 1e-9): boolean {
  return (
    outer.reMin <= inner.reMin + epsilon &&
    outer.reMax >= inner.reMax - epsilon &&
    outer.imMin <= inner.imMin + epsilon &&
    outer.imMax >= inner.imMax - epsilon
  );
}

/** Outline-only peer highlight when their region matches or surrounds our view. */
export function peerHighlightIsViewOutline(peer: Bounds, view: Bounds): boolean {
  return boundsEqual(peer, view) || boundsContains(peer, view);
}

/** Inverse of `tileBounds` for a single grid cell within `view`. */
export function tileIndexFromBounds(
  bounds: Bounds,
  view: Bounds,
  gridSize = 8,
): { row: number; col: number } {
  const reSpan = view.reMax - view.reMin;
  const imSpan = view.imMax - view.imMin;
  const reMid = (bounds.reMin + bounds.reMax) / 2;
  const imMid = (bounds.imMin + bounds.imMax) / 2;
  const col = Math.round(((reMid - view.reMin) / reSpan) * gridSize - 0.5);
  const row = Math.round(((view.imMax - imMid) / imSpan) * gridSize - 0.5);
  return {
    row: Math.min(gridSize - 1, Math.max(0, row)),
    col: Math.min(gridSize - 1, Math.max(0, col)),
  };
}

export function tileIndexToScreen(
  row: number,
  col: number,
  squareX: number,
  squareY: number,
  squareSize: number,
  gridSize = 8,
): { x: number; y: number; w: number; h: number } {
  const cell = squareSize / gridSize;
  return {
    x: squareX + col * cell,
    y: squareY + row * cell,
    w: cell,
    h: cell,
  };
}
