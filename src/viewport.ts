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
const TILE_GAP = 1;
const NEARLY_SQUARE_THRESHOLD = 0.08;
const ZOOM_OUT_BUTTON_SIZE = 44;

export interface SquareLayout {
  x: number;
  y: number;
  size: number;
}

interface ParentEntry {
  bounds: Bounds;
  row: number;
  col: number;
}

export interface ZoomOutButtonPosition {
  x: number;
  y: number;
  visible: boolean;
}

export class Viewport {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bounds: Bounds = { ...CANONICAL_BOUNDS };
  private parentStack: ParentEntry[] = [];
  private animating = false;
  private animStart = 0;
  private animFrom: Bounds = { ...CANONICAL_BOUNDS };
  private animTo: Bounds = { ...CANONICAL_BOUNDS };
  private animRow = 0;
  private animCol = 0;
  private animZoomIn = true;
  private peers: Map<string, PeerPresence> = new Map();
  private onBoundsChanged: ((bounds: Bounds) => void) | null = null;
  private onZoomOutAvailabilityChanged: ((available: boolean) => void) | null = null;
  private onAnimationComplete: (() => void) | null = null;
  private fractalCache: FractalRender | null = null;
  private layoutCache: SquareLayout | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
  }

  setOnBoundsChanged(cb: (bounds: Bounds) => void): void {
    this.onBoundsChanged = cb;
  }

  setOnZoomOutAvailabilityChanged(cb: (available: boolean) => void): void {
    this.onZoomOutAvailabilityChanged = cb;
  }

  setOnAnimationComplete(cb: () => void): void {
    this.onAnimationComplete = cb;
  }

  getBounds(): Bounds {
    return { ...this.bounds };
  }

  canZoomOut(): boolean {
    return this.parentStack.length > 0 && !this.animating;
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

  computeZoomOutButtonPosition(): ZoomOutButtonPosition {
    const visible = this.canZoomOut();
    if (!visible) return { x: 0, y: 0, visible: false };

    const layout = this.computeSquareLayout();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = Math.max(8, layout.size * 0.02);
    const aspectDelta = Math.abs(w - h) / Math.max(w, h);
    const nearlySquare = aspectDelta < NEARLY_SQUARE_THRESHOLD;

    if (nearlySquare) {
      return { x: margin, y: margin, visible: true };
    }

    if (w < h) {
      const x = layout.x + margin;
      const y = Math.max(margin, layout.y - ZOOM_OUT_BUTTON_SIZE - margin);
      return { x, y, visible: true };
    }

    const x = Math.max(margin, layout.x - ZOOM_OUT_BUTTON_SIZE - margin);
    const y = layout.y + margin;
    return { x, y, visible: true };
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

    this.ctx.clearRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.translate(layout.x, layout.y);

    if (this.animating) {
      const t = Math.min(1, (performance.now() - this.animStart) / ZOOM_DURATION_MS);
      const tileT = this.animZoomIn ? t : 1 - t;
      const tile = this.tileRectForZoom(layout.size, tileT);
      const frame = renderZoomFractal(
        layout.size,
        layout.size,
        this.animFrom,
        this.animTo,
        tile,
        t,
        this.animZoomIn,
      );
      this.ctx.drawImage(frame, 0, 0, layout.size, layout.size);
    } else {
      this.ensureFractalCache(this.bounds, layout.size);
      if (this.fractalCache) {
        this.drawFractalWithGaps(this.fractalCache, this.bounds, layout.size);
      }
      this.drawPeerHighlights(layout, this.bounds);
    }

    this.ctx.restore();
  }

  private drawFractalWithGaps(fractal: FractalRender, viewBounds: Bounds, size: number): void {
    const cell = size / GRID_SIZE;
    const halfGap = TILE_GAP / 2;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const destX = col * cell + halfGap;
        const destY = row * cell + halfGap;
        const destW = cell - TILE_GAP;
        const destH = cell - TILE_GAP;
        const tile = tileBounds(viewBounds, row, col, GRID_SIZE);
        drawFractal(this.ctx, fractal, tile, destX, destY, destW, destH);
      }
    }
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
    this.animZoomIn = true;
    prepareZoomBackground(layout.size, layout.size, this.animFrom);
    this.animStart = performance.now();
    this.animating = true;
    this.animate();
  }

  zoomOut(): void {
    if (this.animating || this.parentStack.length === 0) return;
    const entry = this.parentStack[this.parentStack.length - 1];
    this.parentStack.pop();
    this.notifyZoomOutAvailability();

    this.animFrom = { ...this.bounds };
    this.animTo = { ...entry.bounds };
    this.animRow = entry.row;
    this.animCol = entry.col;
    this.animZoomIn = false;
    clearZoomBackground();
    this.animStart = performance.now();
    this.animating = true;
    this.animate();
  }

  private notifyZoomOutAvailability(): void {
    this.onZoomOutAvailabilityChanged?.(this.canZoomOut());
  }

  private animate(): void {
    const elapsed = performance.now() - this.animStart;
    const t = Math.min(1, elapsed / ZOOM_DURATION_MS);
    this.draw();
    if (t < 1) {
      requestAnimationFrame(() => this.animate());
    } else {
      if (this.animZoomIn) {
        this.parentStack.push({
          bounds: { ...this.animFrom },
          row: this.animRow,
          col: this.animCol,
        });
        this.notifyZoomOutAvailability();
      }
      this.bounds = { ...this.animTo };
      this.animating = false;
      clearZoomBackground();
      this.invalidateFractalCache();
      this.draw();
      this.onBoundsChanged?.(this.bounds);
      this.onAnimationComplete?.();
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
