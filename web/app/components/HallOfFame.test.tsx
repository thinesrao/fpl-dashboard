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

  expect(screen.getByText("Classic GW1")).toBeInTheDocument();
  expect(screen.getAllByText("Matthew Mohan").length).toBeGreaterThan(0);
  expect(screen.getByText("85")).toBeInTheDocument();
  expect(screen.getByText("August (Classic)")).toBeInTheDocument();
});

test("marks a still-running month as provisional (So far / Leading)", () => {
  // August ends at GW3; lastFinishedGw 1 means it's still in progress.
  render(<HallOfFame data={data} />);
  expect(screen.getByText("So far")).toBeInTheDocument();
  expect(screen.getByText("Leading")).toBeInTheDocument();
});

test("does not mark a completed month as provisional", () => {
  const finished: DashboardData = {
    ...data,
    meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
  };
  render(<HallOfFame data={finished} />);
  expect(screen.queryByText("So far")).not.toBeInTheDocument();
  expect(screen.queryByText("Leading")).not.toBeInTheDocument();
});

test("orders cards Classic GW, Challenge GW, then monthlies", () => {
  const full: DashboardData = {
    sheets: {
      weekly_manager_log: [{ Gameweek: 1, Team: "A", Manager: "Matthew Mohan", Score: 85 }],
      fpl_challenge_weekly_log: [{ Gameweek: 1, Team: "B", Manager: "Danish Aziz", Score: 40 }],
      classic_monthly_august: [
        { Standings: 1, Team: "A", Manager: "Matthew Mohan", "Total Monthly Points": 250, GW1: 85 },
      ],
      h2h_monthly_august: [
        { Standings: 1, Team: "C", Manager: "Faiz Rahman", "Total_Head_to_Head_FPL_Point": 9, GW1: "85 vs 40" },
      ],
    },
    meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
  };
  render(<HallOfFame data={full} />);

  const labels = Array.from(document.querySelectorAll(".font-display.text-xs")).map(
    (el) => el.textContent
  );
  expect(labels).toEqual([
    "Classic GW1",
    "Challenge GW1",
    "August (Classic)",
    "August (H2H)",
  ]);
});

test("renders a soon placeholder card and does not crash on empty data", () => {
  const empty: DashboardData = { sheets: {}, meta: { lastFinishedGw: 0, lastUpdatedUtc: "" } };
  render(<HallOfFame data={empty} />);

  expect(screen.getByText("soon")).toBeInTheDocument();
});
