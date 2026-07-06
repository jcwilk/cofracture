import { initPresence } from "./presence";
import { Viewport } from "./viewport";
import "./styles.css";

async function main(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found");

  const statusBar = document.createElement("div");
  statusBar.className = "status-bar";
  app.appendChild(statusBar);

  const shareBtn = document.createElement("button");
  shareBtn.className = "share-btn";
  shareBtn.textContent = "Share session";
  shareBtn.addEventListener("click", async () => {
    const url = presence.shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = "Link copied!";
      setTimeout(() => {
        shareBtn.textContent = "Share session";
      }, 2000);
    } catch {
      prompt("Copy this link:", url);
    }
  });
  app.appendChild(shareBtn);

  const canvas = document.createElement("canvas");
  canvas.className = "fractal-canvas";
  app.appendChild(canvas);

  const viewport = new Viewport(canvas);
  viewport.resize();
  viewport.bindInput();
  window.addEventListener("resize", () => viewport.resize());

  const presence = await initPresence();

  const updateStatus = () => {
    const label =
      presence.status === "connected"
        ? `Connected · ${presence.peers.size} peer(s)`
        : presence.status === "solo"
          ? "Solo mode"
          : "Connecting…";
    statusBar.textContent = label;
    statusBar.className = `status-bar status-${presence.status}`;
  };

  presence.onPeersChanged = () => {
    viewport.setPeers(presence.peers);
    updateStatus();
  };
  updateStatus();

  viewport.setOnBoundsChanged((bounds) => {
    presence.broadcastBounds(bounds);
  });

  presence.broadcastBounds(viewport.getBounds());
}

main().catch((err) => {
  console.error(err);
  document.body.textContent = `Failed to start: ${err}`;
});
