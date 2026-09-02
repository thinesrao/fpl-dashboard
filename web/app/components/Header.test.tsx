import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

test("renders brand wordmark, logo, gameweek and formatted last-updated", () => {
  render(<Header gameweek={3} lastUpdated="2026-08-25T10:30:00+00:00" />);
  expect(screen.getByText("PEP")).toBeInTheDocument();
  expect(screen.getByText("ROULETTE")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /peproulette/i })).toBeInTheDocument();
  expect(screen.getByText(/Gameweek 3/)).toBeInTheDocument();
  expect(screen.getByText(/2026/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute("href", "/admin/login");
});

test("formats last-updated in Malaysia time (MYT, UTC+8)", () => {
  // 10:30 UTC → 18:30 MYT, regardless of the test env's own timezone.
  render(<Header gameweek={3} lastUpdated="2026-08-25T10:30:00+00:00" />);
  expect(screen.getByText(/18:30 \(MYT\)/)).toBeInTheDocument();
});

test("treats a bare (offset-less) UTC timestamp as UTC before converting to MYT", () => {
  // The pipeline emits naive UTC like this (no 'Z'); it must still map to 18:30 MYT.
  render(<Header gameweek={3} lastUpdated="2026-08-25T10:30:00.123456" />);
  expect(screen.getByText(/18:30 \(MYT\)/)).toBeInTheDocument();
});
