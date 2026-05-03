import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultInputState } from "../constants";
import { hydrateProjectSnapshot, loadDraft, saveDraft } from "./persistence";

describe("persistence hydration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates 1.0 numeric fields and legacy owner into 1.2 draft fields", () => {
    const hydrated = hydrateProjectSnapshot({
      schema_version: "1.0",
      editor: {},
      inputs: {
        house: {
          facing_bagua: "LI",
          current_floor: 18,
          room_index: 1802,
          static_cycle_reversed: true
        },
        owner: { owner_age: 42, owner_birth_year: 1990, owner_gender: "male" },
        temporal: { lunar_month: 3 },
        manual_measurements: {
          house_height_m: 3.2,
          mingtang_width_m: 1.8,
          front_pair_gap_distance_m: 5
        },
        house_area_override_m2: 120,
        mingtang_area_override_m2: 30
      },
      evaluation: null
    });

    expect(hydrated.schema_version).toBe("1.2");
    expect(hydrated.inputs.members[0]).toMatchObject({
      birth_year: "1990",
      gender: "male",
      is_primary_resident: true,
      relationship: "owner"
    });
    expect(hydrated.inputs.house.facing_bagua).toBe("LI");
    expect(hydrated.inputs.house.current_floor).toBe("18");
    expect(hydrated.inputs.house.room_index).toBe("1802");
    expect(hydrated.inputs.house.static_cycle_reversed).toBe(true);
    expect(hydrated.inputs.temporal.lunar_month).toBe("3");
    expect(hydrated.inputs.temporal.gregorian_time).toBe("12:00:00");
    expect(hydrated.inputs.manual_measurements.house_height_m).toBe("3.2");
    expect(hydrated.inputs.house_area_override_m2).toBe("120");
  });

  it("deep-merges defaults for partial/corrupt drafts", () => {
    const hydrated = hydrateProjectSnapshot({
      schema_version: "1.0",
      inputs: {
        house: { sitting_bagua: "INVALID" },
        manual_flags: { stair_in_center: true },
        external_sha_flags: { external_sha_001: true, external_sha_999: true }
      }
    });

    expect(hydrated.inputs.house.sitting_bagua).toBe("KAN");
    expect(hydrated.inputs.manual_flags.stair_in_center).toBe(true);
    expect(hydrated.inputs.manual_flags.toilet_in_center).toBe(false);
    expect(hydrated.inputs.external_sha_flags.external_sha_001).toBe(true);
    expect(hydrated.inputs.external_sha_flags).not.toHaveProperty("external_sha_999");
  });

  it("normalizes saved draft on load", () => {
    const snapshot = hydrateProjectSnapshot({
      schema_version: "1.0",
      editor: {},
      inputs: createDefaultInputState(),
      evaluation: null
    });

    saveDraft(snapshot);
    const loaded = loadDraft();

    expect(loaded?.schema_version).toBe("1.2");
    expect(loaded?.inputs.house.name).toBe("untitled_house");
  });
});
