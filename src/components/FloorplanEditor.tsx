import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Image, Layer, Group, Line, RegularPolygon, Stage, Text } from "react-konva";
import { DEFAULT_CANVAS_SIZE, MARKER_TYPES, PIXELS_PER_METER } from "../constants";
import { getStoredToken } from "../api/auth";
import {
  analyzeFloorplanWithAi,
  annotationsFromPrimitives,
  floorplanSourceFromAsset,
  saveFloorplanAnnotations,
  uploadPersistedFloorplan
} from "../api/floorplans";
import { t } from "../i18n/ui";
import { getBaguaGrid, type BaguaBoundingBox } from "../lib/baguaGeometry";
import { metersToPixels, primitiveBounds } from "../lib/geometry";
import { makeId } from "../lib/id";
import { cvAnalysisToPrimitives, userWallsToEntrance } from "../lib/floorplan";
import type {
  EditorState,
  FloorplanAiLabelSuggestion,
  FloorplanAiShaObservation,
  FloorplanAnalysis,
  FloorplanPhase,
  FloorplanSource,
  Language,
  MarkerPrimitive,
  MarkerType,
  PointM,
  Primitive,
  RoomPrimitive,
  RoomType,
  SegmentPrimitive,
  Tool,
  ViewportState
} from "../types/fengshui";

interface Props {
  language: Language;
  tool: Tool;
  editor?: EditorState;
  selectedId?: string | null;
  highlightedPrimitiveId?: string | null;
  matchedFormulaIds?: string[];
  onSelectPrimitive?: (id: string | null) => void;
  onViewportChange?: (viewport: ViewportState) => void;
  onAddMarker?: (marker: MarkerPrimitive) => void;
  onRemoveMarker?: (id: string) => void;
  onAddSegment?: (segment: SegmentPrimitive) => void;
  onRemoveSegment?: (id: string) => void;
  onComplete: (primitives: Primitive[], entrance: PointM | null, floorplan?: FloorplanSource) => void;
}

const CANVAS_WORLD_LIMIT_M = 50;

const SNAP_GRID_M = 0.1;
const DRAW_MIN_DISTANCE_M = 0.5;
const SNAP_ANGLE_TOLERANCE_DEG = 15;

const ROOM_TYPE_COLORS: Record<RoomType, string> = {
  unknown: "#94a3b8",
  living: "#22c55e",
  bedroom: "#3b82f6",
  toilet: "#06b6d4",
  kitchen: "#f97316",
  stair: "#8b5cf6",
  atrium: "#22d3ee",
  void: "#f43f5e",
  open_stairwell: "#a855f7",
  skylight: "#38bdf8",
  hallway: "#eab308",
  storage: "#64748b",
  balcony: "#14b8a6"
};

const BAGUA_CELL_COLORS: Record<string, string> = {
  QIAN: "#64748b",
  KAN: "#2563eb",
  GEN: "#84cc16",
  DUI: "#f59e0b",
  CENTER: "#a855f7",
  ZHEN: "#16a34a",
  KUN: "#d97706",
  LI: "#dc2626",
  XUN: "#0d9488"
};

const MARKER_COLORS: Record<MarkerType, string> = {
  main_door: "#b45309",
  back_door: "#92400e",
  room_door: "#d97706",
  toilet_door: "#0891b2",
  kitchen_door: "#ea580c",
  window: "#2563eb",
  toilet_fixture: "#06b6d4",
  stair: "#7c3aed",
  stove: "#dc2626",
  entry_turn: "#16a34a",
  open_center: "#e11d48",
  skylight: "#0284c7",
  open_stairwell: "#9333ea"
};

const MARKER_LABELS: Record<MarkerType, string> = {
  main_door: "M",
  back_door: "B",
  room_door: "R",
  toilet_door: "T",
  kitchen_door: "K",
  window: "W",
  toilet_fixture: "WC",
  stair: "S",
  stove: "F",
  entry_turn: "ET",
  open_center: "OC",
  skylight: "SL",
  open_stairwell: "OS"
};

function isMarkerToolValue(tool: Tool): tool is MarkerType {
  return (MARKER_TYPES as string[]).includes(tool);
}

function isSegmentToolValue(tool: Tool): tool is SegmentPrimitive["kind"] {
  return tool === "wall" || tool === "door" || tool === "window";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function roomPolygonPointsPx(room: RoomPrimitive): number[] {
  const points =
    room.points && room.points.length >= 3
      ? room.points
      : [
          { x: room.x, y: room.y },
          { x: room.x + room.width, y: room.y },
          { x: room.x + room.width, y: room.y + room.height },
          { x: room.x, y: room.y + room.height }
        ];

  return points.flatMap((point) => [metersToPixels(point.x), metersToPixels(point.y)]);
}

function roomLabelPositionPx(room: RoomPrimitive): { x: number; y: number } {
  const points =
    room.points && room.points.length >= 3
      ? room.points
      : [
          { x: room.x, y: room.y },
          { x: room.x + room.width, y: room.y },
          { x: room.x + room.width, y: room.y + room.height },
          { x: room.x, y: room.y + room.height }
        ];
  const center = points.reduce(
    (acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }),
    { x: 0, y: 0 }
  );
  return { x: metersToPixels(center.x), y: metersToPixels(center.y) };
}

function pointsPx(points: PointM[]): number[] {
  return points.flatMap((point) => [metersToPixels(point.x), metersToPixels(point.y)]);
}

