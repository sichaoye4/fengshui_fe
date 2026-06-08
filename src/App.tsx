import { useEffect, useMemo, useReducer, useState, type ChangeEvent } from "react";
import {
  BAGUA_OPTIONS,
  DIRECTION24_OPTIONS,
  GRID_SIZE_PRESETS_M,
  HOUSEHOLD_RELATIONSHIP_OPTIONS,
  MAX_HOUSEHOLD_MEMBERS,
  OWNER_GENDER_OPTIONS,
  STRENGTH_OPTIONS
} from "./constants";
import { evaluateDongzhaiFloor, evaluateHouseholdBazhai, evaluateJingzhaiFull, evaluateRules } from "./api/client";
import { fetchAnnualFlyingStar, fetchAnnualTemporal, fetchFourYunProfile, fetchGregorianConversion, fetchLiqiHouseProfile, fetchMonthlyTemporal } from "./api/temporal";
import { DongzhaiPanel } from "./components/DongzhaiPanel";
import { ExternalShaChecklist } from "./components/ExternalShaChecklist";
import { FloorplanEditor } from "./components/FloorplanEditor";
import { HouseLiqiWorkspace } from "./components/HouseLiqiWorkspace";
import { HousePeriodPanel } from "./components/HousePeriodPanel";
import { JingzhaiPanel } from "./components/JingzhaiPanel";
import { LanguageToggle } from "./components/LanguageToggle";
import { LoginPage } from "./components/LoginPage";
import { saveSession, loadAuth, clearAuth, getLatestSession, getStoredToken, type UserPublic, type SessionDetailResponse } from "./api/auth";
import { ResultsPanel } from "./components/ResultsPanel";
import { RoomLabelPanel } from "./components/RoomLabelPanel";
import { ShaMarkerPalette } from "./components/ShaMarkerPalette";
import { TemporalPanel } from "./components/TemporalPanel";
import { ToolPanel } from "./components/ToolPanel";
import { deriveProjectState } from "./lib/derivation";
import {
  createDongzhaiFloorRequest,
  createHouseholdBazhaiRequest,
  createEvaluationRequest,
  createJingzhaiFullRequest,
  getBazhaiMissingFields,
  getDongzhaiMissingFields,
  hashPayload
} from "./lib/payload";
import { exportProject, importProject, loadDraft, saveDraft } from "./lib/persistence";
import { calculateBaziDate, calculateYearPillarFromBirthYear } from "./lib/bazi";
import { t, type TranslationKey } from "./i18n/ui";
import { appReducer, createInitialAppState, toProjectSnapshot } from "./state/appState";
import type {
  AnalysisTab,
  BaguaCode,
  EvaluationSnapshot,
  FlyingStarAnnualResponse,
  GregorianConversionResponse,
  HouseholdMemberInput,
  HouseMetaInput,
  InputDraftState,
  Language,
  LiqiHouseResponse,
  ManualCategories,
  PeriodFourYunResponse,
  RoomPrimitive,
  RoomType,
  SegmentPrimitive,
  TemporalAnnualResponse,
  TemporalMonthlyResponse
} from "./types/fengshui";

type ManualFlagKey = keyof InputDraftState["manual_flags"];

const MANUAL_FLAG_LABELS: Record<ManualFlagKey, TranslationKey> = {
  stair_in_center: "app.flag.stairInCenter",
  toilet_in_center: "app.flag.toiletInCenter",
  toilet_in_qian: "app.flag.toiletInQian",
  toilet_in_wenchang: "app.flag.toiletInWenchang",
  mingtang_not_grounded: "app.flag.mingtangNotGrounded",
  rear_window_open_on_shengqi: "app.flag.rearWindowOpenOnShengqi",
  stair_corner_window_open: "app.flag.stairCornerWindowOpen",
  center_wall_block: "app.flag.centerWallBlock",
  room_toilet_door_opposed: "app.flag.roomToiletDoorOpposed",
  room_kitchen_door_opposed: "app.flag.roomKitchenDoorOpposed",
  toilet_kitchen_door_opposed: "app.flag.toiletKitchenDoorOpposed",
  main_door_room_door_opposed: "app.flag.mainDoorRoomDoorOpposed",
  main_door_kitchen_door_opposed: "app.flag.mainDoorKitchenDoorOpposed",
  main_door_toilet_door_opposed: "app.flag.mainDoorToiletDoorOpposed",
  hard_to_change_layout: "app.flag.hardToChangeLayout",
  direct_chong: "app.flag.directChong",
  shape_color_sha: "app.flag.shapeColorSha",
  front_pair_gap_aligned: "app.flag.frontPairGapAligned"
};

const PURE_SHAPE_FLAG_KEYS: ManualFlagKey[] = [
  "direct_chong",
  "shape_color_sha",
  "front_pair_gap_aligned",
  "mingtang_not_grounded",
  "rear_window_open_on_shengqi",
  "stair_corner_window_open"
];

const STRUCTURAL_SHA_FLAG_KEYS: ManualFlagKey[] = [
  "stair_in_center",
  "toilet_in_center",
  "toilet_in_qian",
  "toilet_in_wenchang",
  "center_wall_block"
];

const CONFLICT_SHA_FLAG_KEYS: ManualFlagKey[] = [
  "room_toilet_door_opposed",
  "room_kitchen_door_opposed",
  "toilet_kitchen_door_opposed",
  "main_door_room_door_opposed",
  "main_door_kitchen_door_opposed",
  "main_door_toilet_door_opposed"
];

const ANALYSIS_TABS: Array<{ id: AnalysisTab; key: TranslationKey; ariaKey: TranslationKey }> = [
  { id: "house_liqi", key: "app.tab.houseLiqi", ariaKey: "app.tabFull.houseLiqi" },
  { id: "temporal", key: "app.tab.temporal", ariaKey: "app.tabFull.temporal" },
  { id: "zhai_yun", key: "app.tab.zhaiYun", ariaKey: "app.tabFull.zhaiYun" },
  { id: "structure", key: "app.tab.structure", ariaKey: "app.tabFull.structure" },
  { id: "static_house", key: "app.tab.staticHouse", ariaKey: "app.tabFull.staticHouse" },
  { id: "dongzhai", key: "app.tab.dongzhai", ariaKey: "app.tabFull.dongzhai" }
];

