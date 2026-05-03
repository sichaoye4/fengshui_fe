import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LiqiHouseResponse } from "../types/fengshui";
import { LiqiHousePanel } from "./LiqiHousePanel";

const PROFILE: LiqiHouseResponse = {
  sitting_bagua: "坎",
  sitting_bagua_zh: "坎",
  center_star: 1,
  center_bagua: "坎",
  center_star_element: "水",
  flying_star_grid: {
    center_star: 1,
    flight_direction: "forward",
    directional: { C: 1, NW: 2, W: 3, NE: 4, S: 5, N: 6, SW: 7, E: 8, SE: 9 },
    matrix_south_up: [
      [9, 5, 7],
      [8, 1, 3],
      [4, 6, 2],
    ],
    bagua_star: { 乾: 2, 兑: 3, 艮: 4, 离: 5, 坎: 6, 坤: 7, 震: 8, 巽: 9, 中: 1 },
  },
  qi_type_labels: {
    SHENG_QI: { zh: "生气", en: "Sheng Qi" },
    WANG_QI: { zh: "旺气", en: "Wang Qi" },
    SHA_QI: { zh: "煞气", en: "Sha Qi" },
    SI_QI: { zh: "死气", en: "Si Qi" },
    TUI_QI: { zh: "退气", en: "Tui Qi" },
  },
  five_qi_palaces: {
    SHENG_QI: ["离", "坤", "巽"],
    WANG_QI: [],
    SHA_QI: ["艮"],
    SI_QI: ["兑", "震", "中"],
    TUI_QI: ["乾", "坎"],
  },
  five_qi_directions: {
    SHENG_QI: ["S", "SW", "SE"],
    WANG_QI: [],
    SHA_QI: ["NE"],
    SI_QI: ["W", "E", "C"],
    TUI_QI: ["NW", "N"],
  },
  palace_relation_rows: [
    { palace_bagua: "巽", palace_direction: "SE", flying_star: 9, qi_type: "SHENG_QI" },
    { palace_bagua: "离", palace_direction: "S", flying_star: 5, qi_type: "SHENG_QI" },
    { palace_bagua: "坤", palace_direction: "SW", flying_star: 7, qi_type: "SHENG_QI" },
    { palace_bagua: "震", palace_direction: "E", flying_star: 8, qi_type: "SI_QI" },
    { palace_bagua: "中", palace_direction: "C", flying_star: 1, qi_type: "SI_QI" },
    { palace_bagua: "兑", palace_direction: "W", flying_star: 3, qi_type: "SI_QI" },
    { palace_bagua: "艮", palace_direction: "NE", flying_star: 4, qi_type: "SHA_QI" },
    { palace_bagua: "坎", palace_direction: "N", flying_star: 6, qi_type: "TUI_QI" },
    { palace_bagua: "乾", palace_direction: "NW", flying_star: 2, qi_type: "TUI_QI" },
  ],
  wealth_positions: {},
  anchoring_rule_zh: "坐山卦入中顺飞。",
  anchoring_rule_en: "The sitting bagua enters the center and flies forward.",
};

describe("LiqiHousePanel", () => {
  it("renders one five-qi palace grid with direction and bagua labels", () => {
    render(<LiqiHousePanel language="zh" liqiHouseProfile={PROFILE} />);

    expect(screen.getByText("宅理气 / 五气")).toBeInTheDocument();
    expect(screen.getByTestId("five-qi-palace-grid")).toBeInTheDocument();
    expect(screen.getAllByTestId("five-qi-cell")).toHaveLength(9);
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("离")).toBeInTheDocument();
    expect(screen.getAllByText("生气").length).toBeGreaterThan(0);
  });

  it("does not render the old five-qi list cards or duplicate flying-star grid", () => {
    render(<LiqiHousePanel language="en" liqiHouseProfile={PROFILE} />);

    expect(screen.queryByText("Five Qi Directions")).not.toBeInTheDocument();
    expect(screen.queryByTestId("flying-star-grid")).not.toBeInTheDocument();
  });
});
