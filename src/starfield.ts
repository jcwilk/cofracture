/** Full-viewport subtle starfield behind the fractal canvas. */
export class Starfield {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: { nx: number; ny: number; r: number; a: number }[] = [];
  private driftX = 0;
  private driftY = 0;
  private rafId = 0;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "starfield-canvas";
    parent.insertBefore(this.canvas, parent.firstChild);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("starfield 2d context unavailable");
    this.ctx = ctx;
    this.seedStars();
    this.resize();
    this.startDrift();
  }

  private seedStars(): void {
    const count = 180;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        nx: Math.random(),
        ny: Math.random(),
        r: 0.4 + Math.random() * 1.1,
        a: 0.12 + Math.random() * 0.28,
      });
    }
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
    this.ctx.fillStyle = "#0a0a12";
    this.ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const x = ((star.nx * w + this.driftX) % w + w) % w;
      const y = ((star.ny * h + this.driftY) % h + h) % h;
      this.ctx.fillStyle = `rgba(200, 210, 230, ${star.a})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, star.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private startDrift(): void {
    const tick = () => {
      this.driftX += 0.008;
      this.driftY += 0.004;
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.canvas.remove();
  }
}
