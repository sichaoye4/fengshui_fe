import { describe, expect, it } from "vitest";
import { createDefaultEditorState, createDefaultInputState } from "../constants";
import { appReducer, createInitialAppState, toProjectSnapshot } from "./appState";

describe("appReducer — editor & structure tab", () => {
  it("set_tool updates the active tool", () => {
    const state = createInitialAppState(null);
    expect(state.tool).toBe("select");

    const wall = appReducer(state, { type: "set_tool", tool: "wall" });
    expect(wall.tool).toBe("wall");

    const deleteTool = appReducer(wall, { type: "set_tool", tool: "delete" });
    expect(deleteTool.tool).toBe("delete");
  });

  it("set_active_tab switches to structure tab", () => {
    const state = createInitialAppState(null);
    expect(state.activeTab).toBe("house_liqi");

    const switched = appReducer(state, { type: "set_active_tab", tab: "structure" });
    expect(switched.activeTab).toBe("structure");
  });

  it("set_active_tab switches between all tabs", () => {
    const state = createInitialAppState(null);

    const temporal = appReducer(state, { type: "set_active_tab", tab: "temporal" });
    expect(temporal.activeTab).toBe("temporal");

    const staticHouse = appReducer(temporal, { type: "set_active_tab", tab: "static_house" });
    expect(staticHouse.activeTab).toBe("static_house");

    const dongzhai = appReducer(staticHouse, { type: "set_active_tab", tab: "dongzhai" });
    expect(dongzhai.activeTab).toBe("dongzhai");
  });

  it("set_editor_viewport updates viewport without history push", () => {
    const state = createInitialAppState(null);
    const viewport = { x: 100, y: 50, scale: 1.5 };

    const updated = appReducer(state, {
      type: "set_editor_viewport",
      viewport
    });

    expect(updated.editor.viewport).toEqual(viewport);
    // Viewport changes should not push undo history
    expect(updated.undoStack).toHaveLength(0);
  });

  it("set_editor_selected_id sets selectedId to a string", () => {
    const state = createInitialAppState(null);
    expect(state.editor.selectedId).toBeNull();

    const selected = appReducer(state, { type: "set_editor_selected_id", id: "w1" });
    expect(selected.editor.selectedId).toBe("w1");
  });

  it("set_editor_selected_id clears selection with null", () => {
    const state = appReducer(createInitialAppState(null), {
      type: "set_editor_selected_id",
      id: "w1"
    });

    const cleared = appReducer(state, { type: "set_editor_selected_id", id: null });
    expect(cleared.editor.selectedId).toBeNull();
  });

  it("set_analysis_mode switches between jingzhai and dongzhai", () => {
    const state = createInitialAppState(null);
    expect(state.analysisMode).toBe("jingzhai");

    const dongzhai = appReducer(state, { type: "set_analysis_mode", mode: "dongzhai" });
    expect(dongzhai.analysisMode).toBe("dongzhai");

    const back = appReducer(dongzhai, { type: "set_analysis_mode", mode: "jingzhai" });
    expect(back.analysisMode).toBe("jingzhai");
  });

  it("set_show_advanced_external toggles advanced external sha view", () => {
    const state = createInitialAppState(null);
    expect(state.showAdvancedExternal).toBe(false);

    const shown = appReducer(state, { type: "set_show_advanced_external", value: true });
    expect(shown.showAdvancedExternal).toBe(true);
  });

  it("commit_editor pushes to undo stack and updates editor", () => {
    const base = createInitialAppState(null);
    const newEditor = { ...createDefaultEditorState(), northAngleDeg: 30 };

    const committed = appReducer(base, { type: "commit_editor", editor: newEditor });
    expect(committed.editor.northAngleDeg).toBe(30);
    expect(committed.undoStack).toHaveLength(1);
    expect(committed.undoStack[0]).toEqual(base.editor);
    // Redo stack should be cleared on new commit
    expect(committed.redoStack).toHaveLength(0);
  });

  it("commit_editor clears redo stack on new commit", () => {
    const base = createInitialAppState(null);
    const editorA = { ...createDefaultEditorState(), northAngleDeg: 20 };
    const editorB = { ...editorA, northAngleDeg: 40 };

    // First commit
    const committedA = appReducer(base, { type: "commit_editor", editor: editorA });
    // Undo to get redo stack
    const undone = appReducer(committedA, { type: "undo_editor" });
    expect(undone.redoStack).toHaveLength(1);

    // New commit should clear redo stack
    const newCommit = appReducer(undone, { type: "commit_editor", editor: editorB });
    expect(newCommit.redoStack).toHaveLength(0);
  });

  it("undo_editor does nothing with empty undo stack", () => {
    const state = createInitialAppState(null);
    const result = appReducer(state, { type: "undo_editor" });

    expect(result.editor).toEqual(state.editor);
    expect(result.undoStack).toHaveLength(0);
  });

  it("redo_editor does nothing with empty redo stack", () => {
    const state = createInitialAppState(null);
    const result = appReducer(state, { type: "redo_editor" });

    expect(result.editor).toEqual(state.editor);
    expect(result.redoStack).toHaveLength(0);
  });

  it("handles editor primitives through commit_editor", () => {
    const base = createInitialAppState(null);
    const withWall = createDefaultEditorState();
    withWall.primitives = [
      { id: "w1", kind: "wall", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } }
    ];

    const committed = appReducer(base, { type: "commit_editor", editor: withWall });
    expect(committed.editor.primitives).toHaveLength(1);
    expect(committed.editor.primitives[0].kind).toBe("wall");
  });

  it("emits 1.3 project snapshots", () => {
    const state = createInitialAppState(null);
    const snapshot = toProjectSnapshot(state);

    expect(snapshot.schema_version).toBe("1.3");
  });

  it("sets room labels and room types", () => {
    const base = createInitialAppState(null);
    const withRoom = {
      ...base,
      editor: {
        ...base.editor,
        primitives: [{ id: "room-1", kind: "room" as const, x: 0, y: 0, width: 4, height: 3 }]
      }
    };

    const typed = appReducer(withRoom, {
      type: "set_room_label",
      id: "room-1",
      label: "Kitchen",
      roomType: "kitchen"
    });

    expect(typed.editor.primitives[0]).toMatchObject({
      id: "room-1",
      kind: "room",
      label: "Kitchen",
      roomType: "kitchen"
    });
    expect(typed.undoStack).toHaveLength(1);
  });

  it("adds, updates, and removes marker primitives", () => {
    const base = createInitialAppState(null);

    const added = appReducer(base, {
      type: "add_marker",
      marker: {
        id: "marker-1",
        kind: "marker",
        markerType: "main_door",
        x: 1,
        y: 2
      }
    });
    const updated = appReducer(added, {
      type: "update_marker",
      id: "marker-1",
      marker: { markerType: "entry_turn", directionDeg: 90, label: "Turn" }
    });
    const removed = appReducer(updated, { type: "remove_marker", id: "marker-1" });

    expect(added.editor.selectedId).toBe("marker-1");
    expect(updated.editor.primitives[0]).toMatchObject({
      id: "marker-1",
      kind: "marker",
      markerType: "entry_turn",
      directionDeg: 90,
      label: "Turn"
    });
    expect(removed.editor.primitives).toEqual([]);
    expect(removed.editor.selectedId).toBeNull();
  });

  it("preserves entrance in editor state across commits", () => {
    const base = createInitialAppState(null);
    const withEntrance = createDefaultEditorState();
    withEntrance.entrance = { x: 2.5, y: 1.0 };

    const committed = appReducer(base, { type: "commit_editor", editor: withEntrance });
    expect(committed.editor.entrance).toEqual({ x: 2.5, y: 1.0 });
  });

  it("reset_tab_finding_filters resets structure filter to all", () => {
    const base = appReducer(createInitialAppState(null), {
      type: "set_tab_finding_filter",
      tab: "structure",
      filter: "not_evaluable"
    });

    expect(base.tabFindingFilters.structure).toBe("not_evaluable");

    const reset = appReducer(base, { type: "reset_tab_finding_filters" });
    expect(reset.tabFindingFilters.structure).toBe("all");
  });

  it("set_editor_selected_id does not affect other editor fields", () => {
    const base = createInitialAppState(null);
    const viewport = { x: 10, y: 20, scale: 2 };
    const withViewport = appReducer(base, { type: "set_editor_viewport", viewport });

    // Set selectedId
    const selected = appReducer(withViewport, { type: "set_editor_selected_id", id: "testId" });
    // Viewport should be preserved
    expect(selected.editor.viewport).toEqual(viewport);
  });
});

