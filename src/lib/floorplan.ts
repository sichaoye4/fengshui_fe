import type { Primitive, PointM, SegmentPrimitive } from "../types/fengshui";
import { makeId } from "./id";

export function cvWallsToPrimitives(
  cvWalls: Array<[number, number, number, number]>,
  imageWidth: number,
  imageHeight: number,
  canvasWidthM: number,
  canvasHeightM: number
): SegmentPrimitive[] {
  const scaleX = canvasWidthM / imageWidth;
  const scaleY = canvasHeightM / imageHeight;

  return cvWalls.map(([x1, y1, x2, y2]) => ({
    id: makeId("wall"),
    kind: "wall" as const,
    start: { x: +(x1 * scaleX).toFixed(4), y: +(y1 * scaleY).toFixed(4) },
    end: { x: +(x2 * scaleX).toFixed(4), y: +(y2 * scaleY).toFixed(4) },
  }));
}

export function userWallsToEntrance(
  userWalls: ReadonlyArray<SegmentPrimitive>,
  entranceWallId: string | null
): PointM | null {
  if (!entranceWallId) return null;
  const wall = userWalls.find(w => w.id === entranceWallId);
  if (!wall) return null;
  return {
    x: +((wall.start.x + wall.end.x) / 2).toFixed(4),
    y: +((wall.start.y + wall.end.y) / 2).toFixed(4),
  };
}
