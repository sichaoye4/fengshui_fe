import type { FloorplanAnalysis, PointM, RoomPrimitive, SegmentPrimitive } from "../types/fengshui";
import { makeId } from "./id";

type CvRoomPoint = [number, number] | { x: number; y: number };
type CvRoomPolygon = CvRoomPoint[];

function round4(value: number): number {
  return +value.toFixed(4);
}

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
    start: { x: round4(x1 * scaleX), y: round4(y1 * scaleY) },
    end: { x: round4(x2 * scaleX), y: round4(y2 * scaleY) },
  }));
}

function cvPointToMeters(point: CvRoomPoint, scaleX: number, scaleY: number): PointM | null {
  const x = Array.isArray(point) ? point[0] : point.x;
  const y = Array.isArray(point) ? point[1] : point.y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x: round4(x * scaleX), y: round4(y * scaleY) };
}

export function cvRoomsToPrimitives(
  cvRooms: CvRoomPolygon[],
  imageWidth: number,
  imageHeight: number,
  canvasWidthM: number,
  canvasHeightM: number
): RoomPrimitive[] {
  const scaleX = canvasWidthM / imageWidth;
  const scaleY = canvasHeightM / imageHeight;

  return cvRooms
    .map((polygon): RoomPrimitive | null => {
      const points = polygon
        .map((point) => cvPointToMeters(point, scaleX, scaleY))
        .filter((point): point is PointM => point !== null);

      if (points.length < 3) {
        return null;
      }

      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      return {
        id: makeId("room"),
        kind: "room" as const,
        x: round4(minX),
        y: round4(minY),
        width: round4(maxX - minX),
        height: round4(maxY - minY),
        points,
        roomType: "unknown" as const,
      };
    })
    .filter((room): room is RoomPrimitive => room !== null);
}

export function cvAnalysisToPrimitives(
  analysis: FloorplanAnalysis,
  canvasWidthM: number,
  canvasHeightM: number
): Array<SegmentPrimitive | RoomPrimitive> {
  return [
    ...cvRoomsToPrimitives(analysis.rooms, analysis.width, analysis.height, canvasWidthM, canvasHeightM),
    ...cvWallsToPrimitives(analysis.walls, analysis.width, analysis.height, canvasWidthM, canvasHeightM),
  ];
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
