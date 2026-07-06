import {
  CANONICAL_BOUNDS,
  lerpBounds,
  tileBounds,
  type Bounds,
} from "./bounds";
import { boundsToScreen, renderMandelbrot } from "./mandelbrot";
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
  private peers: Map<string, PeerPresence> = new Map();
  private onBoundsChanged: ((bounds: Bounds) => void) | null = null;

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
    this.draw();
  }

  computeSquareLayout(): SquareLayout {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < h) {
      return { x: 0, y: (h - w) / 2, size: w };
    }
    return { x: (w - h) / 2, y: 0, size: h };
  }

  draw(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, w, h);

    const layout = this.computeSquareLayout();
    const displayBounds = this.animating
      ? lerpBounds(
          this.animFrom,
          this.animTo,
          Math.min(1, (performance.now() - this.animStart) / ZOOM_DURATION_MS),
        )
      : this.bounds;

    this.ctx.save();
    this.ctx.translate(layout.x, layout.y);

    renderMandelbrot(this.ctx, layout.size, layout.size, displayBounds);
    this.drawPeerHighlights(layout, displayBounds);
    this.drawGrid(layout);

    this.ctx.restore();
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
      const rect = boundsToScreen(peer.bounds, viewBounds, 0, 0, layout.size);
      this.ctx.strokeStyle = peer.color;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      this.ctx.fillStyle = peer.color + "33";
      this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  }

  hitTest(clientX: number, clientY: number): { row: number; col: number } | null {
    if (this.animating) return null;
    const layout = this.computeSquareLayout();
    const x = clientX - layout.x;
    const y = clientY - layout.y;
    if (x < 0 || y < 0 || x >= layout.size || y >= layout.size) return null;
    const col = Math.floor((x / layout.size) * GRID_SIZE);
    const row = Math.floor((y / layout.size) * GRID_SIZE);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  selectTile(row: number, col: number): void {
    if (this.animating) return;
    const target = tileBounds(this.bounds, row, col, GRID_SIZE);
    this.animFrom = { ...this.bounds };
    this.animTo = target;
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
