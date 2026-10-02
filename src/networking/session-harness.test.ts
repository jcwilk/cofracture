import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ActivityRecord } from "./activity";
import { colorForEndpoint } from "./peers";
import { assertActiveRemotes, NetworkingSession } from "./session";

function watch(session: NetworkingSession): ActivityRecord[] {
  const records: ActivityRecord[] = [];
  session.subscribe((record) => records.push(record));
  return records;
}

describe("headless session harness", () => {
  it("starts two session cores without the fractal explorer", async () => {
    const harnessSource = readFileSync(new URL("./session-harness.test.ts", import.meta.url), "utf8");
    const imports = harnessSource.split("\n").filter((line) => line.startsWith("import "));
    expect(imports.join("\n")).not.toMatch(/viewport|mandelbrot|main\.ts/);
    expect(globalThis.document).toBeUndefined();

    const first = new NetworkingSession({ scope: `harness-a-${crypto.randomUUID()}` });
    const second = new NetworkingSession({ scope: `harness-b-${crypto.randomUUID()}` });
    const left = watch(first);
    const right = watch(second);
    try {
      await Promise.all([
        first.start({ listenWindowMs: 150 }),
        second.start({ listenWindowMs: 150 }),
      ]);
      const leftSelf = left.find((record) => record.kind === "self");
      const rightSelf = right.find((record) => record.kind === "self");
      expect(leftSelf?.identity).toBe(first.myEndpointId);
      expect(rightSelf?.identity).toBe(second.myEndpointId);
      expect(leftSelf?.color).toBe(colorForEndpoint(first.myEndpointId));
      expect(rightSelf?.color).toBe(colorForEndpoint(second.myEndpointId));
      expect(first.myEndpointId).not.toBe(second.myEndpointId);
    } finally {
      await first.stop();
      await second.stop();
    }
  });

  it("connects two private-scope instances and forwards a region", async () => {
    const scope = `harness-connect-${crypto.randomUUID()}`;
    const first = new NetworkingSession({ scope });
    const second = new NetworkingSession({ scope });
    const leftEvents = watch(first);
    const rightEvents = watch(second);
    try {
      await Promise.all([
        first.start({ listenWindowMs: 8_000 }),
        second.start({ listenWindowMs: 8_000 }),
      ]);

      await waitFor(() => {
        assertActiveRemotes(first.activeRemoteIds(), [second.myEndpointId]);
        assertActiveRemotes(second.activeRemoteIds(), [first.myEndpointId]);
      }, 20_000);

      const connected = leftEvents.find(
        (record) => record.kind === "connected" && record.identity === second.myEndpointId,
      );
      expect(connected?.color).toBe(colorForEndpoint(second.myEndpointId));
      expect(leftEvents.some((record) => record.kind === "discovered" && record.identity === second.myEndpointId)).toBe(
        true,
      );
      expect(rightEvents.some((record) => record.kind === "connected" && record.identity === first.myEndpointId)).toBe(
        true,
      );
      expect(connected?.kind).toBe("connected");

      const region = { reMin: -1.25, reMax: -0.5, imMin: 0.25, imMax: 1 };
      const deadline = Date.now() + 12_000;
      let matched = false;
      while (Date.now() < deadline) {
        await first.setLocalRegion(region);
        const remote = second.peers.get(first.myEndpointId);
        if (
          remote &&
          remote.bounds.reMin === region.reMin &&
          remote.bounds.reMax === region.reMax &&
          remote.bounds.imMin === region.imMin &&
          remote.bounds.imMax === region.imMax
        ) {
          matched = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      expect(matched).toBe(true);
    } finally {
      await first.stop();
      await second.stop();
    }
  });
});

async function waitFor(check: () => void, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last: unknown;
  while (Date.now() < deadline) {
    try {
      check();
      return;
    } catch (err) {
      last = err;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
