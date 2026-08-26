import { render, screen, fireEvent } from "@testing-library/react";
import { TrophyDetail } from "./TrophyDetail";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    golden_boot: [
      { Standings: 1, Team: "A", Manager: "Faiz", Goals: 7, GW1: 3, GW2: 4 },
      { Standings: 2, Team: "B", Manager: "Wei", Goals: 5, GW1: 2, GW2: 3 },
      { Standings: 3, Team: "C", Manager: "Danish", Goals: 4, GW1: 1, GW2: 3 },
    ],
    reversed_motw: [
      { Standings: 1, Team: "D", Manager: "Adam", "Times Lowest": 2 },
      { Standings: 2, Team: "E", Manager: "Suria", "Times Lowest": 1 },
    ],
  },
  meta: { lastFinishedGw: 2, lastUpdatedUtc: "" },
};

test("shows the chase and a chart for an award with per-gameweek columns", () => {
  const onClose = vi.fn();
  render(<TrophyDetail data={data} trophyKey="golden_boot" onClose={onClose} />);

  expect(screen.getByText(/Faiz/)).toBeInTheDocument();
  expect(screen.getByText(/Wei/)).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
  expect(screen.getByTestId("trophy-chart")).toBeInTheDocument();
});

test("shows the chase but no chart for a score-only award", () => {
  const onClose = vi.fn();
  render(<TrophyDetail data={data} trophyKey="reversed_motw" onClose={onClose} />);

  expect(screen.getByText(/Adam/)).toBeInTheDocument();
  expect(screen.getByText(/Suria/)).toBeInTheDocument();
  expect(screen.queryByTestId("trophy-chart")).not.toBeInTheDocument();
  expect(screen.getByText("No per-gameweek breakdown for this award")).toBeInTheDocument();
});

test("calls onClose on backdrop click", () => {
  const onClose = vi.fn();
  const { container } = render(
    <TrophyDetail data={data} trophyKey="golden_boot" onClose={onClose} />
  );
  fireEvent.click(container.firstChild as Element);
  expect(onClose).toHaveBeenCalled();
});

test("calls onClose on Escape keydown", () => {
  const onClose = vi.fn();
  render(<TrophyDetail data={data} trophyKey="golden_boot" onClose={onClose} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalled();
});
