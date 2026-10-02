import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { formatActivityLine, type ActivityRecord } from "./activity";
import { colorForEndpoint, STORED_ENDPOINT_SECRET_KEY } from "./peers";
import { announceInScope, PUBLIC_COLLABORATION_SCOPE } from "./scope";
import {
  assertActiveRemotes,
  NetworkingSession,
  startNetworkingSession,
  stopNetworkingSession,
} from "./session";

describe("fingerprint color", () => {
  it("agrees for one identity, including the owner, and can differ for another", () => {
    const identity = "ab".repeat(32);
    const owner = colorForEndpoint(identity);
    const observer = colorForEndpoint(identity.toUpperCase());
    const wrapped = colorForEndpoint(`PublicKey(${identity})`);
    expect(observer).toBe(owner);
    expect(wrapped).toBe(owner);
    const other = colorForEndpoint("hello-peer");
    expect(other).not.toBe(owner);
  });
});

describe("one identity per run", () => {
  it("reuses the running session and ignores a stored secret on a fresh run", async () => {
    const store = new Map<string, string>();
    const secret = "11".repeat(32);
    store.set(STORED_ENDPOINT_SECRET_KEY, secret);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    const wasm = await import("presence-wasm");
    const fromSecret = await wasm.PresenceNode.spawn_with_secret(secret);
    const secretId = fromSecret.endpoint_id();
    await fromSecret.shutdown();

    const scope = `identity-${crypto.randomUUID()}`;
    const lines: string[] = [];
    const info = vi.spyOn(console, "info").mockImplementation((line?: unknown) => {
      if (typeof line === "string" && line.startsWith("presence ")) lines.push(line);
    });

    try {
      const first = await startNetworkingSession({ scope, listenWindowMs: 200 });
      const second = await startNetworkingSession({ scope: `other-${scope}` });
      expect(second).toBe(first);
      expect(second.myEndpointId).toBe(first.myEndpointId);
      expect(second.myEndpointId).not.toBe(secretId);
      expect(store.has(STORED_ENDPOINT_SECRET_KEY)).toBe(false);
      const selfLines = lines.filter((line) => line.startsWith("presence self "));
      expect(selfLines).toHaveLength(1);

      await stopNetworkingSession();
      store.set(STORED_ENDPOINT_SECRET_KEY, secret);
      const fresh = await startNetworkingSession({
        scope: `fresh-${crypto.randomUUID()}`,
        listenWindowMs: 200,
      });
      expect(fresh.myEndpointId).not.toBe(first.myEndpointId);
      expect(fresh.myEndpointId).not.toBe(secretId);
      expect(store.has(STORED_ENDPOINT_SECRET_KEY)).toBe(false);
      await stopNetworkingSession();
    } finally {
      info.mockRestore();
      vi.unstubAllGlobals();
      await stopNetworkingSession();
    }
  });
});

describe("activity records", () => {
  it("delivers each kind to subscribers and the console with identity and color", async () => {
    const scope = `activity-${crypto.randomUUID()}`;
    const session = new NetworkingSession({ scope });
    const records: ActivityRecord[] = [];
    session.subscribe((record) => {
      records.push(record);
    });
    const lines: string[] = [];
    const info = vi.spyOn(console, "info").mockImplementation((line?: unknown) => {
      if (typeof line === "string") lines.push(line);
    });
    try {
      await session.start({ listenWindowMs: 200 });
      const self = records.find((record) => record.kind === "self");
      expect(self?.identity).toBe(session.myEndpointId);
      expect(self?.color).toBe(colorForEndpoint(session.myEndpointId));

      const remote = "ee".repeat(32);
      session.applyTransportEvent({ type: "discovered", endpointId: remote });
      session.applyTransportEvent({ type: "neighborUp", endpointId: `PublicKey(${remote})` });
      session.applyTransportEvent({
        type: "connectFailed",
        endpointId: "ff".repeat(32),
        reason: "dial failed",
      });
      session.applyTransportEvent({ type: "neighborDown", endpointId: remote });

      const kinds = records.map((record) => record.kind);
      expect(kinds).toContain("self");
      expect(kinds).toContain("connected");
      expect(kinds).toContain("connect-failed");
      expect(kinds).toContain("removed");
      expect(new Set(kinds).size).toBeGreaterThanOrEqual(4);

      for (const record of records) {
        expect(record.color).toBe(colorForEndpoint(record.identity));
        expect(lines).toContain(formatActivityLine(record));
      }
      expect(session.activeRemoteIds()).not.toContain("ff".repeat(32));
    } finally {
      info.mockRestore();
      await session.stop();
    }
  });
});

