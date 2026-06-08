import { describe, expect, it } from "vitest";
import { createDefaultEditorState, createDefaultInputState } from "../constants";
import { deriveProjectState } from "./derivation";

describe("deriveProjectState", () => {
  it("derives area, center wall flag, window ratio, and door opposition count", () => {
    const editor = createDefaultEditorState();
    editor.primitives = [
      { id: "room-1", kind: "room", x: 0, y: 0, width: 10, height: 8 },
      { id: "wall-1", kind: "wall", start: { x: 4, y: 0 }, end: { x: 4, y: 8 } },
      { id: "door-1", kind: "door", start: { x: 1, y: 2 }, end: { x: 3, y: 2 } },
      { id: "door-2", kind: "door", start: { x: 1, y: 4 }, end: { x: 3, y: 4 } },
      { id: "window-1", kind: "window", start: { x: 0, y: 1 }, end: { x: 2, y: 1 } }
    ];

    const inputs = createDefaultInputState();

    const derived = deriveProjectState(editor, inputs);

    expect(derived.house_area_m2).toBe(80);
    expect(derived.mingtang_area_m2).toBe(80);
    expect(derived.internal_layout.flags.center_wall_block).toBe(true);
    expect(derived.internal_layout.counts.room_door_opposed_pairs).toBe(1);
    expect(derived.internal_layout.measurements.window_to_space_ratio).toBeGreaterThan(0);
    expect(derived.internal_layout.measurements.window_to_space_ratio).toBeLessThan(1);
  });

  it("respects manual area overrides", () => {
    const editor = createDefaultEditorState();
    editor.primitives = [{ id: "room-1", kind: "room", x: 0, y: 0, width: 6, height: 6 }];

    const inputs = createDefaultInputState();
    inputs.house_area_override_m2 = "88";
    inputs.mingtang_area_override_m2 = "22";

    const derived = deriveProjectState(editor, inputs);
    expect(derived.house_area_m2).toBe(88);
    expect(derived.mingtang_area_m2).toBe(22);
  });

  it("derives center sha flags from labeled room types", () => {
    const editor = createDefaultEditorState();
    editor.primitives = [
      { id: "room-outer", kind: "room", x: 0, y: 0, width: 9, height: 9, roomType: "living" },
      { id: "room-toilet", kind: "room", x: 3.5, y: 3.5, width: 1, height: 1, roomType: "toilet" },
      { id: "room-stair", kind: "room", x: 6.5, y: 6.5, width: 1, height: 1, roomType: "stair" }
    ];

    const derived = deriveProjectState(editor, createDefaultInputState());

    expect(derived.internal_layout.flags.toilet_in_center).toBe(true);
    expect(derived.internal_layout.flags.stair_in_center).toBe(false);
  });
});
