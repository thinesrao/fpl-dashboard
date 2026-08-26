import { render, screen, fireEvent } from "@testing-library/react";
import { ManagerProfile } from "./ManagerProfile";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    classic_league_standings: [
      { Manager: "Carol", Total: 220 },
      { Manager: "Alice", Total: 200 },
    ],
    h2h_league_standings: [{ Manager: "Alice", "Total H2H Point": 12 }],
    golden_boot: [{ Standings: 1, Team: "A", Manager: "Alice", Score: 7 }],
    gw_scores: [{ Manager: "Alice", GW1: 60, GW2: 90, GW3: 75 }],
  },
  meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
};

test("renders the manager's name, a trophy chip, form bars, and total", () => {
  const onClose = vi.fn();
  render(<ManagerProfile data={data} name="Alice" onClose={onClose} />);

  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.getByText(/Golden Boot/)).toBeInTheDocument();
  expect(screen.getByTestId("profile-form")).toBeInTheDocument();
  expect(screen.getByText("200")).toBeInTheDocument();
});

test("shows the empty message for a manager with no data", () => {
  const onClose = vi.fn();
  render(<ManagerProfile data={data} name="Ghost" onClose={onClose} />);

  expect(screen.getByText("No data for this manager yet")).toBeInTheDocument();
});

test("calls onClose on backdrop click", () => {
  const onClose = vi.fn();
  const { container } = render(
    <ManagerProfile data={data} name="Alice" onClose={onClose} />
  );
  fireEvent.click(container.firstChild as Element);
  expect(onClose).toHaveBeenCalled();
});

test("calls onClose on Escape keydown", () => {
  const onClose = vi.fn();
  render(<ManagerProfile data={data} name="Alice" onClose={onClose} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});
