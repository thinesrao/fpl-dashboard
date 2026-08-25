import { render, screen, fireEvent } from "@testing-library/react";
import { ManagerSelect } from "./ManagerSelect";

test("lists managers and reports selection", () => {
  const onChange = vi.fn();
  render(<ManagerSelect managers={["A", "B"]} value="" onChange={onChange} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "B" } });
  expect(onChange).toHaveBeenCalledWith("B");
});
