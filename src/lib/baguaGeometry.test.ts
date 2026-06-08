import { describe, expect, it } from "vitest";
import { getBaguaGrid, pointToPalace, polygonToPalaces, type BaguaBoundingBox } from "./baguaGeometry";

const bbox: BaguaBoundingBox = { minX: 0, minY: 0, maxX: 9, maxY: 9 };

describe("baguaGeometry", () => {
  it("builds all nine post-heaven palace cells", () => {
    const cells = getBaguaGrid(bbox, 0);

    expect(cells.map((cell) => cell.palace)).toEqual([
      "QIAN",
      "KAN",
      "GEN",
      "DUI",
      "CENTER",
      "ZHEN",
      "KUN",
      "LI",
      "XUN"
    ]);
    expect(cells.find((cell) => cell.palace === "KAN")?.label).toBe("Kan");
  });

  it.each([
    [0, { x: 4.5, y: 1.5 }, { x: 4.5, y: 7.5 }, { x: 1.5, y: 1.5 }],
    [90, { x: 7.5, y: 4.5 }, { x: 1.5, y: 4.5 }, { x: 7.5, y: 1.5 }],
    [180, { x: 4.5, y: 7.5 }, { x: 4.5, y: 1.5 }, { x: 7.5, y: 7.5 }],
    [270, { x: 1.5, y: 4.5 }, { x: 7.5, y: 4.5 }, { x: 1.5, y: 7.5 }]
  ])("maps points at northAngleDeg %i", (northAngleDeg, kanPoint, liPoint, qianPoint) => {
    expect(pointToPalace(kanPoint.x, kanPoint.y, bbox, northAngleDeg)).toBe("KAN");
    expect(pointToPalace(liPoint.x, liPoint.y, bbox, northAngleDeg)).toBe("LI");
    expect(pointToPalace(qianPoint.x, qianPoint.y, bbox, northAngleDeg)).toBe("QIAN");
  });

  it("returns overlap percentages for polygons", () => {
    const overlaps = polygonToPalaces(
      [
        { x: 3, y: 3 },
        { x: 6, y: 3 },
        { x: 6, y: 6 },
        { x: 3, y: 6 }
      ],
      bbox,
      0
    );

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].palace).toBe("CENTER");
    expect(overlaps[0].overlapPct).toBeCloseTo(100);
  });
});
