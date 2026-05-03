import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PeriodFourYunResponse } from "../types/fengshui";
import { HousePeriodPanel } from "./HousePeriodPanel";

const PERIOD_DATA: PeriodFourYunResponse = {
  year: 2026,
  sitting_bagua: "KAN",
  hetu_five_yun: {
    year: 2026,
    sitting_bagua: "KAN",
    year_ganzhi_code: "BINGWU",
    period_start_ganzhi_code: "GENGZI",
    period_element: "METAL",
    qualified_palaces: ["QIAN", "DUI", "KAN"],
    sitting_qualifies: true,
  },
  sanyuan_jiuyun: {
    year: 2026,
    sitting_bagua: "KAN",
    period_number: 9,
    period_start_year: 2024,
    period_end_year: 2043,
    period_element: "FIRE",
    qualified_palaces: ["LI", "KUN", "GEN"],
    sitting_qualifies: false,
  },
  tonglin_shanyun: {
    year: 2026,
    sitting_bagua: "KAN",
    yuan: "LOWER",
    anchor_bagua: "DUI",
    commanding_ganzhi_code: "BINGWU",
    commanding_nayin_element: "WATER",
    qualified_palaces: ["KAN", "ZHEN", "XUN"],
    sitting_qualifies: true,
    flying_grid: {
      palace_ganzhi_code: {
        KAN: "YIMAO",
        ZHEN: "BINGCHEN",
        XUN: "DINGSI",
      },
      palace_nayin: {
        KAN: "WATER",
        ZHEN: "EARTH",
        XUN: "EARTH",
      },
    },
    palace_strength: {
      KAN: {
        palace_bagua: "KAN",
        palace_ganzhi_code: "YIMAO",
        palace_nayin_element: "WATER",
        strength: "strong",
        is_strong: true,
      },
    },
  },
  zhuanlin_shanyun: {
    year: 2026,
    sitting_bagua: "KAN",
    qualified_palaces: ["KAN", "ZHEN", "XUN"],
    palace_profiles: {
      KAN: {
        palace_bagua: "KAN",
        target_ganzhi_code: "YIMAO",
        target_nayin_element: "WATER",
        strength: "strong",
        is_strong: true,
      },
    },
    sitting_profile: {
      palace_bagua: "KAN",
      target_ganzhi_code: "YIMAO",
      target_nayin_element: "WATER",
      strength: "strong",
      is_strong: true,
    },
  },
};

describe("HousePeriodPanel", () => {
  it("renders four yun subtabs with one active 9-cell grid", async () => {
    const user = userEvent.setup();
    render(<HousePeriodPanel language="en" periodData={PERIOD_DATA} loading={false} />);

    expect(screen.getByText("House Periods")).toBeInTheDocument();
    expect(screen.getByText("Hetu Five Yun")).toBeInTheDocument();
    expect(screen.queryByText("Sanyuan Jiuyun")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("period-palace-grid")).toHaveLength(1);
    expect(screen.getAllByTestId("period-palace-cell")).toHaveLength(9);

    await user.click(screen.getByTestId("section-tab-zhuanlin"));
    expect(screen.getByText("Zhuanlin Shan Yun")).toBeInTheDocument();
    expect(screen.getAllByText("YIMAO").length).toBeGreaterThan(0);
  });
});
