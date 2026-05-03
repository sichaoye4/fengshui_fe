import type { DerivedState, EditorState, InputDraftState, RoomPrimitive, SegmentPrimitive } from "../types/fengshui";
import { countDoorOpposedPairs, midpoint, pointInCenterZone, primitiveBounds, roomAreaM2, segmentLengthM } from "./geometry";

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

  const autoHouseArea = deriveHouseArea(editor, rooms);
  const autoMingtangArea = deriveMingtangArea(inputs, rooms, autoHouseArea);

  const houseAreaOverride = parsePositiveOverride(inputs.house_area_override_m2);
  const mingtangAreaOverride = parsePositiveOverride(inputs.mingtang_area_override_m2);

  const houseArea = houseAreaOverride ?? autoHouseArea;
  const mingtangArea = mingtangAreaOverride ?? autoMingtangArea;

  const centerWallBlock = deriveCenterWallBlock(editor, walls, inputs.manual_flags.center_wall_block);
  const roomDoorOpposedPairs = countDoorOpposedPairs(doors);
  const windowToSpaceRatio = deriveWindowRatio(walls, windows);

  const internalFlags: Record<string, boolean> = {
    stair_in_center: inputs.manual_flags.stair_in_center,
    toilet_in_center: inputs.manual_flags.toilet_in_center,
    toilet_in_qian: inputs.manual_flags.toilet_in_qian,
    toilet_in_wenchang: inputs.manual_flags.toilet_in_wenchang,
    mingtang_not_grounded: inputs.manual_flags.mingtang_not_grounded,
    rear_window_open_on_shengqi: inputs.manual_flags.rear_window_open_on_shengqi,
    stair_corner_window_open: inputs.manual_flags.stair_corner_window_open,
    center_wall_block: centerWallBlock,
    room_toilet_door_opposed: inputs.manual_flags.room_toilet_door_opposed,
    room_kitchen_door_opposed: inputs.manual_flags.room_kitchen_door_opposed,
    toilet_kitchen_door_opposed: inputs.manual_flags.toilet_kitchen_door_opposed,
    main_door_room_door_opposed: inputs.manual_flags.main_door_room_door_opposed,
    main_door_kitchen_door_opposed: inputs.manual_flags.main_door_kitchen_door_opposed,
    main_door_toilet_door_opposed: inputs.manual_flags.main_door_toilet_door_opposed
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