function segmentStroke(segment: SegmentPrimitive): string {
  if (segment.kind === "door") return "#b45309";
  if (segment.kind === "window") return "#2563eb";
  return "#1e293b";
}

function bboxToRoomPrimitive(suggestion: FloorplanAiLabelSuggestion): RoomPrimitive {
  return {
    id: makeId("ai-room"),
    kind: "room",
    x: +(suggestion.bbox.x / PIXELS_PER_METER).toFixed(4),
    y: +(suggestion.bbox.y / PIXELS_PER_METER).toFixed(4),
    width: +(suggestion.bbox.width / PIXELS_PER_METER).toFixed(4),
    height: +(suggestion.bbox.height / PIXELS_PER_METER).toFixed(4),
    label: suggestion.label,
    roomType: suggestion.room_type
  };
}

function suggestionRectPointsPx(suggestion: FloorplanAiLabelSuggestion): number[] {
  const { x, y, width, height } = suggestion.bbox;
  return [x, y, x + width, y, x + width, y + height, x, y + height];
}

function roomPoints(room: RoomPrimitive): PointM[] {
  return room.points && room.points.length >= 3
    ? room.points
    : [
        { x: room.x, y: room.y },
        { x: room.x + room.width, y: room.y },
        { x: room.x + room.width, y: room.y + room.height },
        { x: room.x, y: room.y + room.height }
      ];
}

function pointInPolygon(point: PointM, polygon: PointM[]): boolean {
  let inside = false;
  let previous = polygon[polygon.length - 1];
  for (const current of polygon) {
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y || 1e-9) + current.x;
    if (intersects) {
      inside = !inside;
    }
    previous = current;
  }
  return inside;
}

function pointInAnyRoom(point: PointM, rooms: RoomPrimitive[]): boolean {
  return rooms.some((room) => pointInPolygon(point, roomPoints(room)));
}

function segmentLength(segment: SegmentPrimitive): number {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function segmentMidpoint(segment: SegmentPrimitive): PointM {
  return {
    x: (segment.start.x + segment.end.x) / 2,
    y: (segment.start.y + segment.end.y) / 2
  };
}

function touchesOppositeExteriorSides(segment: SegmentPrimitive, bbox: BaguaBoundingBox): boolean {
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  if (width <= 0 || height <= 0) {
    return false;
  }
  const tolerance = Math.max(0.2, Math.min(width, height) * 0.02);
  const touchesLeft = Math.min(Math.abs(segment.start.x - bbox.minX), Math.abs(segment.end.x - bbox.minX)) <= tolerance;
  const touchesRight = Math.min(Math.abs(segment.start.x - bbox.maxX), Math.abs(segment.end.x - bbox.maxX)) <= tolerance;
  const touchesTop = Math.min(Math.abs(segment.start.y - bbox.minY), Math.abs(segment.end.y - bbox.minY)) <= tolerance;
  const touchesBottom = Math.min(Math.abs(segment.start.y - bbox.maxY), Math.abs(segment.end.y - bbox.maxY)) <= tolerance;
  return (touchesLeft && touchesRight && segmentLength(segment) >= width * 0.9) ||
    (touchesTop && touchesBottom && segmentLength(segment) >= height * 0.9);
}

function centerOfBounds(bbox: BaguaBoundingBox): PointM {
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2
  };
}

function doorPoints(segments: SegmentPrimitive[], markers: MarkerPrimitive[], role: "main" | "back"): PointM[] {
  const markerType = role === "main" ? "main_door" : "back_door";
  return [
    ...segments.filter((segment) => segment.kind === "door" && segment.role === role).map(segmentMidpoint),
    ...markers.filter((marker) => marker.markerType === markerType).map((marker) => ({ x: marker.x, y: marker.y }))
  ];
}

