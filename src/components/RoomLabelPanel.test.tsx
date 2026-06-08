import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomLabelPanel } from "./RoomLabelPanel";

afterEach(() => {
  cleanup();
});

describe("RoomLabelPanel", () => {
  it("emits room type and label changes for the selected room", async () => {
    const onChange = vi.fn();

    render(
      <RoomLabelPanel
        language="en"
        room={{ id: "room-1", kind: "room", x: 0, y: 0, width: 3, height: 2, roomType: "unknown" }}
        onChange={onChange}
      />
    );

    await userEvent.selectOptions(screen.getByLabelText("Room Type"), "kitchen");
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Prep" } });

    expect(onChange).toHaveBeenCalledWith("room-1", { roomType: "kitchen" });
    expect(onChange).toHaveBeenLastCalledWith("room-1", { label: "Prep" });
  });

  it("does not render without a selected room", () => {
    const { container } = render(<RoomLabelPanel language="en" room={null} onChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});
