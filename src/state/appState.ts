import { API_BASE_URL, createDefaultEditorState, createDefaultInputState } from "../constants";
import { deriveProjectState } from "../lib/derivation";
import type {
  AnalysisTab,
  EditorState,
  EvaluationSnapshot,
  HouseholdMemberInput,
  FindingFilter,
  HouseMetaInput,
  InputDraftState,
  Language,
  LiqiHouseResponse,
  ManualCategories,
  ManualFlags,
  ManualMeasurements,
  ProjectSnapshot,
  PeriodFourYunResponse,
  TabFindingFilterState,
  TemporalDataSnapshot,
  Tool,
  ViewportState
} from "../types/fengshui";

export interface AppState {
  language: Language;
  tool: Tool;
  activeTab: AnalysisTab;
  tabFindingFilters: TabFindingFilterState;
  apiBaseUrl: string;
  showAdvancedExternal: boolean;
  placeEntranceMode: boolean;
  loading: boolean;
  error: string;
  editor: EditorState;
  inputs: InputDraftState;
  evaluation: EvaluationSnapshot | null;
  temporalData: TemporalDataSnapshot;
  temporalLoading: boolean;
  periodData: PeriodFourYunResponse | null;
  periodLoading: boolean;
  liqiHouseProfile: LiqiHouseResponse | null;
  undoStack: EditorState[];
  redoStack: EditorState[];
}

export type AppAction =
  | { type: "set_language"; language: Language }
  | { type: "set_tool"; tool: Tool }
  | { type: "set_active_tab"; tab: AnalysisTab }
  | { type: "set_tab_finding_filter"; tab: keyof TabFindingFilterState; filter: FindingFilter }
  | { type: "reset_tab_finding_filters" }
  | { type: "set_api_base_url"; value: string }
  | { type: "set_show_advanced_external"; value: boolean }
  | { type: "set_place_entrance_mode"; value: boolean }
  | { type: "set_loading"; value: boolean }
  | { type: "set_error"; value: string }
  | { type: "clear_error" }
  | { type: "commit_editor"; editor: EditorState }
  | { type: "set_editor_viewport"; viewport: ViewportState }
  | { type: "set_editor_selected_id"; id: string | null }
  | { type: "undo_editor" }
  | { type: "redo_editor" }
  | { type: "replace_snapshot"; snapshot: ProjectSnapshot }
  | { type: "set_evaluation"; value: EvaluationSnapshot | null }
  | { type: "set_house_field"; field: keyof HouseMetaInput; value: HouseMetaInput[keyof HouseMetaInput] }
  | {
      type: "set_case_contact_field";
      field: keyof InputDraftState["case_contact"];
      value: InputDraftState["case_contact"][keyof InputDraftState["case_contact"]];
    }
  | { type: "add_member"; member: HouseholdMemberInput }
  | { type: "remove_member"; id: string }
  | {
      type: "set_member_field";
      id: string;
      field: keyof HouseholdMemberInput;
      value: HouseholdMemberInput[keyof HouseholdMemberInput];
    }
  | { type: "set_primary_member"; id: string }
  | {
      type: "set_temporal_field";
      field: keyof InputDraftState["temporal"];
      value: InputDraftState["temporal"][keyof InputDraftState["temporal"]];
    }
  | { type: "set_manual_flag"; key: keyof ManualFlags; value: boolean }
  | { type: "set_entry_qi_turns"; value: number }
  | { type: "set_manual_measurement"; key: keyof ManualMeasurements; value: string }
  | {
      type: "set_manual_category";
      key: keyof ManualCategories;
      value: ManualCategories[keyof ManualCategories];
    }
  | { type: "set_external_sha_flag"; id: string; value: boolean }
  | { type: "set_mingtang_room_id"; value: string | null }
  | { type: "set_house_area_override"; value: string }
  | { type: "set_mingtang_area_override"; value: string }
  | { type: "set_temporal_data"; value: Partial<TemporalDataSnapshot> }
  | { type: "set_temporal_loading"; value: boolean }
  | { type: "set_period_data"; value: PeriodFourYunResponse | null }
  | { type: "set_period_loading"; value: boolean }
  | { type: "set_liqi_house_profile"; value: LiqiHouseResponse | null };

export function createInitialAppState(snapshot: ProjectSnapshot | null): AppState {
  return {
    language: "en",
    tool: "select",
    activeTab: "house_liqi",
    tabFindingFilters: {
      structure: "all"
    },
    apiBaseUrl: API_BASE_URL,
    showAdvancedExternal: false,
    placeEntranceMode: false,
    loading: false,
    error: "",
    editor: snapshot?.editor ?? createDefaultEditorState(),
    inputs: snapshot?.inputs ?? createDefaultInputState(),
    evaluation: snapshot?.evaluation ?? null,
    temporalData: {
      annual: null,
      monthly: null,
      flyingStar: null,
      gregorianConversion: null
    },
    temporalLoading: false,
    periodData: null,
    periodLoading: false,
    liqiHouseProfile: null,
    undoStack: [],
    redoStack: []
  };
}

