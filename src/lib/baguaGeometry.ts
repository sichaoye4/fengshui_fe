import type { BaguaCode, PointM } from "../types/fengshui";

export type BaguaPalace = BaguaCode | "CENTER";

export interface BaguaBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Cell {
  palace: BaguaPalace;
  label: string;
  direction: string;
  points: PointM[];
  center: PointM;
}

const EPSILON = 1e-9;

const PALACE_BY_ROW_COL: Array<Array<{ palace: BaguaPalace; label: string; direction: string }>> = [
  [
    { palace: "QIAN", label: "Qian", direction: "NW" },
    { palace: "KAN", label: "Kan", direction: "N" },
    { palace: "GEN", label: "Gen", direction: "NE" }
  ],
  [
    { palace: "DUI", label: "Dui", direction: "W" },
    { palace: "CENTER", label: "Center", direction: "C" },
    { palace: "ZHEN", label: "Zhen", direction: "E" }
  ],
  [
    { palace: "KUN", label: "Kun", direction: "SW" },
    { palace: "LI", label: "Li", direction: "S" },
    { palace: "XUN", label: "Xun", direction: "SE" }
  ]
];

function normalizeAngleDeg(angleDeg: number): number {
  return ((angleDeg % 360) + 360) % 360;
}

function angleRad(angleDeg: number): number {
  return (normalizeAngleDeg(angleDeg) * Math.PI) / 180;
}

function bboxSize(bbox: BaguaBoundingBox): { width: number; height: number } {
  return {
    width: bbox.maxX - bbox.minX,
    height: bbox.maxY - bbox.minY
  };
}

function bboxCenter(bbox: BaguaBoundingBox): PointM {
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2
  };
}

function rotateFromLocal(point: PointM, center: PointM, northAngleDeg: number): PointM {
  const theta = angleRad(northAngleDeg);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos
  };
}

function rotateToLocal(point: PointM, center: PointM, northAngleDeg: number): PointM {
  const theta = angleRad(northAngleDeg);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: dx * cos + dy * sin,
    y: -dx * sin + dy * cos
  };
}

function signedPolygonArea(points: PointM[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function polygonArea(points: PointM[]): number {
  return Math.abs(signedPolygonArea(points));
}

function intersection(start: PointM, end: PointM, clipStart: PointM, clipEnd: PointM): PointM {
  const x1 = start.x;
  const y1 = start.y;
  const x2 = end.x;
  const y2 = end.y;
  const x3 = clipStart.x;
  const y3 = clipStart.y;
  const x4 = clipEnd.x;
  const y4 = clipEnd.y;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denominator) <= EPSILON) {
    return end;
  }

  const a = x1 * y2 - y1 * x2;
  const b = x3 * y4 - y3 * x4;
  return {
    x: (a * (x3 - x4) - (x1 - x2) * b) / denominator,
    y: (a * (y3 - y4) - (y1 - y2) * b) / denominator
  };
}

function clipPolygon(subject: PointM[], clip: PointM[]): PointM[] {
  const clipOrientation = signedPolygonArea(clip) >= 0 ? 1 : -1;
  let output = subject;

  for (let i = 0; i < clip.length; i += 1) {
    const clipStart = clip[i];
    const clipEnd = clip[(i + 1) % clip.length];
    const input = output;
    output = [];

    if (!input.length) {
      break;
    }

    const isInside = (point: PointM): boolean => {
      const cross =
        (clipEnd.x - clipStart.x) * (point.y - clipStart.y) -
        (clipEnd.y - clipStart.y) * (point.x - clipStart.x);
      return cross * clipOrientation >= -EPSILON;
    };

    for (let j = 0; j < input.length; j += 1) {
      const current = input[j];
      const previous = input[(j + input.length - 1) % input.length];
      const currentInside = isInside(current);
      const previousInside = isInside(previous);

      if (currentInside) {
        if (!previousInside) {
          output.push(intersection(previous, current, clipStart, clipEnd));
        }
        output.push(current);
      } else if (previousInside) {
        output.push(intersection(previous, current, clipStart, clipEnd));
      }
    }
  }

  return output;
}

export function getBaguaGrid(bbox: BaguaBoundingBox, northAngleDeg: number): Cell[] {
  const { width, height } = bboxSize(bbox);
  if (width <= 0 || height <= 0) {
    return [];
  }

  const center = bboxCenter(bbox);
  const cellWidth = width / 3;
  const cellHeight = height / 3;
  const cells: Cell[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x1 = -width / 2 + col * cellWidth;
      const y1 = -height / 2 + row * cellHeight;
      const x2 = x1 + cellWidth;
      const y2 = y1 + cellHeight;
      const meta = PALACE_BY_ROW_COL[row][col];
      cells.push({
        ...meta,
        points: [
          rotateFromLocal({ x: x1, y: y1 }, center, northAngleDeg),
          rotateFromLocal({ x: x2, y: y1 }, center, northAngleDeg),
          rotateFromLocal({ x: x2, y: y2 }, center, northAngleDeg),
          rotateFromLocal({ x: x1, y: y2 }, center, northAngleDeg)
        ],
        center: rotateFromLocal({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, center, northAngleDeg)
      });
    }
  }

  return cells;
}

export function pointToPalace(x: number, y: number, bbox: BaguaBoundingBox, northAngleDeg: number): string {
  const { width, height } = bboxSize(bbox);
  if (width <= 0 || height <= 0) {
    return "";
  }

  const local = rotateToLocal({ x, y }, bboxCenter(bbox), northAngleDeg);
  const localX = local.x + width / 2;
  const localY = local.y + height / 2;

  if (localX < -EPSILON || localY < -EPSILON || localX > width + EPSILON || localY > height + EPSILON) {
    return "";
  }

  const col = Math.min(2, Math.max(0, Math.floor(localX / (width / 3))));
  const row = Math.min(2, Math.max(0, Math.floor(localY / (height / 3))));
  return PALACE_BY_ROW_COL[row][col].palace;
}

export function polygonToPalaces(
  points: PointM[],
  bbox: BaguaBoundingBox,
  northAngleDeg: number
): Array<{ palace: string; overlapPct: number }> {
  if (points.length < 3) {
    return [];
  }

  const totalArea = polygonArea(points);
  if (totalArea <= EPSILON) {
    return [];
  }

  return getBaguaGrid(bbox, northAngleDeg)
    .map((cell) => {
      const clipped = clipPolygon(points, cell.points);
      const overlapPct = clipped.length >= 3 ? (polygonArea(clipped) / totalArea) * 100 : 0;
      return { palace: cell.palace, overlapPct };
    })
    .filter((item) => item.overlapPct > 0.001)
    .sort((a, b) => b.overlapPct - a.overlapPct);
}
