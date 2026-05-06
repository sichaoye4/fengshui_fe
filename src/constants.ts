import type {
  Direction24Code,
  EditorState,
  ExternalShaFlags,
  InputDraftState,
  Tool
} from "./types/fengshui";

export const PIXELS_PER_METER = 100;
export const DEFAULT_CANVAS_SIZE = { width: 960, height: 640 };

export const TOOL_ORDER: Tool[] = ["select", "delete", "wall"];

export const GRID_SIZE_PRESETS_M = [0.05, 0.1, 0.2, 0.5, 1];

export const BAGUA_OPTIONS = ["QIAN", "DUI", "LI", "ZHEN", "XUN", "KAN", "GEN", "KUN"] as const;
export const WUXING_OPTIONS = ["WOOD", "FIRE", "EARTH", "METAL", "WATER"] as const;
export const STRENGTH_OPTIONS = ["weak", "normal", "strong"] as const;
export const OWNER_GENDER_OPTIONS = ["male", "female"] as const;
export const MAX_HOUSEHOLD_MEMBERS = 5;
export const HOUSEHOLD_RELATIONSHIP_OPTIONS = [
  "owner",
  "father",
  "mother",
  "spouse",
  "child",
  "elder",
  "other"
] as const;
export const DIRECTION24_OPTIONS: Direction24Code[] = [
  "REN",
  "ZI",
  "GUI",
  "CHOU",
  "GEN",
  "YIN",
  "JIA",
  "MAO",
  "YI",
  "CHEN",
  "XUN",
  "SI",
  "BING",
  "WU",
  "DING",
  "WEI",
  "KUN",
  "SHEN",
  "GENG",
  "YOU",
  "XIN",
  "XU",
  "QIAN",
  "HAI"
];

export const COMMON_EXTERNAL_SHA_IDS = [
  "external_sha_001",
  "external_sha_004",
  "external_sha_005",
  "external_sha_010",
  "external_sha_018",
  "external_sha_021",
  "external_sha_034",
  "external_sha_048",
  "external_sha_068",
  "external_sha_069"
] as const;

export const ALL_EXTERNAL_SHA_IDS = Array.from(
  { length: 80 },
  (_, idx) => `external_sha_${String(idx + 1).padStart(3, "0")}`
);

export function createDefaultExternalShaFlags(): ExternalShaFlags {
  const map: ExternalShaFlags = {};
  for (const id of ALL_EXTERNAL_SHA_IDS) {
    map[id] = false;
  }
  return map;
}

export function createDefaultEditorState(): EditorState {
  return {
    gridSizeM: 0.1,
    viewport: {
      x: 0,
      y: 0,
      scale: 1
    },
    northAngleDeg: 0,
    entrance: null,
    primitives: [],
    selectedId: null
  };
}

export function createDefaultInputState(): InputDraftState {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return {
    house: {
      name: "untitled_house",
      sitting_bagua: "KAN",
      facing_bagua: "",
      door_bagua: "",
      sitting_direction24: "",
      facing_direction24: "",
      total_floors: "",
      current_floor: "",
      house_index: "",
      room_count: ""
    },
    case_contact: {
      case_contact_name: "",
      case_notes: ""
    },
    members: [],
    temporal: {
      gregorian_date: `${yyyy}-${mm}-${dd}`,
      gregorian_time: "12:00:00",
      lunar_month: ""
    },
    manual_flags: {
      stair_in_center: false,
      toilet_in_center: false,
      toilet_in_qian: false,
      toilet_in_wenchang: false,
      mingtang_not_grounded: false,
      rear_window_open_on_shengqi: false,
      stair_corner_window_open: false,
      center_wall_block: false,
      room_toilet_door_opposed: false,
      room_kitchen_door_opposed: false,
      toilet_kitchen_door_opposed: false,
      main_door_room_door_opposed: false,
      main_door_kitchen_door_opposed: false,
      main_door_toilet_door_opposed: false,
      hard_to_change_layout: false,
      direct_chong: false,
      shape_color_sha: false,
      front_pair_gap_aligned: false
    },
    manual_counts: {
      entry_qi_turns: 0
    },
    manual_measurements: {
      house_height_m: "3",
      mingtang_width_m: "2",
      front_pair_gap_distance_m: "5"
    },
    manual_categories: {
      self_strength: "normal",
      incoming_strength: "normal"
    },
    external_sha_flags: createDefaultExternalShaFlags(),
    mingtang_room_id: null,
    house_area_override_m2: "",
    mingtang_area_override_m2: ""
  };
}
