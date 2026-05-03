import { describe, expect, it } from "vitest";
import { createDefaultEditorState, createDefaultInputState } from "../constants";
import { evaluateRules } from "../api/client";
import {
  BAZI_MONTH_BRANCH_ORDER,
  BAZI_MONTH_BRANCH_TO_RULE_MONTH,
  EARTHLY_BRANCH_CODES,
  HEAVENLY_STEM_CODES
} from "./bazi";
import { deriveProjectState } from "./derivation";
import { createEvaluationRequest } from "./payload";

type EnvMap = Record<string, string | undefined>;
type ProcessLike = { env?: EnvMap };
type GlobalWithProcess = typeof globalThis & { process?: ProcessLike };

const processEnv = (globalThis as GlobalWithProcess).process?.env ?? {};
const runLive = processEnv.LIVE_BACKEND === "1";
const baseUrl = processEnv.LIVE_BACKEND_URL ?? "http://127.0.0.1:8000";

describe.runIf(runLive)("live UI-backend integration", () => {
  it("submits frontend-generated payload to backend /rules/evaluate", async () => {
    const editor = createDefaultEditorState();
    editor.primitives = [
      { id: "room-1", kind: "room", x: 0, y: 0, width: 10, height: 8 },
      { id: "wall-1", kind: "wall", start: { x: 4, y: 0 }, end: { x: 4, y: 8 } },
      { id: "door-1", kind: "door", start: { x: 0, y: 3 }, end: { x: 1, y: 3 } },
      { id: "door-2", kind: "door", start: { x: 0, y: 5 }, end: { x: 1, y: 5 } },
      { id: "window-1", kind: "window", start: { x: 9, y: 1 }, end: { x: 10, y: 1 } }
    ];
    editor.entrance = { x: 0, y: 4 };
    editor.northAngleDeg = 18;

    const inputs = createDefaultInputState();
    inputs.house.name = "live_integration_house";
    inputs.temporal.gregorian_date = "2026-04-18";
    inputs.temporal.lunar_month = "3";
    inputs.case_contact.case_contact_name = "Integration User";
    inputs.members = [
      {
        id: "member-1",
        name: "Integration User",
        birth_year: "1987",
        gender: "male",
        is_primary_resident: true,
        relationship: "owner"
      }
    ];
    inputs.manual_flags.stair_in_center = true;
    inputs.manual_flags.main_door_toilet_door_opposed = true;
    inputs.manual_categories.incoming_sha_element = "WOOD";
    inputs.manual_categories.self_strength = "weak";
    inputs.manual_categories.incoming_strength = "strong";
    inputs.external_sha_flags.external_sha_001 = true;

    const derived = deriveProjectState(editor, inputs);
    const payload = createEvaluationRequest(editor, inputs, derived);
    const result = await evaluateRules(baseUrl, payload);

    expect(result.house_name).toBe("live_integration_house");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(["matched", "not_matched", "not_evaluable"]).toContain(result.findings[0]?.status);
    expect(result.temporal_summary).toBeDefined();
  });

  it("surfaces backend validation errors for enum violations", async () => {
    const editor = createDefaultEditorState();
    const inputs = createDefaultInputState();
    const payload = createEvaluationRequest(editor, inputs, deriveProjectState(editor, inputs));

    (payload.house_profile as { sitting_bagua: string }).sitting_bagua = "kan";

    await expect(evaluateRules(baseUrl, payload)).rejects.toThrow();
  });

  it("keeps frontend bazi constants aligned with backend temporal constants", async () => {
    const response = await fetch(`${baseUrl}/api/v1/temporal/constants`);
    expect(response.ok).toBe(true);
    const constants = (await response.json()) as {
      heavenly_stem_codes: string[];
      earthly_branch_codes: string[];
      bazi_month_branch_order: string[];
      bazi_month_branch_to_rule_month: Record<string, number>;
    };

    expect(constants.heavenly_stem_codes).toEqual([...HEAVENLY_STEM_CODES]);
    expect(constants.earthly_branch_codes).toEqual([...EARTHLY_BRANCH_CODES]);
    expect(constants.bazi_month_branch_order).toEqual([...BAZI_MONTH_BRANCH_ORDER]);
    expect(constants.bazi_month_branch_to_rule_month).toEqual(BAZI_MONTH_BRANCH_TO_RULE_MONTH);
  });
});
