import { describe, expect, it, vi } from "vitest";
import { evaluateHouseholdBazhai, evaluateRules } from "../api/client";
import { createDefaultEditorState, createDefaultInputState } from "../constants";
import { deriveProjectState } from "./derivation";
import { createEvaluationRequest } from "./payload";

describe("evaluateRules integration", () => {
  it("posts payload and returns backend response", async () => {
    const editor = createDefaultEditorState();
    const inputs = createDefaultInputState();
    const payload = createEvaluationRequest(editor, inputs, deriveProjectState(editor, inputs));

    const mockResponse = {
      house_name: "demo",
      findings: [
        {
          formula_id: "INT-001",
          title_zh: "",
          title_en: "Break",
          status: "not_evaluable",
          severity: "high",
          confidence: "high",
          message_zh: "",
          message_en: "missing fields",
          missing_fields: ["internal_flags.stair_in_center"],
          source_refs: []
        }
      ],
      matched_count: 0,
      not_matched_count: 0,
      not_evaluable_count: 1,
      static_house_score: null,
      static_house_details: {},
      temporal_summary: {}
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await evaluateRules("http://127.0.0.1:8000", payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/rules/evaluate");
    expect(result.not_evaluable_count).toBe(1);
    expect(result.findings[0]?.status).toBe("not_evaluable");
  });

  it("posts household bazhai payload and returns member results", async () => {
    const mockResponse = {
      house_bagua: "KAN",
      member_results: [
        {
          member_id: "member-1",
          name: "Alice",
          birth_year: 1990,
          gender: "female",
          is_primary_resident: true,
          relationship: "owner",
          status: "matched",
          missing_fields: [],
          result: { overall_label_en: "auspicious" }
        }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await evaluateHouseholdBazhai("http://127.0.0.1:8000", {
      house_bagua: "KAN",
      members: [
        {
          member_id: "member-1",
          name: "Alice",
          birth_year: 1990,
          gender: "female",
          is_primary_resident: true,
          relationship: "owner"
        }
      ]
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/v1/bazhai/household-person-house");
    expect(result.member_results[0]?.status).toBe("matched");
  });
});
