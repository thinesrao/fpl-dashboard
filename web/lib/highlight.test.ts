import { highlightModel } from "./highlight";
import type { DashboardData } from "./types";

const data: DashboardData = {
  sheets: {
    weekly_manager_log: [
      { Gameweek: 1, Team: "A", Manager: "Matthew Mohan", Score: 70 },
      { Gameweek: 2, Team: "A", Manager: "Danish Aziz", Score: 85 }, // latest GW → Classic MotW
    ],
    fpl_challenge_weekly_log: [{ Gameweek: 2, Team: "B", Manager: "Faiz Rahman", Score: 42 }],
    highest_gw_score: [{ Standings: 1, Team: "V", Manager: "Danish Aziz", Score: 85 }], // == Classic hero
    shooting_stars: [{ Standings: 1, Team: "T", Manager: "arai oh arai", Total: 6, GW1: 6 }],
    reversed_motw: [{ Standings: 1, Team: "U", Manager: "Adam Lee", Score: 2 }],
    bad_luck_h2h: [{ Standings: 1, Team: "W", Manager: "Suria Devi", Score: 3 }],
  },
  meta: { lastFinishedGw: 2, lastUpdatedUtc: "" },
};

test("the two heroes are the Classic and Challenge Managers of the Week", () => {
  const m = highlightModel(data);
  expect(m.gameweek).toBe(2);
  expect(m.heroes).toEqual([
    { competition: "Classic", manager: "Danish Aziz", points: 85 }, // latest-GW classic winner
    { competition: "Challenge", manager: "Faiz Rahman", points: 42 },
  ]);
});

