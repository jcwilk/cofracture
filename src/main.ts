import { initPresence } from "./presence";
import { Starfield } from "./starfield";
import { Viewport } from "./viewport";
import "./styles.css";

function createZoomOutButton(app: HTMLElement, viewport: Viewport): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "zoom-out-btn";
  button.setAttribute("aria-label", "Zoom out");
  button.textContent = "−";
  button.hidden = true;
  app.appendChild(button);

  const updatePosition = (): void => {
    const pos = viewport.computeZoomOutButtonPosition();
    button.hidden = !pos.visible;
    if (pos.visible) {
      button.style.left = `${pos.x}px`;
      button.style.top = `${pos.y}px`;
    }
  };

  button.addEventListener("click", () => {
    viewport.zoomOut();
    updatePosition();
  });

  viewport.setOnZoomOutAvailabilityChanged(() => updatePosition());
  viewport.setOnAnimationComplete(() => updatePosition());
  window.addEventListener("resize", () => updatePosition());
  updatePosition();

  return button;
}

async function main(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found");

  const starfield = new Starfield(app);

  const canvas = document.createElement("canvas");
  canvas.className = "fractal-canvas";
  app.appendChild(canvas);

  const viewport = new Viewport(canvas);
  viewport.setOnZoomAnimation((active, zoomIn, easedT) => {
    starfield.setZoomAnimation(active, zoomIn);
    if (active && easedT !== undefined) {
      starfield.notifyZoomEasedProgress(easedT);
    }
  });
  createZoomOutButton(app, viewport);
  viewport.resize();
  viewport.bindInput();
  window.addEventListener("resize", () => {
    starfield.resize();
    viewport.resize();
  });

  const presence = await initPresence();

  presence.onPeersChanged = () => {
    viewport.setPeers(presence.peers);
  };
  viewport.setPeers(presence.peers);

  viewport.setOnBoundsChanged((bounds) => {
    presence.broadcastBounds(bounds);
  });

  presence.broadcastBounds(viewport.getBounds());
}

main().catch((err) => {
  console.error(err);
  document.body.textContent = `Failed to start: ${err}`;
});
