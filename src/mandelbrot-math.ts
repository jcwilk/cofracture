/** Max iterations — also used as "in set" sentinel. */
export const MAX_ITER = 128;

export function mandelbrotIter(re: number, im: number): number {
  let zr = 0;
  let zi = 0;
  let iter = 0;
  while (zr * zr + zi * zi <= 4 && iter < MAX_ITER) {
    const zrNew = zr * zr - zi * zi + re;
    zi = 2 * zr * zi + im;
    zr = zrNew;
    iter++;
  }
  return iter;
}

export function iterColor(iter: number): [number, number, number] {
  if (iter === MAX_ITER) return [0, 0, 0];
  const t = iter / MAX_ITER;
  return [
    Math.floor(9 * (1 - t) * t * t * t * 255),
    Math.floor(15 * (1 - t) * (1 - t) * t * t * 255),
    Math.floor(8.5 * (1 - t) * (1 - t) * (1 - t) * t * 255),
  ];
}
