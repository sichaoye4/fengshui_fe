import { describe, expect, it } from "vitest";
import {
  PIXELS_PER_METER,
  DEFAULT_CANVAS_SIZE,
  TOOL_ORDER,
  GRID_SIZE_PRESETS_M,
  createDefaultEditorState,
  createDefaultInputState,
} from "./constants";

describe("constants", () => {
  it("PIXELS_PER_METER is 100", () => {
    expect(PIXELS_PER_METER).toBe(100);
  });

  it("DEFAULT_CANVAS_SIZE has expected dimensions", () => {
    expect(DEFAULT_CANVAS_SIZE).toEqual({ width: 960, height: 640 });
  });

  it("TOOL_ORDER contains all 3 tools in correct order", () => {
    expect(TOOL_ORDER).toEqual(["select", "delete", "wall"]);
    expect(TOOL_ORDER).toHaveLength(3);
  });

  it("GRID_SIZE_PRESETS_M has presets from fine to coarse", () => {
    expect(GRID_SIZE_PRESETS_M).toEqual([0.05, 0.1, 0.2, 0.5, 1]);
  });

  it("createDefaultEditorState returns default values", () => {
    const state = createDefaultEditorState();
    expect(state.gridSizeM).toBe(0.1);
    expect(state.viewport).toEqual({ x: 0, y: 0, scale: 1 });
    expect(state.northAngleDeg).toBe(0);
    expect(state.entrance).toBeNull();
    expect(state.primitives).toEqual([]);
    expect(state.selectedId).toBeNull();
    expect(state.floorplan).toBeUndefined();
    expect(state.showBaguaOverlay).toBe(false);
  });

  it("createDefaultInputState returns complete input state", () => {
    const state = createDefaultInputState();

    expect(state.house).toBeDefined();
    expect(state.house.name).toBe("untitled_house");
    expect(state.house.sitting_bagua).toBe("KAN");
    expect(state.members).toEqual([]);
    expect(state.manual_flags.stair_in_center).toBe(false);
    expect(state.manual_counts.entry_qi_turns).toBe(0);
    expect(state.manual_measurements.house_height_m).toBe("3");
    expect(state.manual_categories.self_strength).toBe("normal");
    expect(state.external_sha_flags).toBeDefined();
    expect(state.mingtang_room_id).toBeNull();
    expect(state.house_area_override_m2).toBe("");
  });

  it("createDefaultInputState generates today's date for temporal", () => {
    const state = createDefaultInputState();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    expect(state.temporal.gregorian_date).toBe(`${yyyy}-${mm}-${dd}`);
    expect(state.temporal.gregorian_time).toBe("12:00:00");
  });

  it("external_sha_flags has all 80 flags initialized to false", () => {
    const state = createDefaultInputState();
    const flagKeys = Object.keys(state.external_sha_flags);
    expect(flagKeys).toHaveLength(80);
    expect(flagKeys[0]).toBe("external_sha_001");
    expect(flagKeys[79]).toBe("external_sha_080");

    const allFalse = Object.values(state.external_sha_flags).every((v) => v === false);
    expect(allFalse).toBe(true);
  });

  it("TOOL_ORDER contains all tool types used by ToolPanel", () => {
    // Regression: if TOOL_ORDER changes, ToolPanel rendering breaks
    const toolPanelButtons = TOOL_ORDER;
    expect(toolPanelButtons).toContain("select");
    expect(toolPanelButtons).toContain("wall");
    expect(toolPanelButtons).toContain("delete");
  });
});