const BAGUA_ZH_LABELS: Record<BaguaCode, string> = {
  QIAN: "乾",
  DUI: "兑",
  LI: "离",
  ZHEN: "震",
  XUN: "巽",
  KAN: "坎",
  GEN: "艮",
  KUN: "坤"
};

const BAGUA_DISPLAY_ZH_LABELS: Record<BaguaCode, string> = {
  QIAN: "\u4e7e",
  DUI: "\u5151",
  LI: "\u79bb",
  ZHEN: "\u9707",
  XUN: "\u5dfd",
  KAN: "\u574e",
  GEN: "\u826e",
  KUN: "\u5764"
};

function renderLocalizedEnumLabel<T extends string>(
  language: Language,
  code: T,
  zhLabels: Record<T, string>
): string {
  return language === "zh" ? `${zhLabels[code]} (${code})` : code;
}

function renderCalculatedValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const normalized = String(value).trim();
  return normalized === "" ? "—" : normalized;
}

function calculateOwnerAgeFromBirthYear(birthYearRaw: string, referenceDate: string): string {
  const birthYear = Number(birthYearRaw.trim());
  if (!Number.isInteger(birthYear) || birthYear <= 0) {
    return "";
  }

  const parsedRefDate = new Date(referenceDate);
  const referenceYear = Number.isNaN(parsedRefDate.getTime())
    ? new Date().getFullYear()
    : parsedRefDate.getFullYear();
  const age = referenceYear - birthYear;

  if (!Number.isInteger(age) || age < 0) {
    return "";
  }

  return String(age);
}

