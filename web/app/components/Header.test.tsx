import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

test("renders brand, gameweek and formatted last-updated", () => {
  render(<Header gameweek={3} lastUpdated="2026-08-25T10:30:00+00:00" />);
  expect(screen.getByText(/PepRoulette/)).toBeInTheDocument();
  expect(screen.getByText(/Gameweek 3/)).toBeInTheDocument();
  expect(screen.getByText(/2026/)).toBeInTheDocument();
});
