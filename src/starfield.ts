import { ZOOM_DURATION_MS } from "./easing";

/** Full-viewport starfield behind the fractal canvas — radial outward drift. */
interface Star {
  angle: number;
  /** Distance from screen center in CSS pixels. */
  radius: number;
  r: number;
  a: number;
  /** Outward speed in CSS pixels per frame at 60fps reference. */
  speed: number;
  /** Subtle warm/cool shift (−1 cool blue … +1 warm gold). */
  chroma: number;
}

const ZOOM_STAR_BOOST = 80;
const FRAMES_AT_60 = ZOOM_DURATION_MS / (1000 / 60);

export class Starfield {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private rafId = 0;
  private lastTime = 0;
  private zoomActive = false;
  private radialDirection = 1;
  private lastZoomEased = 0;
  private zoomEasedDelta = 0;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "starfield-canvas";
    parent.insertBefore(this.canvas, parent.firstChild);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("starfield 2d context unavailable");
    this.ctx = ctx;
    this.seedStars();
    this.resize();
    this.lastTime = performance.now();
    this.startAnimation();
  }

  private maxRadius(w: number, h: number): number {
    return Math.hypot(w, h) * 0.55;
  }

  private spawnStar(w: number, h: number, maxR: number): Star {
    return {
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * maxR * 0.15,
      r: 0.5 + Math.random() * 1.4,
      a: 0.4 + Math.random() * 0.55,
      speed: 0.04 + Math.random() * 0.92,
      chroma: (Math.random() - 0.5) * 2,
    };
  }

  private starColor(star: Star): string {
    const c = star.chroma;
    const r = Math.round(210 - c * 28);
    const g = Math.round(225 + c * 12);
    const b = Math.round(255 - c * 38);
    return `rgba(${r}, ${g}, ${b}, ${star.a})`;
  }

  private seedStars(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxR = this.maxRadius(w, h);
    const count = 200;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        ...this.spawnStar(w, h, maxR),
        radius: Math.random() * maxR,
      });
    }
  }

  /** Begin zoom-synced drift; motion follows eased progress via `notifyZoomEasedProgress`. */
  setZoomAnimation(active: boolean, zoomIn: boolean): void {
    if (active) {
      this.zoomActive = true;
      this.radialDirection = zoomIn ? 1 : -1;
      this.lastZoomEased = 0;
      this.zoomEasedDelta = 0;
    } else {
      this.zoomActive = false;
      this.radialDirection = 1;
      this.lastZoomEased = 0;
      this.zoomEasedDelta = 0;
    }
  }

  /** Called each viewport zoom frame with cumulative eased progress in [0, 1]. */
  notifyZoomEasedProgress(eased: number): void {
    if (!this.zoomActive) return;
    this.zoomEasedDelta += eased - this.lastZoomEased;
    this.lastZoomEased = eased;
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

  private draw(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const x = cx + Math.cos(star.angle) * star.radius;
      const y = cy + Math.sin(star.angle) * star.radius;
      this.ctx.fillStyle = this.starColor(star);
      this.ctx.beginPath();
      this.ctx.arc(x, y, star.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private tick(now: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxR = this.maxRadius(w, h);
    const dt = Math.min(32, now - this.lastTime) / (1000 / 60);
    this.lastTime = now;

    const easedDelta = this.zoomEasedDelta;
    this.zoomEasedDelta = 0;
    const zoomMul = this.zoomActive
      ? 1 + (ZOOM_STAR_BOOST - 1) * easedDelta * FRAMES_AT_60
      : 1;

    for (const star of this.stars) {
      const t = star.radius / maxR;
      const step = star.speed * dt * (0.25 + 0.75 * t) * zoomMul;
      star.radius += step * this.radialDirection;

      if (this.radialDirection > 0 && star.radius > maxR) {
        Object.assign(star, this.spawnStar(w, h, maxR));
      } else if (this.radialDirection < 0 && star.radius < 0) {
        star.radius = maxR * (0.85 + Math.random() * 0.15);
      }
    }

    this.draw();
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  private startAnimation(): void {
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.canvas.remove();
  }
}
