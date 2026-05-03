import { describe, expect, it } from "vitest";
import { createDefaultEditorState, createDefaultInputState } from "../constants";
import { appReducer, createInitialAppState, toProjectSnapshot } from "./appState";

describe("appReducer", () => {
  it("preserves raw numeric text inputs", () => {
    const state = createInitialAppState(null);
    const next = appReducer(state, {
      type: "set_manual_measurement",
      key: "house_height_m",
      value: "3."
    });

    expect(next.inputs.manual_measurements.house_height_m).toBe("3.");
  });

  it("supports editor undo/redo history", () => {
    const base = createInitialAppState(null);
    const editorA = { ...createDefaultEditorState(), northAngleDeg: 20 };
    const editorB = { ...editorA, northAngleDeg: 40 };

    const committedA = appReducer(base, { type: "commit_editor", editor: editorA });
    const committedB = appReducer(committedA, { type: "commit_editor", editor: editorB });
    const undone = appReducer(committedB, { type: "undo_editor" });
    const redone = appReducer(undone, { type: "redo_editor" });

    expect(undone.editor.northAngleDeg).toBe(20);
    expect(redone.editor.northAngleDeg).toBe(40);
  });

  it("resets history when replacing snapshot", () => {
    const base = createInitialAppState(null);
    const committed = appReducer(base, {
      type: "commit_editor",
      editor: { ...createDefaultEditorState(), northAngleDeg: 55 }
    });

    const snapshot = toProjectSnapshot({
      editor: createDefaultEditorState(),
      inputs: createDefaultInputState(),
      evaluation: null
    });

    const replaced = appReducer(committed, { type: "replace_snapshot", snapshot });
    expect(replaced.undoStack).toHaveLength(0);
    expect(replaced.redoStack).toHaveLength(0);
  });

  it("switches tabs without mutating editor history", () => {
    const base = createInitialAppState(null);
    const committed = appReducer(base, {
      type: "commit_editor",
      editor: { ...createDefaultEditorState(), northAngleDeg: 33 }
    });

    const switched = appReducer(committed, { type: "set_active_tab", tab: "structure" });
    expect(switched.activeTab).toBe("structure");
    expect(switched.undoStack).toHaveLength(1);
    expect(switched.editor.northAngleDeg).toBe(33);
  });

  it("keeps tab finding filters isolated", () => {
    const base = createInitialAppState(null);
    const updated = appReducer(base, {
      type: "set_tab_finding_filter",
      tab: "structure",
      filter: "not_evaluable"
    });

    expect(updated.tabFindingFilters.structure).toBe("not_evaluable");
  });

  describe("temporal / liqi actions", () => {
    it("set_temporal_loading toggles loading flag", () => {
      const state = createInitialAppState(null);
      expect(state.temporalLoading).toBe(false);
      const loading = appReducer(state, { type: "set_temporal_loading", value: true });
      expect(loading.temporalLoading).toBe(true);
      const done = appReducer(loading, { type: "set_temporal_loading", value: false });
      expect(done.temporalLoading).toBe(false);
    });

    it("set_temporal_data merges annual data", () => {
      const state = createInitialAppState(null);
      expect(state.temporalData.annual).toBeNull();
      // Use 'as any' for partial test data that only checks reducer behavior
      const annual = { tai_sui: "South-East", san_sha: "West" } as any;
      const updated = appReducer(state, {
        type: "set_temporal_data",
        value: { annual }
      });
      expect(updated.temporalData.annual).toEqual(annual);
      expect(updated.temporalData.monthly).toBeNull();
    });

    it("set_temporal_data merges monthly data", () => {
      const state = createInitialAppState(null);
      const monthly = { san_sha_month: "North" } as any;
      const updated = appReducer(state, {
        type: "set_temporal_data",
        value: { monthly }
      });
      expect(updated.temporalData.monthly).toEqual(monthly);
    });

    it("set_temporal_data merges flying star data", () => {
      const state = createInitialAppState(null);
      const flyingStar = { grid: [], flight_direction: "East" } as any;
      const updated = appReducer(state, {
        type: "set_temporal_data",
        value: { flyingStar }
      });
      expect(updated.temporalData.flyingStar).toEqual(flyingStar);
    });

    it("set_temporal_data merges gregorian conversion data", () => {
      const state = createInitialAppState(null);
      const gregorianConversion = { year_pillar: "Jia-Chen" } as any;
      const updated = appReducer(state, {
        type: "set_temporal_data",
        value: { gregorianConversion }
      });
      expect(updated.temporalData.gregorianConversion).toEqual(gregorianConversion);
    });

    it("set_temporal_data merges multiple keys in one call", () => {
      const state = createInitialAppState(null);
      const updated = appReducer(state, {
        type: "set_temporal_data",
        value: {
          annual: { tai_sui: "South" } as any,
          monthly: { san_sha_month: "North" } as any
        }
      });
      expect(updated.temporalData.annual).toEqual({ tai_sui: "South" });
      expect(updated.temporalData.monthly).toEqual({ san_sha_month: "North" });
      expect(updated.temporalData.flyingStar).toBeNull();
    });

    it("set_liqi_house_profile stores profile", () => {
      const state = createInitialAppState(null);
      expect(state.liqiHouseProfile).toBeNull();
      const profile = {
        sitting_bagua: "QIAN",
        flying_star_grid: [
          { bagua: "LI", star_number: 8, element: "EARTH", qi: "Wang-Qi" }
        ],
        five_qi: { sheng_qi: "DUI", jue_ming: "ZHEN" },
        wealth_positions: ["DUI", "GEN"],
        current_period: 9
      } as any;
      const updated = appReducer(state, { type: "set_liqi_house_profile", value: profile });
      expect(updated.liqiHouseProfile).toEqual(profile);
    });

    it("set_liqi_house_profile overwrites previous profile", () => {
      const state = createInitialAppState(null);
      const first = appReducer(state, {
        type: "set_liqi_house_profile",
        value: { sitting_bagua: "QIAN" } as any
      });
      const second = appReducer(first, {
        type: "set_liqi_house_profile",
        value: { sitting_bagua: "KUN" } as any
      });
      expect(second.liqiHouseProfile?.sitting_bagua).toBe("KUN");
    });

    it("replace_snapshot preserves temporal data (not in snapshot)", () => {
      // Temporal data is fetched live and isn't part of ProjectSnapshot,
      // so it should be preserved across replace_snapshot.
      const base = createInitialAppState(null);
      const withTemporal = appReducer(base, {
        type: "set_temporal_data",
        value: { annual: { tai_sui: "East" } as any }
      });
      const snapshot = toProjectSnapshot(withTemporal);
      const replaced = appReducer(withTemporal, { type: "replace_snapshot", snapshot });
      expect(replaced.temporalData.annual).toEqual({ tai_sui: "East" });
    });
  });
});
