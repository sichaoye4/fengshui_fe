import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LanguageToggle } from "./LanguageToggle";

describe("LanguageToggle", () => {
  it("switches language when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LanguageToggle language="en" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "中文" }));
    expect(onChange).toHaveBeenCalledWith("zh");
  });
});

