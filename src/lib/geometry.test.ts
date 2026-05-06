import { describe, expect, it } from "vitest";
import {
  metersToPixels,
  pixelsToMeters,
  segmentLengthM,
  roomAreaM2,
  primitiveBounds,
  pointInCenterZone,
  midpoint,
  countDoorOpposedPairs,
} from "./geometry";
import { PIXELS_PER_METER } from "../constants";
import type { SegmentPrimitive, Primitive } from "../types/fengshui";

describe("metersToPixels / pixelsToMeters", () => {
  it("converts meters to pixels using PIXELS_PER_METER", () => {
    expect(metersToPixels(0)).toBe(0);
    expect(metersToPixels(1)).toBe(PIXELS_PER_METER);
    expect(metersToPixels(5)).toBe(5 * PIXELS_PER_METER);
    expect(metersToPixels(-3)).toBe(-3 * PIXELS_PER_METER);
  });

  it("converts pixels to meters using PIXELS_PER_METER", () => {
    expect(pixelsToMeters(0)).toBe(0);
    expect(pixelsToMeters(PIXELS_PER_METER)).toBe(1);
    expect(pixelsToMeters(500)).toBe(5);
    expect(pixelsToMeters(-300)).toBe(-3);
  });

  it("round-trips meters → pixels → meters", () => {
    const original = 3.14;
    const result = pixelsToMeters(metersToPixels(original));
    expect(result).toBeCloseTo(original, 4);
  });
});

describe("segmentLengthM", () => {
  it("calculates length of horizontal segment", () => {
    const seg: SegmentPrimitive = { id: "w1", kind: "wall", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } };
    expect(segmentLengthM(seg)).toBe(5);
  });

  it("calculates length of vertical segment", () => {
    const seg: SegmentPrimitive = { id: "w1", kind: "wall", start: { x: 2, y: 1 }, end: { x: 2, y: 6 } };
    expect(segmentLengthM(seg)).toBe(5);
  });

  it("calculates length of diagonal segment", () => {
    const seg: SegmentPrimitive = { id: "w1", kind: "wall", start: { x: 0, y: 0 }, end: { x: 3, y: 4 } };
    expect(segmentLengthM(seg)).toBe(5);
  });

  it("returns 0 for zero-length segment", () => {
    const seg: SegmentPrimitive = { id: "w1", kind: "wall", start: { x: 2, y: 3 }, end: { x: 2, y: 3 } };
    expect(segmentLengthM(seg)).toBe(0);
  });

  it("works for door and window segments too", () => {
    const door: SegmentPrimitive = { id: "d1", kind: "door", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
    const window: SegmentPrimitive = { id: "wi1", kind: "window", start: { x: 0, y: 0 }, end: { x: 1.5, y: 0 } };
    expect(segmentLengthM(door)).toBe(1);
    expect(segmentLengthM(window)).toBe(1.5);
  });
});

describe("roomAreaM2", () => {
  it("calculates room area", () => {
    expect(roomAreaM2({ id: "r1", kind: "room", x: 0, y: 0, width: 5, height: 4 })).toBe(20);
  });

  it("handles negative coordinates", () => {
    expect(roomAreaM2({ id: "r1", kind: "room", x: -5, y: -3, width: 5, height: 3 })).toBe(15);
  });

  it("returns 0 for zero-size room", () => {
    expect(roomAreaM2({ id: "r1", kind: "room", x: 0, y: 0, width: 0, height: 0 })).toBe(0);
  });
});

