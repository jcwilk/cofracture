import { describe, expect, it } from "vitest";
import {
  applyJitter,
  calculateAdvertiseInterval,
  calculateBackoffMultiplier,
  recordAdvertisement,
  selectOldestMesh,
  shouldAcceptAdvertisement,
  type MeshAdvertisement,
  type MeshCandidate,
} from "./mesh-discovery";

function sampleAd(overrides: Partial<MeshAdvertisement> = {}): MeshAdvertisement {
  return {
    endpoint_id: "endpoint-a",
    mesh_id: "mesh-a",
    mesh_formed_at: 1_000,
    seq: 1,
    ...overrides,
  };
}

describe("mesh discovery seq validation", () => {
  it("discards stale or equal sequence numbers from the same advertiser", () => {
    expect(shouldAcceptAdvertisement(sampleAd({ seq: 2 }), 2)).toBe(false);
    expect(shouldAcceptAdvertisement(sampleAd({ seq: 1 }), 2)).toBe(false);
    expect(shouldAcceptAdvertisement(sampleAd({ seq: 3 }), 2)).toBe(true);
  });

  it("tracks the latest accepted sequence per endpoint", () => {
    const lastSeq = new Map<string, number>();
    const meshes = new Map<string, MeshCandidate>();
    const now = Date.now();

    recordAdvertisement(sampleAd({ seq: 1 }), lastSeq, meshes, now);
    recordAdvertisement(sampleAd({ seq: 1 }), lastSeq, meshes, now);
    recordAdvertisement(sampleAd({ seq: 2 }), lastSeq, meshes, now);

    expect(lastSeq.get("endpoint-a")).toBe(2);
    expect(meshes.get("mesh-a")?.endpoints.get("endpoint-a")?.seq).toBe(2);
  });
});

describe("mesh selection", () => {
  it("selects the mesh with the oldest formation time", () => {
    const now = Date.now();
    const meshes = new Map<string, MeshCandidate>([
      [
        "mesh-new",
        {
          meshId: "mesh-new",
          meshFormedAt: 5_000,
          endpoints: new Map([["e1", { seq: 1, lastSeen: now }]]),
        },
      ],
      [
        "mesh-old",
        {
          meshId: "mesh-old",
          meshFormedAt: 1_000,
          endpoints: new Map([["e2", { seq: 1, lastSeen: now }]]),
        },
      ],
    ]);

    const selected = selectOldestMesh(meshes, now);
    expect(selected?.meshId).toBe("mesh-old");
  });
});

describe("advertise backoff", () => {
  it("widens the interval as advertiser count grows", () => {
    expect(calculateBackoffMultiplier(1)).toBe(1);
    expect(calculateBackoffMultiplier(5)).toBe(1);
    expect(calculateBackoffMultiplier(6)).toBe(2);
    expect(calculateAdvertiseInterval(10)).toBe(4_000);
  });

  it("applies ±10% jitter around the base interval", () => {
    const base = 2_000;
    for (let i = 0; i < 20; i++) {
      const jittered = applyJitter(base, () => 0.5);
      expect(jittered).toBe(base);
    }

    expect(applyJitter(2_000, () => 0)).toBe(1_800);
    expect(applyJitter(2_000, () => 1)).toBe(2_200);
  });
});
