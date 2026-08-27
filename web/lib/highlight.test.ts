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

test("builds distinct stat tiles: no Leader tile, and no repeat of the headline", () => {
  const m = highlightModel(data);
  // MotW is Danish Aziz. There is no "Leader" tile (podium #1 already is the
  // leader), and the Penalty king (Danish Aziz) is dropped as a headline repeat.
  expect(m.tiles).toEqual([
    { label: "Top score", name: "Matthew Mohan", value: "85" },
    { label: "Biggest climber", name: "Faiz Rahman", value: "+3" },
  ]);
});

test("omits climber/penalty tiles when their score is zero", () => {
  const lean: DashboardData = {
    sheets: {
      classic_league_standings: [{ Standings: 1, Team: "A", Manager: "Danish Aziz", Total: 60 }],
      shooting_stars: [{ Standings: 1, Team: "B", Manager: "Faiz Rahman", Total: 0 }],
      penalty_king: [{ Standings: 1, Team: "A", Manager: "Danish Aziz", Total: 0 }],
    },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(lean);
  expect(m.tiles).toEqual([]);
});

test("drops the Top score tile when it just restates Manager of the Week", () => {
  // MotW (weekly_manager_log latest) and highest_gw_score are the same manager.
  const dup: DashboardData = {
    sheets: {
      weekly_manager_log: [{ Gameweek: 1, Team: "A", Manager: "Woon Kun Shum", Score: 67 }],
      classic_league_standings: [
        { Standings: 1, Team: "B", Manager: "Matthew Mohan", Total: 85 },
        { Standings: 2, Team: "A", Manager: "Woon Kun Shum", Total: 67 },
      ],
      highest_gw_score: [{ Standings: 1, Team: "A", Manager: "Woon Kun Shum", Score: 67 }],
      penalty_king: [{ Standings: 1, Team: "C", Manager: "Nicholas Thines", Total: 2 }],
    },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(dup);
  expect(m.headline?.manager).toBe("Woon Kun Shum");
  // No tile repeats the headline manager as "Top score".
  expect(m.tiles.find((t) => t.label === "Top score")).toBeUndefined();
  expect(m.tiles).toEqual([{ label: "Penalty king", name: "Nicholas Thines", value: "2" }]);
});

test("fills up to 4 distinct-manager tiles, skipping repeats across awards", () => {
  const rich: DashboardData = {
    sheets: {
      weekly_manager_log: [{ Gameweek: 1, Team: "Z", Manager: "MotW Guy", Score: 70 }],
      classic_league_standings: [{ Standings: 1, Team: "Z", Manager: "MotW Guy", Total: 70 }],
      highest_gw_score: [{ Standings: 1, Team: "", Manager: "Alice", Score: 88 }],
      shooting_stars: [{ Standings: 1, Team: "", Manager: "Alice", Total: 4 }], // dup Alice → skipped
      penalty_king: [{ Standings: 1, Team: "", Manager: "Bob", Total: 3 }],
      golden_boot: [{ Standings: 1, Team: "", Manager: "Cara", Goals: 5 }],
      playmaker: [{ Standings: 1, Team: "", Manager: "Dan", Assists: 4 }],
      bench_king: [{ Standings: 1, Team: "", Manager: "Eve", Total: 20 }], // 5th distinct → over the cap
    },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(rich);
  expect(m.tiles.map((t) => t.name)).toEqual(["Alice", "Bob", "Cara", "Dan"]);
});

test("headline is null before any awards exist", () => {
  const empty: DashboardData = { sheets: {}, meta: { lastFinishedGw: 0, lastUpdatedUtc: "" } };
  const m = highlightModel(empty);
  expect(m.headline).toBeNull();
  expect(m.podium).toEqual([]);
  expect(m.tiles).toEqual([]);
});