describe("primitiveBounds", () => {
  it("returns null for empty primitives", () => {
    expect(primitiveBounds([])).toBeNull();
  });

  it("computes bounds for room primitives", () => {
    const primitives: Primitive[] = [
      { id: "r1", kind: "room", x: 2, y: 3, width: 5, height: 4 },
    ];
    expect(primitiveBounds(primitives)).toEqual({ minX: 2, minY: 3, maxX: 7, maxY: 7 });
  });

  it("computes bounds for segment primitives", () => {
    const primitives: Primitive[] = [
      { id: "w1", kind: "wall", start: { x: -2, y: -1 }, end: { x: 3, y: 5 } },
    ];
    const bounds = primitiveBounds(primitives);
    expect(bounds!.minX).toBe(-2);
    expect(bounds!.minY).toBe(-1);
    expect(bounds!.maxX).toBe(3);
    expect(bounds!.maxY).toBe(5);
  });

  it("handles mixed room and segment primitives", () => {
    const primitives: Primitive[] = [
      { id: "r1", kind: "room", x: 0, y: 0, width: 5, height: 5 },
      { id: "w1", kind: "wall", start: { x: 10, y: 10 }, end: { x: 15, y: 10 } },
    ];
    expect(primitiveBounds(primitives)).toEqual({ minX: 0, minY: 0, maxX: 15, maxY: 10 });
  });
});

describe("pointInCenterZone", () => {
  const bounds = { minX: 0, minY: 0, maxX: 9, maxY: 9 };

  it("detects point in center zone", () => {
    expect(pointInCenterZone({ x: 4, y: 4 }, bounds)).toBe(true);
    expect(pointInCenterZone({ x: 4.5, y: 4.5 }, bounds)).toBe(true);
  });

  it("rejects point outside center zone", () => {
    expect(pointInCenterZone({ x: 0, y: 0 }, bounds)).toBe(false);
    expect(pointInCenterZone({ x: 8, y: 8 }, bounds)).toBe(false);
    expect(pointInCenterZone({ x: 2, y: 4 }, bounds)).toBe(false);
  });

  it("returns false for zero-size bounds", () => {
    expect(pointInCenterZone({ x: 5, y: 5 }, { minX: 0, minY: 0, maxX: 0, maxY: 0 })).toBe(false);
  });
});

describe("midpoint", () => {
  it("calculates midpoint of horizontal segment", () => {
    const seg: SegmentPrimitive = { id: "w1", kind: "wall", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
    expect(midpoint(seg)).toEqual({ x: 5, y: 0 });
  });

  it("calculates midpoint of diagonal segment", () => {
    const seg: SegmentPrimitive = { id: "w1", kind: "wall", start: { x: 2, y: 3 }, end: { x: 6, y: 7 } };
    expect(midpoint(seg)).toEqual({ x: 4, y: 5 });
  });
});

describe("countDoorOpposedPairs", () => {
  it("counts opposing horizontal doors", () => {
    const doors: SegmentPrimitive[] = [
      { id: "d1", kind: "door", start: { x: 0, y: 0 }, end: { x: 3, y: 0 } },
      { id: "d2", kind: "door", start: { x: 1, y: 2 }, end: { x: 4, y: 2 } },
    ];
    expect(countDoorOpposedPairs(doors)).toBe(1);
  });

  it("counts opposing vertical doors", () => {
    const doors: SegmentPrimitive[] = [
      { id: "d3", kind: "door", start: { x: 0, y: 0 }, end: { x: 0, y: 3 } },
      { id: "d4", kind: "door", start: { x: 2, y: 1 }, end: { x: 2, y: 4 } },
    ];
    expect(countDoorOpposedPairs(doors)).toBe(1);
  });

  it("returns 0 for non-overlapping doors", () => {
    const doors: SegmentPrimitive[] = [
      { id: "d1", kind: "door", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
      { id: "d2", kind: "door", start: { x: 10, y: 5 }, end: { x: 11, y: 5 } },
    ];
    expect(countDoorOpposedPairs(doors)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(countDoorOpposedPairs([])).toBe(0);
  });

  it("returns 0 for single door", () => {
    const doors: SegmentPrimitive[] = [
      { id: "d1", kind: "door", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
    ];
    expect(countDoorOpposedPairs(doors)).toBe(0);
  });
});
