import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { HouseholdBazhaiResponse, LiqiHouseResponse } from "../types/fengshui";
import { HouseLiqiWorkspace } from "./HouseLiqiWorkspace";

const BAZHAI: HouseholdBazhaiResponse = {
  house_bagua: "KAN",
  member_results: [
    {
      member_id: "member-1",
      name: "Alex",
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
        person_minggua: {
          minggua_code: "QIAN",
          group: { group_en: "West Four", group_zh: "West Four" },
        },
        house_bagua: "KAN",
        house_bagua_code: "KAN",
        house_bagua_zh: "KAN",
        house_group: { group_en: "East Four", group_zh: "East Four" },
        group_match: false,
        star_relation: {
          star_code: "liu_sha",
          star_name_en: "Liu Sha",
          star_name_zh: "Liu Sha",
          tier_en: "medium",
          tier_zh: "medium",
        },
        overall_is_auspicious: false,
        overall_label_zh: "inauspicious",
        overall_label_en: "inauspicious",
      },
    },
  ],
};

const LIQI: LiqiHouseResponse = {
  sitting_bagua: "KAN",
  sitting_bagua_zh: "KAN",
  center_star: 1,
  center_bagua: "KAN",
  center_star_element: "WATER",
  flying_star_grid: {
    center_star: 1,
    flight_direction: "forward",
    directional: {},
    matrix_south_up: [],
    bagua_star: {},
  },
  qi_type_labels: {
    SHENG_QI: { zh: "Sheng Qi", en: "Sheng Qi" },
  },
  five_qi_palaces: {},
  five_qi_directions: {},
  palace_relation_rows: [
    { palace_bagua: "XUN", palace_direction: "SE", flying_star: 9, qi_type: "SHENG_QI" },
  ],
  wealth_positions: {},
  anchoring_rule_zh: "",
  anchoring_rule_en: "The sitting bagua enters the center.",
};

describe("HouseLiqiWorkspace", () => {
  it("uses local subtabs for household Bazhai and House Liqi details", async () => {
    const user = userEvent.setup();

    render(
      <HouseLiqiWorkspace
        language="en"
        bazhaiResult={BAZHAI}
        bazhaiMissingFields={[]}
        liqiHouseProfile={LIQI}
      />
    );

    expect(screen.getByTestId("section-tab-bazhai")).toHaveTextContent("0/1 auspicious");
    expect(screen.getByText("Alex · Primary resident")).toBeInTheDocument();
    expect(screen.queryByTestId("five-qi-palace-grid")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("section-tab-liqi"));
    expect(screen.getByTestId("five-qi-palace-grid")).toBeInTheDocument();
    expect(screen.getAllByTestId("five-qi-cell")).toHaveLength(9);
  });
});
