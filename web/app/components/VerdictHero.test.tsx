import { render, screen } from "@testing-library/react";
import { VerdictHero } from "./VerdictHero";

test("renders the manager, line and points when a verdict is present", () => {
  render(<VerdictHero v={{ manager: "Mohan", points: 85, line: "runs it" }} gameweek={1} />);
  expect(screen.getByText(/Mohan/)).toBeInTheDocument();
  expect(screen.getByText(/runs it/)).toBeInTheDocument();
  expect(screen.getByText(/85/)).toBeInTheDocument();
  expect(screen.getByText(/MANAGER OF THE WEEK/i)).toBeInTheDocument();
  expect(screen.getByText(/GAMEWEEK 1/)).toBeInTheDocument();
});

test("renders a compact empty state when there is no verdict yet", () => {
  render(<VerdictHero v={null} gameweek={1} />);
  expect(screen.queryByText(/MANAGER OF THE WEEK/i)).not.toBeInTheDocument();
  expect(screen.getByText(/awards/i)).toBeInTheDocument();
});
