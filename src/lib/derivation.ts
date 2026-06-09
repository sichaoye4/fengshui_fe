import type { DerivedState, EditorState, InputDraftState, MarkerPrimitive, PointM, RoomPrimitive, SegmentPrimitive } from "../types/fengshui";
import { polygonToPalaces, type BaguaPalace } from "./baguaGeometry";
import {
  countDoorOpposedPairs,
  hasOpposedDoorRoles,
  midpoint,
  pointInCenterZone,
  primitiveBounds,
  roomAreaM2,
  segmentLengthM
} from "./geometry";

function round(value: number, digits = 3): number {
  return Number(value.toFixed(digits));
}

function parseNumericText(raw: string, fallback = 0): number {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : fallback;
}

function parsePositiveOverride(raw: string): number | null {
  const value = parseNumericText(raw, Number.NaN);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function sumRoomArea(rooms: RoomPrimitive[]): number {
  return rooms.reduce((total, room) => total + roomAreaM2(room), 0);
}

function roomPolygon(room: RoomPrimitive): Array<{ x: number; y: number }> {
  return room.points && room.points.length >= 3
    ? room.points
    : [
        { x: room.x, y: room.y },
        { x: room.x + room.width, y: room.y },
        { x: room.x + room.width, y: room.y + room.height },
        { x: room.x, y: room.y + room.height }
      ];
}

function deriveHouseArea(editor: EditorState, rooms: RoomPrimitive[]): number {
  const roomArea = sumRoomArea(rooms);
  if (roomArea > 0) {
    return roomArea;
  }

  const bounds = primitiveBounds(editor.primitives);
  if (!bounds) {
    return 0;
  }

  return Math.max(0, (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY));
}

function deriveMingtangArea(inputs: InputDraftState, rooms: RoomPrimitive[], houseArea: number): number {
  if (!rooms.length) {
    return houseArea > 0 ? houseArea * 0.25 : 0;
  }

  const selected = inputs.mingtang_room_id
    ? rooms.find((room) => room.id === inputs.mingtang_room_id)
    : undefined;
  if (selected) {
    return roomAreaM2(selected);
  }

  return roomAreaM2(rooms[0]);
}

function deriveCenterWallBlock(editor: EditorState, walls: SegmentPrimitive[], manualFlag: boolean): boolean {
  if (manualFlag) {
    return true;
  }

  const bounds = primitiveBounds(editor.primitives);
  if (!bounds) {
    return false;
  }

  return walls.some((wall) => pointInCenterZone(midpoint(wall), bounds));
}

function touchesOppositeExteriorSides(segment: SegmentPrimitive, bounds: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const tolerance = Math.max(0.2, Math.min(width, height) * 0.02);
  const touchesLeft = Math.min(Math.abs(segment.start.x - bounds.minX), Math.abs(segment.end.x - bounds.minX)) <= tolerance;
  const touchesRight = Math.min(Math.abs(segment.start.x - bounds.maxX), Math.abs(segment.end.x - bounds.maxX)) <= tolerance;
  const touchesTop = Math.min(Math.abs(segment.start.y - bounds.minY), Math.abs(segment.end.y - bounds.minY)) <= tolerance;
  const touchesBottom = Math.min(Math.abs(segment.start.y - bounds.maxY), Math.abs(segment.end.y - bounds.maxY)) <= tolerance;

  return (touchesLeft && touchesRight && segmentLengthM(segment) >= width * 0.9) ||
    (touchesTop && touchesBottom && segmentLengthM(segment) >= height * 0.9);
}

function doorReferencePoints(doors: SegmentPrimitive[], markers: MarkerPrimitive[], role: "main" | "back"): PointM[] {
  const markerType = role === "main" ? "main_door" : "back_door";
  return [
    ...doors.filter((door) => door.role === role).map(midpoint),
    ...markers.filter((marker) => marker.markerType === markerType).map((marker) => ({ x: marker.x, y: marker.y }))
  ];
}

function deriveQiPiercing(editor: EditorState, doors: SegmentPrimitive[], markers: MarkerPrimitive[]): boolean {
  const bounds = primitiveBounds(editor.primitives);
  if (!bounds) {
    return false;
  }
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  for (const main of doorReferencePoints(doors, markers, "main")) {
    for (const back of doorReferencePoints(doors, markers, "back")) {
      const v1 = { x: main.x - center.x, y: main.y - center.y };
      const v2 = { x: back.x - center.x, y: back.y - center.y };
      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      if (len1 <= 0 || len2 <= 0) {
        continue;
      }
      const cosine = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (len1 * len2)));
      if ((Math.acos(cosine) * 180) / Math.PI >= 165) {
        return true;
      }
    }
  }
  return false;
}