export function toProjectSnapshot(state: Pick<AppState, "editor" | "inputs" | "evaluation">): ProjectSnapshot {
  return {
    schema_version: "1.1",
    editor: state.editor,
    inputs: state.inputs,
    derived: deriveProjectState(state.editor, state.inputs),
    evaluation: state.evaluation
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set_language":
      return { ...state, language: action.language };
    case "set_tool":
      return { ...state, tool: action.tool };
    case "set_active_tab":
      return { ...state, activeTab: action.tab };
    case "set_tab_finding_filter":
      return {
        ...state,
        tabFindingFilters: {
          ...state.tabFindingFilters,
          [action.tab]: action.filter
        }
      };
    case "reset_tab_finding_filters":
      return {
        ...state,
        tabFindingFilters: {
          structure: "all"
        }
      };
    case "set_api_base_url":
      return { ...state, apiBaseUrl: action.value };
    case "set_show_advanced_external":
      return { ...state, showAdvancedExternal: action.value };
    case "set_place_entrance_mode":
      return { ...state, placeEntranceMode: action.value };
    case "set_loading":
      return { ...state, loading: action.value };
    case "set_error":
      return { ...state, error: action.value };
    case "clear_error":
      return { ...state, error: "" };
    case "set_evaluation":
      return { ...state, evaluation: action.value };
    case "set_temporal_data":
      return {
        ...state,
        temporalData: {
          ...state.temporalData,
          ...action.value
        }
      };
    case "set_temporal_loading":
      return { ...state, temporalLoading: action.value };
    case "set_period_data":
      return { ...state, periodData: action.value };
    case "set_period_loading":
      return { ...state, periodLoading: action.value };
    case "set_liqi_house_profile":
      return { ...state, liqiHouseProfile: action.value };
    case "replace_snapshot":
      return {
        ...state,
        editor: action.snapshot.editor,
        inputs: action.snapshot.inputs,
        evaluation: action.snapshot.evaluation,
        undoStack: [],
        redoStack: [],
        error: ""
      };
    case "commit_editor":
      return {
        ...state,
        editor: action.editor,
        undoStack: [...state.undoStack, state.editor],
        redoStack: []
      };
    case "set_editor_viewport":
      return {
        ...state,
        editor: {
          ...state.editor,
          viewport: action.viewport
        }
      };
    case "set_editor_selected_id":
      return {
        ...state,
        editor: {
          ...state.editor,
          selectedId: action.id
        }
      };
    case "undo_editor": {
      const previous = state.undoStack[state.undoStack.length - 1];
      if (!previous) {
        return state;
      }
      return {
        ...state,
        editor: previous,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, state.editor]
      };
    }
    case "redo_editor": {
      const next = state.redoStack[state.redoStack.length - 1];
      if (!next) {
        return state;
      }
      return {
        ...state,
        editor: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, state.editor]
      };
    }
    case "set_house_field":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          house: {
            ...state.inputs.house,
            [action.field]: action.value
          }
        }
      };
    case "set_case_contact_field":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          case_contact: {
            ...state.inputs.case_contact,
            [action.field]: action.value
          }
        }
      };
    case "add_member":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          members: [...state.inputs.members, action.member]
        }
      };
    case "remove_member":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          members: state.inputs.members.filter((member) => member.id !== action.id)
        }
      };
    case "set_member_field":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          members: state.inputs.members.map((member) =>
            member.id === action.id ? { ...member, [action.field]: action.value } : member
          )
        }
      };
    case "set_primary_member":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          members: state.inputs.members.map((member) => ({
            ...member,
            is_primary_resident: member.id === action.id
          }))
        }
      };
    case "set_temporal_field":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          temporal: {
            ...state.inputs.temporal,
            [action.field]: action.value
          }
        }
      };
    case "set_manual_flag":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          manual_flags: {
            ...state.inputs.manual_flags,
            [action.key]: action.value
          }
        }
      };
    case "set_entry_qi_turns":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          manual_counts: {
            ...state.inputs.manual_counts,
            entry_qi_turns: Math.max(0, Math.round(action.value))
          }
        }
      };
    case "set_manual_measurement":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          manual_measurements: {
            ...state.inputs.manual_measurements,
            [action.key]: action.value
          }
        }
      };
    case "set_manual_category":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          manual_categories: {
            ...state.inputs.manual_categories,
            [action.key]: action.value
          }
        }
      };
    case "set_external_sha_flag":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          external_sha_flags: {
            ...state.inputs.external_sha_flags,
            [action.id]: action.value
          }
        }
      };
    case "set_mingtang_room_id":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          mingtang_room_id: action.value
        }
      };
    case "set_house_area_override":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          house_area_override_m2: action.value
        }
      };
    case "set_mingtang_area_override":
      return {
        ...state,
        inputs: {
          ...state.inputs,
          mingtang_area_override_m2: action.value
        }
      };
    default:
      return state;
  }
}
