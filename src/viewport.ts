import {
  CANONICAL_BOUNDS,
  boundsEqual,
  peerHighlightIsViewOutline,
  tileBounds,
  type Bounds,
} from "./bounds";
import {
  boundsToScreen,
  clearZoomBackground,
  drawFractal,
  prepareZoomBackground,
  renderFractal,
  renderZoomFractal,
  type FractalRender,
} from "./mandelbrot";
import type { PeerPresence } from "./presence";

const GRID_SIZE = 8;
const ZOOM_DURATION_MS = 250;

export interface SquareLayout {
  x: number;
  y: number;
  size: number;
}

export class Viewport {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bounds: Bounds = { ...CANONICAL_BOUNDS };
  private animating = false;
  private animStart = 0;
  private animFrom: Bounds = { ...CANONICAL_BOUNDS };
  private animTo: Bounds = { ...CANONICAL_BOUNDS };
  private animRow = 0;
  private animCol = 0;
  private peers: Map<string, PeerPresence> = new Map();
  private onBoundsChanged: ((bounds: Bounds) => void) | null = null;
  private fractalCache: FractalRender | null = null;
  private layoutCache: SquareLayout | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
  }

  setOnBoundsChanged(cb: (bounds: Bounds) => void): void {
    this.onBoundsChanged = cb;
  }

  getBounds(): Bounds {
    return { ...this.bounds };
  }

  setPeers(peers: Map<string, PeerPresence>): void {
    this.peers = peers;
    this.draw();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layoutCache = null;
    this.invalidateFractalCache();
    this.draw();
  }

  computeSquareLayout(): SquareLayout {
    if (this.layoutCache) return this.layoutCache;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.layoutCache =
      w < h ? { x: 0, y: (h - w) / 2, size: w } : { x: (w - h) / 2, y: 0, size: h };
    return this.layoutCache;
  }

  private tileRectForZoom(size: number, t: number): { x: number; y: number; w: number; h: number } {
    const cell = size / GRID_SIZE;
    const startX = this.animCol * cell;
    const startY = this.animRow * cell;
    const startCx = startX + cell / 2;
    const startCy = startY + cell / 2;
    const cx = startCx + (size / 2 - startCx) * t;
    const cy = startCy + (size / 2 - startCy) * t;
    const destW = cell + (size - cell) * t;
    const destH = cell + (size - cell) * t;
    return { x: cx - destW / 2, y: cy - destH / 2, w: destW, h: destH };
  }

  draw(): void {
    const layout = this.computeSquareLayout();
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.translate(layout.x, layout.y);

    if (this.animating) {
      const t = Math.min(1, (performance.now() - this.animStart) / ZOOM_DURATION_MS);
      const tile = this.tileRectForZoom(layout.size, t);
      const frame = renderZoomFractal(layout.size, layout.size, this.animFrom, this.animTo, tile);
      this.ctx.drawImage(frame, 0, 0, layout.size, layout.size);
      this.drawGrid(layout);
    } else {
      this.ensureFractalCache(this.bounds, layout.size);
      if (this.fractalCache) {
        drawFractal(this.ctx, this.fractalCache, this.bounds, 0, 0, layout.size, layout.size);
      }
      this.drawPeerHighlights(layout, this.bounds);
      this.drawGrid(layout);
    }

    this.ctx.restore();
  }

  private ensureFractalCache(bounds: Bounds, size: number): void {
    const cache = this.fractalCache;
    if (
      cache &&
      cache.width === size &&
      cache.height === size &&
      boundsEqual(cache.bounds, bounds)
    ) {
      return;
    }
    this.fractalCache = renderFractal(size, size, bounds);
  }

  private invalidateFractalCache(): void {
    this.fractalCache = null;
  }

  private drawGrid(layout: SquareLayout): void {
    const cell = layout.size / GRID_SIZE;
    this.ctx.strokeStyle = "rgba(255,255,255,0.25)";
    this.ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      const offset = i * cell;
      this.ctx.beginPath();
      this.ctx.moveTo(offset, 0);
      this.ctx.lineTo(offset, layout.size);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, offset);
      this.ctx.lineTo(layout.size, offset);
      this.ctx.stroke();
    }
  }

  private drawPeerHighlights(layout: SquareLayout, viewBounds: Bounds): void {
    for (const peer of this.peers.values()) {
      const outlineOnly = peerHighlightIsViewOutline(peer.bounds, viewBounds);
      const rect = outlineOnly
        ? { x: 0, y: 0, w: layout.size, h: layout.size }
        : boundsToScreen(peer.bounds, viewBounds, 0, 0, layout.size);

      this.ctx.strokeStyle = peer.color;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      if (!outlineOnly) {
        this.ctx.fillStyle = peer.color + "33";
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
    }
  }

  hitTest(clientX: number, clientY: number): { row: number; col: number } | null {
    if (this.animating) return null;
    const layout = this.computeSquareLayout();
    const x = clientX - layout.x;
    const y = clientY - layout.y;
    if (x < 0 || y < 0 || x >= layout.size || y >= layout.size) return null;
    const cell = layout.size / GRID_SIZE;
    const col = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(x / cell)));
    const row = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(y / cell)));
    return { row, col };
  }

  selectTile(row: number, col: number): void {
    if (this.animating) return;
    const layout = this.computeSquareLayout();
    const target = tileBounds(this.bounds, row, col, GRID_SIZE);
    this.animFrom = { ...this.bounds };
    this.animTo = target;
    this.animRow = row;
    this.animCol = col;
    prepareZoomBackground(layout.size, layout.size, this.animFrom);
    this.animStart = performance.now();
    this.animating = true;
    this.animate();
  }

  private animate(): void {
    const elapsed = performance.now() - this.animStart;
    const t = Math.min(1, elapsed / ZOOM_DURATION_MS);
    this.draw();
    if (t < 1) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.bounds = { ...this.animTo };
      this.animating = false;
      clearZoomBackground();
      this.invalidateFractalCache();
      this.draw();
      this.onBoundsChanged?.(this.bounds);
    }
  }

  bindInput(): void {
    const handle = (clientX: number, clientY: number) => {
      const hit = this.hitTest(clientX, clientY);
      if (hit) this.selectTile(hit.row, hit.col);
    };

    this.canvas.addEventListener("click", (e) => handle(e.clientX, e.clientY));
    this.canvas.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        if (touch) handle(touch.clientX, touch.clientY);
      },
      { passive: false },
    );
  }
}