function hasRoomTypeInPalace(
  editor: EditorState,
  rooms: RoomPrimitive[],
  roomType: RoomPrimitive["roomType"],
  palace: BaguaPalace
): boolean {
  const bounds = primitiveBounds(editor.primitives);
  if (!bounds) {
    return false;
  }

  return rooms.some((room) => {
    if (room.roomType !== roomType) {
      return false;
    }

    return polygonToPalaces(roomPolygon(room), bounds, editor.northAngleDeg).some(
      (item) => item.palace === palace && item.overlapPct >= 35
    );
  });
}

function deriveWindowRatio(walls: SegmentPrimitive[], windows: SegmentPrimitive[]): number {
  const wallLength = walls.reduce((sum, item) => sum + segmentLengthM(item), 0);
  const windowLength = windows.reduce((sum, item) => sum + segmentLengthM(item), 0);
  const total = wallLength + windowLength;
  if (total <= 0) {
    return 0;
  }

  return windowLength / total;
}

export function deriveProjectState(editor: EditorState, inputs: InputDraftState): DerivedState {
  const rooms = editor.primitives.filter((item): item is RoomPrimitive => item.kind === "room");
  const walls = editor.primitives.filter((item): item is SegmentPrimitive => item.kind === "wall");
  const doors = editor.primitives.filter((item): item is SegmentPrimitive => item.kind === "door");
  const windows = editor.primitives.filter((item): item is SegmentPrimitive => item.kind === "window");
  const markers = editor.primitives.filter((item): item is MarkerPrimitive => item.kind === "marker");

  const autoHouseArea = deriveHouseArea(editor, rooms);
  const autoMingtangArea = deriveMingtangArea(inputs, rooms, autoHouseArea);

  const houseAreaOverride = parsePositiveOverride(inputs.house_area_override_m2);
  const mingtangAreaOverride = parsePositiveOverride(inputs.mingtang_area_override_m2);

  const houseArea = houseAreaOverride ?? autoHouseArea;
  const mingtangArea = mingtangAreaOverride ?? autoMingtangArea;

  const centerWallBlock = deriveCenterWallBlock(editor, walls, inputs.manual_flags.center_wall_block);
  const toiletInCenter = inputs.manual_flags.toilet_in_center || hasRoomTypeInPalace(editor, rooms, "toilet", "CENTER");
  const stairInCenter = inputs.manual_flags.stair_in_center || hasRoomTypeInPalace(editor, rooms, "stair", "CENTER");
  const toiletInQian = inputs.manual_flags.toilet_in_qian || hasRoomTypeInPalace(editor, rooms, "toilet", "QIAN");
  const kitchenInCenter =
    inputs.manual_flags.kitchen_in_center ||
    hasRoomTypeInPalace(editor, rooms, "kitchen", "CENTER") ||
    markers.some((marker) => marker.markerType === "stove" && primitiveBounds(editor.primitives) && pointInCenterZone(marker, primitiveBounds(editor.primitives)!));
  const openCenterLeak =
    inputs.manual_flags.open_center_leak ||
    ["atrium", "void", "open_stairwell", "skylight"].some((roomType) =>
      hasRoomTypeInPalace(editor, rooms, roomType as RoomPrimitive["roomType"], "CENTER")
    ) ||
    markers.some((marker) => ["open_center", "skylight", "open_stairwell"].includes(marker.markerType) && primitiveBounds(editor.primitives) && pointInCenterZone(marker, primitiveBounds(editor.primitives)!));
  const bounds = primitiveBounds(editor.primitives);
  const bboxArea = bounds ? Math.max(0, (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)) : 0;
  const hasMissingCorners = inputs.manual_flags.has_missing_corners || (bboxArea > 0 && autoHouseArea / bboxArea < 0.95);
  const areaLoss = inputs.manual_flags.area_loss || (bboxArea > 0 && autoHouseArea / bboxArea < 0.6);
  const centerMassSplit =
    inputs.manual_flags.center_mass_split ||
    (bounds ? walls.some((wall) => pointInCenterZone(midpoint(wall), bounds) && segmentLengthM(wall) >= 1.8) : false);
  const taijiSplit =
    inputs.manual_flags.taiji_split ||
    (bounds ? walls.some((wall) => touchesOppositeExteriorSides(wall, bounds) && pointInCenterZone(midpoint(wall), bounds)) : false);
  const qiPiercing = inputs.manual_flags.qi_piercing || deriveQiPiercing(editor, doors, markers);
  const roomDoorOpposedPairs = countDoorOpposedPairs(doors);
  const windowToSpaceRatio = deriveWindowRatio(walls, windows);
  const roomToiletDoorOpposed = hasOpposedDoorRoles(doors, "room", "toilet");
  const roomKitchenDoorOpposed = hasOpposedDoorRoles(doors, "room", "kitchen");
  const toiletKitchenDoorOpposed = hasOpposedDoorRoles(doors, "toilet", "kitchen");
  const mainRoomDoorOpposed = hasOpposedDoorRoles(doors, "main", "room");
  const mainKitchenDoorOpposed = hasOpposedDoorRoles(doors, "main", "kitchen");
  const mainToiletDoorOpposed = hasOpposedDoorRoles(doors, "main", "toilet");

  const internalFlags: Record<string, boolean> = {
    stair_in_center: stairInCenter,
    toilet_in_center: toiletInCenter,
    toilet_in_qian: toiletInQian,
    toilet_in_wenchang: inputs.manual_flags.toilet_in_wenchang,
    mingtang_not_grounded: inputs.manual_flags.mingtang_not_grounded,
    rear_window_open_on_shengqi: inputs.manual_flags.rear_window_open_on_shengqi,
    stair_corner_window_open: inputs.manual_flags.stair_corner_window_open,
    center_wall_block: centerWallBlock,
    has_missing_corners: hasMissingCorners,
    kitchen_in_center: kitchenInCenter,
    open_center_leak: openCenterLeak,
    qi_piercing: qiPiercing,
    center_mass_split: centerMassSplit,
    taiji_split: taijiSplit,
    area_loss: areaLoss,
    room_toilet_door_opposed: inputs.manual_flags.room_toilet_door_opposed || roomToiletDoorOpposed,
    room_kitchen_door_opposed: inputs.manual_flags.room_kitchen_door_opposed || roomKitchenDoorOpposed,
    toilet_kitchen_door_opposed: inputs.manual_flags.toilet_kitchen_door_opposed || toiletKitchenDoorOpposed,
    main_door_room_door_opposed: inputs.manual_flags.main_door_room_door_opposed || mainRoomDoorOpposed,
    main_door_kitchen_door_opposed: inputs.manual_flags.main_door_kitchen_door_opposed || mainKitchenDoorOpposed,
    main_door_toilet_door_opposed: inputs.manual_flags.main_door_toilet_door_opposed || mainToiletDoorOpposed
  };

  const rootFlags: Record<string, boolean> = {
    front_pair_gap_aligned: inputs.manual_flags.front_pair_gap_aligned,
    hard_to_change_layout: inputs.manual_flags.hard_to_change_layout,
    direct_chong: inputs.manual_flags.direct_chong,
    shape_color_sha: inputs.manual_flags.shape_color_sha
  };

  for (const [key, enabled] of Object.entries(inputs.external_sha_flags)) {
    rootFlags[key] = enabled;
  }

  return {
    house_area_m2: round(houseArea, 2),
    mingtang_area_m2: round(mingtangArea, 2),
    internal_layout: {
      flags: internalFlags,
      measurements: {
        window_to_space_ratio: round(windowToSpaceRatio, 3)
      },
      counts: {
        entry_qi_turns: inputs.manual_counts.entry_qi_turns,
        room_door_opposed_pairs: roomDoorOpposedPairs
      }
    },
    measurements: {
      house_height_m: parseNumericText(inputs.manual_measurements.house_height_m, 3),
      mingtang_width_m: parseNumericText(inputs.manual_measurements.mingtang_width_m, 2),
      front_pair_gap_distance_m: parseNumericText(inputs.manual_measurements.front_pair_gap_distance_m, 5)
    },
    flags: rootFlags
  };
}
