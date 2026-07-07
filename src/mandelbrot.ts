import type { Bounds } from "./bounds";
import { tileIndexFromBounds, tileIndexToScreen } from "./bounds";

const GRID_SIZE = 8;
import { MandelbrotGlRenderer, type TileRect } from "./mandelbrot-gl";

export interface FractalRender {
  canvas: HTMLCanvasElement;
  bounds: Bounds;
  width: number;
  height: number;
}

export type { TileRect };

let glRenderer: MandelbrotGlRenderer | undefined;

function getGlRenderer(): MandelbrotGlRenderer {
  if (!glRenderer) {
    glRenderer = MandelbrotGlRenderer.create();
  }
  return glRenderer;
}

let cacheCanvas: HTMLCanvasElement | null = null;

function retainCanvas(
  source: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  if (!cacheCanvas) {
    cacheCanvas = document.createElement("canvas");
  }
  if (cacheCanvas.width !== width || cacheCanvas.height !== height) {
    cacheCanvas.width = width;
    cacheCanvas.height = height;
  }
  cacheCanvas.getContext("2d")!.drawImage(source, 0, 0, width, height);
  return cacheCanvas;
}

/** Render the Mandelbrot set for bounds into an owned offscreen bitmap. */
export function renderFractal(
  width: number,
  height: number,
  bounds: Bounds,
): FractalRender {
  const live = getGlRenderer().render(width, height, bounds);
  const canvas = retainCanvas(live, width, height);
  return { canvas, bounds: { ...bounds }, width, height };
}

/** Bake pre-zoom background on GPU (call once when a zoom starts). */
export function prepareZoomBackground(
  width: number,
  height: number,
  bounds: Bounds,
): void {
  getGlRenderer().cacheZoomBackground(width, height, bounds);
}

export function clearZoomBackground(): void {
  getGlRenderer().clearZoomBackground();
}

/** Single-pass zoom frame: background sampled from GPU texture, tile computed live. */
export function renderZoomFractal(
  width: number,
  height: number,
  boundsFrom: Bounds,
  boundsTo: Bounds,
  tile: TileRect,
): HTMLCanvasElement {
  return getGlRenderer().renderZoom(width, height, boundsFrom, boundsTo, tile);
}

/** Blit a sub-region of a cached fractal bitmap (respects canvas transforms). */
export function drawFractal(
  ctx: CanvasRenderingContext2D,
  fractal: FractalRender,
  viewBounds: Bounds,
  destX: number,
  destY: number,
  destWidth: number,
  destHeight: number,
): void {
  const imageBounds = fractal.bounds;
  const reSpan = imageBounds.reMax - imageBounds.reMin;
  const imSpan = imageBounds.imMax - imageBounds.imMin;

  const sx = ((viewBounds.reMin - imageBounds.reMin) / reSpan) * fractal.width;
  const sw = ((viewBounds.reMax - viewBounds.reMin) / reSpan) * fractal.width;
  const sy = ((imageBounds.imMax - viewBounds.imMax) / imSpan) * fractal.height;
  const sh = ((viewBounds.imMax - viewBounds.imMin) / imSpan) * fractal.height;

  ctx.drawImage(fractal.canvas, sx, sy, sw, sh, destX, destY, destWidth, destHeight);
}

export function boundsToScreen(
  bounds: Bounds,
  viewBounds: Bounds,
  squareX: number,
  squareY: number,
  squareSize: number,
): { x: number; y: number; w: number; h: number } {
  const reSpan = viewBounds.reMax - viewBounds.reMin;
  const imSpan = viewBounds.imMax - viewBounds.imMin;
  const reCell = reSpan / GRID_SIZE;
  const imCell = imSpan / GRID_SIZE;

  const wCells = (bounds.reMax - bounds.reMin) / reCell;
  const hCells = (bounds.imMax - bounds.imMin) / imCell;

  // Peer focus is usually a single grid cell — snap to the same grid as hit-testing.
  if (wCells > 0.5 && wCells < 1.5 && hCells > 0.5 && hCells < 1.5) {
    const { row, col } = tileIndexFromBounds(bounds, viewBounds, GRID_SIZE);
    return tileIndexToScreen(row, col, squareX, squareY, squareSize, GRID_SIZE);
  }

  const x = squareX + ((bounds.reMin - viewBounds.reMin) / reSpan) * squareSize;
  const w = ((bounds.reMax - bounds.reMin) / reSpan) * squareSize;
  const y = squareY + ((viewBounds.imMax - bounds.imMax) / imSpan) * squareSize;
  const h = ((bounds.imMax - bounds.imMin) / imSpan) * squareSize;

  return { x, y, w, h };
}