function createMemberDraft(index: number): HouseholdMemberInput {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${index}`;
  return {
    id: `member-${suffix}`,
    name: "",
    birth_year: "",
    gender: "",
    is_primary_resident: index === 0,
    relationship: ""
  };
}

export default function App(): JSX.Element {
  const [state, dispatch] = useReducer(
    appReducer,
    undefined,
    () => createInitialAppState(loadDraft())
  );
  const [evaluationRippleKey, setEvaluationRippleKey] = useState(0);
  const [authUser, setAuthUser] = useState<UserPublic | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const derived = useMemo(() => deriveProjectState(state.editor, state.inputs), [state.editor, state.inputs]);
  const rooms = useMemo(
    () => state.editor.primitives.filter((item): item is RoomPrimitive => item.kind === "room"),
    [state.editor.primitives]
  );
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === state.editor.selectedId) ?? null,
    [rooms, state.editor.selectedId]
  );
  const selectedDoor = useMemo(
    () =>
      state.editor.primitives.find(
        (primitive): primitive is SegmentPrimitive =>
          primitive.kind === "door" && primitive.id === state.editor.selectedId
      ) ?? null,
    [state.editor.primitives, state.editor.selectedId]
  );
  const baziDate = useMemo(
    () => calculateBaziDate(state.inputs.temporal.gregorian_date, state.inputs.temporal.gregorian_time),
    [state.inputs.temporal.gregorian_date, state.inputs.temporal.gregorian_time]
  );
  const memberCalculatedValues = useMemo(
    () =>
      Object.fromEntries(
        state.inputs.members.map((member) => [
          member.id,
          {
            age: calculateOwnerAgeFromBirthYear(member.birth_year, state.inputs.temporal.gregorian_date),
            yearPillar: calculateYearPillarFromBirthYear(member.birth_year)
          }
        ])
      ) as Record<string, { age: string; yearPillar: string | null }>,
    [state.inputs.members, state.inputs.temporal.gregorian_date]
  );
  const bazhaiMissingFields = useMemo(() => getBazhaiMissingFields(state.inputs), [state.inputs]);
  const dongzhaiMissingFields = useMemo(() => getDongzhaiMissingFields(state.inputs), [state.inputs]);

  const structureFindings = useMemo(
    () => state.evaluation?.response.findings.filter((item) => item.formula_id.startsWith("INT-")) ?? [],
    [state.evaluation]
  );
  const shapeFindings = useMemo(
    () =>
      state.evaluation?.response.findings.filter(
        (item) => item.formula_id.startsWith("EXT-") || item.formula_id.startsWith("MIT-")
      ) ?? [],
    [state.evaluation]
  );
  const combinedStructureFindings = useMemo(
    () => [...structureFindings, ...shapeFindings],
    [shapeFindings, structureFindings]
  );

  useEffect(() => {
    if (state.analysisMode === "jingzhai" && state.activeTab === "dongzhai") {
      dispatch({ type: "set_active_tab", tab: "static_house" });
    } else if (state.analysisMode === "dongzhai" && state.activeTab === "static_house") {
      dispatch({ type: "set_active_tab", tab: "dongzhai" });
    }
  }, [state.analysisMode, state.activeTab]);

  const visibleTabs = useMemo(
    () =>
      ANALYSIS_TABS.filter((tab) => {
        if (tab.id === "dongzhai" && state.analysisMode !== "dongzhai") return false;
        if (tab.id === "static_house" && state.analysisMode !== "jingzhai") return false;
        return true;
      }),
    [state.analysisMode]
  );

  const tabBadgeCounts = useMemo(() => {
    const countByStatus = (findings: typeof structureFindings) => ({
      matched: findings.filter((item) => item.status === "matched").length,
      notEvaluable: findings.filter((item) => item.status === "not_evaluable").length
    });

    const jingzhaiResult = state.evaluation?.jingzhai_result ?? null;
    const jingzhaiStatus = jingzhaiResult?.house_analysis.status;
    const jingzhaiCounts =
      jingzhaiResult === null
        ? { matched: 0, notEvaluable: 0 }
        : jingzhaiStatus === "ok"
          ? { matched: 1, notEvaluable: 0 }
          : { matched: 0, notEvaluable: 1 };
    const dongzhaiResult = state.evaluation?.dongzhai_result ?? null;
    const dongzhaiCounts =
      dongzhaiResult === null
        ? { matched: 0, notEvaluable: dongzhaiMissingFields.length > 0 ? 1 : 0 }
        : dongzhaiResult.evaluable
          ? { matched: 1, notEvaluable: 0 }
          : { matched: 0, notEvaluable: 1 };

    return {
      house_liqi: countByStatus([]),
      temporal: countByStatus([]),
      zhai_yun: countByStatus([]),
      structure: countByStatus(combinedStructureFindings),
      static_house: jingzhaiCounts,
      dongzhai: dongzhaiCounts
    } as Record<AnalysisTab, { matched: number; notEvaluable: number }>;
  }, [
    combinedStructureFindings,
    dongzhaiMissingFields.length,
    state.evaluation?.dongzhai_result,
    state.evaluation?.jingzhai_result,
    structureFindings
  ]);

  useEffect(() => {
    saveDraft(toProjectSnapshot(state));
  }, [state.editor, state.inputs, state.evaluation]);

  useEffect(() => {
    const stored = loadAuth();
    if (stored) {
      setAuthUser(stored.user);
      setAuthToken(stored.token);
      getLatestSession(stored.token).then((session) => {
        if (session) {
          const hp = session.house_profile;
          dispatch({ type: "set_house_field", field: "name", value: (hp.name as string) ?? "" });
          if (hp.sitting_bagua) dispatch({ type: "set_house_field", field: "sitting_bagua", value: hp.sitting_bagua as string });
          if (hp.facing_bagua) dispatch({ type: "set_house_field", field: "facing_bagua", value: hp.facing_bagua as string });
          if (hp.door_bagua) dispatch({ type: "set_house_field", field: "door_bagua", value: hp.door_bagua as string });
          if (hp.sitting_direction24) dispatch({ type: "set_house_field", field: "sitting_direction24", value: hp.sitting_direction24 as string });
          if (hp.facing_direction24) dispatch({ type: "set_house_field", field: "facing_direction24", value: hp.facing_direction24 as string });
          if (hp.total_floors != null) dispatch({ type: "set_house_field", field: "total_floors", value: String(hp.total_floors) });
          if (hp.current_floor != null) dispatch({ type: "set_house_field", field: "current_floor", value: String(hp.current_floor) });
          if (hp.room_count != null) dispatch({ type: "set_house_field", field: "room_count", value: String(hp.room_count) });
          if (session.members && session.members.length > 0) {
            const currentMembers = state.inputs.members;
            for (let i = currentMembers.length - 1; i >= 0; i--) {
              dispatch({ type: "remove_member", id: currentMembers[i].id });
            }
            session.members.forEach((m) => {
              dispatch({
                type: "add_member",
                member: {
                  id: `member-${crypto.randomUUID()}`,
                  name: m.name,
                  birth_year: m.birth_year != null ? String(m.birth_year) : "",
                  gender: (m.gender === "male" || m.gender === "female" ? m.gender : "") as "" | "male" | "female",
                  is_primary_resident: m.is_primary_resident,
                  relationship: m.relationship,
                }
              });
            });
          }
        }
      }).catch(() => {});
    }
    setAuthReady(true);
  }, []);

  const runEvaluation = async () => {
    dispatch({ type: "set_loading", value: true });
    dispatch({ type: "clear_error" });

    try {
      const payload = createEvaluationRequest(state.editor, state.inputs, derived);
      const response = await evaluateRules(payload);
      const bazhaiPayload = createHouseholdBazhaiRequest(state.inputs);
      let bazhaiResult = null;
      if (bazhaiPayload) {
        try {
          bazhaiResult = await evaluateHouseholdBazhai(bazhaiPayload);
        } catch (err) {
          dispatch({
            type: "set_error",
            value: err instanceof Error ? `Bazhai: ${err.message}` : `Bazhai: ${String(err)}`
          });
        }
      }
      let dongzhaiResult = null;
      let jingzhaiResult = null;

      if (state.analysisMode === "dongzhai") {
        const dongzhaiPayload = createDongzhaiFloorRequest(state.inputs);
        if (dongzhaiPayload) {
          try {
            dongzhaiResult = await evaluateDongzhaiFloor(dongzhaiPayload);
          } catch (err) {
            dispatch({
              type: "set_error",
              value: err instanceof Error ? `Dongzhai: ${err.message}` : `Dongzhai: ${String(err)}`
            });
          }
        }
      }

      if (state.analysisMode === "jingzhai") {
        try {
          jingzhaiResult = await evaluateJingzhaiFull(createJingzhaiFullRequest(state.editor, state.inputs, derived));
        } catch (err) {
          dispatch({
            type: "set_error",
            value: err instanceof Error ? `Jingzhai: ${err.message}` : `Jingzhai: ${String(err)}`
          });
        }
      }
      const snapshot: EvaluationSnapshot = {
        requested_at: new Date().toISOString(),
        payload_hash: hashPayload(payload),
        request: payload,
        response,
        bazhai_results: bazhaiResult,
        dongzhai_result: dongzhaiResult,
        jingzhai_result: jingzhaiResult
      };
      dispatch({ type: "set_evaluation", value: snapshot });
      dispatch({ type: "reset_tab_finding_filters" });

      // Fetch temporal data after evaluation
      if (baziDate) {
        // Fire temporal requests in parallel (don't block overall evaluation)
        const temporalPromises: Array<Promise<void>> = [];

        // Gregorian conversion
        if (state.inputs.temporal.gregorian_date) {
          temporalPromises.push(
            fetchGregorianConversion(state.inputs.temporal.gregorian_date, state.inputs.temporal.gregorian_time || undefined)
              .then((result: GregorianConversionResponse) => dispatch({ type: "set_temporal_data", value: { gregorianConversion: result } }))
              .catch(() => { /* temporal is supplementary */ })
          );
        }

        // Annual temporal
        temporalPromises.push(
          fetchAnnualTemporal(baziDate.year_pillar)
            .then((result: TemporalAnnualResponse) => dispatch({ type: "set_temporal_data", value: { annual: result } }))
            .catch(() => {})
        );

        // Annual flying star
        const solarYear = new Date(state.inputs.temporal.gregorian_date).getFullYear();
        if (!Number.isNaN(solarYear)) {
          temporalPromises.push(
            fetchAnnualFlyingStar(solarYear)
              .then((result: FlyingStarAnnualResponse) => dispatch({ type: "set_temporal_data", value: { flyingStar: result } }))
              .catch(() => {})
          );

          if (state.inputs.house.sitting_bagua) {
            dispatch({ type: "set_period_loading", value: true });
            fetchFourYunProfile(solarYear, state.inputs.house.sitting_bagua)
              .then((result: PeriodFourYunResponse) => dispatch({ type: "set_period_data", value: result }))
              .catch(() => {})
              .finally(() => dispatch({ type: "set_period_loading", value: false }));
          }
        }

        // Monthly temporal
        if (baziDate.month_ganzhi_code) {
          temporalPromises.push(
            fetchMonthlyTemporal(baziDate.year_pillar, baziDate.month_ganzhi_code)
              .then((result: TemporalMonthlyResponse) => dispatch({ type: "set_temporal_data", value: { monthly: result } }))
              .catch(() => {})
          );
        }

        // Fetch Liqi house profile
        if (state.inputs.house.sitting_bagua) {
          temporalPromises.push(
            fetchLiqiHouseProfile(state.inputs.house.sitting_bagua)
              .then((result: LiqiHouseResponse) => dispatch({ type: "set_liqi_house_profile", value: result }))
              .catch(() => {})
          );
        }

        if (temporalPromises.length > 0) {
          dispatch({ type: "set_temporal_loading", value: true });
          Promise.allSettled(temporalPromises).finally(() => {
            dispatch({ type: "set_temporal_loading", value: false });
          });
        }

        // Save session to backend after successful evaluation
        if (authToken) {
          const hp = createEvaluationRequest(state.editor, state.inputs, derived);
          saveSession({
            house_profile: hp.house_profile as unknown as Record<string, unknown>,
            members: state.inputs.members.map(m => ({
              name: m.name,
              birth_year: m.birth_year ? parseInt(m.birth_year) : null,
              gender: m.gender || null,
              is_primary_resident: m.is_primary_resident,
              relationship: m.relationship,
            })),
            analysis_results: {
              rules: response,
              bazhai: bazhaiResult,
              jingzhai: jingzhaiResult,
              dongzhai: dongzhaiResult,
            },
          }, authToken).catch(() => {});
        }
      }
    } catch (err) {
      dispatch({ type: "set_error", value: err instanceof Error ? err.message : String(err) });
    } finally {
      dispatch({ type: "set_loading", value: false });
    }
  };

  const handleRunEvaluation = () => {
    setEvaluationRippleKey((key) => key + 1);
    void runEvaluation();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const inputElement = event.currentTarget;
    const file = inputElement.files?.[0];
    if (!file) {
      return;
    }

    try {
      const snapshot = await importProject(file);
      dispatch({ type: "replace_snapshot", snapshot });
    } catch (err) {
      dispatch({ type: "set_error", value: err instanceof Error ? err.message : String(err) });
    } finally {
      inputElement.value = "";
    }
  };

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;
  const ui = (key: TranslationKey): string => t(state.language, key);
  const renderBaguaLabel = (code: BaguaCode): string =>
    renderLocalizedEnumLabel(state.language, code, BAGUA_DISPLAY_ZH_LABELS);

  const renderShapeFlagGroup = (
    titleKey: TranslationKey,
    keys: ManualFlagKey[]
  ): JSX.Element => (
    <article className="sub-panel">
      <h4>{ui(titleKey)}</h4>
      <div className="checkbox-grid">
        {keys.map((key) => (
          <label key={key} className="checkbox-item">
            <input
              type="checkbox"
              checked={state.inputs.manual_flags[key]}
              onChange={(event) => {
                dispatch({ type: "set_manual_flag", key, value: event.currentTarget.checked });
              }}
            />
            <span>{ui(MANUAL_FLAG_LABELS[key])}</span>
          </label>
        ))}
      </div>
    </article>
  );

  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    setAuthToken(null);
  };

  return (
    !authReady ? (<></>) : !authUser ? (
      <LoginPage onLogin={(user, token) => { setAuthUser(user); setAuthToken(token); }} />
    ) : (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>{ui("app.header.title")}</h1>
          <p>{ui("app.header.subtitle")}</p>
        </div>
        <span className="auth-user-badge">{authUser.username}</span>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
        <LanguageToggle
          language={state.language}
          onChange={(language) => dispatch({ type: "set_language", language })}
        />
      </header>

      <main className="app-main">
        <section className="panel app-input-panel">
          <h3>{ui("app.inputWorkspace" as TranslationKey)}</h3>
          <div className="app-input-layout">
            <section className="common-context-section">
              <h4 className="common-context-subtitle">{ui("app.houseInfo.title" as TranslationKey)}</h4>
              <div className="form-grid three-col compact-grid">
                <label>
                  {ui("app.house.name")}
                  <input
                    value={state.inputs.house.name}
                    onChange={(event) => {
                      dispatch({ type: "set_house_field", field: "name", value: event.currentTarget.value });
                    }}
                  />
                </label>

                <label>
                  {ui("app.house.sittingBagua")}
                  <select
                    value={state.inputs.house.sitting_bagua}
                    onChange={(event) => {
                      const next = event.currentTarget.value as HouseMetaInput["sitting_bagua"];
                      dispatch({ type: "set_house_field", field: "sitting_bagua", value: next });
                    }}
                  >
                    {BAGUA_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {renderBaguaLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {ui("app.house.facingBagua")}
                  <select
                    value={state.inputs.house.facing_bagua}
                    onChange={(event) => {
                      const next = event.currentTarget.value as HouseMetaInput["facing_bagua"];
                      dispatch({ type: "set_house_field", field: "facing_bagua", value: next });
                    }}
                  >
                    <option value="">{ui("app.common.select")}</option>
                    {BAGUA_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {renderBaguaLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="analysis-mode-label">
                  {ui("app.analysisMode.label")}
                  <div className="analysis-mode-toggle">
                    <button
                      type="button"
                      className={state.analysisMode === "jingzhai" ? "active" : ""}
                      onClick={() => dispatch({ type: "set_analysis_mode", mode: "jingzhai" })}
                    >
                      {ui("app.analysisMode.jingzhai")}
                    </button>
                    <button
                      type="button"
                      className={state.analysisMode === "dongzhai" ? "active" : ""}
                      onClick={() => dispatch({ type: "set_analysis_mode", mode: "dongzhai" })}
                    >
                      {ui("app.analysisMode.dongzhai")}
                    </button>
                  </div>
                </label>

                {state.analysisMode === "dongzhai" && (
                  <label>
                    <span>{ui("app.house.currentFloor")}</span>
                    <input
                      type="number"
                      min="1"
                      value={state.inputs.house.current_floor}
                      onChange={(event) => {
                        dispatch({ type: "set_house_field", field: "current_floor", value: event.currentTarget.value });
                      }}
                    />
                  </label>
                )}

                {state.analysisMode === "jingzhai" && (
                  <label>
                    <span>{ui("app.house.houseIndex")}</span>
                    <input
                      type="number"
                      min="1"
                      value={state.inputs.house.house_index}
                      onChange={(event) => {
                        dispatch({ type: "set_house_field", field: "house_index", value: event.currentTarget.value });
                      }}
                    />
                  </label>
                )}

                <label>
                  {ui("app.caseContact.name" as TranslationKey)}
                  <input
                    value={state.inputs.case_contact.case_contact_name}
                    onChange={(event) => {
                      dispatch({
                        type: "set_case_contact_field",
                        field: "case_contact_name",
                        value: event.currentTarget.value
                      });
                    }}
                  />
                </label>

                <label className="span-3">
                  {ui("app.caseContact.notes" as TranslationKey)}
                  <textarea
                    rows={2}
                    value={state.inputs.case_contact.case_notes}
                    onChange={(event) => {
                      dispatch({
                        type: "set_case_contact_field",
                        field: "case_notes",
                        value: event.currentTarget.value
                      });
                    }}
                  />
                </label>
              </div>

              <details className="advanced-block">
                <summary>{ui("app.advanced.title")}</summary>
                <div className="form-grid three-col advanced-grid compact-grid">
                  <label>
                    {ui("app.house.totalFloors")}
                    <input
                      type="number"
                      min="1"
                      value={state.inputs.house.total_floors}
                      onChange={(event) => {
                        dispatch({ type: "set_house_field", field: "total_floors", value: event.currentTarget.value });
                      }}
                    />
                  </label>

                  <label>
                    {ui("app.house.roomCount")}
                    <input
                      type="number"
                      min="1"
                      value={state.inputs.house.room_count}
                      onChange={(event) => {
                        dispatch({ type: "set_house_field", field: "room_count", value: event.currentTarget.value });
                      }}
                    />
                  </label>

                  <label>
                    {ui("app.house.doorBagua")}
                    <select
                      value={state.inputs.house.door_bagua}
                      onChange={(event) => {
                        dispatch({
                          type: "set_house_field",
                          field: "door_bagua",
                          value: event.currentTarget.value as HouseMetaInput["door_bagua"]
                        });
                      }}
                    >
                      <option value="">{ui("app.common.select")}</option>
                      {BAGUA_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {renderBaguaLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {ui("app.house.sittingDirection24")}
                    <select
                      value={state.inputs.house.sitting_direction24}
                      onChange={(event) => {
                        dispatch({
                          type: "set_house_field",
                          field: "sitting_direction24",
                          value: event.currentTarget.value as HouseMetaInput["sitting_direction24"]
                        });
                      }}
                    >
                      <option value="">{ui("app.common.select")}</option>
                      {DIRECTION24_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {ui("app.house.facingDirection24")}
                    <select
                      value={state.inputs.house.facing_direction24}
                      onChange={(event) => {
                        dispatch({
                          type: "set_house_field",
                          field: "facing_direction24",
                          value: event.currentTarget.value as HouseMetaInput["facing_direction24"]
                        });
                      }}
                    >
                      <option value="">{ui("app.common.select")}</option>
                      {DIRECTION24_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
            </section>

            <section className="common-context-section calculated-section">
              <h4 className="common-context-subtitle">{ui("app.timeBoard.title" as TranslationKey)}</h4>
              <div className="form-grid three-col compact-grid">
                <label>
                  {ui("app.time.gregorianDate")}
                  <input
                    type="date"
                    value={state.inputs.temporal.gregorian_date}
                    onChange={(event) => {
                      dispatch({
                        type: "set_temporal_field",
                        field: "gregorian_date",
                        value: event.currentTarget.value
                      });
                    }}
                  />
                </label>

                <label>
                  {ui("app.time.gregorianTime")}
                  <input
                    type="time"
                    step="1"
                    value={state.inputs.temporal.gregorian_time}
                    onChange={(event) => {
                      dispatch({
                        type: "set_temporal_field",
                        field: "gregorian_time",
                        value: event.currentTarget.value
                      });
                    }}
                  />
                </label>

                <label>
                  {ui("app.time.ruleMonthOverride")}
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={state.inputs.temporal.lunar_month}
                    onChange={(event) => {
                      dispatch({ type: "set_temporal_field", field: "lunar_month", value: event.currentTarget.value });
                    }}
                  />
                </label>
              </div>
              <dl className="calculated-grid compact-calculated-grid" data-testid="calculated-fields-grid">
                <div className="calculated-row" data-testid="calculated-flow-year-pillar">
                  <dt>{ui("app.time.baziYearPillar")}</dt>
                  <dd data-testid="calculated-flow-year-pillar-value">{renderCalculatedValue(baziDate?.year_pillar)}</dd>
                </div>

                <div className="calculated-row" data-testid="calculated-flow-year-ganzhi-code">
                  <dt>{ui("app.time.baziYearCode")}</dt>
                  <dd>{renderCalculatedValue(baziDate?.year_ganzhi_code)}</dd>
                </div>

                <div className="calculated-row" data-testid="calculated-jieqi-rule-month">
                  <dt>{ui("app.time.jieqiRuleMonth")}</dt>
                  <dd data-testid="calculated-jieqi-rule-month-value">
                    {renderCalculatedValue(baziDate?.rule_month_from_jieqi)}
                  </dd>
                </div>

                <div className="calculated-row" data-testid="calculated-bazi-month-pillar">
                  <dt>{ui("app.time.baziMonthPillar")}</dt>
                  <dd>{renderCalculatedValue(baziDate?.month_pillar)}</dd>
                </div>

                <div className="calculated-row" data-testid="calculated-bazi-month-ganzhi-code">
                  <dt>{ui("app.time.baziMonthCode")}</dt>
                  <dd>{renderCalculatedValue(baziDate?.month_ganzhi_code)}</dd>
                </div>

                <div className="calculated-row" data-testid="calculated-bazi-day-pillar">
                  <dt>{ui("app.time.baziDayPillar")}</dt>
                  <dd>{renderCalculatedValue(baziDate?.day_pillar)}</dd>
                </div>

                <div className="calculated-row" data-testid="calculated-bazi-time-pillar">
                  <dt>{ui("app.time.baziTimePillar")}</dt>
                  <dd>{renderCalculatedValue(baziDate?.time_pillar)}</dd>
                </div>
              </dl>
            </section>

            <section className="common-context-section household-members-section">
              <div className="section-title-row">
                <h4 className="common-context-subtitle">
                  {ui("members.title" as TranslationKey)} {state.inputs.members.length} / {MAX_HOUSEHOLD_MEMBERS}
                </h4>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "add_member", member: createMemberDraft(state.inputs.members.length) })}
                  disabled={state.inputs.members.length >= MAX_HOUSEHOLD_MEMBERS}
                >
                  {ui("members.add" as TranslationKey)}
                </button>
              </div>

              {state.inputs.members.length === 0 ? (
                <p className="meta-text">{ui("members.empty" as TranslationKey)}</p>
              ) : (
                <div className="member-card-list">
                  {state.inputs.members.map((member, index) => {
                    const calculated = memberCalculatedValues[member.id];
                    return (
                      <article key={member.id} className="member-card">
                        <div className="member-card-header">
                          <strong>
                            {ui("members.member" as TranslationKey)} {index + 1}
                          </strong>
                          <button type="button" onClick={() => dispatch({ type: "remove_member", id: member.id })}>
                            {ui("members.remove" as TranslationKey)}
                          </button>
                        </div>

                        <div className="form-grid two-col compact-grid">
                          <label>
                            {ui("members.name" as TranslationKey)}
                            <input
                              value={member.name}
                              onChange={(event) =>
                                dispatch({
                                  type: "set_member_field",
                                  id: member.id,
                                  field: "name",
                                  value: event.currentTarget.value
                                })
                              }
                            />
                          </label>

                          <label>
                            {ui("members.birthYear" as TranslationKey)}
                            <input
                              type="number"
                              value={member.birth_year}
                              onChange={(event) =>
                                dispatch({
                                  type: "set_member_field",
                                  id: member.id,
                                  field: "birth_year",
                                  value: event.currentTarget.value
                                })
                              }
                            />
                          </label>

                          <label>
                            {ui("members.gender" as TranslationKey)}
                            <select
                              value={member.gender}
                              onChange={(event) =>
                                dispatch({
                                  type: "set_member_field",
                                  id: member.id,
                                  field: "gender",
                                  value: event.currentTarget.value as HouseholdMemberInput["gender"]
                                })
                              }
                            >
                              <option value="">{ui("app.common.select")}</option>
                              {OWNER_GENDER_OPTIONS.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label>
                            {ui("members.relationship" as TranslationKey)}
                            <select
                              value={member.relationship}
                              onChange={(event) =>
                                dispatch({
                                  type: "set_member_field",
                                  id: member.id,
                                  field: "relationship",
                                  value: event.currentTarget.value
                                })
                              }
                            >
                              <option value="">{ui("app.common.select")}</option>
                              {HOUSEHOLD_RELATIONSHIP_OPTIONS.map((item) => (
                                <option key={item} value={item}>
                                  {ui(`members.relationship.${item}` as TranslationKey)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="inline-checkbox">
                            <input
                              type="checkbox"
                              checked={member.is_primary_resident}
                              onChange={() => dispatch({ type: "set_primary_member", id: member.id })}
                            />
                            <span>{ui("members.primary" as TranslationKey)}</span>
                          </label>

                          <div className="member-derived">
                            <span>{ui("members.age" as TranslationKey)}: {renderCalculatedValue(calculated?.age)}</span>
                            <span>
                              {ui("members.yearPillar" as TranslationKey)}: {renderCalculatedValue(calculated?.yearPillar)}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="common-context-section evaluate-section">
              <h4 className="common-context-subtitle">{ui("app.evaluate.title")}</h4>
              <div className="form-grid two-col compact-grid">
                <button
                  type="button"
                  className="primary evaluate-run-button"
                  onClick={handleRunEvaluation}
                  disabled={state.loading}
                >
                  <span className="evaluate-run-label">
                    {state.loading ? ui("app.evaluate.evaluating") : ui("app.evaluate.run")}
                  </span>
                  {evaluationRippleKey > 0 && (
                    <span key={evaluationRippleKey} className="evaluate-run-ink" aria-hidden="true" />
                  )}
                </button>

                <button type="button" onClick={() => exportProject(toProjectSnapshot(state))}>
                  {ui("app.evaluate.exportJson")}
                </button>

                <label className="file-upload">
                  {ui("app.evaluate.importJson")}
                  <input type="file" accept="application/json" onChange={handleImport} />
                </label>
              </div>

              {state.error && <p className="error-text">{state.error}</p>}
              {state.evaluation && (
                <p className="meta-text">
                  {ui("app.evaluate.lastRequest")}: {state.evaluation.requested_at} | hash {state.evaluation.payload_hash}
                </p>
              )}
            </section>
          </div>
        </section>

        <section className="panel tab-bar-panel">
          <div className="panel-header-inline">
            <h3>{ui("app.analysisTabs")}</h3>
          </div>
          <div className="tab-row" role="tablist" aria-label={ui("app.analysisTabsAria")}>
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={state.activeTab === tab.id}
                aria-label={ui(tab.ariaKey)}
                className={state.activeTab === tab.id ? "active" : ""}
                onClick={() => dispatch({ type: "set_active_tab", tab: tab.id })}
              >
                <span className="tab-button-content">
                  <span>{ui(tab.key)}</span>
                  {state.evaluation && (
                    <span className="tab-badge" data-testid={`tab-badge-${tab.id}`}>
                      {`${ui("app.badge.matchedShort")} ${tabBadgeCounts[tab.id].matched} / ${ui("app.badge.notEvaluableShort")} ${tabBadgeCounts[tab.id].notEvaluable}`}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="tab-workspace">
          {state.activeTab === "house_liqi" && (
            <HouseLiqiWorkspace
              language={state.language}
              bazhaiResult={state.evaluation?.bazhai_results ?? null}
              bazhaiMissingFields={bazhaiMissingFields}
              liqiHouseProfile={state.liqiHouseProfile}
              loading={state.temporalLoading}
            />
          )}

          {state.activeTab === "temporal" && (
            <TemporalPanel
              language={state.language}
              annual={state.temporalData.annual}
              monthly={state.temporalData.monthly}
              flyingStar={state.temporalData.flyingStar}
              gregorianConversion={state.temporalData.gregorianConversion}
              loading={state.temporalLoading}
              error={state.error}
            />
          )}

          {state.activeTab === "zhai_yun" && (
            <HousePeriodPanel
              language={state.language}
              periodData={state.periodData}
              loading={state.periodLoading}
              error={state.error}
            />
          )}

          {state.activeTab === "structure" && (
            <>
              <ToolPanel
                tool={state.tool}
                onToolChange={(tool) => dispatch({ type: "set_tool", tool })}
                language={state.language}
                onUndo={() => dispatch({ type: "undo_editor" })}
                onRedo={() => dispatch({ type: "redo_editor" })}
                canUndo={canUndo}
                canRedo={canRedo}
              />

              <ShaMarkerPalette
                tool={state.tool}
                language={state.language}
                onToolChange={(tool) => dispatch({ type: "set_tool", tool })}
              />

              <section className="panel">
                <h3>{ui("app.internal.editorControls")}</h3>
                <div className="form-grid two-col compact-grid">
                  <label>
                    {ui("app.internal.gridSize")}
                    <select
                      value={state.editor.gridSizeM}
                      onChange={(event) => {
                        const next = Number(event.currentTarget.value);
                        dispatch({
                          type: "commit_editor",
                          editor: { ...state.editor, gridSizeM: next }
                        });
                      }}
                    >
                      {GRID_SIZE_PRESETS_M.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    {ui("app.internal.customGrid")}
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={state.editor.gridSizeM}
                      onChange={(event) => {
                        const next = Number(event.currentTarget.value);
                        if (Number.isFinite(next) && next > 0) {
                          dispatch({
                            type: "commit_editor",
                            editor: { ...state.editor, gridSizeM: next }
                          });
                        }
                      }}
                    />
                  </label>

                  <label>
                    {ui("app.internal.northAngle")}
                    <input
                      type="range"
                      min="0"
                      max="359"
                      value={state.editor.northAngleDeg}
                      onChange={(event) => {
                        dispatch({
                          type: "commit_editor",
                          editor: { ...state.editor, northAngleDeg: Number(event.currentTarget.value) }
                        });
                      }}
                    />
                  </label>

                  <label>
                    {ui("app.internal.baguaOverlay")}
                    <button
                      type="button"
                      className={state.editor.showBaguaOverlay ? "active" : ""}
                      aria-pressed={Boolean(state.editor.showBaguaOverlay)}
                      onClick={() => {
                        dispatch({
                          type: "set_show_bagua_overlay",
                          value: !state.editor.showBaguaOverlay
                        });
                      }}
                    >
                      {state.editor.showBaguaOverlay ? ui("app.common.on") : ui("app.common.off")}
                    </button>
                  </label>

                </div>
              </section>

              <FloorplanEditor
                language={state.language}
                tool={state.tool}
                editor={state.editor}
                selectedId={state.editor.selectedId}
                onSelectPrimitive={(id) => dispatch({ type: "set_editor_selected_id", id })}
                onViewportChange={(viewport) => dispatch({ type: "set_editor_viewport", viewport })}
                onAddMarker={(marker) => dispatch({ type: "add_marker", marker })}
                onRemoveMarker={(id) => dispatch({ type: "remove_marker", id })}
                onAddSegment={(segment) => dispatch({ type: "add_segment", segment })}
                onRemoveSegment={(id) => dispatch({ type: "remove_segment", id })}
                onComplete={(primitives, entrance, floorplan) => {
                  dispatch({
                    type: "commit_editor",
                    editor: { ...state.editor, primitives, entrance, floorplan }
                  });
                }}
              />

              <section className="panel door-role-panel">
                <h3>{ui("doorRole.title")}</h3>
                {selectedDoor ? (
                  <div className="form-grid two-col compact-grid">
                    <label>
                      {ui("doorRole.role")}
                      <select
                        value={selectedDoor.role ?? ""}
                        onChange={(event) => {
                          const role = event.currentTarget.value;
                          dispatch({
                            type: "update_segment",
                            id: selectedDoor.id,
                            segment: { role: role ? (role as SegmentPrimitive["role"]) : undefined }
                          });
                        }}
                      >
                        <option value="">{ui("doorRole.none")}</option>
                        <option value="main">{ui("doorRole.main")}</option>
                        <option value="room">{ui("doorRole.room")}</option>
                        <option value="toilet">{ui("doorRole.toilet")}</option>
                        <option value="kitchen">{ui("doorRole.kitchen")}</option>
                      </select>
                    </label>
                    <label>
                      ID
                      <input value={selectedDoor.id} readOnly />
                    </label>
                  </div>
                ) : (
                  <p className="meta-text">{ui("doorRole.empty")}</p>
                )}
              </section>

              <RoomLabelPanel
                language={state.language}
                room={selectedRoom}
                onChange={(id, update: { label?: string; roomType?: RoomType }) => {
                  dispatch({ type: "set_room_label", id, ...update });
                }}
              />

              <section className="panel">
                <h3>{ui("app.internal.metrics")}</h3>
                <div className="form-grid three-col compact-grid">
                  <label>
                    {ui("app.internal.derivedHouseArea")}
                    <input value={derived.house_area_m2} readOnly />
                  </label>
                  <label>
                    {ui("app.internal.overrideHouseArea")}
                    <input
                      type="number"
                      value={state.inputs.house_area_override_m2}
                      onChange={(event) => {
                        dispatch({ type: "set_house_area_override", value: event.currentTarget.value });
                      }}
                    />
                  </label>
                  <label>
                    {ui("app.internal.mingtangRoom")}
                    <select
                      value={state.inputs.mingtang_room_id ?? ""}
                      onChange={(event) => {
                        dispatch({ type: "set_mingtang_room_id", value: event.currentTarget.value || null });
                      }}
                    >
                      <option value="">{ui("app.common.auto")}</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.label || room.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {ui("app.internal.derivedMingtangArea")}
                    <input value={derived.mingtang_area_m2} readOnly />
                  </label>
                  <label>
                    {ui("app.internal.overrideMingtangArea")}
                    <input
                      type="number"
                      value={state.inputs.mingtang_area_override_m2}
                      onChange={(event) => {
                        dispatch({ type: "set_mingtang_area_override", value: event.currentTarget.value });
                      }}
                    />
                  </label>
                  <label>
                    {ui("app.internal.windowSpaceRatio")}
                    <input value={derived.internal_layout.measurements.window_to_space_ratio} readOnly />
                  </label>
                  <label>
                    {ui("app.internal.roomDoorOpposedPairs")}
                    <input value={derived.internal_layout.counts.room_door_opposed_pairs} readOnly />
                  </label>
                </div>
              </section>

              <section className="panel">
                <h3>{ui("app.shape.signalInputs")}</h3>
                <div className="sub-panel-grid">
                  {renderShapeFlagGroup("app.shape.pureIndicators", PURE_SHAPE_FLAG_KEYS)}
                  {renderShapeFlagGroup("app.shape.structuralIndicators", STRUCTURAL_SHA_FLAG_KEYS)}
                  {renderShapeFlagGroup("app.shape.conflictIndicators", CONFLICT_SHA_FLAG_KEYS)}
                </div>
              </section>

              <section className="panel">
                <h3>{ui("app.shape.mitigationContext")}</h3>
                <div className="sub-panel-grid">
                  <article className="sub-panel">
                    <h4>{ui("app.shape.changeability")}</h4>
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={state.inputs.manual_flags.hard_to_change_layout}
                        onChange={(event) => {
                          dispatch({
                            type: "set_manual_flag",
                            key: "hard_to_change_layout",
                            value: event.currentTarget.checked
                          });
                        }}
                      />
                      <span>{ui(MANUAL_FLAG_LABELS.hard_to_change_layout)}</span>
                    </label>
                  </article>

                  <article className="sub-panel">
                    <h4>{ui("app.shape.flowGeometry")}</h4>
                    <div className="form-grid two-col compact-grid">
                      <label>
                        {ui("app.shape.entryQiTurns")}
                        <input
                          type="number"
                          min="0"
                          value={state.inputs.manual_counts.entry_qi_turns}
                          onChange={(event) => {
                            dispatch({ type: "set_entry_qi_turns", value: Number(event.currentTarget.value) });
                          }}
                        />
                      </label>

                      <label>
                        {ui("app.shape.houseHeight")}
                        <input
                          type="number"
                          step="0.1"
                          value={state.inputs.manual_measurements.house_height_m}
                          onChange={(event) => {
                            dispatch({
                              type: "set_manual_measurement",
                              key: "house_height_m",
                              value: event.currentTarget.value
                            });
                          }}
                        />
                      </label>

                      <label>
                        {ui("app.shape.mingtangWidth")}
                        <input
                          type="number"
                          step="0.1"
                          value={state.inputs.manual_measurements.mingtang_width_m}
                          onChange={(event) => {
                            dispatch({
                              type: "set_manual_measurement",
                              key: "mingtang_width_m",
                              value: event.currentTarget.value
                            });
                          }}
                        />
                      </label>

                      <label>
                        {ui("app.shape.frontGapDistance")}
                        <input
                          type="number"
                          step="0.1"
                          value={state.inputs.manual_measurements.front_pair_gap_distance_m}
                          onChange={(event) => {
                            dispatch({
                              type: "set_manual_measurement",
                              key: "front_pair_gap_distance_m",
                              value: event.currentTarget.value
                            });
                          }}
                        />
                      </label>
                    </div>
                  </article>

                  <article className="sub-panel">
                    <h4>{ui("app.shape.elementStrength")}</h4>
                    <div className="form-grid two-col compact-grid">
                      <label>
                        {ui("app.shape.selfStrength")}
                        <select
                          value={state.inputs.manual_categories.self_strength}
                          onChange={(event) => {
                            const next = event.currentTarget.value as ManualCategories["self_strength"];
                            dispatch({ type: "set_manual_category", key: "self_strength", value: next });
                          }}
                        >
                          {STRENGTH_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        {ui("app.shape.incomingStrength")}
                        <select
                          value={state.inputs.manual_categories.incoming_strength}
                          onChange={(event) => {
                            const next = event.currentTarget.value as ManualCategories["incoming_strength"];
                            dispatch({ type: "set_manual_category", key: "incoming_strength", value: next });
                          }}
                        >
                          {STRENGTH_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </article>
                </div>
              </section>

              <section className="panel">
                <h3>{ui("app.shape.externalChecklist")}</h3>
                <div className="form-grid three-col top-space">
                  <p className="meta-text">{ui("app.shape.externalHint")}</p>
                </div>
              </section>

              <ExternalShaChecklist
                language={state.language}
                flags={state.inputs.external_sha_flags}
                showAdvanced={state.showAdvancedExternal}
                onToggleAdvanced={(value) => dispatch({ type: "set_show_advanced_external", value })}
                onFlagChange={(id, value) => dispatch({ type: "set_external_sha_flag", id, value })}
              />

              <ResultsPanel
                language={state.language}
                titleKey="results.panel.structureTitle"
                findings={combinedStructureFindings}
                filter={state.tabFindingFilters.structure}
                onFilterChange={(filter) => dispatch({ type: "set_tab_finding_filter", tab: "structure", filter })}
                emptyKey="results.empty.structure"
                showMitigationHighlights
              />
            </>
          )}

          {state.activeTab === "static_house" && (
            <JingzhaiPanel language={state.language} result={state.evaluation?.jingzhai_result ?? null} />
          )}

          {state.activeTab === "dongzhai" && (
            <DongzhaiPanel
              language={state.language}
              result={state.evaluation?.dongzhai_result ?? null}
              missingFields={dongzhaiMissingFields}
            />
          )}
        </section>
      </main>
    </div>
    )
  );
}
