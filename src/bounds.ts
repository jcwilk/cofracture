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
