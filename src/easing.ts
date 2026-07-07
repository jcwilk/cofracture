export const ZOOM_DURATION_MS = 250;

/** Cubic ease-in: slow start, fast finish — used for both zoom-in and zoom-out. */
export function easeInCubic(t: number): number {
  return t * t * t;
}
