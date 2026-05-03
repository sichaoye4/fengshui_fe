import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionTabs } from "./SectionTabs";

describe("SectionTabs", () => {
  it("renders compact local tabs and reports selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SectionTabs
        ariaLabel="Local sections"
        activeId="a"
        onChange={onChange}
        items={[
          { id: "a", title: "Alpha", summary: "Ready" },
          { id: "b", title: "Beta", summary: "2 issues", tone: "bad" },
        ]}
      />
    );

    expect(screen.getByRole("tab", { name: /Alpha/ })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: /Beta/ }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