describe("appReducer — error handling", () => {
  it("set_error sets error message", () => {
    const base = createInitialAppState(null);
    const withError = appReducer(base, { type: "set_error", value: "Something went wrong" });
    expect(withError.error).toBe("Something went wrong");
  });

  it("clear_error clears error message", () => {
    const base = appReducer(createInitialAppState(null), {
      type: "set_error",
      value: "Error"
    });
    const cleared = appReducer(base, { type: "clear_error" });
    expect(cleared.error).toBe("");
  });

  it("set_loading toggles loading flag", () => {
    const base = createInitialAppState(null);
    expect(base.loading).toBe(false);

    const loading = appReducer(base, { type: "set_loading", value: true });
    expect(loading.loading).toBe(true);
  });
});

describe("appReducer — structure tab finding filters", () => {
  it("set_tab_finding_filter stores structure filter", () => {
    const base = createInitialAppState(null);
    expect(base.tabFindingFilters.structure).toBe("all");

    const filtered = appReducer(base, {
      type: "set_tab_finding_filter",
      tab: "structure",
      filter: "matched"
    });
    expect(filtered.tabFindingFilters.structure).toBe("matched");

    const notEvaluable = appReducer(filtered, {
      type: "set_tab_finding_filter",
      tab: "structure",
      filter: "not_evaluable"
    });
    expect(notEvaluable.tabFindingFilters.structure).toBe("not_evaluable");
  });
});
