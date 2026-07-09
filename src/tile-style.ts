/** Stable per-tile layout jitter so the idle grid feels loosely arranged. */
export function tileBaseJitter(row: number, col: number): { x: number; y: number } {
  const n = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
  const f = n - Math.floor(n);
  const m = Math.sin(row * 39.346 + col * 11.135) * 23421.631;
  const g = m - Math.floor(m);
  return {
    x: (f - 0.5) * 2.4,
    y: (g - 0.5) * 2.4,
  };
}

/** Slow independent drift on top of base jitter. Amplitude in CSS px. */
export function tileWanderOffset(
  row: number,
  col: number,
  timeMs: number,
): { x: number; y: number } {
  const phase = row * 1.7 + col * 2.3;
  const t = timeMs / 1000;
  return {
    x: Math.sin(t * 0.31 + phase) * 1.1 + Math.sin(t * 0.17 + phase * 1.4) * 0.45,
    y: Math.cos(t * 0.27 + phase * 0.9) * 1.1 + Math.cos(t * 0.19 + phase * 1.1) * 0.45,
  };
}

/** Combined idle offset for one macro cell — shared by canvas idle and zoom uniforms. */
export function tileMacroOffset(
  row: number,
  col: number,
  timeMs: number,
): { x: number; y: number } {
  const jitter = tileBaseJitter(row, col);
  const wander = tileWanderOffset(row, col, timeMs);
  return { x: jitter.x + wander.x, y: jitter.y + wander.y };
}

const MACRO_OFFSET_PACK = new Float32Array(64 * 2);

/** Pack 8×8 macro offsets as [x0,y0,x1,y1,…] (reuses one buffer). */
export function packMacroOffsets(timeMs: number): Float32Array {
  const out = MACRO_OFFSET_PACK;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const o = tileMacroOffset(row, col, timeMs);
      const i = (row * 8 + col) * 2;
      out[i] = o.x;
      out[i + 1] = o.y;
    }
  }
  return out;
}
