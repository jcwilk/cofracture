import type { Bounds } from "./bounds";

const MAX_ITER = 256;

export function renderMandelbrot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bounds: Bounds,
): void {
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const re = bounds.reMin + (px / width) * (bounds.reMax - bounds.reMin);
      const im = bounds.imMax - (py / height) * (bounds.imMax - bounds.imMin);

      let zr = 0;
      let zi = 0;
      let iter = 0;
      while (zr * zr + zi * zi <= 4 && iter < MAX_ITER) {
        const zrNew = zr * zr - zi * zi + re;
        zi = 2 * zr * zi + im;
        zr = zrNew;
        iter++;
      }

      const idx = (py * width + px) * 4;
      if (iter === MAX_ITER) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      } else {
        const t = iter / MAX_ITER;
        data[idx] = Math.floor(9 * (1 - t) * t * t * t * 255);
        data[idx + 1] = Math.floor(15 * (1 - t) * (1 - t) * t * t * 255);
        data[idx + 2] = Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255);
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
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
