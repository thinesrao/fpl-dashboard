import { render, screen, fireEvent } from "@testing-library/react";
import { RaceBoard } from "./RaceBoard";
import { OverlayProvider } from "./OverlayContext";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    classic_league_standings: [
      { Rank: 1, Team: "A", Manager: "Matthew Mohan", Total: 212 },
      { Rank: 2, Team: "B", Manager: "arai oh arai", Total: 199 },
    ],
    h2h_league_standings: [
      { Rank: 1, Team: "A", Manager: "arai oh arai", "Total H2H Point": 30 },
      { Rank: 2, Team: "B", Manager: "Matthew Mohan", "Total H2H Point": 22 },
    ],
  },
  meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
};

function renderBoard() {
  const openManager = vi.fn();
  const openTrophy = vi.fn();
  render(
    <OverlayProvider value={{ openManager, openTrophy }}>
      <RaceBoard data={data} />
    </OverlayProvider>
  );
  return { openManager, openTrophy };
}

test("renders classic bars by default", () => {
  renderBoard();
  expect(screen.getByText("Matthew Mohan")).toBeInTheDocument();
  expect(screen.getByText("212")).toBeInTheDocument();
  expect(screen.getByText("199")).toBeInTheDocument();
});

test("switching to head-to-head shows h2h values", () => {
  renderBoard();
  fireEvent.click(screen.getByText("Head-to-Head"));
  expect(screen.getByText("30")).toBeInTheDocument();
  expect(screen.getByText("22")).toBeInTheDocument();
  expect(screen.queryByText("212")).not.toBeInTheDocument();
});

test("clicking a manager row calls openManager with that name", () => {
  const { openManager } = renderBoard();
  fireEvent.click(screen.getByText("Matthew Mohan"));
  expect(openManager).toHaveBeenCalledWith("Matthew Mohan");
});
