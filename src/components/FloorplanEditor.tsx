import { useMemo, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { DEFAULT_CANVAS_SIZE } from "../constants";
import { t } from "../i18n/ui";
import { metersToPixels, pixelsToMeters, snapPointMeters } from "../lib/geometry";
import { makeId } from "../lib/id";
import type {
  EditorState,
  Language,
  PointM,
  Primitive,
  SegmentPrimitive,
  Tool,
  ViewportState
} from "../types/fengshui";

interface Props {
  editor: EditorState;
  tool: Tool;
  language: Language;
  placeEntranceMode: boolean;
  onViewportChange: (viewport: ViewportState) => void;
  onAddPrimitive: (primitive: Primitive) => void;
  onSelectId: (id: string | null) => void;
  onDeleteId: (id: string) => void;
  onPlaceEntrance: (point: PointM) => void;
}

const CANVAS_WORLD_LIMIT_M = 50;

function toMeters(pointPx: { x: number; y: number }, viewport: ViewportState): PointM {
  const worldX = (pointPx.x - viewport.x) / viewport.scale;
  const worldY = (pointPx.y - viewport.y) / viewport.scale;
  return {
    x: pixelsToMeters(worldX),
    y: pixelsToMeters(worldY)
  };
}

function linePoints(segment: SegmentPrimitive): number[] {
  return [
    metersToPixels(segment.start.x),
    metersToPixels(segment.start.y),
    metersToPixels(segment.end.x),
    metersToPixels(segment.end.y)
  ];
}

export function FloorplanEditor({
  editor,
  tool,
  language,
  placeEntranceMode,
  onViewportChange,
  onAddPrimitive,
  onSelectId,
  onDeleteId,
  onPlaceEntrance
}: Props): JSX.Element {
  const stageRef = useRef<import("konva/lib/Stage").Stage | null>(null);
  const [drawStart, setDrawStart] = useState<PointM | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<PointM | null>(null);

  const gridStepPx = metersToPixels(editor.gridSizeM);

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

  const drawingPreview = useMemo(() => {
    if (!drawStart || !drawCurrent) {
      return null;
    }

    if (tool === "room") {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      return {
        type: "room" as const,
        x,
        y,
        width,
        height
      };
    }

    if (tool === "wall" || tool === "door" || tool === "window") {
      return {
        type: "segment" as const,
        start: drawStart,
        end: drawCurrent
      };
    }

    return null;
  }, [drawCurrent, drawStart, tool]);

  const handleWheel = (event: import("konva/lib/Node").KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const oldScale = editor.viewport.scale;
    const scaleBy = 1.05;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const nextScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.4, Math.min(4, nextScale));

    const mousePointTo = {
      x: (pointer.x - editor.viewport.x) / oldScale,
      y: (pointer.y - editor.viewport.y) / oldScale
    };

    const nextViewport: ViewportState = {
      scale: clampedScale,
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale
    };
    onViewportChange(nextViewport);
  };

  const handleStageMouseDown = () => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const snapped = snapPointMeters(toMeters(pointer, editor.viewport), editor.gridSizeM);

    if (placeEntranceMode) {
      onPlaceEntrance(snapped);
      return;
    }

    if (tool === "wall" || tool === "door" || tool === "window" || tool === "room") {
      setDrawStart(snapped);
      setDrawCurrent(snapped);
      return;
    }

    if (tool === "select") {
      onSelectId(null);
    }
  };

  const handleStageMouseMove = () => {
    if (!drawStart) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const snapped = snapPointMeters(toMeters(pointer, editor.viewport), editor.gridSizeM);
    setDrawCurrent(snapped);
  };

  const handleStageMouseUp = () => {
    if (!drawStart || !drawCurrent) {
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    if (tool === "room") {
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      if (width >= editor.gridSizeM && height >= editor.gridSizeM) {
        onAddPrimitive({
          id: makeId("room"),
          kind: "room",
          x: Math.min(drawStart.x, drawCurrent.x),
          y: Math.min(drawStart.y, drawCurrent.y),
          width,
          height
        });
      }
    }

    if (tool === "wall" || tool === "door" || tool === "window") {
      const dx = drawCurrent.x - drawStart.x;
      const dy = drawCurrent.y - drawStart.y;
      if (Math.sqrt(dx * dx + dy * dy) >= editor.gridSizeM / 2) {
        onAddPrimitive({
          id: makeId(tool),
          kind: tool,
          start: drawStart,
          end: drawCurrent
        });
      }
    }

    setDrawStart(null);
    setDrawCurrent(null);
  };

  const handlePrimitiveClick = (primitiveId: string) => {
    if (tool === "delete") {
      onDeleteId(primitiveId);
      return;
    }

    onSelectId(primitiveId);
  };

  return (
    <section className="panel floorplan-panel">
      <div className="panel-header-inline">
        <h3>{t(language, "floorplan.title")}</h3>
        <span className="meta-text">{t(language, "floorplan.hint")}</span>
      </div>

      <div className="canvas-shell" data-testid="floorplan-editor">
        <Stage
          ref={stageRef}
          width={DEFAULT_CANVAS_SIZE.width}
          height={DEFAULT_CANVAS_SIZE.height}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onWheel={handleWheel}
          draggable={tool === "select"}
          x={editor.viewport.x}
          y={editor.viewport.y}
          scaleX={editor.viewport.scale}
          scaleY={editor.viewport.scale}
          onDragEnd={(event) => {
            onViewportChange({
              ...editor.viewport,
              x: event.target.x(),
              y: event.target.y()
            });
          }}
        >
          <Layer>
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

              {editor.primitives.map((primitive) => {
                if (primitive.kind === "room") {
                  const isSelected = editor.selectedId === primitive.id;
                  return (
                    <Group key={primitive.id}>
                      <Rect
                        x={metersToPixels(primitive.x)}
                        y={metersToPixels(primitive.y)}
                        width={metersToPixels(primitive.width)}
                        height={metersToPixels(primitive.height)}
                        fill={isSelected ? "rgba(14,116,144,0.25)" : "rgba(14,116,144,0.12)"}
                        stroke={isSelected ? "#0e7490" : "#0891b2"}
                        strokeWidth={2}
                        onClick={(event) => {
                          event.cancelBubble = true;
                          handlePrimitiveClick(primitive.id);
                        }}
                      />
                      <Text
                        x={metersToPixels(primitive.x) + 4}
                        y={metersToPixels(primitive.y) + 4}
                        text={primitive.label || t(language, "floorplan.defaultRoom")}
                        fontSize={12}
                        fill="#0f172a"
                        listening={false}
                      />
                    </Group>
                  );
                }

                const color = primitive.kind === "wall" ? "#1e293b" : primitive.kind === "door" ? "#dc2626" : "#0ea5e9";
                const isSelected = editor.selectedId === primitive.id;

                return (
                  <Line
                    key={primitive.id}
                    points={linePoints(primitive)}
                    stroke={color}
                    strokeWidth={isSelected ? 5 : 3}
                    onClick={(event) => {
                      event.cancelBubble = true;
                      handlePrimitiveClick(primitive.id);
                    }}
                  />
                );
              })}

              {drawingPreview?.type === "segment" && (
                <Line
                  points={[
                    metersToPixels(drawingPreview.start.x),
                    metersToPixels(drawingPreview.start.y),
                    metersToPixels(drawingPreview.end.x),
                    metersToPixels(drawingPreview.end.y)
                  ]}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dash={[6, 4]}
                  listening={false}
                />
              )}

              {drawingPreview?.type === "room" && (
                <Rect
                  x={metersToPixels(drawingPreview.x)}
                  y={metersToPixels(drawingPreview.y)}
                  width={metersToPixels(drawingPreview.width)}
                  height={metersToPixels(drawingPreview.height)}
                  stroke="#f59e0b"
                  dash={[6, 4]}
                  strokeWidth={2}
                  listening={false}
                />
              )}

              {editor.entrance && (
                <Circle
                  x={metersToPixels(editor.entrance.x)}
                  y={metersToPixels(editor.entrance.y)}
                  radius={6}
                  fill="#16a34a"
                  stroke="#14532d"
                  strokeWidth={1}
                  listening={false}
                />
              )}
            </Group>
          </Layer>
        </Stage>
      </div>
    </section>
  );
}

