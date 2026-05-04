// API payload builders.
// Wire field names must match backend_api_contract.md — when renaming UI fields,
// always check whether the API contract uses a different name.
// See: ../fengshui/docs/backend_api_contract.md
import { BAGUA_OPTIONS, DIRECTION24_OPTIONS, WUXING_OPTIONS } from "../constants";
import type {
  BaguaCode,
  BazhaiMissingField,
  DerivedState,
  Direction24Code,
  DongzhaiFloorEvaluateRequest,
  DongzhaiMissingField,
  EditorState,
  HouseholdBazhaiRequest,
  InputDraftState,
  JingzhaiFullRequest,
  RuleEvaluateRequest,
  WuXingCode
} from "../types/fengshui";
import { calculateBaziDate, deriveMonthGanzhiCode } from "./bazi";

function parseYearFromGregorian(dateStr: string): number {
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return date.getFullYear();
  }
  return new Date().getFullYear();
}

function sanitizeNumber(value: number): number {
  if (Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function parseOptionalInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isInteger(value)) {
    return null;
  }
  return value;
}

function parseOptionalPositiveInteger(raw: string): number | null {
  const value = parseOptionalInteger(raw);
  if (value === null || value <= 0) {
    return null;
  }
  return value;
}

function parseOptionalEnum<T extends string>(raw: string, options: readonly T[]): T | null {
  if ((options as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return null;
}

function normalizeGender(raw: string): "male" | "female" | null {
  if (raw === "male" || raw === "female") {
    return raw;
  }
  return null;
}

function calculateOwnerAgeFromBirthYear(rawBirthYear: string, referenceYear: number): number | null {
  const birthYear = parseOptionalInteger(rawBirthYear);
  if (birthYear === null || birthYear <= 0) {
    return null;
  }

  const age = referenceYear - birthYear;
  if (!Number.isInteger(age) || age < 0) {
    return null;
  }

  return age;
}

function parseYearFromInputDate(raw: string): number {
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getFullYear();
  }
  return new Date().getFullYear();
}

export function getBazhaiMissingFields(inputs: InputDraftState): BazhaiMissingField[] {
  const missing: BazhaiMissingField[] = [];

  if (!inputs.house.sitting_bagua) {
    missing.push("house.sitting_bagua");
  }
  if (inputs.members.length === 0) {
    missing.push("members.empty");
  }
  return missing;
}

export function createHouseholdBazhaiRequest(inputs: InputDraftState): HouseholdBazhaiRequest | null {
  const missing = getBazhaiMissingFields(inputs);
  if (missing.length > 0) {
    return null;
  }

  return {
    house_bagua: inputs.house.sitting_bagua,
    members: inputs.members.map((member) => {
      const birthYear = parseOptionalInteger(member.birth_year);
      const gender = normalizeGender(member.gender);
      return {
        member_id: member.id,
        name: member.name,
        ...(birthYear !== null && birthYear > 0 ? { birth_year: birthYear } : {}),
        ...(gender ? { gender } : {}),
        is_primary_resident: member.is_primary_resident,
        relationship: member.relationship
      };
    })
  };
}

export function getDongzhaiMissingFields(inputs: InputDraftState): DongzhaiMissingField[] {
  const missing: DongzhaiMissingField[] = [];
  const facingBagua = parseOptionalEnum<BaguaCode>(inputs.house.facing_bagua, BAGUA_OPTIONS);
  const doorBagua = parseOptionalEnum<BaguaCode>(inputs.house.door_bagua, BAGUA_OPTIONS);
  const totalFloors = parseOptionalPositiveInteger(inputs.house.total_floors);
  const currentFloor = parseOptionalPositiveInteger(inputs.house.current_floor);

  if (!facingBagua) {
    missing.push("house.facing_bagua");
  }
  if (!doorBagua) {
    missing.push("house.door_bagua");
  }
  if (totalFloors === null) {
    missing.push("house.total_floors");
  }
  if (currentFloor === null) {
    missing.push("house.current_floor");
  }
  if (totalFloors !== null && currentFloor !== null && currentFloor > totalFloors) {
    missing.push("house.current_floor.within_total_floors");
  }

  return missing;
}

export function createDongzhaiFloorRequest(inputs: InputDraftState): DongzhaiFloorEvaluateRequest | null {
  if (getDongzhaiMissingFields(inputs).length > 0) {
    return null;
  }

  const facingBagua = parseOptionalEnum<BaguaCode>(inputs.house.facing_bagua, BAGUA_OPTIONS);
  const doorBagua = parseOptionalEnum<BaguaCode>(inputs.house.door_bagua, BAGUA_OPTIONS);
  const totalFloors = parseOptionalPositiveInteger(inputs.house.total_floors);
  const currentFloor = parseOptionalPositiveInteger(inputs.house.current_floor);

  if (!facingBagua || !doorBagua || totalFloors === null || currentFloor === null) {
    return null;
  }

  return {
    building_facing_bagua: facingBagua,
    door_bagua: doorBagua,
    total_floors: totalFloors,
    current_floor: currentFloor,
    has_obvious_shape_sha: inputs.manual_flags.shape_color_sha
  };
}

export function createJingzhaiFullRequest(
  editor: EditorState,
  inputs: InputDraftState,
  derived: DerivedState
): JingzhaiFullRequest {
  const evaluationRequest = createEvaluationRequest(editor, inputs, derived);
  const persons = inputs.members.flatMap((member) => {
    const birthYear = parseOptionalInteger(member.birth_year);
    const gender = normalizeGender(member.gender);
    if (birthYear === null || birthYear <= 0 || !gender) {
      return [];
    }
    return [
      {
        member_id: member.id,
        name: member.name,
        birth_year: birthYear,
        gender
      }
    ];
  });

  return {
    house_profile: evaluationRequest.house_profile,
    persons,
    solar_year: parseYearFromInputDate(inputs.temporal.gregorian_date)
  };
}

export function createEvaluationRequest(
  editor: EditorState,
  inputs: InputDraftState,
  derived: DerivedState
): RuleEvaluateRequest {
  const year = parseYearFromGregorian(inputs.temporal.gregorian_date);
  const members = inputs.members.map((member) => ({
    id: member.id,
    name: member.name,
    age: calculateOwnerAgeFromBirthYear(member.birth_year, year),
    birth_year: parseOptionalInteger(member.birth_year),
    gender: normalizeGender(member.gender),
    is_primary_resident: member.is_primary_resident,
    relationship: member.relationship
  }));
  const baziDate = calculateBaziDate(inputs.temporal.gregorian_date, inputs.temporal.gregorian_time);
  const ruleMonthOverride = parseOptionalInteger(inputs.temporal.lunar_month);
  const ruleMonth = ruleMonthOverride ?? baziDate?.rule_month_from_jieqi ?? null;
  if (!baziDate?.year_ganzhi_code) {
    throw new Error("Unable to derive Ganzhi temporal context from Gregorian date/time.");
  }
  const yearGanzhi = baziDate.year_ganzhi_code;
  const monthGanzhi =
    ruleMonthOverride !== null
      ? deriveMonthGanzhiCode(baziDate?.year_stem_code ?? null, ruleMonthOverride)
      : baziDate?.month_ganzhi_code ?? null;

  const facingBagua = parseOptionalEnum<BaguaCode>(inputs.house.facing_bagua, BAGUA_OPTIONS);
  const doorBagua = parseOptionalEnum<BaguaCode>(inputs.house.door_bagua, BAGUA_OPTIONS);
  const sittingDirection24 = parseOptionalEnum<Direction24Code>(
    inputs.house.sitting_direction24,
    DIRECTION24_OPTIONS
  );
  const facingDirection24 = parseOptionalEnum<Direction24Code>(
    inputs.house.facing_direction24,
    DIRECTION24_OPTIONS
  );
  const totalFloors = parseOptionalPositiveInteger(inputs.house.total_floors);
  const currentFloor = parseOptionalPositiveInteger(inputs.house.current_floor);
  // UI field: house_index -> API wire field: room_index (see backend_api_contract.md)
  const roomIndex = parseOptionalPositiveInteger(inputs.house.house_index || inputs.house.room_index || "");
  const roomCount = parseOptionalPositiveInteger(inputs.house.room_count);
  const staticCycleReversed = inputs.house.static_cycle_reversed === true;

  const payload: RuleEvaluateRequest = {
    house_profile: {
      name: inputs.house.name,
      sitting_bagua: inputs.house.sitting_bagua,
      ...(facingBagua ? { facing_bagua: facingBagua } : {}),
      ...(doorBagua ? { door_bagua: doorBagua } : {}),
      ...(sittingDirection24 ? { sitting_direction24: sittingDirection24 } : {}),
      ...(facingDirection24 ? { facing_direction24: facingDirection24 } : {}),
      ...(totalFloors !== null ? { total_floors: totalFloors } : {}),
      ...(currentFloor !== null ? { current_floor: currentFloor } : {}),
      ...(roomIndex !== null ? { room_index: roomIndex } : {}),
      ...(roomCount !== null ? { room_count: roomCount } : {}),
      ...(staticCycleReversed ? { static_cycle_reversed: true } : {}),
      house_area_m2: sanitizeNumber(derived.house_area_m2),
      mingtang_area_m2: sanitizeNumber(derived.mingtang_area_m2),
      flags: { ...derived.flags },
      measurements: { ...derived.measurements },
      categories: {
        incoming_sha_element: inputs.manual_categories.incoming_sha_element,
        self_strength: inputs.manual_categories.self_strength,
        incoming_strength: inputs.manual_categories.incoming_strength
      },
      internal_layout: {
        flags: { ...derived.internal_layout.flags },
        measurements: { ...derived.internal_layout.measurements },
        counts: { ...derived.internal_layout.counts }
      }
    },
    temporal_context: {
      year_ganzhi: yearGanzhi,
      ...(monthGanzhi ? { month_ganzhi: monthGanzhi } : {}),
      notes: {
        case_contact: {
          case_contact_name: inputs.case_contact.case_contact_name,
          case_notes: inputs.case_contact.case_notes
        },
        members,
        house_profile: {
          sitting_bagua: inputs.house.sitting_bagua,
          facing_bagua: facingBagua,
          door_bagua: doorBagua,
          sitting_direction24: sittingDirection24,
          facing_direction24: facingDirection24,
          total_floors: totalFloors,
          current_floor: currentFloor,
          room_index: roomIndex,
          room_count: roomCount,
          static_cycle_reversed: staticCycleReversed
        },
        gregorian_date: inputs.temporal.gregorian_date,
        gregorian_time: inputs.temporal.gregorian_time,
        calendar_basis: "jieqi_bazi",
        bazi: baziDate
          ? {
              solar_ymdhms: baziDate.solar_ymdhms,
              lunar_text: baziDate.lunar_text,
              year_pillar: baziDate.year_pillar,
              month_pillar: baziDate.month_pillar,
              day_pillar: baziDate.day_pillar,
              time_pillar: baziDate.time_pillar,
              year_stem_code: baziDate.year_stem_code,
              year_branch_code: baziDate.year_branch_code,
              year_ganzhi_code: baziDate.year_ganzhi_code,
              month_stem_code: baziDate.month_stem_code,
              month_branch_code: baziDate.month_branch_code,
              month_ganzhi_code: baziDate.month_ganzhi_code,
              day_stem_code: baziDate.day_stem_code,
              day_branch_code: baziDate.day_branch_code,
              day_ganzhi_code: baziDate.day_ganzhi_code,
              time_stem_code: baziDate.time_stem_code,
              time_branch_code: baziDate.time_branch_code,
              time_ganzhi_code: baziDate.time_ganzhi_code,
              rule_month_from_jieqi: baziDate.rule_month_from_jieqi
            }
          : null,
        rule_month: ruleMonth,
        rule_month_source: ruleMonthOverride !== null ? "manual_override" : "jieqi_bazi",
        month_ganzhi_source: ruleMonthOverride !== null ? "wuhu_dun_manual_rule_month" : "jieqi_bazi",
        orientation: {
          north_angle_deg: editor.northAngleDeg,
          has_entrance_marker: editor.entrance !== null
        }
      }
    }
  };

  return payload;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  const body = entries
    .map(([key, inner]) => `${JSON.stringify(key)}:${stableStringify(inner)}`)
    .join(",");
  return `{${body}}`;
}

export function hashPayload(payload: RuleEvaluateRequest): string {
  const text = stableStringify(payload);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }
  return `h${(hash >>> 0).toString(16)}`;
}
