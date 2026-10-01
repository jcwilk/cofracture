import type { Bounds } from "./bounds";

/** Matches the mesh cap and the compiled coloring-window slots. */
export const COLORING_SLOTS = 16;
export const ORBIT_ITERATIONS = 128;
/** Shorter-arc cutoff: nearly opposite hues do not slide toward a midpoint. */
export const COMPLEMENT_ARC = 150 / 360;
export const SATURATION_FLOOR = 0.85;
/** Lifts a single harmonic entry into a clearly visible shade. */
export const BRIGHTNESS_GAMMA = 0.42;

export function harmonicNumber(n: number): number {
  let sum = 0;
  for (let k = 0; k < n; k++) sum += 1 / (1 + k);
  return sum;
}

export const HARMONIC_FULL = harmonicNumber(ORBIT_ITERATIONS);

const BAILOUT = 2;

export interface ColoringWindow {
  bounds: Bounds;
  /** Hue in turns, 0–1. */
  hue: number;
  saturation: number;
}

export interface OrbitColor {
  r: number;
  g: number;
  b: number;
  a: number;
  /** Harmonic weight per slot, length COLORING_SLOTS. */
  weights: number[];
}

export function missesBailoutDisk(bounds: Bounds): boolean {
  const re = clamp(0, bounds.reMin, bounds.reMax);
  const im = clamp(0, bounds.imMin, bounds.imMax);
  return re * re + im * im > BAILOUT * BAILOUT;
}

export function coversBailoutSquare(bounds: Bounds): boolean {
  return (
    bounds.reMin <= -BAILOUT &&
    bounds.reMax >= BAILOUT &&
    bounds.imMin <= -BAILOUT &&
    bounds.imMax >= BAILOUT
  );
}

export function hexToHueSat(hex: string): { hue: number; saturation: number } {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16) / 255;
  const g = Number.parseInt(n.slice(2, 4), 16) / 255;
  const b = Number.parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d > 1e-8) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
    if (hue < 0) hue += 1;
  }
  const saturation = max === 0 ? 0 : d / max;
  return { hue, saturation };
}

export interface PackedWindows {
  rects: Float32Array;
  hs: Float32Array;
  mask: Float32Array;
  bail: Float32Array;
  /** 0 bailout-only local, 1 single window, 2 several windows. */
  path: number;
}

/** Slot 0 is the local window. Windows that miss the bailout disk are masked off. */
export function packColoringWindows(windows: ColoringWindow[]): PackedWindows {
  const rects = new Float32Array(COLORING_SLOTS * 4);
  const hs = new Float32Array(COLORING_SLOTS * 2);
  const mask = new Float32Array(COLORING_SLOTS);
  const bail = new Float32Array(COLORING_SLOTS);
  const count = Math.min(windows.length, COLORING_SLOTS);
  let active = 0;
  for (let i = 0; i < count; i++) {
    const w = windows[i];
    const o = i * 4;
    rects[o] = w.bounds.reMin;
    rects[o + 1] = w.bounds.reMax;
    rects[o + 2] = w.bounds.imMin;
    rects[o + 3] = w.bounds.imMax;
    hs[i * 2] = w.hue;
    hs[i * 2 + 1] = w.saturation;
    const miss = missesBailoutDisk(w.bounds);
    const covers = coversBailoutSquare(w.bounds);
    if (!miss) {
      mask[i] = 1;
      active += 1;
    }
    if (covers) bail[i] = 1;
  }
  let path = 2;
  if (active === 1 && mask[0] === 1) path = bail[0] === 1 ? 0 : 1;
  return { rects, hs, mask, bail, path };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function inside(zRe: number, zIm: number, bounds: Bounds): boolean {
  return (
    zRe >= bounds.reMin &&
    zRe <= bounds.reMax &&
    zIm >= bounds.imMin &&
    zIm <= bounds.imMax
  );
}

/** CPU twin of the fragment coloring rule, used to check hues and brightness. */
export function colorOrbit(cRe: number, cIm: number, windows: ColoringWindow[]): OrbitColor {
  const weights = new Array<number>(COLORING_SLOTS).fill(0);
  const counts = new Array<number>(COLORING_SLOTS).fill(0);
  const active = windows.slice(0, COLORING_SLOTS).map((w) => !missesBailoutDisk(w.bounds));
  const bail = windows.slice(0, COLORING_SLOTS).map((w) => coversBailoutSquare(w.bounds));
  let zRe = 0;
  let zIm = 0;
  let total = 0;
  for (let step = 0; step < ORBIT_ITERATIONS; step++) {
    if (zRe * zRe + zIm * zIm > 4) break;
    for (let i = 0; i < windows.length && i < COLORING_SLOTS; i++) {
      if (!active[i]) continue;
      const hit = bail[i] || inside(zRe, zIm, windows[i].bounds) ? 1 : 0;
      const add = hit / (1 + counts[i]);
      weights[i] += add;
      counts[i] += hit;
      total += add;
    }
    const nextRe = zRe * zRe - zIm * zIm + cRe;
    const nextIm = 2 * zRe * zIm + cIm;
    zRe = nextRe;
    zIm = nextIm;
  }
  if (total <= 0) {
    return { r: 0, g: 0, b: 0, a: 0, weights };
  }
  const { hue, saturation } = mixHue(windows, weights);
  const value = Math.pow(Math.min(1, total / HARMONIC_FULL), BRIGHTNESS_GAMMA);
  const [r, g, b] = hsvToRgb(hue, saturation, value);
  return { r, g, b, a: 1, weights };
}

export function mixHue(
  windows: ColoringWindow[],
  weights: number[],
): { hue: number; saturation: number } {
  let best = -1;
  let second = -1;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] <= 0) continue;
    if (best < 0 || weights[i] > weights[best]) {
      second = best;
      best = i;
    } else if (second < 0 || weights[i] > weights[second]) {
      second = i;
    }
  }
  if (best < 0) return { hue: 0, saturation: 0 };
  const lead = windows[best];
  if (second < 0) {
    return { hue: lead.hue, saturation: Math.max(SATURATION_FLOOR, lead.saturation) };
  }
  const other = windows[second];
  let dh = other.hue - lead.hue;
  dh -= Math.floor(dh + 0.5);
  let hue = lead.hue;
  if (Math.abs(dh) < COMPLEMENT_ARC) {
    hue = lead.hue + dh * (weights[second] / (weights[best] + weights[second]));
  }
  hue = ((hue % 1) + 1) % 1;
  return {
    hue,
    saturation: Math.max(SATURATION_FLOOR, lead.saturation, other.saturation),
  };
}

/** Same mapping as the fragment shader's `hsv2rgb`. */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const channel = (offset: number): number => {
    let x = (h + offset) % 1;
    if (x < 0) x += 1;
    const p = Math.abs(x * 6 - 3);
    const clamped = Math.min(1, Math.max(0, p - 1));
    return v * (1 - s * (1 - clamped));
  };
  return [channel(0), channel(2 / 3), channel(1 / 3)];
}

export function saturationOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 1e-8) return 0;
  return (max - min) / max;
}
