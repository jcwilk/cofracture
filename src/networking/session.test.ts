import { describe, expect, it } from "vitest";
import {
  applyJitter,
  calculateAdvertiseInterval,
  calculateBackoffMultiplier,
  formNewMesh,
  recordAdvertisement,
  selectOldestMesh,
  shouldAcceptAdvertisement,
  type MeshAdvertisement,
  type MeshCandidate,
} from "../mesh-discovery";

/**
 * L0 confirmation: mesh policy remains invocable without constructing a live
 * discovery transport (task 2.1).
 */
describe("mesh policy without live transport", () => {
  it("evaluates seq, selection, and backoff without MeshDiscovery", () => {
    const meshes = new Map<string, MeshCandidate>();
    const lastSeq = new Map<string, number>();
    const now = 1_000_000;

    const ad: MeshAdvertisement = {
      endpoint_id: "ep-a",
      mesh_id: "mesh-1",
      mesh_formed_at: now - 1000,
      seq: 1,
    };

    expect(shouldAcceptAdvertisement(ad, undefined)).toBe(true);
    expect(recordAdvertisement(ad, lastSeq, meshes, now)).toBe(true);
    expect(selectOldestMesh(meshes, now)?.meshId).toBe("mesh-1");
    expect(calculateBackoffMultiplier(12)).toBeGreaterThanOrEqual(1);
    expect(calculateAdvertiseInterval(1)).toBeGreaterThan(0);
    expect(applyJitter(1000, () => 0.5)).toBe(1000);
    expect(formNewMesh().meshId.length).toBe(32);
  });
});
