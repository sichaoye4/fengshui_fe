export type Language = "en" | "zh";

export type FloorplanPhase = "upload" | "edit";

export interface FloorplanAnalysis {
  width: number;
  height: number;
  walls: Array<[number, number, number, number]>;
  rooms: Array<Array<[number, number]>>;
}

export type BaseTool = "select" | "delete" | "wall" | "door" | "window";
export type Tool = BaseTool | MarkerType;
export type AnalysisTab = "house_liqi" | "temporal" | "zhai_yun" | "structure" | "static_house" | "dongzhai";

export type FindingStatus = "matched" | "not_matched" | "not_evaluable";
export type FindingFilter = "all" | FindingStatus;

export type BaguaCode = "QIAN" | "DUI" | "LI" | "ZHEN" | "XUN" | "KAN" | "GEN" | "KUN";
export type WuXingCode = "WOOD" | "FIRE" | "EARTH" | "METAL" | "WATER";
export type Direction24Code =
  | "REN"
  | "ZI"
  | "GUI"
  | "CHOU"
  | "GEN"
  | "YIN"
  | "JIA"
  | "MAO"
  | "YI"
  | "CHEN"
  | "XUN"
  | "SI"
  | "BING"
  | "WU"
  | "DING"
  | "WEI"
  | "KUN"
  | "SHEN"
  | "GENG"
  | "YOU"
  | "XIN"
  | "XU"
  | "QIAN"
  | "HAI";
export type OwnerGender = "male" | "female";

export interface PointM {
  x: number;
  y: number;
}

export type RoomType =
  | "living"
  | "bedroom"
  | "toilet"
  | "kitchen"
  | "stair"
  | "hallway"
  | "storage"
  | "balcony"
  | "unknown";

export type MarkerType =
  | "main_door"
  | "room_door"
  | "toilet_door"
  | "kitchen_door"
  | "window"
  | "toilet_fixture"
  | "stair"
  | "stove"
  | "entry_turn";

export type DoorRole = "main" | "room" | "toilet" | "kitchen";

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface SegmentPrimitive {
  id: string;
  kind: "wall" | "door" | "window";
  start: PointM;
  end: PointM;
  role?: DoorRole;
  roomId?: string;
}

export interface RoomPrimitive {
  id: string;
  kind: "room";
  x: number;
  y: number;
  width: number;
  height: number;
  points?: PointM[];
  label?: string;
  roomType?: RoomType;
}

export interface MarkerPrimitive {
  id: string;
  kind: "marker";
  markerType: MarkerType;
  x: number;
  y: number;
  roomId?: string;
  directionDeg?: number;
  label?: string;
}

export type Primitive = SegmentPrimitive | RoomPrimitive | MarkerPrimitive;

export interface FloorplanSource {
  imageDataUrl?: string;
  imageWidth: number;
  imageHeight: number;
  imageName?: string;
  contentType?: string;
  analysis?: FloorplanAnalysis;
}

export interface ManualFlags {
  stair_in_center: boolean;
  toilet_in_center: boolean;
  toilet_in_qian: boolean;
  toilet_in_wenchang: boolean;
  mingtang_not_grounded: boolean;
  rear_window_open_on_shengqi: boolean;
  stair_corner_window_open: boolean;
  center_wall_block: boolean;
  room_toilet_door_opposed: boolean;
  room_kitchen_door_opposed: boolean;
  toilet_kitchen_door_opposed: boolean;
  main_door_room_door_opposed: boolean;
  main_door_kitchen_door_opposed: boolean;
  main_door_toilet_door_opposed: boolean;
  hard_to_change_layout: boolean;
  direct_chong: boolean;
  shape_color_sha: boolean;
  front_pair_gap_aligned: boolean;
}

export interface ManualCounts {
  entry_qi_turns: number;
}

export interface ManualMeasurements {
  house_height_m: string;
  mingtang_width_m: string;
  front_pair_gap_distance_m: string;
}

export interface ManualCategories {
  self_strength: "weak" | "normal" | "strong";
  incoming_strength: "weak" | "normal" | "strong";
}

export interface HouseMetaInput {
  name: string;
  sitting_bagua: BaguaCode;
  facing_bagua: "" | BaguaCode;
  door_bagua: "" | BaguaCode;
  sitting_direction24: "" | Direction24Code;
  facing_direction24: "" | Direction24Code;
  total_floors: string;
  current_floor: string;
  house_index: string;
  room_index?: string;
  room_count: string;
  static_cycle_reversed?: boolean;
}

export interface CaseContactInput {
  case_contact_name: string;
  case_notes: string;
}

