import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BazhaiPanel } from "./BazhaiPanel";

describe("BazhaiPanel", () => {
  it("shows missing input hints when required fields are absent", () => {
    render(<BazhaiPanel language="en" result={null} missingFields={["members.empty"]} />);

    expect(screen.getByText("Missing Inputs")).toBeInTheDocument();
    expect(screen.getByText("At least one household member")).toBeInTheDocument();
  });

  it("shows bazhai result summary when data is available", () => {
    render(
      <BazhaiPanel
        language="en"
        missingFields={[]}
        result={{
          year: 1990,
          gender: "male",
          gender_zh: "male_zh",
          person_minggua: {
            minggua_code: "KAN",
            group: { group_code: "EAST4", group_en: "East Four", group_zh: "east4_zh" }
          },
          house_bagua: "KAN",
          house_bagua_code: "KAN",
          house_bagua_zh: "KAN_zh",
          house_group: { group_code: "EAST4", group_en: "East Four", group_zh: "east4_zh" },
          group_match: true,
          star_relation: {
            star_code: "FUWEI",
            star_name_en: "Fu Wei",
            star_name_zh: "FuWei_zh",
            tier_en: "primary"
          },
          overall_is_auspicious: true,
          overall_label_zh: "auspicious_zh",
          overall_label_en: "auspicious"
        }}
      />
    );

    expect(screen.getAllByText("Bazhai Result").length).toBeGreaterThan(0);
    expect(screen.getByText(/auspicious/i)).toBeInTheDocument();
    expect(screen.getByText(/Fu Wei/i)).toBeInTheDocument();
    expect(screen.getAllByText(/KAN/i).length).toBeGreaterThan(0);
  });
});
