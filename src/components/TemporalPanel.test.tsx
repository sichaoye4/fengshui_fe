import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TemporalPanel } from "./TemporalPanel";

describe("TemporalPanel", () => {
  it("shows temporal subsections one detail group at a time", async () => {
    const user = userEvent.setup();

    render(
      <TemporalPanel
        language="en"
        loading={false}
        error={null}
        gregorianConversion={{
          input: { date: "2026-04-18", time: "12:00:00", timezone: "Asia/Shanghai" },
          converted_timezone: "Asia/Shanghai",
          converted_datetime: "2026-04-18T12:00:00",
          pillars: {
            year_ganzhi: "BINGWU",
            month_ganzhi: "RENCHEN",
            day_ganzhi: "JISI",
            time_ganzhi: "GENGWU",
          },
          year_stem: "BING",
          year_branch: "WU",
          month_stem: "REN",
          month_branch: "CHEN",
          rule_month: 3,
        }}
        annual={{
          basis: "ganzhi",
          year_ganzhi: "BINGWU",
          year_stem: "BING",
          year_branch: "WU",
          tai_sui_sui_po: { tai_sui: "WU", sui_po: "ZI" },
          san_sha: ["HAI", "ZI", "CHOU"],
          wuji_sha: ["XU", "HAI"],
          taiyang: { year_ganzhi: "BINGWU", tai_sui: "WU", taiyang_shen: "WEI", taiyang_position: "HAI" },
          nobleman: { year_ganzhi_code: "BINGWU", nobleman_branches: { yang: "HAI", yin: "YOU" } },
          lu_ma: { lu: "SI", ma: "SHEN" },
        }}
        monthly={{
          basis: "ganzhi",
          year_ganzhi: "BINGWU",
          month_ganzhi: "RENCHEN",
          rule_month: 3,
          center_star: 6,
          anjian_sha: "QIAN",
          wuji_sha: ["SHEN", "YOU"],
        }}
        flyingStar={{
          center_star: 1,
          flight_direction: "forward",
          directional: {},
          matrix_south_up: [],
          bagua_star: { CENTER: 1 },
        }}
      />
    );

    expect(screen.getByTestId("section-tab-conversion")).toHaveTextContent("BINGWU");
    expect(screen.getAllByText(/Gregorian .* Bazi Conversion/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("flying-star-grid")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("section-tab-flyingStar"));
    expect(screen.getByTestId("flying-star-grid")).toBeInTheDocument();
  });
});
