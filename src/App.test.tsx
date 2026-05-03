import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./components/FloorplanEditor", () => ({
  FloorplanEditor: () => <div data-testid="floorplan-editor-mock" />
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

function installEvaluationFetchMock() {
  const mockResponse = {
    house_name: "demo",
    findings: [
      {
        formula_id: "INT-001",
        title_zh: "INT zh",
        title_en: "INT finding",
        status: "matched",
        severity: "medium",
        confidence: "high",
        message_zh: "int message zh",
        message_en: "int message",
        missing_fields: [],
        source_refs: []
      },
      {
        formula_id: "EXT-001",
        title_zh: "EXT zh",
        title_en: "EXT finding",
        status: "matched",
        severity: "high",
        confidence: "high",
        message_zh: "ext message zh",
        message_en: "ext message",
        missing_fields: [],
        source_refs: []
      },
      {
        formula_id: "MIT-001",
        title_zh: "MIT zh",
        title_en: "MIT finding",
        status: "matched",
        severity: "low",
        confidence: "high",
        message_zh: "mit message zh",
        message_en: "mit message",
        missing_fields: [],
        source_refs: []
      }
    ],
    matched_count: 3,
    not_matched_count: 0,
    not_evaluable_count: 0,
    static_house_score: 70,
    static_house_details: {
      status_en: "balanced",
      status_zh: "ping heng",
      self_element: "WOOD"
    },
    temporal_summary: { annual: "ok" }
  };

  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = mockResponse;

    if (url.includes("/api/v1/temporal/convert/gregorian")) {
      body = {
        pillars: {
          year_ganzhi: "BINGWU",
          month_ganzhi: "RENCHEN",
          day_ganzhi: "JISI",
          time_ganzhi: "GENGWU"
        },
        rule_month: 3
      };
    } else if (url.includes("/api/v1/temporal/annual")) {
      body = {
        year_ganzhi: "BINGWU",
        year_stem: "BING",
        year_branch: "WU",
        tai_sui_sui_po: { tai_sui: "WU", sui_po: "ZI" },
        san_sha: ["HAI", "ZI", "CHOU"],
        wuji_sha: ["XU", "HAI"],
        taiyang: { year_ganzhi: "BINGWU", tai_sui: "WU", taiyang_shen: "WEI", taiyang_position: "HAI" },
        nobleman: { year_ganzhi_code: "BINGWU", nobleman_branches: { yang: "HAI", yin: "YOU" } },
        lu_ma: { lu: "SI", ma: "SHEN" }
      };
    } else if (url.includes("/api/v1/temporal/monthly")) {
      body = {
        year_ganzhi: "BINGWU",
        month_ganzhi: "RENCHEN",
        rule_month: 3,
        center_star: 6,
        anjian_sha: "QIAN",
        wuji_sha: ["SHEN", "YOU"]
      };
    } else if (url.includes("/api/v1/temporal/flying-star/annual")) {
      body = {
        center_star: 1,
        flight_direction: "forward",
        directional: { C: 1, NW: 2, W: 3, NE: 4, S: 5, N: 6, SW: 7, E: 8, SE: 9 },
        matrix_south_up: [[9, 5, 7], [8, 1, 3], [4, 6, 2]],
        bagua_star: { 乾: 2, 兑: 3, 艮: 4, 离: 5, 坎: 6, 坤: 7, 震: 8, 巽: 9, 中: 1 }
      };
    } else if (url.includes("/api/v1/liqi/house/")) {
      body = {
        sitting_bagua: "KAN",
        sitting_bagua_zh: "坎",
        center_star: 1,
        center_bagua: "坎",
        center_star_element: "水",
        flying_star_grid: {
          center_star: 1,
          flight_direction: "forward",
          directional: { C: 1, NW: 2, W: 3, NE: 4, S: 5, N: 6, SW: 7, E: 8, SE: 9 },
          matrix_south_up: [[9, 5, 7], [8, 1, 3], [4, 6, 2]],
          bagua_star: { 乾: 2, 兑: 3, 艮: 4, 离: 5, 坎: 6, 坤: 7, 震: 8, 巽: 9, 中: 1 }
        },
        qi_type_labels: { SHENG_QI: { zh: "生气", en: "Sheng Qi" } },
        five_qi_palaces: {},
        five_qi_directions: {},
        palace_relation_rows: [],
        wealth_positions: {},
        anchoring_rule_zh: "",
        anchoring_rule_en: ""
      };
    } else if (url.includes("/api/v1/periods/four-yun")) {
      body = {
        year: 2026,
        sitting_bagua: "KAN",
        hetu_five_yun: {
          year: 2026,
          sitting_bagua: "KAN",
          year_ganzhi_code: "BINGWU",
          period_start_ganzhi_code: "GENGZI",
          period_element: "METAL",
          qualified_palaces: ["QIAN", "DUI", "KAN"],
          sitting_qualifies: true
        },
        sanyuan_jiuyun: {
          year: 2026,
          sitting_bagua: "KAN",
          period_number: 9,
          period_start_year: 2024,
          period_end_year: 2043,
          period_element: "FIRE",
          qualified_palaces: ["LI", "KUN", "GEN"],
          sitting_qualifies: false
        },
        tonglin_shanyun: {
          year: 2026,
          sitting_bagua: "KAN",
          yuan: "LOWER",
          anchor_bagua: "DUI",
          commanding_ganzhi_code: "BINGWU",
          qualified_palaces: ["KAN", "ZHEN", "XUN"],
          sitting_qualifies: true,
          flying_grid: {
            palace_ganzhi_code: { KAN: "YIMAO" },
            palace_nayin: { KAN: "WATER" }
          },
          palace_strength: {
            KAN: { palace_bagua: "KAN", palace_ganzhi_code: "YIMAO", palace_nayin_element: "WATER", strength: "strong", is_strong: true }
          }
        },
        zhuanlin_shanyun: {
          year: 2026,
          sitting_bagua: "KAN",
          qualified_palaces: ["KAN", "ZHEN", "XUN"],
          palace_profiles: {
            KAN: { palace_bagua: "KAN", target_ganzhi_code: "YIMAO", target_nayin_element: "WATER", strength: "strong", is_strong: true }
          },
          sitting_profile: { palace_bagua: "KAN", target_ganzhi_code: "YIMAO", target_nayin_element: "WATER", strength: "strong", is_strong: true }
        }
      };
    } else if (url.includes("/api/v1/bazhai/household-person-house")) {
      body = {
        house_bagua: "KAN",
        member_results: [
          {
            member_id: "member-1",
            name: "Demo",
            birth_year: 1994,
            gender: "male",
            is_primary_resident: true,
            relationship: "owner",
            status: "matched",
            missing_fields: [],
            result: {
              year: 1994,
              gender: "male",
              gender_zh: "male",
              person_minggua: { minggua_code: "QIAN", group: { group_en: "West Four" } },
              house_bagua: "KAN",
              house_bagua_code: "KAN",
              house_bagua_zh: "KAN",
              house_group: { group_en: "East Four" },
              group_match: false,
              star_relation: { star_name_en: "Liu Sha", tier_en: "medium" },
              overall_is_auspicious: false,
              overall_label_zh: "inauspicious",
              overall_label_en: "inauspicious"
            }
          }
        ]
      };
    } else if (url.includes("/api/v1/bazhai/person-house")) {
      body = {
        year: 1994,
        gender: "male",
        gender_zh: "男",
        person_minggua: { bagua_code: "QIAN", bagua_zh: "乾", group_en: "West Four" },
        house_bagua: "KAN",
        house_bagua_code: "KAN",
        house_bagua_zh: "坎",
        house_group: { group_en: "East Four" },
        group_match: false,
        star_relation: { relation_en: "Liu Sha", relation_zh: "六煞", tier: "medium" },
        overall_is_auspicious: false,
        overall_label_zh: "不吉",
        overall_label_en: "inauspicious"
      };
    }

    return Promise.resolve({
      ok: true,
      json: async () => body
    } as Response);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("App tabbed workflow", () => {
  it("renders simplified chinese labels when language is switched", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /中文|涓枃/ }));

    expect(screen.getByText("输入工作区")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /宅命理气|瀹呭懡鐞嗘皵/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /执行评估|鎵ц璇勪及/ })).toBeInTheDocument();
  });

  it("keeps shared context values across all tab switches", async () => {
    const user = userEvent.setup();
    render(<App />);

    const facingBaguaSelect = screen.getByLabelText("Facing Bagua") as HTMLSelectElement;
    await user.selectOptions(facingBaguaSelect, "LI");
    expect(facingBaguaSelect.value).toBe("LI");

    const mainTabs = screen.getByRole("tablist", { name: "Analysis tabs" });

    await user.click(within(mainTabs).getByRole("tab", { name: /Flow-Year Temporal/ }));
    expect(screen.getByLabelText("Facing Bagua")).toHaveValue("LI");

    await user.click(within(mainTabs).getByRole("tab", { name: /House Periods/ }));
    expect(screen.getByLabelText("Facing Bagua")).toHaveValue("LI");

    await user.click(within(mainTabs).getByRole("tab", { name: /Plan \+ Indoor Sha/ }));
    expect(screen.getByLabelText("Facing Bagua")).toHaveValue("LI");

    await user.click(within(mainTabs).getByRole("tab", { name: /Static House/ }));
    expect(screen.getByLabelText("Facing Bagua")).toHaveValue("LI");
  });

  it("splits inputs into house, time board, and household members sections", () => {
    render(<App />);

    expect(screen.getByText("House Information")).toBeInTheDocument();
    expect(screen.getByText("Flow-Year / Time Board")).toBeInTheDocument();
    expect(screen.getByText(/Household Members/)).toBeInTheDocument();
    expect(screen.getByTestId("calculated-fields-grid")).toBeInTheDocument();
    expect(screen.queryByLabelText("Owner Age")).not.toBeInTheDocument();
  });

  it("adds household members and computes member age and year pillar", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dateInput = screen.getByLabelText("Gregorian Date") as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, "2026-04-18");

    await user.click(screen.getByRole("button", { name: "+ Add Member" }));
    const birthYearInput = screen.getByLabelText("Birth Year") as HTMLInputElement;

    await user.clear(birthYearInput);
    await user.type(birthYearInput, "1990");
    expect(screen.getByText(/Age: 36/)).toBeInTheDocument();
    expect(screen.getByText(/Year Pillar:/).textContent).not.toBe("Year Pillar: -");

    await user.clear(birthYearInput);
    await user.type(birthYearInput, "1991");
    expect(screen.getByText(/Age: 35/)).toBeInTheDocument();
  });

  it("shows flow year pillar from selected gregorian date/time", async () => {
    const user = userEvent.setup();
    render(<App />);

    const dateInput = screen.getByLabelText("Gregorian Date") as HTMLInputElement;
    const timeInput = screen.getByLabelText("Gregorian Time") as HTMLInputElement;
    const flowYearPillarValue = screen.getByTestId("calculated-flow-year-pillar-value");

    await user.clear(dateInput);
    await user.type(dateInput, "2026-04-18");
    await user.clear(timeInput);
    await user.type(timeInput, "12:00:00");

    expect(flowYearPillarValue.textContent?.trim()).not.toBe("");
    expect(flowYearPillarValue.textContent).not.toBe("鈥?");
  });

  it("renders bagua and wuxing selectors as chinese + code in zh mode", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /中文|涓枃/ }));

    const sittingBaguaSelect = screen.getByLabelText(/鍧愬崷|坐卦/) as HTMLSelectElement;
    const doorElementSelect = screen.getByLabelText(/闂ㄤ箣浜旇|门之五行/) as HTMLSelectElement;

    expect(within(sittingBaguaSelect).getByRole("option", { name: /QIAN/ })).toBeInTheDocument();
    expect(within(doorElementSelect).getByRole("option", { name: /WOOD/ })).toBeInTheDocument();

    await user.selectOptions(sittingBaguaSelect, "LI");
    await user.selectOptions(doorElementSelect, "WATER");

    expect(sittingBaguaSelect).toHaveValue("LI");
    expect(doorElementSelect).toHaveValue("WATER");
  });

  it("splits results into house liqi, temporal, house periods, structure, and placeholder tabs", async () => {
    const user = userEvent.setup();
    installEvaluationFetchMock();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Run Evaluation" }));

    await waitFor(() => expect(screen.getByTestId("tab-badge-structure")).toHaveTextContent("M 3 / NE 0"));
    expect(screen.getByText("House + Person Liqi")).toBeInTheDocument();
    expect(screen.queryByText("Temporal Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Hetu Five Yun")).not.toBeInTheDocument();
    const mainTabs = screen.getByRole("tablist", { name: "Analysis tabs" });
    expect(within(mainTabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "LiqiM 0 / NE 0",
      "TemporalM 0 / NE 0",
      "PeriodsM 0 / NE 0",
      "ShapeM 3 / NE 0",
      "StaticM 0 / NE 0"
    ]);
    expect(screen.getByTestId("tab-badge-house_liqi")).toHaveTextContent("M 0 / NE 0");
    expect(screen.getByTestId("tab-badge-temporal")).toHaveTextContent("M 0 / NE 0");
    expect(screen.getByTestId("tab-badge-zhai_yun")).toHaveTextContent("M 0 / NE 0");
    expect(screen.getByTestId("tab-badge-structure")).toHaveTextContent("M 3 / NE 0");
    expect(screen.getByTestId("tab-badge-static_house")).toHaveTextContent("M 0 / NE 0");

    expect(screen.getByTestId("section-tab-bazhai")).toBeInTheDocument();
    expect(screen.getByTestId("section-tab-liqi")).toBeInTheDocument();

    await user.click(within(mainTabs).getByRole("tab", { name: /Flow-Year Temporal/ }));
    expect(screen.getByText("Temporal Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("House Liqi / Five Qi")).not.toBeInTheDocument();
    expect(screen.getByTestId("section-tab-conversion")).toBeInTheDocument();

    await user.click(within(mainTabs).getByRole("tab", { name: /House Periods/ }));
    await waitFor(() => expect(screen.getByText("Hetu Five Yun")).toBeInTheDocument());
    expect(screen.getByTestId("section-tab-hetu")).toBeInTheDocument();
    expect(screen.getAllByTestId("period-palace-grid")).toHaveLength(1);

    await user.click(within(mainTabs).getByRole("tab", { name: /Plan \+ Indoor Sha/ }));
    expect(screen.getByRole("cell", { name: "INT-001" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "EXT-001" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "MIT-001" })).toBeInTheDocument();
    expect(screen.getByTestId("floorplan-editor-mock")).toBeInTheDocument();

    await user.click(within(mainTabs).getByRole("tab", { name: /Static House/ }));
    expect(screen.getByText("Static House Evaluation")).toBeInTheDocument();
    expect(screen.queryByText(/Score:/)).not.toBeInTheDocument();
  });

  it("shows refined shape input groups in the structure tab", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /Plan \+ Indoor Sha/ }));

    expect(screen.getByText("Shape Signal Inputs")).toBeInTheDocument();
    expect(screen.getByText("Pure Shape / Sha Indicators")).toBeInTheDocument();
    expect(screen.getByText("Structural Sha Indicators")).toBeInTheDocument();
    expect(screen.getByText("Door / Path Conflict Indicators")).toBeInTheDocument();
    expect(screen.getByText("Mitigation Context Inputs")).toBeInTheDocument();
    expect(screen.getByText("Element Strength Context")).toBeInTheDocument();
  });
});
