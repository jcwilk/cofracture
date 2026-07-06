import type { Bounds } from "./bounds";
import { iterColor, mandelbrotIter, MAX_ITER } from "./mandelbrot-math";
import { MandelbrotGlRenderer, type TileRect } from "./mandelbrot-gl";

export interface FractalRender {
  canvas: HTMLCanvasElement;
  bounds: Bounds;
  width: number;
  height: number;
}

export type { TileRect };

let glRenderer: MandelbrotGlRenderer | null | undefined;

function getGlRenderer(): MandelbrotGlRenderer | null {
  if (glRenderer === undefined) {
    glRenderer = MandelbrotGlRenderer.tryCreate();
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

function renderFractalCpu(width: number, height: number, bounds: Bounds): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const reSpan = bounds.reMax - bounds.reMin;
  const imSpan = bounds.imMax - bounds.imMin;

  for (let py = 0; py < height; py++) {
    const im = bounds.imMax - (py / height) * imSpan;
    for (let px = 0; px < width; px++) {
      const re = bounds.reMin + (px / width) * reSpan;
      const iter = mandelbrotIter(re, im);
      const idx = (py * width + px) * 4;
      const [r, g, b] = iterColor(iter);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function renderZoomFractalCpu(
  width: number,
  height: number,
  boundsFrom: Bounds,
  boundsTo: Bounds,
  tile: TileRect,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const fromReSpan = boundsFrom.reMax - boundsFrom.reMin;
  const fromImSpan = boundsFrom.imMax - boundsFrom.imMin;
  const toReSpan = boundsTo.reMax - boundsTo.reMin;
  const toImSpan = boundsTo.imMax - boundsTo.imMin;
  const tileR = tile.x + tile.w;
  const tileB = tile.y + tile.h;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let re: number;
      let im: number;

      if (px >= tile.x && px < tileR && py >= tile.y && py < tileB) {
        const u = (px - tile.x) / tile.w;
        const v = (py - tile.y) / tile.h;
        re = boundsTo.reMin + u * toReSpan;
        im = boundsTo.imMax - v * toImSpan;
      } else {
        re = boundsFrom.reMin + (px / width) * fromReSpan;
        im = boundsFrom.imMax - (py / height) * fromImSpan;
      }

      const iter = mandelbrotIter(re, im);
      const idx = (py * width + px) * 4;
      const [r, g, b] = iterColor(iter);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Render the Mandelbrot set for bounds into an owned offscreen bitmap. */
export function renderFractal(
  width: number,
  height: number,
  bounds: Bounds,
): FractalRender {
  const gl = getGlRenderer();
  const live = gl
    ? gl.render(width, height, bounds)
    : renderFractalCpu(width, height, bounds);
  const canvas = retainCanvas(live, width, height);
  return { canvas, bounds: { ...bounds }, width, height };
}

/** Bake pre-zoom background on GPU (call once when a zoom starts). */
export function prepareZoomBackground(
  width: number,
  height: number,
  bounds: Bounds,
): void {
  getGlRenderer()?.cacheZoomBackground(width, height, bounds);
}

export function clearZoomBackground(): void {
  getGlRenderer()?.clearZoomBackground();
}

/** Single-pass zoom frame: background sampled from GPU texture, tile computed live. */
export function renderZoomFractal(
  width: number,
  height: number,
  boundsFrom: Bounds,
  boundsTo: Bounds,
  tile: TileRect,
): HTMLCanvasElement {
  const gl = getGlRenderer();
  if (gl) {
    return gl.renderZoom(width, height, boundsFrom, boundsTo, tile);
  }
  return renderZoomFractalCpu(width, height, boundsFrom, boundsTo, tile);
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

  const x = squareX + ((bounds.reMin - viewBounds.reMin) / reSpan) * squareSize;
  const w = ((bounds.reMax - bounds.reMin) / reSpan) * squareSize;
  const y = squareY + ((viewBounds.imMax - bounds.imMax) / imSpan) * squareSize;
  const h = ((bounds.imMax - bounds.imMin) / imSpan) * squareSize;

  return { x, y, w, h };
}