export function FloorplanEditor({
  language,
  tool,
  editor,
  selectedId = null,
  highlightedPrimitiveId = null,
  matchedFormulaIds = [],
  onSelectPrimitive,
  onViewportChange,
  onAddMarker,
  onRemoveMarker,
  onAddSegment,
  onRemoveSegment,
  onComplete
}: Props): JSX.Element {
  const hasExistingFloorplan = Boolean(editor?.floorplan || editor?.primitives.length);
  const [phase, setPhase] = useState<FloorplanPhase>(hasExistingFloorplan ? "edit" : "upload");
  const [imageUrl, setImageUrl] = useState<string | null>(editor?.floorplan?.imageDataUrl ?? null);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(editor?.floorplan?.imageDataUrl);
  const [imageWidth, setImageWidth] = useState(editor?.floorplan?.imageWidth ?? 0);
  const [imageHeight, setImageHeight] = useState(editor?.floorplan?.imageHeight ?? 0);
  const [analysis, setAnalysis] = useState<FloorplanAnalysis | null>(editor?.floorplan?.analysis ?? null);
  const [imageFileMeta, setImageFileMeta] = useState<Pick<FloorplanSource, "imageName" | "contentType">>({
    imageName: editor?.floorplan?.imageName,
    contentType: editor?.floorplan?.contentType
  });
  const [persistedFloorplan, setPersistedFloorplan] = useState<
    Pick<FloorplanSource, "id" | "imageUrl" | "storageKey"> | undefined
  >(
    editor?.floorplan?.id
      ? { id: editor.floorplan.id, imageUrl: editor.floorplan.imageUrl, storageKey: editor.floorplan.storageKey }
      : undefined
  );
  const [userSegments, setUserSegments] = useState<SegmentPrimitive[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [entranceWallId, setEntranceWallId] = useState<string | null>(null);
  const [drawStart, setDrawStart] = useState<PointM | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<PointM | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<FloorplanAiLabelSuggestion[]>([]);
  const [acceptedAiRooms, setAcceptedAiRooms] = useState<RoomPrimitive[]>([]);
  const [aiShaObservations, setAiShaObservations] = useState<FloorplanAiShaObservation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    x: editor?.viewport.x ?? 0,
    y: editor?.viewport.y ?? 0,
    scale: editor?.viewport.scale ?? 1
  });

  const stageRef = useRef<import("konva/lib/Stage").Stage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const gridStepPx = metersToPixels(0.1);

  const savedRooms = useMemo(
    () => editor?.primitives.filter((item): item is RoomPrimitive => item.kind === "room") ?? [],
    [editor?.primitives]
  );
  const savedSegments = useMemo(
    () =>
      editor?.primitives.filter(
        (item): item is SegmentPrimitive => item.kind === "wall" || item.kind === "door" || item.kind === "window"
      ) ?? [],
    [editor?.primitives]
  );
  const savedMarkers = useMemo(
    () => editor?.primitives.filter((item): item is MarkerPrimitive => item.kind === "marker") ?? [],
    [editor?.primitives]
  );
  const shouldRenderSavedPrimitives = savedRooms.length > 0 || savedSegments.length > 0;
  const isMarkerTool = isMarkerToolValue(tool);
  const isSegmentTool = isSegmentToolValue(tool);
  const isHighlighted = (id: string) => highlightedPrimitiveId === id;
  const canRunAiAnalyze = Boolean(persistedFloorplan?.id && getStoredToken());
  const matchedFormulaSet = useMemo(() => new Set(matchedFormulaIds), [matchedFormulaIds]);

  const baguaBBox = useMemo<BaguaBoundingBox | null>(() => {
    if (imageWidth > 0 && imageHeight > 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: imageWidth / PIXELS_PER_METER,
        maxY: imageHeight / PIXELS_PER_METER
      };
    }
    return editor?.primitives.length ? primitiveBounds(editor.primitives) : null;
  }, [editor?.primitives, imageHeight, imageWidth]);

  const overlayBaguaCells = useMemo(
    () => (baguaBBox && (editor?.showBaguaOverlay || matchedFormulaSet.has("INT-018")) ? getBaguaGrid(baguaBBox, editor?.northAngleDeg ?? 0) : []),
    [baguaBBox, editor?.northAngleDeg, editor?.showBaguaOverlay, matchedFormulaSet]
  );
  const missingCornerCells = useMemo(
    () =>
      matchedFormulaSet.has("INT-018")
        ? overlayBaguaCells.filter(
            (cell) =>
              ["QIAN", "GEN", "KUN", "XUN"].includes(cell.palace) && !pointInAnyRoom(cell.center, savedRooms)
          )
        : [],
    [matchedFormulaSet, overlayBaguaCells, savedRooms]
  );
  const taijiSplitSegment = useMemo(
    () =>
      matchedFormulaSet.has("INT-023") && baguaBBox
        ? savedSegments.find((segment) => segment.kind === "wall" && touchesOppositeExteriorSides(segment, baguaBBox)) ?? null
        : null,
    [baguaBBox, matchedFormulaSet, savedSegments]
  );
  const qiPiercingLine = useMemo(() => {
    if (!matchedFormulaSet.has("INT-021") || !baguaBBox) {
      return null;
    }
    const main = doorPoints(savedSegments, savedMarkers, "main")[0];
    const back = doorPoints(savedSegments, savedMarkers, "back")[0];
    if (!main || !back) {
      return null;
    }
    const center = centerOfBounds(baguaBBox);
    return [main, center, back];
  }, [baguaBBox, matchedFormulaSet, savedMarkers, savedSegments]);

  useEffect(() => {
    if (!editor?.floorplan && !editor?.primitives.length) {
      return;
    }
    setPhase("edit");
    setImageUrl(editor.floorplan?.imageDataUrl ?? null);
    setImageDataUrl(editor.floorplan?.imageDataUrl);
    setImageWidth(editor.floorplan?.imageWidth ?? imageWidth);
    setImageHeight(editor.floorplan?.imageHeight ?? imageHeight);
    setAnalysis(editor.floorplan?.analysis ?? null);
    setImageFileMeta({
      imageName: editor.floorplan?.imageName,
      contentType: editor.floorplan?.contentType
    });
    setPersistedFloorplan(
      editor.floorplan?.id
        ? { id: editor.floorplan.id, imageUrl: editor.floorplan.imageUrl, storageKey: editor.floorplan.storageKey }
        : undefined
    );
  }, [editor?.floorplan, editor?.primitives.length]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    setViewport(editor.viewport);
  }, [editor?.viewport.x, editor?.viewport.y, editor?.viewport.scale]);

  const gridLines = useMemo(() => {
    const worldLimitPx = metersToPixels(CANVAS_WORLD_LIMIT_M);
    const lines: Array<{ points: number[]; isAxis: boolean }> = [];

    for (let x = -worldLimitPx; x <= worldLimitPx; x += gridStepPx) {
      lines.push({ points: [x, -worldLimitPx, x, worldLimitPx], isAxis: x === 0 });
    }

    for (let y = -worldLimitPx; y <= worldLimitPx; y += gridStepPx) {
      lines.push({ points: [-worldLimitPx, y, worldLimitPx, y], isAxis: y === 0 });
    }

    return lines;
  }, [gridStepPx]);

  // Load the uploaded image into an HTMLImageElement for Konva
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
    return () => {
      img.onload = null;
      imageRef.current = null;
      setImageLoaded(false);
    };
  }, [imageUrl]);

  // Keyboard delete/backspace removes selected wall
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedWallId) {
        setUserSegments((prev) => prev.filter((segment) => segment.id !== selectedWallId));
        onRemoveSegment?.(selectedWallId);
        setSelectedWallId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRemoveSegment, selectedWallId]);

  // Helper: convert pointer screen position to world-space snapped point
  const getSnappedPointerPoint = (
    stage: import("konva/lib/Stage").Stage
  ): PointM => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    const x = (pointer.x - viewport.x) / viewport.scale;
    const y = (pointer.y - viewport.y) / viewport.scale;
    return {
      x: Math.round(x / SNAP_GRID_M) * SNAP_GRID_M,
      y: Math.round(y / SNAP_GRID_M) * SNAP_GRID_M,
    };
  };

  // Entrance marker triangle (computed from the entrance wall midpoint)
  const entranceWall = entranceWallId
    ? userSegments.find((w) => w.id === entranceWallId)
    : null;
  let entranceMarkerPoints: number[] | null = null;
  if (entranceWall) {
    const { start, end } = entranceWall;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const size = 0.4; // arrow size in meters
      const px = -dy / len;
      const py = dx / len;
      const tipX = midX + px * size;
      const tipY = midY + py * size;
      const baseX1 = midX + px * size * 0.3 - (dx / len) * size * 0.5;
      const baseY1 = midY + py * size * 0.3 - (dy / len) * size * 0.5;
      const baseX2 = midX + px * size * 0.3 + (dx / len) * size * 0.5;
      const baseY2 = midY + py * size * 0.3 + (dy / len) * size * 0.5;
      entranceMarkerPoints = [tipX, tipY, baseX1, baseY1, baseX2, baseY2];
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getStoredToken();
      let floorplanAnalysis: FloorplanAnalysis;
      let persistedSource: FloorplanSource | undefined;

      if (token) {
        const asset = await uploadPersistedFloorplan(file, token);
        floorplanAnalysis = asset.analysis;
        persistedSource = floorplanSourceFromAsset(asset);
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(
          "/api/v1/floorplan/analyze",
          { method: "POST", body: formData }
        );

        if (!res.ok) {
          throw new Error(t(language, "floorplan.uploadError"));
        }

        floorplanAnalysis = (await res.json()) as FloorplanAnalysis;
      }

      const dataUrl = await fileToDataUrl(file).catch(() =>
        "createObjectURL" in URL ? URL.createObjectURL(file) : ""
      );

      setImageUrl(dataUrl || null);
      setImageDataUrl(dataUrl.startsWith("data:") ? dataUrl : undefined);
      setImageWidth(floorplanAnalysis.width);
      setImageHeight(floorplanAnalysis.height);
      setAnalysis(floorplanAnalysis);
      setImageFileMeta({
        imageName: file.name,
        contentType: file.type || undefined
      });
      setPersistedFloorplan(
        persistedSource?.id
          ? { id: persistedSource.id, imageUrl: persistedSource.imageUrl, storageKey: persistedSource.storageKey }
          : undefined
      );
      setPhase("edit");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(language, "floorplan.uploadError")
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  const handleAiAnalyze = async () => {
    if (!persistedFloorplan?.id) {
      setError(t(language, "floorplan.aiNeedsSaved"));
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setError(t(language, "floorplan.aiNeedsAuth"));
      return;
    }

    setAiLoading(true);
    setError(null);
    try {
      const result = await analyzeFloorplanWithAi(persistedFloorplan.id, token);
      setAiSuggestions(
        result.suggested_labels.filter((suggestion) => suggestion.bbox.width > 0 && suggestion.bbox.height > 0)
      );
      setAiShaObservations(result.sha_observations);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(language, "floorplan.aiError"));
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAiSuggestion = (suggestion: FloorplanAiLabelSuggestion) => {
    setAcceptedAiRooms((prev) => [...prev, bboxToRoomPrimitive(suggestion)]);
    setAiSuggestions((prev) => prev.filter((item) => item.id !== suggestion.id));
  };

  const rejectAiSuggestion = (suggestionId: string) => {
    setAiSuggestions((prev) => prev.filter((item) => item.id !== suggestionId));
  };

  const handleWheel = (
    event: import("konva/lib/Node").KonvaEventObject<WheelEvent>
  ) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const oldScale = viewport.scale;
    const scaleBy = 1.05;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const nextScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.4, Math.min(4, nextScale));

    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale
    };

    const nextViewport = {
      scale: clampedScale,
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale
    };
    setViewport(nextViewport);
    onViewportChange?.(nextViewport);
  };

  if (phase === "upload") {
    return (
      <section className="panel floorplan-panel">
        <div className="panel-header-inline">
          <h3>{t(language, "floorplan.title")}</h3>
        </div>

        {error ? (
          <div className="floorplan-error">
            <p>{error}</p>
            <button type="button" onClick={handleRetry}>
              {t(language, "floorplan.retry")}
            </button>
          </div>
        ) : loading ? (
          <div className="floorplan-loading">
            <p>{t(language, "floorplan.uploading")}</p>
          </div>
        ) : (
          <div
            className="floorplan-upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              hidden
              onChange={handleFileSelect}
            />
            <button type="button">{t(language, "floorplan.upload")}</button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="panel floorplan-panel">
      <div className="panel-header-inline">
        <h3>{t(language, "floorplan.title")}</h3>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="canvas-shell" data-testid="floorplan-editor">
        <Stage
          ref={stageRef}
          width={DEFAULT_CANVAS_SIZE.width}
          height={DEFAULT_CANVAS_SIZE.height}
          onWheel={handleWheel}
          draggable={tool === "select"}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          onDragEnd={(event) => {
            const nextViewport = {
              ...viewport,
              x: event.target.x(),
              y: event.target.y()
            };
            setViewport(nextViewport);
            onViewportChange?.(nextViewport);
          }}
          onClick={(e) => {
            // Only handle clicks directly on the stage background (not on shapes)
            if (e.target !== e.target.getStage()) return;
            const stage = e.target.getStage();
            if (!stage) return;

            if (tool === "select") {
              setSelectedWallId(null);
              onSelectPrimitive?.(null);
              setDrawStart(null);
              setDrawCurrent(null);
              return;
            }

            if (tool === "delete") {
              return;
            }

            if (isMarkerTool) {
              const snapped = getSnappedPointerPoint(stage);
              onAddMarker?.({
                id: makeId("marker"),
                kind: "marker",
                markerType: tool as MarkerType,
                x: snapped.x,
                y: snapped.y
              });
              setDrawStart(null);
              setDrawCurrent(null);
              return;
            }

            if (isSegmentTool) {
              const snapped = getSnappedPointerPoint(stage);

              if (drawStart) {
                // Second click: attempt to complete the segment.
                const dx = snapped.x - drawStart.x;
                const dy = snapped.y - drawStart.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > DRAW_MIN_DISTANCE_M) {
                  let endX = snapped.x;
                  let endY = snapped.y;
                  const angleRad = Math.abs(Math.atan2(dy, dx));
                  const toleranceRad =
                    (SNAP_ANGLE_TOLERANCE_DEG * Math.PI) / 180;
                  // Snap to horizontal if within tolerance of 0° or 180°
                  if (angleRad < toleranceRad) {
                    endY = drawStart.y;
                  }
                  // Snap to vertical if within tolerance of 90°
                  else if (angleRad > Math.PI / 2 - toleranceRad) {
                    endX = drawStart.x;
                  }
                  const segment: SegmentPrimitive = {
                    id: makeId(tool),
                    kind: tool,
                    start: drawStart,
                    end: { x: endX, y: endY },
                  };
                  if (shouldRenderSavedPrimitives) {
                    onAddSegment?.(segment);
                  } else {
                    setUserSegments((prev) => [...prev, segment]);
                  }
                }
                setDrawStart(null);
                setDrawCurrent(null);
              } else {
                // First click: start drawing.
                setDrawStart(snapped);
                setDrawCurrent(snapped);
              }
            }
          }}
          onMouseMove={(e) => {
            if (!drawStart) return;
            const stage = e.target.getStage();
            if (!stage) return;
            const snapped = getSnappedPointerPoint(stage);
            setDrawCurrent(snapped);
          }}
        >
          <Layer>
            {/* Layer 1 — Grid */}
            <Group>
              {gridLines.map((line, idx) => (
                <Line
                  key={`grid-${idx}`}
                  points={line.points}
                  stroke={line.isAxis ? "#64748b" : "#e2e8f0"}
                  strokeWidth={line.isAxis ? 2 : 1}
                  listening={false}
                />
              ))}
            </Group>

            {/* Layer 2 — Image background (50% opacity) */}
            {imageLoaded && imageRef.current && (
              <Image
                image={imageRef.current}
                x={0}
                y={0}
                width={imageWidth}
                height={imageHeight}
                opacity={0.5}
                listening={false}
              />
            )}

            {/* Layer 3 — Room polygons */}
            {shouldRenderSavedPrimitives
              ? savedRooms.map((room) => {
                  const color = ROOM_TYPE_COLORS[room.roomType ?? "unknown"];
                  const labelPosition = roomLabelPositionPx(room);
                  const label = room.label || t(language, "floorplan.defaultRoom");
                  const highlighted = isHighlighted(room.id);
                  return (
                    <Group key={room.id}>
                      <Line
                        data-testid={`room-polygon-${room.id}`}
                        data-highlighted={highlighted ? "true" : "false"}
                        points={roomPolygonPointsPx(room)}
                        fill={color}
                        opacity={0.26}
                        stroke={highlighted ? "#f59e0b" : selectedId === room.id ? "#0f172a" : color}
                        strokeWidth={highlighted ? 5 : selectedId === room.id ? 3 : 1.5}
                        shadowColor={highlighted ? "#f59e0b" : undefined}
                        shadowBlur={highlighted ? 12 : 0}
                        closed
                        onClick={(event) => {
                          event.cancelBubble = true;
                          if (tool !== "select") {
                            return;
                          }
                          setSelectedWallId(null);
                          onSelectPrimitive?.(room.id);
                          setDrawStart(null);
                          setDrawCurrent(null);
                        }}
                        onTap={(event) => {
                          event.cancelBubble = true;
                          if (tool !== "select") {
                            return;
                          }
                          setSelectedWallId(null);
                          onSelectPrimitive?.(room.id);
                          setDrawStart(null);
                          setDrawCurrent(null);
                        }}
                      />
                      <Text
                        text={label}
                        x={labelPosition.x - 38}
                        y={labelPosition.y - 10}
                        width={76}
                        align="center"
                        fontSize={12}
                        fill="#0f172a"
                        listening={false}
                      />
                    </Group>
                  );
                })
              : (analysis?.rooms ?? []).map((room, idx) => (
                  <Line
                    key={`cv-room-${idx}`}
                    points={room.flatMap(([x, y]) => [x, y])}
                    fill={ROOM_TYPE_COLORS.unknown}
                    opacity={0.22}
                    stroke={ROOM_TYPE_COLORS.unknown}
                    strokeWidth={1.5}
                    closed
                    listening={false}
                  />
                ))}

            {acceptedAiRooms.map((room) => {
              const color = ROOM_TYPE_COLORS[room.roomType ?? "unknown"];
              const labelPosition = roomLabelPositionPx(room);
              return (
                <Group key={room.id}>
                  <Line
                    data-testid={`room-polygon-${room.id}`}
                    points={roomPolygonPointsPx(room)}
                    fill={color}
                    opacity={0.26}
                    stroke={color}
                    strokeWidth={1.5}
                    closed
                    onClick={(event) => {
                      event.cancelBubble = true;
                      if (tool === "select") {
                        setSelectedWallId(null);
                        onSelectPrimitive?.(room.id);
                      }
                    }}
                  />
                  <Text
                    text={room.label || t(language, "floorplan.defaultRoom")}
                    x={labelPosition.x - 38}
                    y={labelPosition.y - 10}
                    width={76}
                    align="center"
                    fontSize={12}
                    fill="#0f172a"
                    listening={false}
                  />
                </Group>
              );
            })}

            {aiSuggestions.map((suggestion) => {
              const color = ROOM_TYPE_COLORS[suggestion.room_type ?? "unknown"];
              const x = suggestion.bbox.x + suggestion.bbox.width / 2 - 42;
              const y = suggestion.bbox.y + suggestion.bbox.height / 2 - 9;
              return (
                <Group key={suggestion.id}>
                  <Line
                    data-testid={`ai-suggestion-${suggestion.id}`}
                    points={suggestionRectPointsPx(suggestion)}
                    fill={color}
                    opacity={0.12}
                    stroke={color}
                    strokeWidth={2}
                    dash={[8, 5]}
                    closed
                    listening={false}
                  />
                  <Text
                    text={suggestion.label}
                    x={x}
                    y={y}
                    width={84}
                    align="center"
                    fontSize={12}
                    fill="#0f172a"
                    listening={false}
                  />
                </Group>
              );
            })}

            {/* Layer 4 — CV and saved walls */}
            {shouldRenderSavedPrimitives
              ? savedSegments.map((segment) => {
                  const mid = {
                    x: (segment.start.x + segment.end.x) / 2,
                    y: (segment.start.y + segment.end.y) / 2
                  };
                  const highlighted = isHighlighted(segment.id);
                  return (
                    <Group key={segment.id}>
                      <Line
                        data-testid={`segment-${segment.id}`}
                        data-highlighted={highlighted ? "true" : "false"}
                        points={[
                          metersToPixels(segment.start.x),
                          metersToPixels(segment.start.y),
                          metersToPixels(segment.end.x),
                          metersToPixels(segment.end.y)
                        ]}
                        stroke={highlighted ? "#f59e0b" : segmentStroke(segment)}
                        strokeWidth={highlighted ? 6 : selectedId === segment.id ? 4 : segment.kind === "wall" ? 3 : 2.5}
                        opacity={segment.kind === "wall" ? 0.85 : 0.8}
                        dash={segment.kind === "window" ? [10, 5] : undefined}
                        shadowColor={highlighted ? "#f59e0b" : undefined}
                        shadowBlur={highlighted ? 10 : 0}
                        onClick={(event) => {
                          event.cancelBubble = true;
                          if (tool === "delete") {
                            if (segment.kind === "wall" || segment.kind === "door" || segment.kind === "window") {
                              onRemoveSegment?.(segment.id);
                            }
                            setDrawStart(null);
                            setDrawCurrent(null);
                            return;
                          }
                          if (tool === "select") {
                            setSelectedWallId(segment.id);
                            onSelectPrimitive?.(segment.id);
                            setDrawStart(null);
                            setDrawCurrent(null);
                          }
                        }}
                        onTap={(event) => {
                          event.cancelBubble = true;
                          if (tool === "delete") {
                            onRemoveSegment?.(segment.id);
                            setDrawStart(null);
                            setDrawCurrent(null);
                            return;
                          }
                          if (tool === "select") {
                            setSelectedWallId(segment.id);
                            onSelectPrimitive?.(segment.id);
                            setDrawStart(null);
                            setDrawCurrent(null);
                          }
                        }}
                      />
                      {segment.kind === "door" && segment.role && (
                        <Text
                          text={segment.role.toUpperCase()}
                          x={metersToPixels(mid.x) - 24}
                          y={metersToPixels(mid.y) - 24}
                          width={48}
                          align="center"
                          fontSize={10}
                          fill="#78350f"
                          listening={false}
                        />
                      )}
                    </Group>
                  );
                })
              : (analysis?.walls ?? []).map(([x1, y1, x2, y2], idx) => (
                  <Line
                    key={`cv-${idx}`}
                    points={[x1, y1, x2, y2]}
                    stroke="#22c55e"
                    strokeWidth={2}
                    opacity={0.6}
                    listening={false}
                  />
                ))}

            {/* Layer 5 - user-drawn draft segments */}
            {!shouldRenderSavedPrimitives && userSegments.map((wall) => (
              <Line
                key={wall.id}
                data-highlighted={isHighlighted(wall.id) ? "true" : "false"}
                points={[
                  metersToPixels(wall.start.x),
                  metersToPixels(wall.start.y),
                  metersToPixels(wall.end.x),
                  metersToPixels(wall.end.y),
                ]}
                stroke={isHighlighted(wall.id) ? "#f59e0b" : segmentStroke(wall)}
                strokeWidth={isHighlighted(wall.id) ? 6 : selectedWallId === wall.id ? 4 : wall.kind === "wall" ? 3 : 2.5}
                opacity={wall.kind === "wall" ? 0.85 : 0.8}
                dash={wall.kind === "window" ? [10, 5] : undefined}
                shadowColor={isHighlighted(wall.id) ? "#f59e0b" : undefined}
                shadowBlur={isHighlighted(wall.id) ? 10 : 0}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (tool === "delete") {
                    setUserSegments((prev) => prev.filter((w) => w.id !== wall.id));
                    if (selectedWallId === wall.id) setSelectedWallId(null);
                    if (entranceWallId === wall.id) setEntranceWallId(null);
                    setDrawStart(null);
                    setDrawCurrent(null);
                  } else if (tool === "select") {
                    setSelectedWallId(wall.id);
                    setDrawStart(null);
                    setDrawCurrent(null);
                  }
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  if (tool === "delete") {
                    setUserSegments((prev) => prev.filter((w) => w.id !== wall.id));
                    if (selectedWallId === wall.id) setSelectedWallId(null);
                    if (entranceWallId === wall.id) setEntranceWallId(null);
                    setDrawStart(null);
                    setDrawCurrent(null);
                  } else if (tool === "select") {
                    setSelectedWallId(wall.id);
                    setDrawStart(null);
                    setDrawCurrent(null);
                  }
                }}
              />
            ))}

            {savedMarkers.map((marker) => {
              const color = MARKER_COLORS[marker.markerType];
              const highlighted = isHighlighted(marker.id);
              return (
                <Group
                  key={marker.id}
                  data-testid={`marker-${marker.id}`}
                  x={metersToPixels(marker.x)}
                  y={metersToPixels(marker.y)}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    if (tool === "delete") {
                      onRemoveMarker?.(marker.id);
                      setDrawStart(null);
                      setDrawCurrent(null);
                      return;
                    }
                    if (tool === "select") {
                      setSelectedWallId(null);
                      onSelectPrimitive?.(marker.id);
                      setDrawStart(null);
                      setDrawCurrent(null);
                    }
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true;
                    if (tool === "delete") {
                      onRemoveMarker?.(marker.id);
                      setDrawStart(null);
                      setDrawCurrent(null);
                      return;
                    }
                    if (tool === "select") {
                      setSelectedWallId(null);
                      onSelectPrimitive?.(marker.id);
                      setDrawStart(null);
                      setDrawCurrent(null);
                    }
                  }}
                >
                  <Circle
                    data-testid={`marker-dot-${marker.id}`}
                    data-highlighted={highlighted ? "true" : "false"}
                    radius={12}
                    fill="#ffffff"
                    stroke={highlighted ? "#f59e0b" : selectedId === marker.id ? "#0f172a" : color}
                    strokeWidth={highlighted ? 5 : selectedId === marker.id ? 3 : 2}
                    shadowColor={highlighted ? "#f59e0b" : undefined}
                    shadowBlur={highlighted ? 12 : 0}
                  />
                  <RegularPolygon sides={4} radius={7} fill={color} opacity={0.92} listening={false} />
                  <Text
                    text={MARKER_LABELS[marker.markerType]}
                    x={-18}
                    y={13}
                    width={36}
                    align="center"
                    fontSize={9}
                    fill="#0f172a"
                    listening={false}
                  />
                </Group>
              );
            })}

            {/* Drawing preview (dashed amber line) */}
            {drawStart && drawCurrent && (
              <Line
                points={[
                  metersToPixels(drawStart.x),
                  metersToPixels(drawStart.y),
                  metersToPixels(drawCurrent.x),
                  metersToPixels(drawCurrent.y),
                ]}
                stroke="#f59e0b"
                strokeWidth={3}
                dash={[8, 4]}
                listening={false}
              />
            )}

            {/* Entrance marker (green triangle at wall midpoint) */}
            {entranceMarkerPoints && (
              <Line
                points={entranceMarkerPoints.map((p) => metersToPixels(p))}
                fill="#16a34a"
                stroke="#16a34a"
                strokeWidth={2}
                closed
                listening={false}
              />
            )}

            {taijiSplitSegment && (
              <Line
                data-testid="taiji-split-overlay"
                points={[
                  metersToPixels(taijiSplitSegment.start.x),
                  metersToPixels(taijiSplitSegment.start.y),
                  metersToPixels(taijiSplitSegment.end.x),
                  metersToPixels(taijiSplitSegment.end.y)
                ]}
                stroke="#dc2626"
                strokeWidth={5}
                dash={[14, 8]}
                opacity={0.92}
                listening={false}
              />
            )}

            {qiPiercingLine && (
              <Line
                data-testid="qi-piercing-overlay"
                points={qiPiercingLine.flatMap((point) => [metersToPixels(point.x), metersToPixels(point.y)])}
                stroke="#dc2626"
                strokeWidth={4}
                dash={[10, 7]}
                opacity={0.88}
                listening={false}
              />
            )}

            {overlayBaguaCells.length > 0 && (
              <Group data-testid="bagua-overlay">
                {overlayBaguaCells.map((cell) => {
                  const color = BAGUA_CELL_COLORS[cell.palace];
                  const missingCorner = missingCornerCells.some((missing) => missing.palace === cell.palace);
                  return (
                    <Group key={cell.palace}>
                      <Line
                        data-testid={`bagua-cell-${cell.palace}`}
                        points={pointsPx(cell.points)}
                        fill={missingCorner ? "#dc2626" : color}
                        opacity={missingCorner ? 0.24 : editor?.showBaguaOverlay ? 0.14 : 0}
                        stroke={missingCorner ? "#dc2626" : color}
                        strokeWidth={2}
                        closed
                        listening={false}
                      />
                      {missingCorner &&
                        [0.2, 0.4, 0.6, 0.8].map((ratio) => {
                          const left = {
                            x: cell.points[0].x + (cell.points[3].x - cell.points[0].x) * ratio,
                            y: cell.points[0].y + (cell.points[3].y - cell.points[0].y) * ratio
                          };
                          const right = {
                            x: cell.points[1].x + (cell.points[2].x - cell.points[1].x) * ratio,
                            y: cell.points[1].y + (cell.points[2].y - cell.points[1].y) * ratio
                          };
                          return (
                            <Line
                              key={`${cell.palace}-hatch-${ratio}`}
                              data-testid={`missing-corner-hatch-${cell.palace}`}
                              points={[
                                metersToPixels(left.x),
                                metersToPixels(left.y),
                                metersToPixels(right.x),
                                metersToPixels(right.y)
                              ]}
                              stroke="#b91c1c"
                              strokeWidth={2}
                              opacity={0.75}
                              listening={false}
                            />
                          );
                        })}
                      <Text
                        data-testid={`bagua-label-${cell.palace}`}
                        text={cell.label}
                        x={metersToPixels(cell.center.x) - 36}
                        y={metersToPixels(cell.center.y) - 9}
                        width={72}
                        align="center"
                        fontSize={13}
                        fontStyle="bold"
                        fill={editor?.showBaguaOverlay || missingCorner ? "#0f172a" : "transparent"}
                        listening={false}
                      />
                    </Group>
                  );
                })}
              </Group>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Action bar */}
      <div className="floorplan-actions">
        <button
          type="button"
          disabled={!canRunAiAnalyze || aiLoading}
          onClick={handleAiAnalyze}
        >
          {aiLoading ? t(language, "floorplan.aiAnalyzing") : t(language, "floorplan.aiAnalyze")}
        </button>
        <button
          type="button"
          disabled={!selectedWallId}
          onClick={() => {
            if (selectedWallId) setEntranceWallId(selectedWallId);
          }}
        >
          {t(language, "floorplan.markEntrance")}
        </button>
        <button
          type="button"
          onClick={() => {
            const canvasWidthM = imageWidth / PIXELS_PER_METER;
            const canvasHeightM = imageHeight / PIXELS_PER_METER;
            const primitives = shouldRenderSavedPrimitives
              ? [...(editor?.primitives ?? []), ...acceptedAiRooms]
              : analysis
                ? cvAnalysisToPrimitives(
                    analysis,
                    canvasWidthM,
                    canvasHeightM
                  )
                : [];
            if (!shouldRenderSavedPrimitives) {
              primitives.push(...acceptedAiRooms, ...savedMarkers, ...userSegments);
            }
            const entrance = shouldRenderSavedPrimitives
              ? editor?.entrance ?? null
              : userWallsToEntrance(
                  userSegments.filter((segment) => segment.kind === "wall"),
                  entranceWallId
                );
            const floorplan: FloorplanSource | undefined = editor?.floorplan ??
              (analysis
                ? {
                    ...persistedFloorplan,
                    ...(imageDataUrl ? { imageDataUrl } : {}),
                    imageWidth,
                    imageHeight,
                    ...imageFileMeta,
                    analysis
                  }
                : undefined);
            const token = getStoredToken();
            if (floorplan?.id && token) {
              void saveFloorplanAnnotations(
                floorplan.id,
                annotationsFromPrimitives(primitives, editor?.northAngleDeg ?? 0),
                token
              ).catch(() => {});
            }
            onComplete(primitives, entrance, floorplan);
          }}
        >
          {t(language, "floorplan.complete")}
        </button>
      </div>

      {(aiSuggestions.length > 0 || aiShaObservations.length > 0) && (
        <div className="ai-suggestion-panel">
          {aiSuggestions.length > 0 && (
            <div className="ai-suggestion-list">
              {aiSuggestions.map((suggestion) => (
                <div className="ai-suggestion-row" key={suggestion.id}>
                  <div>
                    <strong>{suggestion.label}</strong>
                    <span>{suggestion.room_type} · {Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                  <div className="ai-suggestion-actions">
                    <button type="button" onClick={() => acceptAiSuggestion(suggestion)}>
                      {t(language, "floorplan.aiAccept")}
                    </button>
                    <button type="button" onClick={() => rejectAiSuggestion(suggestion.id)}>
                      {t(language, "floorplan.aiReject")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {aiShaObservations.length > 0 && (
            <div className="ai-sha-list">
              {aiShaObservations.map((observation) => (
                <p key={observation.id}>
                  <strong>{observation.severity.toUpperCase()}</strong> {observation.description}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
