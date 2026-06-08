import { PIXELS_PER_METER } from "../constants";
import type { DoorRole, PointM, Primitive, RoomPrimitive, SegmentPrimitive } from "../types/fengshui";

export function metersToPixels(valueM: number): number {
  return valueM * PIXELS_PER_METER;
}

export function pixelsToMeters(valuePx: number): number {
  return valuePx / PIXELS_PER_METER;
}

export function snapValueMeters(valueM: number, gridSizeM: number): number {
  const snap = Math.round(valueM / gridSizeM) * gridSizeM;
  return Number(snap.toFixed(4));
}

export function snapPointMeters(point: PointM, gridSizeM: number): PointM {
  return {
    x: snapValueMeters(point.x, gridSizeM),
    y: snapValueMeters(point.y, gridSizeM)
  };
}

export function segmentLengthM(segment: SegmentPrimitive): number {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonAreaM2(points: PointM[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area / 2);
}

export function roomAreaM2(room: RoomPrimitive): number {
  if (room.points && room.points.length >= 3) {
    return polygonAreaM2(room.points);
  }
  return Math.abs(room.width * room.height);
}

function isHorizontal(segment: SegmentPrimitive, tolerance = 1e-6): boolean {
  return Math.abs(segment.start.y - segment.end.y) <= tolerance;
}

function isVertical(segment: SegmentPrimitive, tolerance = 1e-6): boolean {
  return Math.abs(segment.start.x - segment.end.x) <= tolerance;
}

export function primitiveBounds(primitives: Primitive[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (!primitives.length) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const primitive of primitives) {
    if (primitive.kind === "room") {
      const points = primitive.points && primitive.points.length >= 3 ? primitive.points : null;
      if (points) {
        for (const point of points) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      } else {
        minX = Math.min(minX, primitive.x);
        minY = Math.min(minY, primitive.y);
        maxX = Math.max(maxX, primitive.x + primitive.width);
        maxY = Math.max(maxY, primitive.y + primitive.height);
      }
      continue;
    }

    if (primitive.kind === "marker") {
      minX = Math.min(minX, primitive.x);
      minY = Math.min(minY, primitive.y);
      maxX = Math.max(maxX, primitive.x);
      maxY = Math.max(maxY, primitive.y);
      continue;
    }

    minX = Math.min(minX, primitive.start.x, primitive.end.x);
    minY = Math.min(minY, primitive.start.y, primitive.end.y);
    maxX = Math.max(maxX, primitive.start.x, primitive.end.x);
    maxY = Math.max(maxY, primitive.start.y, primitive.end.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY
  };
}

export function pointInCenterZone(point: PointM, bounds: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (width <= 0 || height <= 0) {
    return false;
  }

  const centerMinX = bounds.minX + width / 3;
  const centerMaxX = bounds.maxX - width / 3;
  const centerMinY = bounds.minY + height / 3;
  const centerMaxY = bounds.maxY - height / 3;

  return point.x >= centerMinX && point.x <= centerMaxX && point.y >= centerMinY && point.y <= centerMaxY;
}

export function midpoint(segment: SegmentPrimitive): PointM {
  return {
    x: (segment.start.x + segment.end.x) / 2,
    y: (segment.start.y + segment.end.y) / 2
  };
}

export function isOpposed(a: SegmentPrimitive, b: SegmentPrimitive): boolean {
  if (isHorizontal(a) && isHorizontal(b)) {
    const yGap = Math.abs(a.start.y - b.start.y);
    const aMin = Math.min(a.start.x, a.end.x);
    const aMax = Math.max(a.start.x, a.end.x);
    const bMin = Math.min(b.start.x, b.end.x);
    const bMax = Math.max(b.start.x, b.end.x);
    const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
    return yGap > 0 && yGap <= 3 && overlap > 0.2;
  }

  if (isVertical(a) && isVertical(b)) {
    const xGap = Math.abs(a.start.x - b.start.x);
    const aMin = Math.min(a.start.y, a.end.y);
    const aMax = Math.max(a.start.y, a.end.y);
    const bMin = Math.min(b.start.y, b.end.y);
    const bMax = Math.max(b.start.y, b.end.y);
    const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
    return xGap > 0 && xGap <= 3 && overlap > 0.2;
  }

  return false;
}

export function countOpposedDoorPairs(doors: SegmentPrimitive[]): number {
  let count = 0;

  for (let i = 0; i < doors.length; i += 1) {
    for (let j = i + 1; j < doors.length; j += 1) {
      if (isOpposed(doors[i], doors[j])) {
        count += 1;
      }
    }
  }

  return count;
}

export function countDoorOpposedPairs(doors: SegmentPrimitive[]): number {
  return countOpposedDoorPairs(doors);
}

export function hasOpposedDoorRoles(doors: SegmentPrimitive[], roleA: DoorRole, roleB: DoorRole): boolean {
  for (let i = 0; i < doors.length; i += 1) {
    for (let j = i + 1; j < doors.length; j += 1) {
      const a = doors[i];
      const b = doors[j];
      const rolesMatch =
        (a.role === roleA && b.role === roleB) ||
        (a.role === roleB && b.role === roleA);
      if (rolesMatch && isOpposed(a, b)) {
        return true;
      }
    }
  }

  return false;
}
