import { describe, expect, it } from "vitest";
import { snapPointMeters, snapValueMeters } from "./geometry";

describe("grid snapping", () => {
  it("snaps values and points to selected grid size", () => {
    expect(snapValueMeters(1.17, 0.1)).toBe(1.2);
    expect(snapValueMeters(1.14, 0.1)).toBe(1.1);

    const snapped = snapPointMeters({ x: 2.26, y: 3.74 }, 0.2);
    expect(snapped).toEqual({ x: 2.2, y: 3.8 });
  });
});