import { render, screen } from "@testing-library/react";
import { HallOfFame } from "./HallOfFame";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    weekly_manager_log: [{ Gameweek: 1, Team: "A", Manager: "Matthew Mohan", Score: 85 }],
    classic_monthly_august: [
      {
        Standings: 1,
        Team: "A",
        Manager: "Matthew Mohan",
        "Total Monthly Points": 250,
        GW1: 85,
      },
    ],
  },
  meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
};

test("renders the GW1 Manager of the Week card and a monthly card", () => {
  render(<HallOfFame data={data} />);

  expect(screen.getByText("GW1")).toBeInTheDocument();
  expect(screen.getAllByText("Matthew Mohan").length).toBeGreaterThan(0);
  expect(screen.getByText("85")).toBeInTheDocument();
  expect(screen.getByText("August (Classic)")).toBeInTheDocument();
});

test("renders a soon placeholder card and does not crash on empty data", () => {
  const empty: DashboardData = { sheets: {}, meta: { lastFinishedGw: 0, lastUpdatedUtc: "" } };
  render(<HallOfFame data={empty} />);

  expect(screen.getByText("soon")).toBeInTheDocument();
});
