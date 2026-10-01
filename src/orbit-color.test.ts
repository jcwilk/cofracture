import { describe, expect, it } from "vitest";
import { CANONICAL_BOUNDS } from "./bounds";
import {
  colorOrbit,
  COMPLEMENT_ARC,
  hexToHueSat,
  mixHue,
  saturationOf,
  type ColoringWindow,
} from "./orbit-color";

function windowAt(
  hue: number,
  bounds = CANONICAL_BOUNDS,
  saturation = 1,
): ColoringWindow {
  return { bounds, hue, saturation };
}

describe("orbit coloring windows", () => {
  it("colors a solo canonical orbit in only the local hue and leaves misses clear", () => {
    const local = windowAt(0.6);
    const interior = colorOrbit(0, 0, [local]);
    const escaped = colorOrbit(0.3, 0.5, [local]);
    expect(interior.a).toBe(1);
    expect(escaped.a).toBe(1);
    const interiorHue = mixHue([local], interior.weights).hue;
    const escapedHue = mixHue([local], escaped.weights).hue;
    expect(interiorHue).toBeCloseTo(0.6, 5);
    expect(escapedHue).toBeCloseTo(0.6, 5);

    const elsewhere = windowAt(0.1, {
      reMin: 1.2,
      reMax: 1.4,
      imMin: 1.2,
      imMax: 1.4,
    });
    const missed = colorOrbit(-1, 0, [elsewhere]);
    expect(missed.a).toBe(0);
    expect(missed.r + missed.g + missed.b).toBe(0);
  });

  it("makes the first entry count more than a later one", () => {
    const weights = [0, 0];
    let count = 0;
    const first = 1 / (1 + count);
    weights[0] += first;
    count += 1;
    for (let k = 0; k < 40; k++) {
      weights[0] += 1 / (1 + count);
      count += 1;
    }
    const late = 1 / (1 + count);
    expect(first).toBe(1);
    expect(late).toBeLessThan(first / 20);
  });

  it("blends two hues vividly and does not let a third wash toward gray", () => {
    const red = windowAt(0);
    const green = windowAt(1 / 3);
    const blue = windowAt(2 / 3);
    const two = colorOrbit(0, 0, [red, green]);
    expect(two.a).toBe(1);
    expect(saturationOf(two.r, two.g, two.b)).toBeGreaterThan(0.8);

    const mixed = mixHue([red, green], [3, 1, 0]);
    expect(mixed.hue).toBeGreaterThan(0);
    expect(mixed.hue).toBeLessThan(1 / 3);
    expect(mixed.saturation).toBeGreaterThanOrEqual(0.85);

    const withThird = mixHue([red, green, blue], [3, 1, 0.4]);
    expect(withThird.hue).toBeCloseTo(mixed.hue, 5);
    const painted = colorOrbit(0, 0, [red, green, blue]);
    expect(saturationOf(painted.r, painted.g, painted.b)).toBeGreaterThan(0.8);
  });

  it("lets the leader win when hues are nearly opposite", () => {
    const lead = windowAt(0.1);
    const opposite = windowAt(0.1 + 0.5);
    expect(Math.abs(0.5)).toBeGreaterThanOrEqual(COMPLEMENT_ARC);
    const mixed = mixHue([lead, opposite], [2, 2]);
    expect(mixed.hue).toBeCloseTo(0.1, 5);
    const { hue: red } = hexToHueSat("#e6194b");
    const { hue: cyan } = hexToHueSat("#42d4f4");
    expect(Math.abs(cyan - red)).toBeGreaterThan(0.2);
  });
});
