import { describe, expect, it } from "vitest";
import type { DashboardData } from "./types";
import { cabinet, managerProfile, talkingPoints, trophyChase, verdict } from "./story";

function makeData(sheets: DashboardData["sheets"]): DashboardData {
  return { sheets, meta: { lastFinishedGw: 3, lastUpdatedUtc: "2026-08-26T00:00:00Z" } };
}

describe("verdict", () => {
  it("returns the latest weekly_manager_log row as MotW with a non-empty line", () => {
    const data = makeData({
      weekly_manager_log: [
        { Gameweek: 1, Manager: "Alice", Score: 70 },
        { Gameweek: 2, Manager: "Bob", Score: 80 },
        { Gameweek: 3, Manager: "Carol", Score: 90 },
      ],
      classic_league_standings: [
        { Manager: "Carol", Total: 220 },
        { Manager: "Alice", Total: 200 },
        { Manager: "Bob", Total: 150 },
      ],
      shooting_stars: [{ Manager: "Dan", Total: 5 }],
    });
    const v = verdict(data);
    expect(v).not.toBeNull();
    expect(v?.manager).toBe("Carol");
    expect(v?.points).toBe(90);
    expect(v?.line.length).toBeGreaterThan(0);
    expect(v?.line).toBe("runs it");
  });

  it("picks 'edges ahead' for a mid-sized gap", () => {
    const data = makeData({
      weekly_manager_log: [{ Gameweek: 1, Manager: "Carol", Score: 90 }],
      classic_league_standings: [
        { Manager: "Carol", Total: 205 },
        { Manager: "Alice", Total: 200 },
      ],
    });
    expect(verdict(data)?.line).toBe("edges ahead");
  });

  it("picks 'clings on' for a tiny gap", () => {
    const data = makeData({
      weekly_manager_log: [{ Gameweek: 1, Manager: "Carol", Score: 90 }],
      classic_league_standings: [
        { Manager: "Carol", Total: 202 },
        { Manager: "Alice", Total: 200 },
      ],
    });
    expect(verdict(data)?.line).toBe("clings on");
  });

  it("overrides to 'storms it' when MotW is also the top riser", () => {
    const data = makeData({
      weekly_manager_log: [{ Gameweek: 1, Manager: "Carol", Score: 90 }],
      classic_league_standings: [
        { Manager: "Carol", Total: 220 },
        { Manager: "Alice", Total: 200 },
      ],
      shooting_stars: [{ Manager: "Carol", Total: 5 }],
    });
    expect(verdict(data)?.line).toBe("storms it");
  });

  it("returns null when weekly_manager_log has no rows", () => {
    expect(verdict(makeData({}))).toBeNull();
  });
});

describe("talkingPoints", () => {
  it("returns the four callouts when data supports them", () => {
    const data = makeData({
      shooting_stars: [{ Manager: "Dan", Total: 5 }],
      reversed_motw: [{ Manager: "Eve", Score: 3 }],
      highest_gw_score: [{ Manager: "Carol", Score: 95 }],
      bad_luck_h2h: [{ Manager: "Frank", Score: 4 }],
    });
    const tp = talkingPoints(data);
    expect(tp.riser).toEqual({ manager: "Dan", detail: "▲5 places" });
    expect(tp.spoon).toEqual({ manager: "Eve", detail: "3× bottom" });
    expect(tp.highest).toEqual({ manager: "Carol", detail: "95 pts" });
    expect(tp.badLuck).toEqual({ manager: "Frank", detail: "4-week winless" });
  });

  it("returns nulls when the underlying values are zero or missing", () => {
    const data = makeData({
      shooting_stars: [{ Manager: "Dan", Total: 0 }],
      reversed_motw: [],
      highest_gw_score: [],
      bad_luck_h2h: [{ Manager: "Frank", Score: 0 }],
    });
    const tp = talkingPoints(data);
    expect(tp.riser).toBeNull();
    expect(tp.spoon).toBeNull();
    expect(tp.highest).toBeNull();
    expect(tp.badLuck).toBeNull();
  });

  it("falls back to last place in classic standings when reversed_motw is empty/zero", () => {
    const data = makeData({
      reversed_motw: [{ Manager: "Eve", Score: 0 }],
      classic_league_standings: [
        { Manager: "Carol", Total: 220 },
        { Manager: "Alice", Total: 200 },
        { Manager: "Ghost", Total: 90 },
      ],
    });
    const tp = talkingPoints(data);
    expect(tp.spoon).toEqual({ manager: "Ghost", detail: "propping up the table" });
  });
});

