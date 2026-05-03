import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDefaultExternalShaFlags } from "../constants";
import { ExternalShaChecklist } from "./ExternalShaChecklist";

describe("ExternalShaChecklist", () => {
  it("shows tiered common list then expands to all 80", async () => {
    const user = userEvent.setup();
    const flags = createDefaultExternalShaFlags();
    const onToggleAdvanced = vi.fn();

    const { rerender } = render(
      <ExternalShaChecklist
        language="en"
        flags={flags}
        showAdvanced={false}
        onToggleAdvanced={onToggleAdvanced}
        onFlagChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("external-list").querySelectorAll("input[type='checkbox']")).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: "Show All 80" }));
    expect(onToggleAdvanced).toHaveBeenCalledWith(true);

    rerender(
      <ExternalShaChecklist
        language="en"
        flags={flags}
        showAdvanced
        onToggleAdvanced={onToggleAdvanced}
        onFlagChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("external-list").querySelectorAll("input[type='checkbox']")).toHaveLength(80);
  });
});