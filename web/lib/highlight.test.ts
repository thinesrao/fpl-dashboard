import { highlightModel } from "./highlight";
import type { DashboardData } from "./types";

const data: DashboardData = {
  sheets: {
    weekly_manager_log: [
      { Gameweek: 1, Team: "A", Manager: "Danish Aziz", Score: 85 },
      { Gameweek: 2, Team: "A", Manager: "Danish Aziz", Score: 78 },
    ],
    classic_league_standings: [
      { Standings: 1, Team: "A", Manager: "Danish Aziz", Total: 212 },
      { Standings: 2, Team: "B", Manager: "Faiz Rahman", Total: 199 },
      { Standings: 3, Team: "C", Manager: "Matthew Mohan", Total: 190 },
      { Standings: 4, Team: "D", Manager: "Someone Else", Total: 180 },
    ],
    highest_gw_score: [{ Standings: 1, Team: "C", Manager: "Matthew Mohan", Score: 85 }],
    shooting_stars: [{ Standings: 1, Team: "B", Manager: "Faiz Rahman", Total: 3 }],
    penalty_king: [{ Standings: 1, Team: "A", Manager: "Danish Aziz", Total: 6 }],
  },
  meta: { lastFinishedGw: 2, lastUpdatedUtc: "" },
};

test("derives gameweek, headline, and a top-3 podium", () => {
  const m = highlightModel(data);
  expect(m.gameweek).toBe(2);
  // Leader's 13-pt gap (212 vs 199) is >=5 and <15 → "edges ahead".
  expect(m.headline).toEqual({ manager: "Danish Aziz", line: "edges ahead", points: 78 });
  expect(m.podium).toEqual([
    { rank: 1, manager: "Danish Aziz", points: 212 },
    { rank: 2, manager: "Faiz Rahman", points: 199 },
    { rank: 3, manager: "Matthew Mohan", points: 190 },
  ]);
});

test("builds the four stat tiles from their award sheets", () => {
  const m = highlightModel(data);
  expect(m.tiles).toEqual([
    { label: "Leader", name: "Danish Aziz", value: "212" },
    { label: "Top score", name: "Matthew Mohan", value: "85" },
    { label: "Biggest climber", name: "Faiz Rahman", value: "+3" },
    { label: "Penalty king", name: "Danish Aziz", value: "6" },
  ]);
});

test("omits climber/penalty tiles when their score is zero, and never exceeds 4", () => {
  const lean: DashboardData = {
    sheets: {
      classic_league_standings: [{ Standings: 1, Team: "A", Manager: "Danish Aziz", Total: 60 }],
      shooting_stars: [{ Standings: 1, Team: "B", Manager: "Faiz Rahman", Total: 0 }],
      penalty_king: [{ Standings: 1, Team: "A", Manager: "Danish Aziz", Total: 0 }],
    },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(lean);
  expect(m.tiles).toEqual([{ label: "Leader", name: "Danish Aziz", value: "60" }]);
});

test("headline is null before any awards exist", () => {
  const empty: DashboardData = { sheets: {}, meta: { lastFinishedGw: 0, lastUpdatedUtc: "" } };
  const m = highlightModel(empty);
  expect(m.headline).toBeNull();
  expect(m.podium).toEqual([]);
  expect(m.tiles).toEqual([]);
});
