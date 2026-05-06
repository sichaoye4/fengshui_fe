import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Layer, Group, Line, Stage } from "react-konva";
import { DEFAULT_CANVAS_SIZE, PIXELS_PER_METER } from "../constants";
import { t } from "../i18n/ui";
import { metersToPixels, pixelsToMeters } from "../lib/geometry";
import { makeId } from "../lib/id";
import { cvWallsToPrimitives, userWallsToEntrance } from "../lib/floorplan";
import type {
  FloorplanPhase,
  Language,
  PointM,
  Primitive,
  SegmentPrimitive,
  Tool,
  ViewportState
} from "../types/fengshui";

interface Props {
  language: Language;
  tool: Tool;
  onComplete: (primitives: Primitive[], entrance: PointM | null) => void;
}

const CANVAS_WORLD_LIMIT_M = 50;

const SNAP_GRID_M = 0.1;
const DRAW_MIN_DISTANCE_M = 0.5;
const SNAP_ANGLE_TOLERANCE_DEG = 15;

export function FloorplanEditor({ language, tool, onComplete }: Props): JSX.Element {
  const [phase, setPhase] = useState<FloorplanPhase>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [cvWalls, setCvWalls] = useState<Array<[number, number, number, number]>>([]);
  const [userWalls, setUserWalls] = useState<SegmentPrimitive[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [entranceWallId, setEntranceWallId] = useState<string | null>(null);
  const [drawStart, setDrawStart] = useState<PointM | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<PointM | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    scale: 1
  });

  const stageRef = useRef<import("konva/lib/Stage").Stage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const gridStepPx = metersToPixels(0.1);

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
        setUserWalls((prev) => prev.filter((w) => w.id !== selectedWallId));
        setSelectedWallId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedWallId]);

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
    ? userWalls.find((w) => w.id === entranceWallId)
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
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        "http://127.0.0.1:8000/api/v1/floorplan/analyze",
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        throw new Error(t(language, "floorplan.uploadError"));
      }

      const data = await res.json();
      const url = URL.createObjectURL(file);

      setImageUrl(url);
      setImageWidth(data.width);
      setImageHeight(data.height);
      setCvWalls(data.walls);
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

    setViewport({
      scale: clampedScale,
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale
    });
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

      <div className="canvas-shell" data-testid="floorplan-editor">
        <Stage
          ref={stageRef}
          width={DEFAULT_CANVAS_SIZE.width}
          height={DEFAULT_CANVAS_SIZE.height}
          onWheel={handleWheel}
          draggable
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          onDragEnd={(event) => {
            setViewport({
              ...viewport,
              x: event.target.x(),
              y: event.target.y()
            });
          }}
          onClick={(e) => {
            // Only handle clicks directly on the stage background (not on shapes)
            if (e.target !== e.target.getStage()) return;
            const stage = e.target.getStage();
            if (!stage) return;

            if (tool === "select") {
              setSelectedWallId(null);
              setDrawStart(null);
              setDrawCurrent(null);
              return;
            }

            if (tool === "delete") {
              return;
            }

            if (tool === "wall") {
              const snapped = getSnappedPointerPoint(stage);

              if (drawStart) {
                // Second click — attempt to complete the wall
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
                  setUserWalls((prev) => [
                    ...prev,
                    {
                      id: makeId("wall"),
                      kind: "wall",
                      start: drawStart,
                      end: { x: endX, y: endY },
                    },
                  ]);
                }
                setDrawStart(null);
                setDrawCurrent(null);
              } else {
                // First click — start drawing
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

            {/* Layer 3 — CV-detected walls */}
            {cvWalls.map(([x1, y1, x2, y2], idx) => (
              <Line
                key={`cv-${idx}`}
                points={[x1, y1, x2, y2]}
                stroke="#22c55e"
                strokeWidth={2}
                opacity={0.6}
                listening={false}
              />
            ))}

            {/* Layer 4 — User walls */}
            {userWalls.map((wall) => (
              <Line
                key={wall.id}
                points={[
                  metersToPixels(wall.start.x),
                  metersToPixels(wall.start.y),
                  metersToPixels(wall.end.x),
                  metersToPixels(wall.end.y),
                ]}
                stroke="#1e293b"
                strokeWidth={selectedWallId === wall.id ? 4 : 3}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (tool === "delete") {
                    setUserWalls((prev) => prev.filter((w) => w.id !== wall.id));
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
                    setUserWalls((prev) => prev.filter((w) => w.id !== wall.id));
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
          </Layer>
        </Stage>
      </div>

      {/* Action bar */}
      <div className="floorplan-actions">
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
            const primitives = cvWallsToPrimitives(
              cvWalls,
              imageWidth,
              imageHeight,
              canvasWidthM,
              canvasHeightM
            );
            const entrance = userWallsToEntrance(
              userWalls,
              entranceWallId
            );
            onComplete(primitives, entrance);
          }}
        >
          {t(language, "floorplan.complete")}
        </button>
      </div>
    </section>
  );
}