describe("cabinet", () => {
  it("lists only awards with data, with a rotating colorIdx", () => {
    const data = makeData({
      golden_boot: [{ Standings: 1, Team: "A", Manager: "Alice", Score: 7 }],
      playmaker: [{ Standings: 1, Team: "B", Manager: "Bob", Score: 6 }],
      golden_glove: [{ Standings: 1, Team: "C", Manager: "Carol", Score: 5 }],
      best_gk: [{ Standings: 1, Team: "D", Manager: "Dan", Score: 4 }],
      best_def: [{ Standings: 1, Team: "E", Manager: "Eve", Score: 3 }],
      best_mid: [{ Standings: 1, Team: "F", Manager: "Frank", Score: 2 }],
      // best_fwd intentionally has no data
      best_fwd: [],
    });
    const entries = cabinet(data);
    expect(entries).toHaveLength(6);
    expect(entries.map((e) => e.key)).toEqual([
      "golden_boot",
      "playmaker",
      "golden_glove",
      "best_gk",
      "best_def",
      "best_mid",
    ]);
    expect(entries[0]).toMatchObject({ manager: "Alice", score: 7, colorIdx: 0 });
    expect(entries.map((e) => e.colorIdx)).toEqual([0, 1, 2, 3, 4, 0]);
    expect(entries.every((e) => e.title.length > 0 && e.suffix.length > 0)).toBe(true);
  });

  it("returns an empty list when no award sheets have data", () => {
    expect(cabinet(makeData({}))).toEqual([]);
  });
});

describe("trophyChase", () => {
  it("returns a cumulative series for an award with GW columns", () => {
    const data = makeData({
      golden_boot: [
        { Standings: 1, Team: "A", Manager: "Alice", Score: 7, GW1: 3, GW2: 4 },
        { Standings: 2, Team: "B", Manager: "Bob", Score: 5, GW1: 2, GW2: 3 },
        { Standings: 3, Team: "C", Manager: "Carol", Score: 4, GW1: 1, GW2: 3 },
        { Standings: 4, Team: "D", Manager: "Dan", Score: 1, GW1: 1, GW2: 0 },
      ],
    });
    const result = trophyChase(data, "golden_boot");
    expect(result.chase).toHaveLength(4);
    expect(result.chase[0]).toEqual({ manager: "Alice", score: 7 });
    expect(result.series).not.toBeNull();
    expect(result.series?.[0]).toMatchObject({ gameweek: 1, Alice: 3, Bob: 2, Carol: 1 });
    // Only the top 3 contenders appear in the series, never all rows.
    expect(result.series?.[0]).not.toHaveProperty("Dan");
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.suffix.length).toBeGreaterThan(0);
  });

  it("returns a null series for a score-only award", () => {
    const data = makeData({
      reversed_motw: [{ Standings: 1, Team: "A", Manager: "Eve", Score: 3 }],
    });
    const result = trophyChase(data, "reversed_motw");
    expect(result.series).toBeNull();
    expect(result.chase).toEqual([{ manager: "Eve", score: 3 }]);
  });

  it("returns an empty chase and null series when the award sheet is empty", () => {
    const result = trophyChase(makeData({}), "golden_boot");
    expect(result.chase).toEqual([]);
    expect(result.series).toBeNull();
  });
});

describe("managerProfile", () => {
  it("returns rank, trophies, and form for a known manager", () => {
    const data = makeData({
      classic_league_standings: [
        { Manager: "Carol", Total: 220 },
        { Manager: "Alice", Total: 200 },
      ],
      h2h_league_standings: [{ Manager: "Alice", "Total H2H Point": 12 }],
      golden_boot: [{ Standings: 1, Team: "A", Manager: "Alice", Score: 7 }],
      gw_scores: [{ Manager: "Alice", GW1: 60, GW2: 90, GW3: 75 }],
    });
    const profile = managerProfile(data, "Alice");
    expect(profile).not.toBeNull();
    expect(profile?.classicRank).toBe(2);
    expect(profile?.classicTotal).toBe(200);
    expect(profile?.h2hTotal).toBe(12);
    expect(profile?.trophies).toContain("🥇 Golden Boot");
    expect(profile?.form).toEqual([60, 90, 75]);
    expect(profile?.bestGw).toBe(90);
    expect(profile?.worstGw).toBe(60);
  });

  it("returns null for a manager present in no sheet", () => {
    const data = makeData({
      classic_league_standings: [{ Manager: "Alice", Total: 200 }],
      gw_scores: [{ Manager: "Alice", GW1: 60 }],
    });
    expect(managerProfile(data, "Ghost")).toBeNull();
  });
});
