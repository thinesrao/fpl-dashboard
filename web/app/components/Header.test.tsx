import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

test("renders brand, gameweek and formatted last-updated", () => {
  render(<Header gameweek={3} lastUpdated="2026-08-25T10:30:00+00:00" />);
  expect(screen.getByText(/PepRoulette/)).toBeInTheDocument();
  expect(screen.getByText(/Gameweek 3/)).toBeInTheDocument();
  expect(screen.getByText(/2026/)).toBeInTheDocument();
});

test("formats last-updated in UTC regardless of local timezone", () => {
  // 10:30 UTC should render as 10:30 even if the test env runs in a
  // non-UTC timezone; this would fail if formatUpdated used local time.
  render(<Header gameweek={3} lastUpdated="2026-08-25T10:30:00+00:00" />);
  expect(screen.getByText(/10:30/)).toBeInTheDocument();
});