export interface HouseholdMemberInput {
  id: string;
  name: string;
  birth_year: string;
  gender: "" | OwnerGender;
  is_primary_resident: boolean;
  relationship: string;
}

export interface TemporalInput {
  gregorian_date: string;
  gregorian_time: string;
  lunar_month: string;
}

export type ExternalShaFlags = Record<string, boolean>;

export interface InputDraftState {
  house: HouseMetaInput;
  case_contact: CaseContactInput;
  members: HouseholdMemberInput[];
  temporal: TemporalInput;
  manual_flags: ManualFlags;
  manual_counts: ManualCounts;
  manual_measurements: ManualMeasurements;
  manual_categories: ManualCategories;
  external_sha_flags: ExternalShaFlags;
  mingtang_room_id: string | null;
  house_area_override_m2: string;
  mingtang_area_override_m2: string;
}

export interface EditorState {
  gridSizeM: number;
  viewport: ViewportState;
  northAngleDeg: number;
  entrance: PointM | null;
  primitives: Primitive[];
  selectedId: string | null;
  floorplan?: FloorplanSource;
  showBaguaOverlay?: boolean;
}

export interface DerivedState {
  house_area_m2: number;
  mingtang_area_m2: number;
  internal_layout: {
    flags: Record<string, boolean>;
    measurements: Record<string, number>;
    counts: Record<string, number>;
  };
  measurements: Record<string, number>;
  flags: Record<string, boolean>;
}

export interface RuleFinding {
  formula_id: string;
  title_zh: string;
  title_en: string;
  status: FindingStatus;
  severity: string;
  confidence: string;
  message_zh: string;
  message_en: string;
  missing_fields: string[];
  source_refs: string[];
}

export interface RuleEvaluationResponse {
  house_name: string;
  findings: RuleFinding[];
  matched_count: number;
  not_matched_count: number;
  not_evaluable_count: number;
  static_house_score: number | null;
  static_house_details: {
    score?: number;
    status_zh?: string;
    status_en?: string;
    self_element?: string;
    relations?: Array<Record<string, unknown>>;
    disease_causes?: string[];
    wealth_causes?: string[];
    leakage_causes?: string[];
    rule_note_zh?: string;
    rule_note_en?: string;
  };
  temporal_summary: Record<string, unknown>;
}

export interface RuleEvaluateRequest {
  house_profile: {
    name: string;
    sitting_bagua: BaguaCode;
    facing_bagua?: BaguaCode;
    door_bagua?: BaguaCode;
    sitting_direction24?: Direction24Code;
    facing_direction24?: Direction24Code;
    total_floors?: number;
    current_floor?: number;
    room_index?: number;
    room_count?: number;
    static_cycle_reversed?: boolean;
    house_area_m2: number;
    mingtang_area_m2: number;
    flags: Record<string, boolean>;
    measurements: Record<string, number>;
    categories: Record<string, string>;
    internal_layout: {
      flags: Record<string, boolean>;
      measurements: Record<string, number>;
      counts: Record<string, number>;
    };
  };
  temporal_context: {
    year_ganzhi: string;
    month_ganzhi?: string;
    seasonal_half?: "winter_to_summer" | "summer_to_winter";
    notes: Record<string, unknown>;
  };
}

export interface BazhaiPersonHouseResponse {
  year: number;
  gender: OwnerGender;
  gender_zh: string;
  person_minggua: {
    minggua_code?: string;
    minggua_zh?: string;
    group?: {
      group_code?: "EAST4" | "WEST4";
      group_en?: string;
      group_zh?: string;
    };
  };
  house_bagua: string;
  house_bagua_code: BaguaCode;
  house_bagua_zh: string;
  house_group: {
    group_code?: "EAST4" | "WEST4";
    group_en?: string;
    group_zh?: string;
  };
  group_match: boolean;
  star_relation: {
    star_code?: string;
    star_name_en?: string;
    star_name_zh?: string;
    category_en?: string;
    category_zh?: string;
    is_auspicious?: boolean;
    tier_en?: string;
    tier_zh?: string;
    pattern_en?: string;
    pattern_zh?: string;
  };
  overall_is_auspicious: boolean;
  overall_label_zh: string;
  overall_label_en: string;
}

export interface HouseholdBazhaiMemberPayload {
  member_id: string;
  name: string;
  birth_year?: number;
  gender?: OwnerGender;
  is_primary_resident: boolean;
  relationship: string;
}

export interface HouseholdBazhaiRequest {
  house_bagua: BaguaCode;
  members: HouseholdBazhaiMemberPayload[];
}

