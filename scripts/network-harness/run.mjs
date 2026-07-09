/**
 * Headless multi-peer network harness (L2).
 *
 * Spawns Vite if needed, drives Playwright pages against peer.html (no Mandelbrot UI),
 * and fails the process when lifecycle/teardown gates observe uncaught networking errors.
 *
 * Usage:
 *   node scripts/network-harness/run.mjs
 *   node scripts/network-harness/run.mjs --scenario=teardown-gates
 *   COFRACTURE_URL=http://localhost:5173/cofracture/ node scripts/network-harness/run.mjs
 *
 * Exit 0 = all selected scenarios passed.
 * Exit 1 = failure (policy/session/transport classified in output).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { setTimeout as delay } from "node:timers/promises";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BASE = process.env.COFRACTURE_URL ?? "http://127.0.0.1:5173/cofracture/";
const scenarioArg = process.argv.find((a) => a.startsWith("--scenario="));
const SCENARIO = scenarioArg ? scenarioArg.slice("--scenario=".length) : "all";
const KEEP_SERVER = process.env.COFRACTURE_KEEP_SERVER === "1";

function classifyFailure(result) {
  if (!result) return "unknown";
  if (result.layer) return result.layer;
  if (result.gate) return "transport";
  return "session";
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await delay(250);
  }
  throw new Error(`server not ready: ${url}`);
}

async function ensureDevServer() {
  if (process.env.COFRACTURE_URL) {
    await waitForServer(new URL("scripts/network-harness/peer.html", BASE).href);
    return null;
  }

  const child = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    detached: true,
  });

  let output = "";
  child.stdout.on("data", (buf) => {
    output += buf.toString();
  });
  child.stderr.on("data", (buf) => {
    output += buf.toString();
  });

  const shutdown = () => {
    try {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
    } catch {
      try {
        child.kill("SIGTERM");
      } catch {
        // already gone
      }
    }
  };

  try {
    await waitForServer(new URL("scripts/network-harness/peer.html", BASE).href);
  } catch (err) {
    shutdown();
    throw new Error(`${err.message}\n--- vite output ---\n${output.slice(-2000)}`);
  }
  child.shutdown = shutdown;
  return child;
}

async function openPeer(browser, label) {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => {
    pageErrors.push({
      label,
      message: err?.message ? String(err.message) : String(err),
      stack: err?.stack ? String(err.stack) : "",
    });
  });
  const url = new URL("scripts/network-harness/peer.html", BASE).href;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => window.__networkHarness, null, { timeout: 60_000 });
  return { page, pageErrors, label };
}

function mergePageErrors(result, pageErrors) {
  if (!pageErrors.length) return result;
  const networking = pageErrors.filter((e) =>
    /removeListener|webtorrent|destroyed|torrent|tracker|mesh discovery|presence|iroh|null/i.test(
      e.message,
    ),
  );
  if (!networking.length) return result;
  return {
    ...result,
    ok: false,
    networkingErrors: [...(result.networkingErrors ?? []), ...networking],
    pageErrors: networking,
  };
}

async function runOnPeer(browser, name, fn) {
  const { page, pageErrors } = await openPeer(browser, name);
  try {
    const result = await fn(page);
    return mergePageErrors(result, pageErrors);
  } finally {
    await page.close().catch(() => undefined);
  }
}

const scenarios = {
  async "two-peer-discovery"(browser) {
    return runOnPeer(browser, "two-peer", (page) =>
      page.evaluate(() => window.__networkHarness.runTwoPeerDiscovery()),
    );
  },

  async "overlapping-stop"(browser) {
    return runOnPeer(browser, "overlap", (page) =>
      page.evaluate(() =>
        window.__networkHarness.runConcurrentTeardown({
          peers: 5,
          stopCount: 3,
          warmMs: 1000,
        }),
      ),
    );
  },

  async "rapid-restart"(browser) {
    return runOnPeer(browser, "restart", (page) =>
      page.evaluate(() => window.__networkHarness.runRapidRestart({ cycles: 10, warmMs: 150 })),
    );
  },

  /** Gate: concurrent-peer teardown uncaught errors */
  async "concurrent-peer-teardown"(browser) {
    return runOnPeer(browser, "concurrent-teardown", (page) =>
      page.evaluate(() =>
        window.__networkHarness.runConcurrentTeardown({
          peers: 6,
          stopCount: 3,
          warmMs: 1200,
          settleMs: 500,
        }),
      ),
    );
  },

  /** Gate: destroy-during-start */
  async "destroy-during-start"(browser) {
    return runOnPeer(browser, "destroy-during-start", (page) =>
      page.evaluate(() =>
        window.__networkHarness.runDestroyDuringStart({ cycles: 24, maxDelayMs: 50 }),
      ),
    );
  },

  async "session-stop-clears-peers"(browser) {
    return runOnPeer(browser, "session-stop", (page) =>
      page.evaluate(() => window.__networkHarness.runSessionStopClearsPeers()),
    );
  },
};

const TEARDOWN_GATES = ["concurrent-peer-teardown", "destroy-during-start"];
const ALL = [
  "two-peer-discovery",
  "overlapping-stop",
  "rapid-restart",
  ...TEARDOWN_GATES,
  "session-stop-clears-peers",
];

async function main() {
  const selected =
    SCENARIO === "all"
      ? ALL
      : SCENARIO === "teardown-gates"
        ? TEARDOWN_GATES
        : SCENARIO.split(",").map((s) => s.trim());

  for (const name of selected) {
    if (!scenarios[name]) {
      console.error(`unknown scenario: ${name}`);
      console.error(`known: ${Object.keys(scenarios).join(", ")}, all, teardown-gates`);
      process.exit(1);
    }
  }

  const server = await ensureDevServer();
  const browser = await chromium.launch();
  const results = [];
  let failed = false;

  try {
    for (const name of selected) {
      console.log(`\n=== scenario: ${name} ===`);
      const result = await scenarios[name](browser);
      results.push({ name, ...result });
      const status = result?.ok ? "PASS" : "FAIL";
      console.log(status, JSON.stringify(result, null, 2));
      if (!result?.ok) {
        failed = true;
        console.error(
          `failure class: ${classifyFailure(result)} (gate=${result?.gate ?? "n/a"})`,
        );
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
    if (server && !KEEP_SERVER) {
      if (typeof server.shutdown === "function") {
        server.shutdown();
      } else {
        server.kill("SIGTERM");
      }
      await delay(500);
    }
  }

  console.log("\n=== summary ===");
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name} [${classifyFailure(r)}]`);
  }

  if (failed) {
    process.exit(1);
  }
  // Ensure the runner exits even if vite child handles linger briefly.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
