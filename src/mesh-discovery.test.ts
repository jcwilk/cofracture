import { describe, expect, it } from "vitest";
import {
  applyJitter,
  calculateAdvertiseInterval,
  calculateBackoffMultiplier,
  MESH_CAPACITY,
  meshIsFull,
  recordAdvertisement,
  retainedEndpointIds,
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

  it("joins the oldest mesh that still has room", () => {
    const now = 10_000;
    const open = (id: string, formed: number, members: number, count?: number): MeshCandidate => ({
      meshId: id,
      meshFormedAt: formed,
      endpoints: new Map(
        Array.from({ length: members }, (_, i) => [
          `${id}-${i}`,
          { seq: 1, lastSeen: now, memberCount: count },
        ]),
      ),
    });

    const oldestOpen = new Map<string, MeshCandidate>([
      ["old", open("old", 1, 3)],
      ["new", open("new", 5, 2)],
    ]);
    expect(selectOldestMesh(oldestOpen, now)?.meshId).toBe("old");

    const fullOldest = new Map<string, MeshCandidate>([
      ["old", open("old", 1, MESH_CAPACITY)],
      ["new", open("new", 5, 2)],
    ]);
    expect(selectOldestMesh(fullOldest, now)?.meshId).toBe("new");

    const allFull = new Map<string, MeshCandidate>([
      ["old", open("old", 1, 1, MESH_CAPACITY)],
      ["new", open("new", 5, MESH_CAPACITY)],
    ]);
    expect(meshIsFull(allFull.get("old")!, now)).toBe(true);
    expect(selectOldestMesh(allFull, now)).toBeNull();
  });

  it("treats one full advertisement as a full mesh and agrees who stays", () => {
    const now = 10_000;
    const meshes = new Map<string, MeshCandidate>();
    const lastSeq = new Map<string, number>();
    recordAdvertisement(
      sampleAd({ endpoint_id: "solo", member_count: MESH_CAPACITY }),
      lastSeq,
      meshes,
      now,
    );
    const mesh = meshes.get("mesh-a")!;
    expect(mesh.endpoints.size).toBe(1);
    expect(meshIsFull(mesh, now)).toBe(true);
    expect(selectOldestMesh(meshes, now)).toBeNull();

    const ids = ["m", "b", "q", "a", "z", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "n", "o"];
    const stayA = retainedEndpointIds(ids);
    const stayB = retainedEndpointIds([...ids].reverse());
    expect(stayA).toEqual(stayB);
    expect(stayA).toHaveLength(MESH_CAPACITY);
    expect(stayA).not.toContain("z");
    expect(stayA[0] < stayA[1]).toBe(true);
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