export interface HouseholdBazhaiMemberResult {
  member_id: string;
  name: string;
  birth_year: number | null;
  gender: OwnerGender | null;
  is_primary_resident: boolean;
  relationship: string;
  status: "matched" | "not_evaluable" | "error";
  missing_fields: string[];
  result: BazhaiPersonHouseResponse | null;
  error?: string;
}

export interface HouseholdBazhaiResponse {
  house_bagua: BaguaCode;
  member_results: HouseholdBazhaiMemberResult[];
}

export type BazhaiMissingField =
  | "members.empty"
  | "house.sitting_bagua";

export type DongzhaiMissingField =
  | "house.facing_bagua"
  | "house.door_bagua"
  | "house.total_floors"
  | "house.current_floor"
  | "house.current_floor.within_total_floors";

export interface DongzhaiFloorEvaluateRequest {
  building_facing_bagua: BaguaCode;
  door_bagua: BaguaCode;
  total_floors: number;
  current_floor: number;
  door_sitting_bagua?: BaguaCode;
  has_obvious_shape_sha: boolean;
}

export interface DongzhaiFloorEvaluation {
  floor: number;
  star_code?: string;
  star_name_zh?: string;
  star_name_en?: string;
  star_element_code?: WuXingCode | string;
  is_auspicious?: boolean;
  label_zh?: string;
  label_en?: string;
  [key: string]: unknown;
}

export interface DongzhaiFloorEvaluateResponse {
  evaluable: boolean;
  not_evaluable_reason_zh: string;
  not_evaluable_reason_en: string;
  building_facing_bagua: string;
  building_facing_bagua_code: string;
  building_facing_bagua_zh: string;
  door_bagua: string;
  door_bagua_code: string;
  door_bagua_zh: string;
  door_sitting_bagua: string;
  door_sitting_bagua_code: string;
  door_sitting_bagua_zh: string;
  base_bagua: string;
  base_bagua_code: string;
  base_bagua_zh: string;
  base_rule: string;
  total_floors: number;
  current_floor: number;
  method_code: string;
  method_zh: string;
  method_en: string;
  initial_star_relation: Record<string, unknown>;
  floor_sequence: DongzhaiFloorEvaluation[];
  current_floor_evaluation: DongzhaiFloorEvaluation | null;
  overall_is_auspicious: boolean | null;
  overall_label_zh: string;
  overall_label_en: string;
  warnings: Array<Record<string, string>>;
}

export interface JingzhaiMemberPayload {
  member_id: string;
  name: string;
  birth_year: number;
  gender: OwnerGender;
}

export interface JingzhaiFullRequest {
  house_profile: RuleEvaluateRequest["house_profile"];
  persons: JingzhaiMemberPayload[];
  solar_year: number;
}

export interface JingzhaiAttributeSummary {
  bagua?: string | null;
  bagua_zh?: string | null;
  element?: string | null;
  number?: number | null;
  index?: number | null;
}

export interface JingzhaiPhase {
  phase_index?: number;
  lord_element?: string;
  lord_source?: string;
  lord_source_zh?: string;
  years_range?: string;
  years_start?: number;
  years_end?: number;
  attribute_count?: number;
  total_years?: number;
}

export interface JingzhaiDecadeAnalysis {
  decade_index?: number;
  years_range?: string;
  years_start?: number;
  years_end?: number;
  lord_element?: string;
  lord_source?: string;
  lord_source_zh?: string;
  diagnosis?: Record<string, unknown> | null;
  affliction?: Record<string, unknown> | null;
  pathogen?: Record<string, unknown> | null;
  affected_persons?: Record<string, unknown> | null;
  interactions?: Array<Record<string, unknown>>;
  wealth_sources?: Array<Record<string, unknown>>;
  leakage_sinks?: Array<Record<string, unknown>>;
  support_sources?: Array<Record<string, unknown>>;
  door_recommendation?: JingzhaiDoorRecommendation | null;
}

export interface JingzhaiDoorOption {
  bagua: string;
  bagua_zh: string;
  element: string;
  relation: string;
  relation_code: string;
}

export interface JingzhaiScoredDoorOption extends JingzhaiDoorOption {
  position: string;
  label_zh: string;
  score: number;
}

export interface JingzhaiDoorAnalysis {
  available: boolean;
  sitting_bagua?: string;
  sitting_bagua_zh?: string;
  sitting_element?: string;
  facing_bagua?: string;
  facing_bagua_zh?: string;
  door_bagua?: string;
  door_bagua_zh?: string;
  center_door?: JingzhaiDoorOption;
  dragon_door?: JingzhaiDoorOption;
  tiger_door?: JingzhaiDoorOption;
}

