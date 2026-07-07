import { initPresence } from "./presence";
import { Viewport } from "./viewport";
import "./styles.css";

async function main(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found");

  const canvas = document.createElement("canvas");
  canvas.className = "fractal-canvas";
  app.appendChild(canvas);

  const viewport = new Viewport(canvas);
  viewport.resize();
  viewport.bindInput();
  window.addEventListener("resize", () => viewport.resize());

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
