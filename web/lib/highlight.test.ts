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

test("falls back to just the Classic hero when there's no Challenge log", () => {
  const classicOnly: DashboardData = {
    sheets: { weekly_manager_log: [{ Gameweek: 1, Team: "", Manager: "Solo", Score: 55 }] },
    meta: { lastFinishedGw: 1, lastUpdatedUtc: "" },
  };
  const m = highlightModel(classicOnly);
  expect(m.heroes).toEqual([{ competition: "Classic", manager: "Solo", points: 55 }]);
});

test("no heroes or tiles before any gameweek data exists", () => {
  const empty: DashboardData = { sheets: {}, meta: { lastFinishedGw: 0, lastUpdatedUtc: "" } };
  const m = highlightModel(empty);
  expect(m.heroes).toEqual([]);
  expect(m.tiles).toEqual([]);
});
