import { render, screen, fireEvent } from "@testing-library/react";
import { TrophyCabinet } from "./TrophyCabinet";
import { OverlayProvider } from "./OverlayContext";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    golden_boot: [
      { Standings: 1, Team: "A", Manager: "Faiz", Goals: 7 },
      { Standings: 2, Team: "B", Manager: "Wei", Goals: 5 },
    ],
    reversed_motw: [{ Standings: 1, Team: "C", Manager: "Adam", "Times Lowest": 2 }],
  },
  meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
};

function renderCabinet() {
  const openManager = vi.fn();
  const openTrophy = vi.fn();
  render(
    <OverlayProvider value={{ openManager, openTrophy }}>
      <TrophyCabinet data={data} />
    </OverlayProvider>
  );
  return { openManager, openTrophy };
}

test("renders a coin for every entry from cabinet(data)", () => {
  renderCabinet();
  expect(screen.getByText("Golden Boot")).toBeInTheDocument();
  expect(screen.getByText("Faiz · 7")).toBeInTheDocument();
  expect(screen.getByText("Reversed MotW")).toBeInTheDocument();
  expect(screen.getByText("Adam · 2")).toBeInTheDocument();
});

test("clicking a coin calls openTrophy with its award key", () => {
  const { openTrophy } = renderCabinet();
  fireEvent.click(screen.getByText("Faiz · 7"));
  expect(openTrophy).toHaveBeenCalledWith("golden_boot");
});
