import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToolPanel } from "./ToolPanel";

describe("ToolPanel", () => {
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
});