import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlyingStarGrid } from "./FlyingStarGrid";

const CHINESE_BAGUA_STAR = {
  乾: 2,
  兑: 3,
  艮: 4,
  离: 5,
  坎: 6,
  坤: 7,
  震: 8,
  巽: 9,
  中: 1,
};

describe("FlyingStarGrid", () => {
  it("renders a 9-cell south-up grid from backend Chinese bagua keys", () => {
    render(
      <FlyingStarGrid
        language="en"
        baguaStar={CHINESE_BAGUA_STAR}
        centerStar={1}
        flightDirection="forward"
      />
    );

    expect(screen.getAllByTestId("flying-star-cell")).toHaveLength(9);
    expect(screen.getByText("Forward")).toBeInTheDocument();
    expect(screen.getByText("SE")).toBeInTheDocument();
    expect(screen.getByText("Xun")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("renders backward flight direction", () => {
    render(
      <FlyingStarGrid
        language="en"
        baguaStar={CHINESE_BAGUA_STAR}
        centerStar={1}
        flightDirection="backward"
      />
    );

    expect(screen.getByText("Backward")).toBeInTheDocument();
  });
});
