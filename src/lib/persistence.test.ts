import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultInputState } from "../constants";
import { hydrateProjectSnapshot, loadDraft, saveDraft } from "./persistence";

describe("persistence hydration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("migrates 1.0 numeric fields and legacy owner into 1.3 draft fields", () => {
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
        manual_categories: {
          incoming_sha_element: "WATER",
          self_strength: "weak",
          incoming_strength: "strong"
        },
        house_area_override_m2: 120,
        mingtang_area_override_m2: 30
      },
      evaluation: null
    });

    expect(hydrated.schema_version).toBe("1.3");
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
    expect(hydrated.inputs.manual_categories).toMatchObject({
      self_strength: "weak",
      incoming_strength: "strong"
    });
    expect(hydrated.inputs.manual_categories).not.toHaveProperty("incoming_sha_element");
    expect(hydrated.inputs.house_area_override_m2).toBe("120");
  });

  it("hydrates legacy 1.2 snapshots with editor annotation defaults", () => {
    const hydrated = hydrateProjectSnapshot({
      schema_version: "1.2",
      editor: {
        primitives: [
          { id: "room-1", kind: "room", x: 1, y: 2, width: 3, height: 4, label: "Living Room" }
        ]
      },
      inputs: createDefaultInputState(),
      evaluation: null
    });

    expect(hydrated.schema_version).toBe("1.3");
    expect(hydrated.editor.showBaguaOverlay).toBe(false);
    expect(hydrated.editor.floorplan).toBeUndefined();
    expect(hydrated.editor.primitives[0]).toMatchObject({
      id: "room-1",
      kind: "room",
      label: "Living Room",
      roomType: "unknown"
    });
  });

  it("preserves 1.3 polygon rooms, markers, and floorplan analysis", () => {
    const hydrated = hydrateProjectSnapshot({
      schema_version: "1.3",
      editor: {
        showBaguaOverlay: true,
        floorplan: {
          imageWidth: 200,
          imageHeight: 100,
          imageName: "floorplan.jpg",
          contentType: "image/jpeg",
          analysis: {
            width: 200,
            height: 100,
            walls: [[0, 0, 200, 0]],
            rooms: [[[0, 0], [100, 0], [100, 50], [0, 50]]]
          }
        },
        primitives: [
          {
            id: "room-1",
            kind: "room",
            points: [
              { x: 0, y: 0 },
              { x: 4, y: 0 },
              { x: 4, y: 3 },
              { x: 0, y: 3 }
            ],
            roomType: "kitchen",
            label: "Kitchen"
          },
          {
            id: "marker-1",
            kind: "marker",
            markerType: "stove",
            x: 2,
            y: 1,
            roomId: "room-1",
            directionDeg: 725,
            label: "Stove"
          }
        ]
      },
      inputs: createDefaultInputState(),
      evaluation: null
    });

    expect(hydrated.editor.showBaguaOverlay).toBe(true);
    expect(hydrated.editor.floorplan).toMatchObject({
      imageWidth: 200,
      imageHeight: 100,
      imageName: "floorplan.jpg",
      analysis: {
        walls: [[0, 0, 200, 0]],
        rooms: [[[0, 0], [100, 0], [100, 50], [0, 50]]]
      }
    });
    expect(hydrated.editor.primitives).toEqual([
      expect.objectContaining({
        id: "room-1",
        kind: "room",
        x: 0,
        y: 0,
        width: 4,
        height: 3,
        roomType: "kitchen",
        label: "Kitchen",
        points: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 3 },
          { x: 0, y: 3 }
        ]
      }),
      expect.objectContaining({
        id: "marker-1",
        kind: "marker",
        markerType: "stove",
        x: 2,
        y: 1,
        roomId: "room-1",
        directionDeg: 5,
        label: "Stove"
      })
    ]);
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

    expect(loaded?.schema_version).toBe("1.3");
    expect(loaded?.inputs.house.name).toBe("untitled_house");
  });
});
