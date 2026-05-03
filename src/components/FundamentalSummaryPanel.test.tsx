import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FundamentalSummaryPanel } from "./FundamentalSummaryPanel";

describe("FundamentalSummaryPanel", () => {
  it("shows missing input hints", () => {
    render(
      <FundamentalSummaryPanel
        language="en"
        result={null}
        missingFields={["house.facing_bagua", "house.current_floor", "house.room_index"]}
      />
    );

    expect(screen.getByText("Missing Inputs")).toBeInTheDocument();
    expect(screen.getByText("House Facing Bagua")).toBeInTheDocument();
    expect(screen.getByText("Current Floor")).toBeInTheDocument();
    expect(screen.getByText("Room Index")).toBeInTheDocument();
  });

  it("renders summary/static cards and omits raw temporal summary", () => {
    render(
      <FundamentalSummaryPanel
        language="en"
        missingFields={[]}
        result={{
          house_name: "demo",
          findings: [],
          matched_count: 1,
          not_matched_count: 2,
          not_evaluable_count: 3,
          static_house_score: 60,
          static_house_details: {
            status_en: "balanced",
            status_zh: "ping heng",
            self_element: "WOOD"
          },
          temporal_summary: {
            annual_star: "8"
          }
        }}
      />
    );

    expect(screen.getByText("Static House")).toBeInTheDocument();
    expect(screen.getByText("Score: 60")).toBeInTheDocument();
    expect(screen.queryByText("Temporal")).not.toBeInTheDocument();
    expect(screen.queryByText(/annual_star/i)).not.toBeInTheDocument();

    expect(document.querySelector(".fundamental-card-temporal")).not.toBeInTheDocument();
    expect(document.querySelector(".temporal-viewer")).not.toBeInTheDocument();
  });
});