describe("session core regions and scope", () => {
  it("records a delivered region with no document", async () => {
    expect(globalThis.document).toBeUndefined();
    const left = new NetworkingSession({ scope: `region-a-${crypto.randomUUID()}` });
    const right = new NetworkingSession({ scope: `region-b-${crypto.randomUUID()}` });
    try {
      await Promise.all([
        left.start({ listenWindowMs: 100 }),
        right.start({ listenWindowMs: 100 }),
      ]);
      const region = { reMin: -0.5, reMax: 0.25, imMin: 0.1, imMax: 0.4 };
      await left.setLocalRegion(region);
      expect(left.localRegion).toEqual(region);
      right.applyTransportEvent({
        type: "presence",
        from: left.myEndpointId,
        bounds: {
          re_min: region.reMin,
          re_max: region.reMax,
          im_min: region.imMin,
          im_max: region.imMax,
        },
        color: "#000000",
      });
      const seen = right.peers.get(left.myEndpointId);
      expect(seen?.bounds).toEqual(region);
      expect(seen?.color).toBe(colorForEndpoint(left.myEndpointId));
    } finally {
      await left.stop();
      await right.stop();
    }
  });

  it("does not activate a public-scope participant from a private scope", async () => {
    const publicPeer = "aa".repeat(32);
    announceInScope(PUBLIC_COLLABORATION_SCOPE, publicPeer);
    const session = new NetworkingSession({ scope: `private-${crypto.randomUUID()}` });
    const seen: string[] = [];
    session.subscribe((record) => seen.push(record.identity));
    try {
      await session.start({ listenWindowMs: 300 });
      expect(session.getDiscoveryAdapter().isStarted).toBe(false);
      expect(session.scope).not.toBe(PUBLIC_COLLABORATION_SCOPE);
      expect(session.activeRemoteIds()).not.toContain(publicPeer);
      expect(seen).not.toContain(publicPeer);
    } finally {
      await session.stop();
    }
  });

  it("removes a silent participant at 15s and ignores a failed connect", () => {
    let now = 1_000_000;
    const session = new NetworkingSession({ scope: "clock", now: () => now });
    const remote = "12".repeat(32);
    session.applyTransportEvent({
      type: "presence",
      from: remote,
      bounds: { re_min: 0, re_max: 1, im_min: 0, im_max: 1 },
      color: "#fff",
    });
    expect(session.activeRemoteIds()).toEqual([remote]);
    now += 14_999;
    expect(session.pruneAt(now)).toEqual([]);
    now += 1;
    expect(session.pruneAt(now)).toEqual([remote]);
    expect(session.activeRemoteIds()).toEqual([]);

    const failed = "34".repeat(32);
    const before = session.activeRemoteIds();
    session.applyTransportEvent({
      type: "connectFailed",
      endpointId: failed,
      reason: "dial failed",
    });
    expect(session.activeRemoteIds()).toEqual(before);
    session.applyTransportEvent({ type: "neighborDown", endpointId: remote });
  });
});

describe("page wiring", () => {
  it("does not keep a second peer-connection list in the viewport", () => {
    const viewport = readFileSync(new URL("../viewport.ts", import.meta.url), "utf8");
    const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
    expect(viewport).not.toMatch(/join_mesh|neighborUp|startNetworkingSession|MeshDiscovery/);
    expect(main).toMatch(/viewport\.setPeers\(presence\.peers\)/);
    expect(main).toMatch(/presence\.broadcastBounds/);
    expect(main).not.toMatch(/new Map/);
  });
});

describe("active remote assertion", () => {
  it("fails when an outsider or a duplicate identity is active", () => {
    const peer = "ab".repeat(32);
    expect(() => assertActiveRemotes([peer], [peer])).not.toThrow();
    expect(() => assertActiveRemotes([peer, "cd".repeat(32)], [peer])).toThrow(/active remotes/);
    expect(() => assertActiveRemotes([peer, peer], [peer])).toThrow(/active remotes/);
  });
});