test("Manager of the Week ignores in-progress gameweeks beyond last_finished_gw", () => {
  // A manual mid-GW2 pipeline run can publish a GW2 row while GW2 isn't final;
  // last_finished_gw stays 1, so the hero must remain GW1's winner.
  const d: DashboardData = {
    sheets: {
      weekly_manager_log: [
        { Gameweek: 1, Team: "A", Manager: "Woon Kun Shum", Score: 67 },
        { Gameweek: 2, Team: "B", Manager: "arai oh arai", Score: 119 }, // in progress
      ],
    },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(d);
  expect(m.gameweek).toBe(1);
  expect(m.heroes).toEqual([{ competition: "Classic", manager: "Woon Kun Shum", points: 67 }]);
});

test("tiles are the week's talking points, sanitized and de-duped against heroes", () => {
  const m = highlightModel(data);
  // "Highest score" is Danish Aziz — already the Classic hero — so it's dropped.
  // ▲ and × are swapped for ASCII the image renderer can draw.
  expect(m.tiles).toEqual([
    { label: "Biggest riser", name: "arai oh arai", detail: "+6 places" },
    { label: "Worst luck", name: "Suria Devi", detail: "3-week winless" },
    { label: "Wooden spoon", name: "Adam Lee", detail: "2x bottom" },
  ]);
});

test("keeps the Highest-score tile when it's a different manager, and caps at 4", () => {
  const rich: DashboardData = {
    sheets: {
      weekly_manager_log: [{ Gameweek: 1, Team: "", Manager: "Hero One", Score: 70 }],
      fpl_challenge_weekly_log: [{ Gameweek: 1, Team: "", Manager: "Hero Two", Score: 40 }],
      highest_gw_score: [{ Standings: 1, Team: "", Manager: "Point One", Score: 88 }],
      shooting_stars: [{ Standings: 1, Team: "", Manager: "Point Two", Total: 4 }],
      bad_luck_h2h: [{ Standings: 1, Team: "", Manager: "Point Three", Score: 2 }],
      reversed_motw: [{ Standings: 1, Team: "", Manager: "Point Four", Score: 5 }],
    },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(rich);
  expect(m.tiles.map((t) => `${t.label}:${t.name}`)).toEqual([
    "Highest score:Point One",
    "Biggest riser:Point Two",
    "Worst luck:Point Three",
    "Wooden spoon:Point Four",
  ]);
});

test("backfills tiles from award leaders when talking points are sparse", () => {
  const gw1: DashboardData = {
    sheets: {
      weekly_manager_log: [{ Gameweek: 1, Team: "", Manager: "Woon Kun Shum", Score: 67 }],
      fpl_challenge_weekly_log: [{ Gameweek: 1, Team: "", Manager: "Nicholas Thines", Score: 86 }],
      highest_gw_score: [{ Standings: 1, Team: "", Manager: "Woon Kun Shum", Score: 67 }], // == Classic hero
      // no shooting_stars → no riser yet at GW1
      bad_luck_h2h: [{ Standings: 1, Team: "", Manager: "Szu how", Score: 1 }],
      reversed_motw: [{ Standings: 1, Team: "", Manager: "Stephen Lo", Score: 1 }],
      golden_boot: [{ Standings: 1, Team: "", Manager: "Ben Tan", Goals: 3 }],
      playmaker: [{ Standings: 1, Team: "", Manager: "Chris Lim", Assists: 2 }],
    },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(gw1);
  // 2 real talking points + 2 award backfills = a full 4 tiles.
  expect(m.tiles).toEqual([
    { label: "Worst luck", name: "Szu how", detail: "1-week winless" },
    { label: "Wooden spoon", name: "Stephen Lo", detail: "1x bottom" },
    { label: "Golden boot", name: "Ben Tan", detail: "3 goals" },
    { label: "Playmaker", name: "Chris Lim", detail: "2 assists" },
  ]);
});

test("falls back to just the Classic hero when there's no Challenge log", () => {
  const classicOnly: DashboardData = {
    sheets: { weekly_manager_log: [{ Gameweek: 1, Team: "", Manager: "Solo", Score: 55 }] },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(classicOnly);
  expect(m.heroes).toEqual([{ competition: "Classic", manager: "Solo", points: 55 }]);
});

test("Manager of the Month: top-3 race for the latest month while it's ongoing", () => {
  const d: DashboardData = {
    sheets: {
      weekly_manager_log: [{ Gameweek: 5, Team: "", Manager: "MotW", Score: 60 }],
      classic_monthly_august: [{ Standings: 1, Team: "A", Manager: "Danish Aziz", "Total Monthly Points": 250 }],
      classic_monthly_september: [
        { Standings: 1, Team: "A", Manager: "Danish Aziz", "Total Monthly Points": 120 },
        { Standings: 2, Team: "B", Manager: "Faiz Rahman", "Total Monthly Points": 112 },
        { Standings: 3, Team: "C", Manager: "Wei Jie", "Total Monthly Points": 108 },
        { Standings: 4, Team: "D", Manager: "Off Podium", "Total Monthly Points": 90 },
      ],
      h2h_monthly_september: [
        { Standings: 1, Team: "D", Manager: "Matthew Mohan", "Total_Head_to_Head_FPL_Point": 9 },
        { Standings: 2, Team: "E", Manager: "Suria Devi", "Total_Head_to_Head_FPL_Point": 7 },
        { Standings: 3, Team: "F", Manager: "Adam Lee", "Total_Head_to_Head_FPL_Point": 6 },
      ],
    },
    meta: { lastFinishedGw: 5, lastUpdatedUtc: "" }, // September (ends GW6) still running
  };
  const m = highlightModel(d);
  expect(m.months).toEqual([
    {
      competition: "Classic",
      month: "September",
      final: false,
      leaders: [
        { manager: "Danish Aziz", points: 120 },
        { manager: "Faiz Rahman", points: 112 },
        { manager: "Wei Jie", points: 108 },
      ],
    },
    {
      competition: "H2H",
      month: "September",
      final: false,
      leaders: [
        { manager: "Matthew Mohan", points: 9 },
        { manager: "Suria Devi", points: 7 },
        { manager: "Adam Lee", points: 6 },
      ],
    },
  ]);
});

test("Manager of the Month shows just the winner once the month is finalized", () => {
  const d: DashboardData = {
    sheets: {
      classic_monthly_august: [
        { Standings: 1, Team: "A", Manager: "Danish Aziz", "Total Monthly Points": 250 },
        { Standings: 2, Team: "B", Manager: "Faiz Rahman", "Total Monthly Points": 230 },
      ],
    },
    meta: { lastFinishedGw: 3, lastUpdatedUtc: "" }, // August ends GW3 → finalized
  };
  const m = highlightModel(d);
  expect(m.months).toEqual([
    { competition: "Classic", month: "August", final: true, leaders: [{ manager: "Danish Aziz", points: 250 }] },
  ]);
});

test("no heroes or tiles before any gameweek data exists", () => {
  const empty: DashboardData = { sheets: {}, meta: { lastFinishedGw: 0, lastUpdatedUtc: "" } };
  const m = highlightModel(empty);
  expect(m.heroes).toEqual([]);
  expect(m.months).toEqual([]);
  expect(m.tiles).toEqual([]);
});
