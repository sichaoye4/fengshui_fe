import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
        onMouseMove={() => {
          const stage = {
            getPointerPosition: () => konvaMock.pointer,
            getStage: () => stage
          };
          props.onMouseMove?.({ target: stage });
        }}
        onMouseLeave={() => props.onMouseLeave?.()}
      >
        {children}
      </div>
    ),
    Layer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="konva-layer">{children}</div>
    ),
    Group: MockGroup,
    Circle: ({ onClick, ...props }: any) => (
      <div
        data-testid={props["data-testid"] ?? "konva-circle"}
        data-x={props.x}
        data-y={props.y}
        data-radius={props.radius}
        onClick={(event) => onClick?.({ ...event, cancelBubble: false })}
      />
    ),
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
    RegularPolygon: () => <div data-testid="konva-regular-polygon" />,
    Text: ({ text }: any) => <div data-testid="konva-text">{text}</div>,
  };
});
vi.mock("konva", () => ({}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
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
    konvaMock.pointer = { x: 200, y: 0 };
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

  it("renders an in-canvas icon toolbar and changes tools", async () => {
    const onToolChange = vi.fn();
    const onUndo = vi.fn();

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
          primitives: [],
          floorplan: {
            imageWidth: 200,
            imageHeight: 100,
            analysis: { width: 200, height: 100, walls: [], rooms: [] }
          }
        }}
        onToolChange={onToolChange}
        onUndo={onUndo}
        canUndo
        onComplete={vi.fn()}
      />
    );

    const toolbar = screen.getByRole("toolbar", { name: "Tools" });
    expect(toolbar.closest(".canvas-shell")).toBeInTheDocument();
    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton.closest(".floorplan-canvas-toolbar")).toBe(toolbar);

    await userEvent.click(deleteButton);
    expect(onToolChange).toHaveBeenCalledWith("delete");
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("deletes the nearest saved segment from a background click within the erase radius", async () => {
    const onRemoveSegment = vi.fn();

    render(
      <FloorplanEditor
        language="en"
        tool="delete"
        editor={{
          gridSizeM: 0.1,
          viewport: { x: 0, y: 0, scale: 1 },
          northAngleDeg: 0,
          entrance: null,
          selectedId: null,
          primitives: [
            { id: "wall-1", kind: "wall", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } }
          ]
        }}
        onRemoveSegment={onRemoveSegment}
        onComplete={vi.fn()}
      />
    );

    const stage = screen.getByTestId("konva-stage");
    konvaMock.pointer = { x: 100, y: 20 };
    fireEvent.mouseMove(stage);
    expect(screen.getByTestId("delete-radius")).toHaveAttribute("data-radius", "35");

    await userEvent.click(stage);
    expect(onRemoveSegment).toHaveBeenCalledWith("wall-1");
  });

  it("does not delete saved primitives from a background click outside the erase radius", async () => {
    const onRemoveSegment = vi.fn();

    render(
      <FloorplanEditor
        language="en"
        tool="delete"
        editor={{
          gridSizeM: 0.1,
          viewport: { x: 0, y: 0, scale: 1 },
          northAngleDeg: 0,
          entrance: null,
          selectedId: null,
          primitives: [
            { id: "wall-1", kind: "wall", start: { x: 0, y: 0 }, end: { x: 2, y: 0 } }
          ]
        }}
        onRemoveSegment={onRemoveSegment}
        onComplete={vi.fn()}
      />
    );

    konvaMock.pointer = { x: 500, y: 500 };
    await userEvent.click(screen.getByTestId("konva-stage"));
    expect(onRemoveSegment).not.toHaveBeenCalled();
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

  it("renders the bagua overlay only when enabled", () => {
    const editor = {
      gridSizeM: 0.1,
      viewport: { x: 0, y: 0, scale: 1 },
      northAngleDeg: 0,
      entrance: null,
      selectedId: null,
      primitives: [
        {
          id: "room-1",
          kind: "room" as const,
          x: 0,
          y: 0,
          width: 9,
          height: 9,
          roomType: "living" as const
        }
      ]
    };

    const { rerender } = render(
      <FloorplanEditor language="en" tool="select" editor={editor} onComplete={vi.fn()} />
    );

    expect(screen.queryByTestId("bagua-cell-KAN")).not.toBeInTheDocument();

    rerender(
      <FloorplanEditor
        language="en"
        tool="select"
        editor={{ ...editor, showBaguaOverlay: true }}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByTestId("bagua-cell-KAN")).toBeInTheDocument();
    expect(screen.getByText("Kan")).toBeInTheDocument();
  });

  it("runs AI analysis for a saved floorplan and accepts a suggested room", async () => {
    window.localStorage.setItem(
      "fengshui_auth_v1",
      JSON.stringify({
        token: "access-token",
        user: { id: "user-1", username: "owner", display_name: "", is_active: true, created_at: "", last_login_at: null }
      })
    );
    const aiAnalysis = {
      provider: "dashscope",
      model_name: "qwen3.5-plus",
      width: 200,
      height: 100,
      rooms: [
        {
          id: "room-1",
          room_type: "toilet",
          label: "Bath",
          location: "north",
          confidence: 0.83,
          bbox: { x: 20, y: 10, width: 80, height: 40 },
          polygon: [
            { x: 20, y: 10 },
            { x: 100, y: 10 },
            { x: 100, y: 50 },
            { x: 20, y: 50 }
          ]
        }
      ],
      walls: [],
      suggested_labels: [],
      sha_observations: [
        {
          id: "sha-1",
          issue_type: "toilet_facing_door",
          severity: "medium",
          confidence: 0.5,
          description: "Toilet may face a door",
          related_room_ids: ["room-1"],
          related_feature_ids: [],
          suggested_action: ""
        }
      ],
      usage: {}
    };
    const asset = {
      id: "floorplan-1",
      house_id: null,
      content_type: "image/png",
      storage_key: "aa/floorplan.png",
      width: 200,
      height: 100,
      analysis: { width: 200, height: 100, walls: [], rooms: [] },
      ai_analysis: aiAnalysis,
      annotations: { rooms: [], segments: [], markers: [], northAngleDeg: 0, manualOverrides: { flags: {}, measurements: {}, counts: {} } },
      derived_internal_layout: {},
      image_url: "/api/v1/floorplans/floorplan-1/image",
      created_at: "2026-06-11T00:00:00Z",
      updated_at: "2026-06-11T00:00:00Z"
    };
    let resolveAi: (response: Response) => void = () => {};
    const aiPromise = new Promise<Response>((resolve) => {
      resolveAi = resolve;
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => aiPromise)
      .mockResolvedValueOnce({ ok: true, json: async () => asset } as Response);
    const onAnnotationsChange = vi.fn();

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
          primitives: [],
          floorplan: {
            id: "floorplan-1",
            imageUrl: "/api/v1/floorplans/floorplan-1/image",
            storageKey: "aa/floorplan.png",
            imageWidth: 200,
            imageHeight: 100,
            contentType: "image/png",
            analysis: { width: 200, height: 100, walls: [], rooms: [] }
          }
        }}
        onAnnotationsChange={onAnnotationsChange}
        onComplete={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "AI Analyze" }));
    expect(screen.getByText("AI analyzing your floorplan...")).toBeInTheDocument();
    resolveAi({ ok: true, json: async () => asset } as Response);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/v1/floorplans/floorplan-1/ai-analysis",
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer access-token" }
        })
      )
    );
    expect(await screen.findByTestId("ai-suggestion-room-1")).toBeInTheDocument();
    expect(screen.getByText("Toilet may face a door")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const putBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/floorplans/floorplan-1/annotations",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer access-token" }
      })
    );
    expect(putBody.rooms[0]).toMatchObject({
      id: "ai-room-room-1",
      label: "Bath",
      roomType: "toilet",
      x: 0.2,
      y: 0.1,
      width: 0.8,
      height: 0.4
    });
    expect(putBody.rooms[0].points).toEqual([
      { x: 0.2, y: 0.1 },
      { x: 1, y: 0.1 },
      { x: 1, y: 0.5 },
      { x: 0.2, y: 0.5 }
    ]);
    expect(onAnnotationsChange).toHaveBeenCalled();
    const [primitives] = onAnnotationsChange.mock.calls[onAnnotationsChange.mock.calls.length - 1];
    expect(primitives).toEqual([
      expect.objectContaining({
        id: "ai-room-room-1",
        kind: "room",
        label: "Bath",
        roomType: "toilet",
        x: 0.2,
        y: 0.1,
        width: 0.8,
        height: 0.4
      })
    ]);
  });
});