export interface JingzhaiDoorRecommendation {
  available: boolean;
  door_options: JingzhaiScoredDoorOption[];
  recommended: string[];
  recommended_keys: string[];
  rationale_zh: string;
  rationale_en: string;
  condition: string;
}

export interface JingzhaiHouseAnalysis {
  status: "ok" | "partial" | "not_evaluable" | string;
  reason_zh?: string;
  reason_en?: string;
  attributes?: {
    sitting?: JingzhaiAttributeSummary;
    floor?: JingzhaiAttributeSummary;
    room?: JingzhaiAttributeSummary;
  };
  phases?: JingzhaiPhase[];
  decade_analyses?: JingzhaiDecadeAnalysis[];
  door_analysis?: JingzhaiDoorAnalysis | null;
  overall_summary?: {
    total_decades_analyzed?: number;
    afflicted_decades_count?: number;
    has_affliction?: boolean;
    summary_zh?: string;
    summary_en?: string;
  };
  first_decade_only?: JingzhaiDecadeAnalysis;
}

export interface JingzhaiAffectedDecade {
  decade_index?: number;
  years_range?: string;
  years_start?: number;
  years_end?: number;
  lord_element?: string;
  pathogen_bagua?: string;
  pathogen_bagua_zh?: string;
  pathogen_element?: string;
  matching_categories?: Array<Record<string, unknown>>;
  person_bagua?: string;
  person_bagua_zh?: string;
}

export interface JingzhaiPersonImpactPerson {
  member_id: string;
  name: string;
  birth_year?: number;
  gender?: OwnerGender | string;
  minggua?: Record<string, unknown>;
  status: "ok" | "not_evaluable" | "error" | string;
  reason?: string;
  is_affected?: boolean;
  affected_decades_count?: number;
  affected_decades?: JingzhaiAffectedDecade[];
  summary_zh?: string;
}

export interface JingzhaiPersonImpact {
  house_status: string;
  persons: JingzhaiPersonImpactPerson[];
  total_affected: number;
  total_persons: number;
}

export interface JingzhaiFullResponse {
  house_analysis: JingzhaiHouseAnalysis;
  person_impact?: JingzhaiPersonImpact;
}

export type TabFindingFilterState = {
  structure: FindingFilter;
};

export interface EvaluationSnapshot {
  requested_at: string;
  payload_hash: string;
  request: RuleEvaluateRequest;
  response: RuleEvaluationResponse;
  bazhai_results: HouseholdBazhaiResponse | null;
  dongzhai_result: DongzhaiFloorEvaluateResponse | null;
  jingzhai_result: JingzhaiFullResponse | null;
}

export interface ProjectSnapshot {
  schema_version: "1.0" | "1.1" | "1.2" | "1.3";
  editor: EditorState;
  inputs: InputDraftState;
  derived: DerivedState;
  evaluation: EvaluationSnapshot | null;
}

// ── Temporal API response types ──

export interface GregorianConversionResponse {
  input: {
    date: string;
    time: string;
    timezone: string;
  };
  converted_timezone: string;
  converted_datetime: string;
  pillars: {
    year_ganzhi: string;
    month_ganzhi: string;
    day_ganzhi: string;
    time_ganzhi: string;
  };
  year_stem: string;
  year_branch: string;
  month_stem: string;
  month_branch: string;
  rule_month: number;
}

export interface TemporalAnnualResponse {
  basis: string;
  year_ganzhi: string;
  year_stem: string;
  year_branch: string;
  tai_sui_sui_po: {
    tai_sui: string;
    sui_po: string;
  };
  san_sha: string[];
  wuji_sha: string[];
  taiyang: {
    year_ganzhi: string;
    tai_sui: string;
    taiyang_shen: string;
    taiyang_position: string;
  };
  nobleman: {
    year_ganzhi_code: string;
    nobleman_branches: {
      yang: string;
      yin: string;
    };
  };
  lu_ma: {
    lu: string;
    ma: string;
  };
}

export interface TemporalMonthlyResponse {
  basis: string;
  year_ganzhi: string;
  month_ganzhi: string;
  rule_month: number;
  center_star: number;
  anjian_sha: string;
  wuji_sha: string[];
}

export interface FlyingStarGridPayload {
  center_star: number;
  flight_direction: string;
  directional: Record<string, number>;
  matrix_south_up: number[][];
  bagua_star: Record<string, number>;
}

export interface FlyingStarAnnualResponse extends FlyingStarGridPayload {}

export interface LiqiPalaceRelationRow {
  palace_bagua: string;
  palace_direction: string;
  palace_element?: string;
  flying_star: number;
  flying_star_native_bagua?: string;
  flying_star_element?: string;
  relation_palace_to_flying_star?: string;
  qi_type: string;
}

