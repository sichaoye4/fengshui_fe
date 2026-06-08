import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloorplanEditor } from "./FloorplanEditor";

const konvaMock = vi.hoisted(() => ({
  pointer: { x: 0, y: 0 }
}));

vi.mock("react-konva", () => {
  const MockGroup = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="konva-group">{children}</div>
  );
  return {
    Stage: ({ children, ...props }: any) => (
      <div
        data-testid="konva-stage"
        data-x={props.x}
        data-y={props.y}
        data-scale-x={props.scaleX}
        data-scale-y={props.scaleY}
        onClick={() => {
          const stage = {
            getPointerPosition: () => konvaMock.pointer,
            getStage: () => stage
          };
          props.onClick?.({ target: stage });
        }}
      >
        {children}
      </div>
    ),
    Layer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="konva-layer">{children}</div>
    ),
    Group: MockGroup,
    Image: () => <div data-testid="konva-image" />,
    Line: ({ onClick, ...props }: any) => (
      <div
        data-testid={props["data-testid"] ?? "konva-line"}
        data-stroke={props.stroke}
        data-fill={props.fill}
        data-opacity={props.opacity}
        onClick={(event) => onClick?.({ ...event, cancelBubble: false })}
      />
    ),
    Text: ({ text }: any) => <div data-testid="konva-text">{text}</div>,
  };
});
vi.mock("konva", () => ({}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const defaultProps = {
  language: "en" as const,
  tool: "select" as const,
  onComplete: vi.fn(),
};

function mockSuccessfulAnalyzeResponse(rooms: Array<Array<[number, number]>> = []) {
  if ("createObjectURL" in URL) {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:floorplan");
  } else {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:floorplan")
    });
  }
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      width: 200,
      height: 100,
      walls: [[0, 0, 100, 0]],
      rooms
    })
  } as Response);
}

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

  it("uploads floorplans through the proxy-relative API path", async () => {
    const fetchMock = mockSuccessfulAnalyzeResponse();

    render(<FloorplanEditor {...defaultProps} />);

    const input = document.querySelector<HTMLInputElement>(
      '.floorplan-upload-zone input[type="file"]'
    )!;
    const file = new File(["floorplan"], "floorplan.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);
    await screen.findByTestId("floorplan-editor");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/floorplan/analyze",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
  });

  it("passes user-drawn walls alongside CV walls on complete", async () => {
    mockSuccessfulAnalyzeResponse();
    const onComplete = vi.fn();

    render(
      <FloorplanEditor
        language="en"
        tool="wall"
        onComplete={onComplete}
      />
    );

    const input = document.querySelector<HTMLInputElement>(
      '.floorplan-upload-zone input[type="file"]'
    )!;
    const file = new File(["floorplan"], "floorplan.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);
    const stage = await screen.findByTestId("konva-stage");

    konvaMock.pointer = { x: 0, y: 0 };
    await userEvent.click(stage);
    konvaMock.pointer = { x: 2, y: 0 };
    await userEvent.click(stage);

    await userEvent.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const [primitives, entrance] = onComplete.mock.calls[0];
    expect(entrance).toBeNull();
    expect(primitives).toEqual([
      expect.objectContaining({
        kind: "wall",
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 }
      }),
      expect.objectContaining({
        kind: "wall",
        start: { x: 0, y: 0 },
        end: { x: 2, y: 0 }
      })
    ]);
  });

  it("passes CV room polygons and floorplan metadata on complete", async () => {
    mockSuccessfulAnalyzeResponse([[[0, 0], [100, 0], [100, 50], [0, 50]]]);
    const onComplete = vi.fn();

    render(
      <FloorplanEditor
        language="en"
        tool="select"
        onComplete={onComplete}
      />
    );

    const input = document.querySelector<HTMLInputElement>(
      '.floorplan-upload-zone input[type="file"]'
    )!;
    const file = new File(["floorplan"], "floorplan.jpg", { type: "image/jpeg" });

    await userEvent.upload(input, file);
    await screen.findByTestId("floorplan-editor");
    await userEvent.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const [primitives, , floorplan] = onComplete.mock.calls[0];

    expect(primitives).toEqual([
      expect.objectContaining({
        kind: "room",
        x: 0,
        y: 0,
        width: 1,
        height: 0.5,
        roomType: "unknown",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 0.5 },
          { x: 0, y: 0.5 }
        ]
      }),
      expect.objectContaining({
        kind: "wall",
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 }
      })
    ]);
    expect(floorplan).toMatchObject({
      imageWidth: 200,
      imageHeight: 100,
      imageName: "floorplan.jpg",
      contentType: "image/jpeg",
      analysis: {
        rooms: [[[0, 0], [100, 0], [100, 50], [0, 50]]]
      }
    });
  });

  it("renders saved room polygons and selects a room on click", async () => {
    const onSelectPrimitive = vi.fn();

    render(
      <FloorplanEditor
        language="en"
        tool="select"
        editor={{
          gridSizeM: 0.1,
          viewport: { x: 0, y: 0, scale: 1 },
          northAngleDeg: 0,
          entrance: null,
          selectedId: null,
          primitives: [
            {
              id: "room-1",
              kind: "room",
              x: 0,
              y: 0,
              width: 2,
              height: 2,
              roomType: "toilet",
              label: "Bath"
            },
            { id: "wall-1", kind: "wall", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } }
          ]
        }}
        selectedId={null}
        onSelectPrimitive={onSelectPrimitive}
        onComplete={vi.fn()}
      />
    );

    const room = await screen.findByTestId("room-polygon-room-1");
    expect(room).toHaveAttribute("data-fill", "#06b6d4");
    expect(room).toHaveAttribute("data-opacity", "0.26");

    await userEvent.click(room);
    expect(onSelectPrimitive).toHaveBeenCalledWith("room-1");
    expect(screen.getByText("Bath")).toBeInTheDocument();
  });
});
