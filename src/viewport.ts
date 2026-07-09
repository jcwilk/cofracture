import {
  CANONICAL_BOUNDS,
  boundsEqual,
  lerpBounds,
  peerHighlightIsViewOutline,
  tileBounds,
  type Bounds,
} from "./bounds";
import { ZOOM_DURATION_MS, easeInCubic } from "./easing";
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
import { tileBaseJitter, tileWanderOffset } from "./tile-style";

const GRID_SIZE = 8;
const TILE_GAP = 3;
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
  private onZoomAnimation:
    | ((active: boolean, zoomIn: boolean, easedT?: number) => void)
    | null = null;
  private fractalCache: FractalRender | null = null;
  private layoutCache: SquareLayout | null = null;
  private peerAnimFrom: Map<string, Bounds> = new Map();
  private peerAnimStart: Map<string, number> = new Map();
  private peerDisplayed: Map<string, Bounds> = new Map();
  private peerTargets: Map<string, Bounds> = new Map();
  private peerAnimLoopActive = false;
  /** Continuous idle redraw so macro-tile wander stays live. */
  private idleLoopActive = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.startIdleLoop();
  }

  private startIdleLoop(): void {
    if (this.idleLoopActive) return;
    this.idleLoopActive = true;
    const loop = (): void => {
      if (!this.animating) this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
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

  setOnZoomAnimation(cb: (active: boolean, zoomIn: boolean, easedT?: number) => void): void {
    this.onZoomAnimation = cb;
  }

  getBounds(): Bounds {
    return { ...this.bounds };
  }

  canZoomOut(): boolean {
    return this.parentStack.length > 0 && !this.animating;
  }

  setPeers(peers: Map<string, PeerPresence>): void {
    const now = performance.now();
    this.peers = peers;

    for (const [id, peer] of peers) {
      const prevTarget = this.peerTargets.get(id);
      if (prevTarget === undefined) {
        this.peerDisplayed.set(id, { ...peer.bounds });
        this.peerAnimFrom.delete(id);
        this.peerAnimStart.delete(id);
      } else if (!boundsEqual(prevTarget, peer.bounds)) {
        const from = this.peerAnimStart.has(id)
          ? this.interpolatePeerBounds(id, now)
          : (this.peerDisplayed.get(id) ?? peer.bounds);
        this.peerAnimFrom.set(id, { ...from });
        this.peerAnimStart.set(id, now);
      }
      this.peerTargets.set(id, { ...peer.bounds });
    }

    for (const id of this.peerTargets.keys()) {
      if (!peers.has(id)) {
        this.peerTargets.delete(id);
        this.peerAnimFrom.delete(id);
        this.peerAnimStart.delete(id);
        this.peerDisplayed.delete(id);
      }
    }

    this.schedulePeerAnimation();
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
    clearZoomBackground();
    this.invalidateFractalCache();
    this.draw();
  }

  computeSquareLayout(): SquareLayout {
    if (this.layoutCache) return this.layoutCache;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Snap to a multiple of 64 so each nested glass face gets the same integer CSS pixel width
    // (avoids periodic bright columns from soft-edge beat against uneven px/cell).
    const raw = Math.min(w, h);
    const size = Math.max(64, Math.round(raw / 64) * 64);
    this.layoutCache =
      w < h ? { x: 0, y: (h - size) / 2, size } : { x: (w - size) / 2, y: 0, size };
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
      const rawT = Math.min(1, (performance.now() - this.animStart) / ZOOM_DURATION_MS);
      const eased = easeInCubic(rawT);
      // Zoom-in: linear wall-clock progress; fly-apart easing (move/scale) lives in the shader.
      // Zoom-out: cubic ease + existing single-tile reverse path (no fly-apart).
      const progress = this.animZoomIn ? rawT : eased;
      const tileT = this.animZoomIn ? progress : 1 - eased;
      const tile = this.tileRectForZoom(layout.size, tileT);
      const pickupTile = this.tileRectForZoom(layout.size, 0);
      this.onZoomAnimation?.(true, this.animZoomIn, progress);
      const frame = renderZoomFractal(
        layout.size,
        layout.size,
        this.animFrom,
        this.animTo,
        tile,
        pickupTile,
        progress,
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
    const now = performance.now();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const jitter = tileBaseJitter(row, col);
        const wander = tileWanderOffset(row, col, now);
        const destX = col * cell + halfGap + jitter.x + wander.x;
        const destY = row * cell + halfGap + jitter.y + wander.y;
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

  private interpolatePeerBounds(id: string, now: number): Bounds {
    const from = this.peerAnimFrom.get(id);
    const start = this.peerAnimStart.get(id);
    const target = this.peers.get(id)?.bounds;
    if (!from || start === undefined || !target) {
      return target ?? from ?? { ...CANONICAL_BOUNDS };
    }

    const rawT = Math.min(1, (now - start) / ZOOM_DURATION_MS);
    const t = easeInCubic(rawT);
    if (rawT >= 1) {
      this.peerAnimFrom.delete(id);
      this.peerAnimStart.delete(id);
      this.peerDisplayed.set(id, { ...target });
      return target;
    }
    return lerpBounds(from, target, t);
  }

  private hasActivePeerAnimations(now = performance.now()): boolean {
    for (const [id, start] of this.peerAnimStart) {
      if (!this.peers.has(id)) continue;
      if ((now - start) / ZOOM_DURATION_MS < 1) return true;
    }
    return false;
  }

  private schedulePeerAnimation(): void {
    if (this.peerAnimLoopActive) return;
    if (!this.hasActivePeerAnimations()) {
      if (!this.animating) this.draw();
      return;
    }
    this.peerAnimLoopActive = true;
    const loop = (): void => {
      if (!this.animating) this.draw();
      if (!this.hasActivePeerAnimations()) {
        this.peerAnimLoopActive = false;
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private drawPeerHighlights(layout: SquareLayout, viewBounds: Bounds): void {
    const now = performance.now();
    for (const [id, peer] of this.peers) {
      const bounds = this.peerAnimStart.has(id)
        ? this.interpolatePeerBounds(id, now)
        : (this.peerDisplayed.get(id) ?? peer.bounds);

      if (!this.peerAnimStart.has(id)) {
        this.peerDisplayed.set(id, { ...bounds });
      }

      const outlineOnly = peerHighlightIsViewOutline(bounds, viewBounds);
      const rect = outlineOnly
        ? { x: 0, y: 0, w: layout.size, h: layout.size }
        : boundsToScreen(bounds, viewBounds, 0, 0, layout.size);

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
    this.onZoomAnimation?.(true, true);
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
    this.onZoomAnimation?.(true, false);
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
      this.onZoomAnimation?.(false, this.animZoomIn);
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
