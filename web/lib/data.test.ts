import { normalizeDashboard, getSheet } from "./types";

test("normalizeDashboard maps metadata and preserves sheets", () => {
  const raw = {
    sheets: { classic_league_standings: [{ Manager: "A", Total: 100 }] },
    generated_from_metadata: { last_finished_gw: 3, last_updated_utc: "2026-08-25T10:30:00+00:00" },
  };
  const data = normalizeDashboard(raw);
  expect(data.meta.lastFinishedGw).toBe(3);
  expect(data.meta.lastUpdatedUtc).toBe("2026-08-25T10:30:00+00:00");
  expect(getSheet(data, "classic_league_standings")[0].Manager).toBe("A");
});

test("getSheet returns empty array for missing sheet", () => {
  const data = normalizeDashboard({ sheets: {}, generated_from_metadata: {} });
  expect(getSheet(data, "nope")).toEqual([]);
  expect(data.meta.lastFinishedGw).toBe(0);
});
