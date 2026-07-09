export const ZOOM_DURATION_MS = 450;

/** Cubic ease-in: slow start, fast finish — used for zoom-out and peer highlight motion. */
export function easeInCubic(t: number): number {
  return t * t * t;
}
