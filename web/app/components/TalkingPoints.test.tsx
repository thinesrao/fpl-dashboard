import { render, screen } from "@testing-library/react";
import { TalkingPoints } from "./TalkingPoints";

const full = {
  riser: { manager: "arai oh arai", detail: "▲6 places" },
  spoon: { manager: "Adam Lee", detail: "rooted to the bottom" },
  highest: { manager: "Matthew Mohan", detail: "85 pts" },
  badLuck: { manager: "Suria Devi", detail: "3-week winless" },
};

test("renders all four callouts when every entry is present", () => {
  render(<TalkingPoints tp={full} />);
  expect(screen.getByText(/On the charge/i)).toBeInTheDocument();
  expect(screen.getByText(/Spoon watch/i)).toBeInTheDocument();
  expect(screen.getByText(/Highest GW/i)).toBeInTheDocument();
  expect(screen.getByText(/Bad luck/i)).toBeInTheDocument();

  expect(screen.getByText("arai oh arai")).toBeInTheDocument();
  expect(screen.getByText("Adam Lee")).toBeInTheDocument();
  expect(screen.getByText("Matthew Mohan")).toBeInTheDocument();
  expect(screen.getByText("Suria Devi")).toBeInTheDocument();
});

test("skips a card whose entry is null", () => {
  render(<TalkingPoints tp={{ ...full, riser: null }} />);
  expect(screen.queryByText(/On the charge/i)).not.toBeInTheDocument();
  expect(screen.queryByText("arai oh arai")).not.toBeInTheDocument();
  expect(screen.getByText(/Spoon watch/i)).toBeInTheDocument();
});
