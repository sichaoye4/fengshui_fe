import {
  ALL_EXTERNAL_SHA_IDS,
  BAGUA_OPTIONS,
  DIRECTION24_OPTIONS,
  MAX_HOUSEHOLD_MEMBERS,
  OWNER_GENDER_OPTIONS,
  STRENGTH_OPTIONS,
  WUXING_OPTIONS,
  createDefaultEditorState,
  createDefaultInputState
} from "../constants";
import { deriveProjectState } from "./derivation";
import type {
  EditorState,
  EvaluationSnapshot,
  HouseholdMemberInput,
  HouseMetaInput,
  InputDraftState,
  ManualCategories,
  ManualFlags,
  ManualMeasurements,
  ProjectSnapshot
} from "../types/fengshui";

const STORAGE_KEY = "fengshui_ui_project_v1";
const CURRENT_SCHEMA_VERSION = "1.2" as const;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function readString(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function sanitizeEditor(rawEditor: unknown): EditorState {
  const defaults = createDefaultEditorState();
  const editor = asRecord(rawEditor);
  if (!editor) {
    return defaults;
  }

  const viewport = asRecord(editor.viewport);
  const entrance = asRecord(editor.entrance);
  const primitivesRaw = Array.isArray(editor.primitives) ? editor.primitives : [];

  const primitives: EditorState["primitives"] = primitivesRaw
    .map((item, index) => {
      const primitive = asRecord(item);
      if (!primitive) {
        return null;
      }
      const kind = primitive.kind;
      const id = readString(primitive.id, `legacy-${index}`);

      if (kind === "room") {
        const x = readNumber(primitive.x, Number.NaN);
        const y = readNumber(primitive.y, Number.NaN);
        const width = readNumber(primitive.width, Number.NaN);
        const height = readNumber(primitive.height, Number.NaN);
        if (![x, y, width, height].every(Number.isFinite)) {
          return null;
        }
        return {
          id,
          kind: "room" as const,
          x,
          y,
          width,
          height,
          label: typeof primitive.label === "string" ? primitive.label : undefined
        };
      }

      if (kind === "wall" || kind === "door" || kind === "window") {
        const start = asRecord(primitive.start);
        const end = asRecord(primitive.end);
        if (!start || !end) {
          return null;
        }

        const startX = readNumber(start.x, Number.NaN);
        const startY = readNumber(start.y, Number.NaN);
        const endX = readNumber(end.x, Number.NaN);
        const endY = readNumber(end.y, Number.NaN);
        if (![startX, startY, endX, endY].every(Number.isFinite)) {
          return null;
        }

        return {
          id,
          kind: kind as "wall" | "door" | "window",
          start: { x: startX, y: startY },
          end: { x: endX, y: endY }
        };
      }

      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    gridSizeM: Math.max(0.01, readNumber(editor.gridSizeM, defaults.gridSizeM)),
    viewport: {
      x: viewport ? readNumber(viewport.x, defaults.viewport.x) : defaults.viewport.x,
      y: viewport ? readNumber(viewport.y, defaults.viewport.y) : defaults.viewport.y,
      scale: Math.max(0.1, viewport ? readNumber(viewport.scale, defaults.viewport.scale) : defaults.viewport.scale)
    },
    northAngleDeg: ((readNumber(editor.northAngleDeg, defaults.northAngleDeg) % 360) + 360) % 360,
    entrance:
      entrance && Number.isFinite(readNumber(entrance.x, Number.NaN)) && Number.isFinite(readNumber(entrance.y, Number.NaN))
        ? { x: readNumber(entrance.x, 0), y: readNumber(entrance.y, 0) }
        : null,
    primitives,
    selectedId: typeof editor.selectedId === "string" ? editor.selectedId : null
  };
}

function sanitizeManualFlags(rawFlags: unknown, defaults: ManualFlags): ManualFlags {
  const source = asRecord(rawFlags) ?? {};
  const next: UnknownRecord = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof ManualFlags>) {
    next[key] = readBoolean(source[key], defaults[key]);
  }
  return next as unknown as ManualFlags;
}

function sanitizeManualMeasurements(raw: unknown, defaults: ManualMeasurements): ManualMeasurements {
  const source = asRecord(raw) ?? {};
  return {
    house_height_m: readString(source.house_height_m, defaults.house_height_m),
    mingtang_width_m: readString(source.mingtang_width_m, defaults.mingtang_width_m),
    front_pair_gap_distance_m: readString(source.front_pair_gap_distance_m, defaults.front_pair_gap_distance_m)
  };
}

function sanitizeManualCategories(raw: unknown, defaults: ManualCategories): ManualCategories {
  const source = asRecord(raw) ?? {};
  return {
    incoming_sha_element: readEnum(source.incoming_sha_element, WUXING_OPTIONS, defaults.incoming_sha_element),
    self_strength: readEnum(source.self_strength, STRENGTH_OPTIONS, defaults.self_strength),
    incoming_strength: readEnum(source.incoming_strength, STRENGTH_OPTIONS, defaults.incoming_strength)
  };
}

function sanitizeHouse(raw: unknown, defaults: HouseMetaInput): HouseMetaInput {
  const source = asRecord(raw) ?? {};
  return {
    name: readString(source.name, defaults.name),
    sitting_bagua: readEnum(source.sitting_bagua, BAGUA_OPTIONS, defaults.sitting_bagua),
    facing_bagua: readEnum(source.facing_bagua, ["", ...BAGUA_OPTIONS] as const, defaults.facing_bagua),
    door_bagua: readEnum(source.door_bagua, ["", ...BAGUA_OPTIONS] as const, defaults.door_bagua),
    sitting_direction24: readEnum(
      source.sitting_direction24,
      ["", ...DIRECTION24_OPTIONS] as const,
      defaults.sitting_direction24
    ),
    facing_direction24: readEnum(
      source.facing_direction24,
      ["", ...DIRECTION24_OPTIONS] as const,
      defaults.facing_direction24
    ),
    sitting_element: readEnum(source.sitting_element, ["", ...WUXING_OPTIONS] as const, defaults.sitting_element),
    facing_element: readEnum(source.facing_element, ["", ...WUXING_OPTIONS] as const, defaults.facing_element),
    door_element: readEnum(source.door_element, WUXING_OPTIONS, defaults.door_element),
    total_floors: readString(source.total_floors, defaults.total_floors),
    current_floor: readString(source.current_floor, defaults.current_floor),
    room_index: readString(source.room_index, defaults.room_index),
    room_count: readString(source.room_count, defaults.room_count),
    static_cycle_reversed: readBoolean(source.static_cycle_reversed, defaults.static_cycle_reversed)
  };
}

function sanitizeExternalShaFlags(raw: unknown, defaults: InputDraftState["external_sha_flags"]): InputDraftState["external_sha_flags"] {
  const source = asRecord(raw) ?? {};
  const next = { ...defaults };
  for (const key of ALL_EXTERNAL_SHA_IDS) {
    next[key] = readBoolean(source[key], defaults[key] ?? false);
  }
  return next;
}

function sanitizeMembers(rawMembers: unknown, legacyOwner: UnknownRecord, defaults: InputDraftState): HouseholdMemberInput[] {
  const sourceMembers = Array.isArray(rawMembers) ? rawMembers : [];
  const members = sourceMembers
    .slice(0, MAX_HOUSEHOLD_MEMBERS)
    .map((item, index) => {
      const source = asRecord(item);
      if (!source) {
        return null;
      }
      return {
        id: readString(source.id ?? source.member_id, `member-${index + 1}`),
        name: readString(source.name, ""),
        birth_year: readString(source.birth_year, ""),
        gender: readEnum(source.gender, ["", ...OWNER_GENDER_OPTIONS] as const, ""),
        is_primary_resident: readBoolean(source.is_primary_resident, false),
        relationship: readString(source.relationship, "")
      };
    })
    .filter((member): member is HouseholdMemberInput => member !== null);

  if (members.length > 0) {
    const firstPrimaryIndex = members.findIndex((member) => member.is_primary_resident);
    return members.map((member, index) => ({
      ...member,
      is_primary_resident: firstPrimaryIndex >= 0 ? index === firstPrimaryIndex : member.is_primary_resident
    }));
  }

  const legacyBirthYear = readString(legacyOwner.owner_birth_year, "");
  const legacyGender = readEnum(legacyOwner.owner_gender, ["", ...OWNER_GENDER_OPTIONS] as const, "");
  if (legacyBirthYear || legacyGender) {
    return [
      {
        id: "member-1",
        name: readString(legacyOwner.owner_name, defaults.case_contact.case_contact_name),
        birth_year: legacyBirthYear,
        gender: legacyGender,
        is_primary_resident: true,
        relationship: "owner"
      }
    ];
  }

  return defaults.members;
}

function sanitizeEvaluation(raw: unknown): EvaluationSnapshot | null {
  const source = asRecord(raw);
  if (!source) {
    return null;
  }
  if (typeof source.requested_at !== "string" || typeof source.payload_hash !== "string") {
    return null;
  }
  if (!source.request || !source.response) {
    return null;
  }
  const normalized = { ...source };
  if (!("bazhai_results" in normalized) && "bazhai_result" in normalized && normalized.bazhai_result) {
    normalized.bazhai_results = {
      house_bagua: asRecord(normalized.bazhai_result)?.house_bagua_code ?? "KAN",
      member_results: [
        {
          member_id: "member-1",
          name: "",
          birth_year: asRecord(normalized.bazhai_result)?.year ?? null,
          gender: asRecord(normalized.bazhai_result)?.gender ?? null,
          is_primary_resident: true,
          relationship: "owner",
          status: "matched",
          missing_fields: [],
          result: normalized.bazhai_result
        }
      ]
    };
  }
  if (!("bazhai_results" in normalized)) {
    normalized.bazhai_results = null;
  }
  delete normalized.bazhai_result;
  return normalized as unknown as EvaluationSnapshot;
}

function sanitizeInputs(rawInputs: unknown): InputDraftState {
  const defaults = createDefaultInputState();
  const source = asRecord(rawInputs);
  if (!source) {
    return defaults;
  }

  const house = sanitizeHouse(source.house, defaults.house);
  const owner = asRecord(source.owner) ?? {};
  const caseContact = asRecord(source.case_contact) ?? {};
  const temporal = asRecord(source.temporal) ?? {};
  const manualCounts = asRecord(source.manual_counts) ?? {};

  return {
    house,
    case_contact: {
      case_contact_name: readString(
        caseContact.case_contact_name,
        readString(owner.owner_name, defaults.case_contact.case_contact_name)
      ),
      case_notes: readString(caseContact.case_notes, readString(owner.owner_notes, defaults.case_contact.case_notes))
    },
    members: sanitizeMembers(source.members, owner, defaults),
    temporal: {
      gregorian_date: readString(temporal.gregorian_date, defaults.temporal.gregorian_date),
      gregorian_time: readString(temporal.gregorian_time, defaults.temporal.gregorian_time),
      lunar_month: readString(temporal.lunar_month, defaults.temporal.lunar_month)
    },
    manual_flags: sanitizeManualFlags(source.manual_flags, defaults.manual_flags),
    manual_counts: {
      entry_qi_turns: Math.max(0, Math.round(readNumber(manualCounts.entry_qi_turns, defaults.manual_counts.entry_qi_turns)))
    },
    manual_measurements: sanitizeManualMeasurements(source.manual_measurements, defaults.manual_measurements),
    manual_categories: sanitizeManualCategories(source.manual_categories, defaults.manual_categories),
    external_sha_flags: sanitizeExternalShaFlags(source.external_sha_flags, defaults.external_sha_flags),
    mingtang_room_id: typeof source.mingtang_room_id === "string" ? source.mingtang_room_id : null,
    house_area_override_m2: readString(source.house_area_override_m2, defaults.house_area_override_m2),
    mingtang_area_override_m2: readString(source.mingtang_area_override_m2, defaults.mingtang_area_override_m2)
  };
}

export function hydrateProjectSnapshot(raw: unknown): ProjectSnapshot {
  const source = asRecord(raw) ?? {};
  const editor = sanitizeEditor(source.editor);
  const inputs = sanitizeInputs(source.inputs);
  const evaluation = sanitizeEvaluation(source.evaluation);

  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    editor,
    inputs,
    derived: deriveProjectState(editor, inputs),
    evaluation
  };
}

export function saveDraft(snapshot: ProjectSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = hydrateProjectSnapshot(snapshot);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function loadDraft(): ProjectSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  const text = window.localStorage.getItem(STORAGE_KEY);
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    return hydrateProjectSnapshot(parsed);
  } catch {
    return null;
  }
}

export function exportProject(snapshot: ProjectSnapshot): void {
  const normalized = hydrateProjectSnapshot(snapshot);
  const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = URL.createObjectURL(blob);
  link.download = `fengshui-project-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function importProject(file: File): Promise<ProjectSnapshot> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  if (!asRecord(parsed)) {
    throw new Error("Unsupported or invalid project schema.");
  }
  return hydrateProjectSnapshot(parsed);
}

