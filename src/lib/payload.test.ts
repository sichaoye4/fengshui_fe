import { describe, expect, it } from "vitest";
import { createDefaultEditorState, createDefaultInputState } from "../constants";
import {
  createBazhaiRequest,
  createEvaluationRequest,
  createHouseholdBazhaiRequest,
  getBazhaiMissingFields,
  getFundamentalMissingFields,
  hashPayload
} from "./payload";
import { deriveProjectState } from "./derivation";

describe("createEvaluationRequest", () => {
  it("builds strict payload with case contact and member metadata in notes", () => {
    const editor = createDefaultEditorState();
    const inputs = createDefaultInputState();
    inputs.temporal.gregorian_date = "2023-10-15";
    inputs.temporal.gregorian_time = "14:30:00";
    inputs.temporal.lunar_month = "3";
    inputs.case_contact.case_contact_name = "Alice Contact";
    inputs.members = [
      {
        id: "member-1",
        name: "Alice",
        birth_year: "1988",
        gender: "female",
        is_primary_resident: true,
        relationship: "owner"
      }
    ];

    const derived = deriveProjectState(editor, inputs);
    const payload = createEvaluationRequest(editor, inputs, derived);

    expect(payload.temporal_context.year_ganzhi).toBe("GUIMAO");
    expect(payload.temporal_context.month_ganzhi).toBe("BINGCHEN");
    expect(payload.house_profile.sitting_bagua).toBe("KAN");
    expect(payload.temporal_context.notes.case_contact).toMatchObject({
      case_contact_name: "Alice Contact"
    });
    expect(payload.temporal_context.notes.members).toEqual([
      expect.objectContaining({ id: "member-1", name: "Alice", age: 35, birth_year: 1988 })
    ]);
    expect(payload.temporal_context.notes.rule_month_source).toBe("manual_override");
    expect(payload.temporal_context.notes.bazi).toMatchObject({
      year_pillar: "癸卯",
      month_pillar: "壬戌",
      year_ganzhi_code: "GUIMAO",
      month_branch_code: "XU",
      month_ganzhi_code: "RENXU",
      rule_month_from_jieqi: 9
    });
    expect(payload.temporal_context.notes.rule_month).toBe(3);
    expect(payload.house_profile.flags).toHaveProperty("external_sha_001");
    expect(payload.house_profile.internal_layout.counts).toHaveProperty("entry_qi_turns");
  });

  it("maps newly exposed foundational house fields", () => {
    const editor = createDefaultEditorState();
    const inputs = createDefaultInputState();
    inputs.house.facing_bagua = "LI";
    inputs.house.current_floor = "18";
    inputs.house.room_index = "1802";
    inputs.house.total_floors = "33";
    inputs.house.room_count = "2";
    inputs.house.sitting_direction24 = "REN";
    inputs.house.facing_direction24 = "BING";
    inputs.house.static_cycle_reversed = true;

    const payload = createEvaluationRequest(editor, inputs, deriveProjectState(editor, inputs));

    expect(payload.house_profile.facing_bagua).toBe("LI");
    expect(payload.house_profile.current_floor).toBe(18);
    expect(payload.house_profile.room_index).toBe(1802);
    expect(payload.house_profile.total_floors).toBe(33);
    expect(payload.house_profile.room_count).toBe(2);
    expect(payload.house_profile.sitting_direction24).toBe("REN");
    expect(payload.house_profile.facing_direction24).toBe("BING");
    expect(payload.house_profile.static_cycle_reversed).toBe(true);
    expect(payload.temporal_context.notes.house_profile).toMatchObject({
      facing_bagua: "LI",
      current_floor: 18,
      room_index: 1802
    });
  });

  it("uses jieqi-based month when override is empty", () => {
    const editor = createDefaultEditorState();
    const inputs = createDefaultInputState();
    inputs.temporal.gregorian_date = "2023-10-15";
    inputs.temporal.gregorian_time = "14:30:00";
    inputs.temporal.lunar_month = "";

    const payload = createEvaluationRequest(editor, inputs, deriveProjectState(editor, inputs));
    expect(payload.temporal_context.month_ganzhi).toBe("RENXU");
    expect(payload.temporal_context.notes.rule_month).toBe(9);
    expect(payload.temporal_context.notes.rule_month_source).toBe("jieqi_bazi");
  });

  it("creates stable hash for same payload", () => {
    const editor = createDefaultEditorState();
    const inputs = createDefaultInputState();
    const derived = deriveProjectState(editor, inputs);

    const payloadA = createEvaluationRequest(editor, inputs, derived);
    const payloadB = createEvaluationRequest(editor, inputs, derived);

    expect(hashPayload(payloadA)).toBe(hashPayload(payloadB));
  });

  it("builds bazhai requests when member fields are present", () => {
    const inputs = createDefaultInputState();
    inputs.members = [
      {
        id: "member-1",
        name: "Bob",
        birth_year: "1990",
        gender: "male",
        is_primary_resident: true,
        relationship: "owner"
      }
    ];

    const bazhaiRequest = createBazhaiRequest(inputs);
    expect(bazhaiRequest).toEqual({
      year: 1990,
      gender: "male",
      house_bagua: "KAN"
    });
    expect(createHouseholdBazhaiRequest(inputs)).toEqual({
      house_bagua: "KAN",
      members: [
        {
          member_id: "member-1",
          name: "Bob",
          birth_year: 1990,
          gender: "male",
          is_primary_resident: true,
          relationship: "owner"
        }
      ]
    });
  });

  it("reports missing fields for bazhai when no members are present", () => {
    const inputs = createDefaultInputState();

    const missing = getBazhaiMissingFields(inputs);
    expect(missing).toContain("members.empty");
    expect(createBazhaiRequest(inputs)).toBeNull();
    expect(createHouseholdBazhaiRequest(inputs)).toBeNull();
  });

  it("reports fundamental missing fields for shared context guidance", () => {
    const inputs = createDefaultInputState();
    inputs.house.facing_bagua = "";
    inputs.house.current_floor = "";
    inputs.house.room_index = "";

    const missing = getFundamentalMissingFields(inputs);
    expect(missing).toEqual(
      expect.arrayContaining([
        "members.empty",
        "house.facing_bagua",
        "house.current_floor",
        "house.room_index"
      ])
    );
  });
});
