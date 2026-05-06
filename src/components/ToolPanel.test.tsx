import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolPanel } from "./ToolPanel";
import type { Tool } from "../types/fengshui";

afterEach(cleanup);

describe("ToolPanel", () => {
  it("renders all 3 tool buttons", () => {
    render(
      <ToolPanel
        tool="select"
        language="en"
        onToolChange={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={false}
        canRedo={false}
      />
    );

    expect(screen.getByRole("button", { name: "Select / Pan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wall" })).toBeInTheDocument();
  });

  it("renders zh labels when language is zh", () => {
    render(
      <ToolPanel
        tool="select"
        language="zh"
        onToolChange={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={false}
        canRedo={false}
      />
    );

    expect(screen.getByRole("button", { name: "选择 / 平移" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "墙体" })).toBeInTheDocument();
  });

  it("highlights the active tool with 'active' class", () => {
    render(
      <ToolPanel
        tool="wall"
        language="en"
        onToolChange={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={false}
        canRedo={false}
      />
    );

    const wallButton = screen.getByRole("button", { name: "Wall" });
    expect(wallButton).toHaveClass("active");

    const selectButton = screen.getByRole("button", { name: "Select / Pan" });
    expect(selectButton).not.toHaveClass("active");
  });

  it("calls onToolChange when clicking a tool button", async () => {
    const user = userEvent.setup();
    const onToolChange = vi.fn();

    render(
      <ToolPanel
        tool="select"
        language="en"
        onToolChange={onToolChange}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={false}
        canRedo={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Wall" }));
    expect(onToolChange).toHaveBeenCalledWith("wall");
  });

  it("handles undo/redo controls", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    render(
      <ToolPanel
        tool="select"
        onToolChange={vi.fn()}
        language="en"
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo
        canRedo={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);

    const redoButton = screen.getByRole("button", { name: "Redo" });
    expect(redoButton).toBeDisabled();
    await user.click(redoButton);
    expect(onRedo).toHaveBeenCalledTimes(0);
  });

  it("disables undo button when cannot undo", () => {
    render(
      <ToolPanel
        tool="select"
        onToolChange={vi.fn()}
        language="en"
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={false}
        canRedo
      />
    );

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).not.toBeDisabled();
  });

  it("renders the tool panel title", () => {
    render(
      <ToolPanel
        tool="select"
        language="en"
        onToolChange={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={false}
        canRedo={false}
      />
    );

    expect(screen.getByText("Tools")).toBeInTheDocument();
  });

  it("calls onToolChange for delete tool", async () => {
    const user = userEvent.setup();
    const onToolChange = vi.fn();

    render(
      <ToolPanel
        tool="select"
        language="en"
        onToolChange={onToolChange}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo={false}
        canRedo={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onToolChange).toHaveBeenCalledWith("delete");
  });
});
