import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloorplanEditor } from "./FloorplanEditor";

vi.mock("react-konva", () => {
  const MockGroup = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  );
  return {
    Stage: ({ children, ...props }: any) => (
      <div data-testid="konva-stage" data-x={props.x} data-y={props.y} data-scale-x={props.scaleX} data-scale-y={props.scaleY}>
        {children}
      </div>
    ),
    Layer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="konva-layer">{children}</div>
    ),
    Group: MockGroup,
    Line: ({ onClick, ...props }: any) => (
      <div data-testid="konva-line" data-stroke={props.stroke} onClick={onClick} />
    ),
  };
});
vi.mock("konva", () => ({}));

afterEach(cleanup);

const defaultProps = {
  language: "en" as const,
  onComplete: vi.fn(),
};

describe("FloorplanEditor", () => {
  it("shows the upload phase with panel title", () => {
    render(<FloorplanEditor {...defaultProps} />);

    expect(screen.getByText("Floorplan Editor")).toBeInTheDocument();
    expect(screen.getByText("Upload Floor Plan")).toBeInTheDocument();
  });

  it("renders the floorplan-panel container", () => {
    const { container } = render(<FloorplanEditor {...defaultProps} />);

    expect(container.querySelector(".floorplan-panel")).toBeInTheDocument();
    expect(container.querySelector(".floorplan-upload-zone")).toBeInTheDocument();
  });

  it("renders correctly with zh language", () => {
    render(<FloorplanEditor {...defaultProps} language="zh" />);

    expect(screen.getByText("平面图编辑")).toBeInTheDocument();
    expect(screen.getByText("上传户型图")).toBeInTheDocument();
  });

  it("has a hidden file input with correct accept types", () => {
    render(<FloorplanEditor {...defaultProps} />);

    const input = document.querySelector<HTMLInputElement>(
      '.floorplan-upload-zone input[type="file"]'
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("hidden");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png");
  });

  it("shows loading state when file is selected", async () => {
    // Mock global fetch to hang so we see loading state
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      () => new Promise<Response>(() => {})
    );

    render(<FloorplanEditor {...defaultProps} />);

    const input = document.querySelector<HTMLInputElement>(
      '.floorplan-upload-zone input[type="file"]'
    )!;
    const file = new File([""], "floorplan.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    expect(screen.queryByText("Upload Floor Plan")).not.toBeInTheDocument();
  });

  it("shows error and retry button on upload failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    render(<FloorplanEditor {...defaultProps} />);

    const input = document.querySelector<HTMLInputElement>(
      '.floorplan-upload-zone input[type="file"]'
    )!;
    const file = new File([""], "floorplan.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("returns to upload zone on retry after error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    render(<FloorplanEditor {...defaultProps} />);

    const input = document.querySelector<HTMLInputElement>(
      '.floorplan-upload-zone input[type="file"]'
    )!;
    const file = new File([""], "floorplan.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);
    await screen.findByText("Retry");
    await userEvent.click(screen.getByText("Retry"));

    expect(screen.getByText("Upload Floor Plan")).toBeInTheDocument();
  });
});