export interface LiqiHouseResponse {
  sitting_bagua: string;
  sitting_bagua_zh: string;
  center_star: number;
  center_bagua: string;
  center_star_element: string;
  flying_star_grid: FlyingStarGridPayload;
  qi_type_labels: Record<string, Record<string, string>>;
  five_qi_palaces: Record<string, string[]>;
  five_qi_directions: Record<string, string[]>;
  palace_relation_rows: LiqiPalaceRelationRow[];
  wealth_positions: Record<string, unknown>;
  anchoring_rule_zh: string;
  anchoring_rule_en: string;
}

export interface PeriodFourYunResponse {
  year: number;
  sitting_bagua?: string;
  hetu_five_yun?: PeriodHetuFiveYunResponse;
  sanyuan_jiuyun?: PeriodSanyuanJiuyunResponse;
  tonglin_shanyun?: PeriodTonglinShanyunResponse;
  zhuanlin_shanyun?: PeriodZhuanlinShanyunResponse;
}

export interface PeriodHetuFiveYunResponse {
  year: number;
  sitting_bagua?: string;
  year_ganzhi?: unknown;
  year_ganzhi_code?: string;
  year_ganzhi_zh?: string;
  block?: number;
  period_start_ganzhi?: unknown;
  period_start_ganzhi_code?: string;
  period_start_ganzhi_zh?: string;
  period_element: string;
  qualified_palaces: string[];
  sitting_qualifies?: boolean | null;
}

export interface PeriodSanyuanJiuyunResponse {
  year: number;
  sitting_bagua?: string;
  cycle_start_year?: number;
  period_number: number;
  period_name_zh?: string;
  period_start_year: number;
  period_end_year: number;
  yuan?: string;
  period_star_bagua?: string;
  period_element?: string;
  qualified_palaces?: string[];
  sitting_qualifies?: boolean | null;
}

export interface PeriodFlyingGanzhiGrid {
  palace_ganzhi?: Record<string, unknown>;
  palace_ganzhi_code?: Record<string, string>;
  palace_ganzhi_zh?: Record<string, string>;
  palace_nayin?: Record<string, string>;
  [key: string]: unknown;
}

export interface PeriodPalaceStrength {
  palace_bagua: string;
  sitting_element?: string;
  palace_ganzhi?: unknown;
  palace_ganzhi_code?: string;
  palace_ganzhi_zh?: string;
  palace_nayin_element?: string;
  relation_palace_nayin_to_sitting?: string;
  strength?: string;
  is_strong?: boolean;
}

export interface PeriodTonglinShanyunResponse {
  year: number;
  yuan: string;
  anchor_bagua: string;
  jia_decade_start_year?: number;
  jia_decade_start_ganzhi?: unknown;
  jia_decade_start_ganzhi_code?: string;
  jia_decade_start_ganzhi_zh?: string;
  flying_grid?: PeriodFlyingGanzhiGrid;
  commanding_ganzhi?: unknown;
  commanding_ganzhi_code?: string;
  commanding_ganzhi_zh?: string;
  commanding_nayin_element?: string;
  qualified_palaces: string[];
  palace_strength?: Record<string, PeriodPalaceStrength>;
  sitting_bagua?: string | null;
  sitting_qualifies?: boolean | null;
  sitting_strength?: PeriodPalaceStrength | null;
}

export interface PeriodZhuanlinPalaceProfile {
  palace_bagua: string;
  center_ganzhi?: unknown;
  center_ganzhi_code?: string;
  center_ganzhi_zh?: string;
  center_nayin_element?: string;
  target_ganzhi?: unknown;
  target_ganzhi_code?: string;
  target_ganzhi_zh?: string;
  target_nayin_element?: string;
  relation_target_to_center?: string;
  strength?: string;
  is_strong?: boolean;
  flying_grid?: PeriodFlyingGanzhiGrid;
}

export interface PeriodZhuanlinShanyunResponse {
  year: number;
  source_tonglin?: PeriodTonglinShanyunResponse;
  qualified_palaces: string[];
  palace_profiles?: Record<string, PeriodZhuanlinPalaceProfile>;
  sitting_bagua?: string | null;
  sitting_profile?: PeriodZhuanlinPalaceProfile | null;
}

export interface TemporalDataSnapshot {
  annual: TemporalAnnualResponse | null;
  monthly: TemporalMonthlyResponse | null;
  flyingStar: FlyingStarAnnualResponse | null;
  gregorianConversion: GregorianConversionResponse | null;
}
