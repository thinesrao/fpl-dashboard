import { SPECIAL_AWARDS } from "./awards";
import { cumulativeSeries, gwColumns, toNum } from "./transforms";
import { getSheet, type DashboardData, type SheetRow } from "./types";

export type Verdict = { manager: string; points: number; line: string };

export type TalkingPoint = { manager: string; detail: string };

export type TalkingPoints = {
  riser: TalkingPoint | null;
  spoon: TalkingPoint | null;
  highest: TalkingPoint | null;
  badLuck: TalkingPoint | null;
};

export type CabinetEntry = {
  key: string;
  title: string;
  suffix: string;
  manager: string;
  score: number;
  colorIdx: number;
};

export type TrophyChase = {
  title: string;
  suffix: string;
  chase: { manager: string; score: number }[];
  series: Array<Record<string, number>> | null;
};

export type ManagerProfile = {
  name: string;
  classicRank: number;
  classicTotal: number;
  h2hTotal: number;
  trophies: string[];
  form: number[];
  bestGw: number;
  worstGw: number;
};

function managerOf(row: SheetRow): string {
  return String(row.Manager ?? "");
}

/** The 4th column (index 3) of an award sheet row is always its score column
 * (Standings, Team, Manager, <score>). */
function scoreColumnKey(row: SheetRow): string | undefined {
  return Object.keys(row)[3];
}

/**
 * Manager of the Week: the `weekly_manager_log` row with the highest
 * `Gameweek`, falling back to the last row when there's no clear max
 * (e.g. all rows share the same/missing Gameweek).
 */
export function verdict(data: DashboardData): Verdict | null {
  const log = getSheet(data, "weekly_manager_log");
  if (log.length === 0) return null;

  let motw = log[0];
  let maxGw = -Infinity;
  for (const row of log) {
    const gw = toNum(row.Gameweek);
    if (gw >= maxGw) {
      maxGw = gw;
      motw = row;
    }
  }

  const manager = managerOf(motw);
  const points = toNum(motw.Score);

  const standings = getSheet(data, "classic_league_standings");
  let line: string;
  if (standings.length >= 2) {
    const gap = toNum(standings[0].Total) - toNum(standings[1].Total);
    if (gap >= 15) line = "runs it";
    else if (gap >= 5) line = "edges ahead";
    else line = "clings on";
  } else {
    line = "clings on";
  }

  const risers = getSheet(data, "shooting_stars");
  if (risers.length > 0) {
    const topRiser = risers[0];
    if (toNum(topRiser.Total) > 0 && managerOf(topRiser) === manager) {
      line = "storms it";
    }
  }

  return { manager, points, line };
}

/** The four data-derived callouts row: biggest riser, spoon watch, highest
 * GW score, and worst H2H luck. Each is null when the underlying data is
 * absent or zero (e.g. GW1 has no riser yet). */
export function talkingPoints(data: DashboardData): TalkingPoints {
  const riserRows = getSheet(data, "shooting_stars");
  const riser =
    riserRows.length > 0 && toNum(riserRows[0].Total) > 0
      ? { manager: managerOf(riserRows[0]), detail: `▲${toNum(riserRows[0].Total)} places` }
      : null;

  const spoonRows = getSheet(data, "reversed_motw");
  const spoon =
    spoonRows.length > 0 && toNum(spoonRows[0].Score) > 0
      ? { manager: managerOf(spoonRows[0]), detail: `${toNum(spoonRows[0].Score)}× bottom` }
      : null;

  const highestRows = getSheet(data, "highest_gw_score");
  const highest =
    highestRows.length > 0
      ? { manager: managerOf(highestRows[0]), detail: `${toNum(highestRows[0].Score)} pts` }
      : null;

  const badLuckRows = getSheet(data, "bad_luck_h2h");
  const badLuck =
    badLuckRows.length > 0 && toNum(badLuckRows[0].Score) > 0
      ? { manager: managerOf(badLuckRows[0]), detail: `${toNum(badLuckRows[0].Score)}-week winless` }
      : null;

  return { riser, spoon, highest, badLuck };
}

/** One coin per SPECIAL_AWARDS entry that has data, in SPECIAL_AWARDS order,
 * with a stable colorIdx rotation for the coin palette. */
export function cabinet(data: DashboardData): CabinetEntry[] {
  const entries: CabinetEntry[] = [];
  for (const award of SPECIAL_AWARDS) {
    const rows = getSheet(data, award.key);
    if (rows.length === 0) continue;
    const row0 = rows[0];
    const scoreKey = scoreColumnKey(row0);
    entries.push({
      key: award.key,
      title: award.title,
      suffix: award.suffix,
      manager: managerOf(row0),
      score: scoreKey ? toNum(row0[scoreKey]) : 0,
      colorIdx: entries.length % 5,
    });
  }
  return entries;
}

/** Trophy detail: top-4 chase for one award, plus a cumulative progression
 * series limited to the top 3 contenders (never all rows), only when the
 * sheet carries per-GW columns. */
export function trophyChase(data: DashboardData, key: string): TrophyChase {
  const award = SPECIAL_AWARDS.find((a) => a.key === key);
  const title = award?.title ?? "";
  const suffix = award?.suffix ?? "";

  const rows = getSheet(data, key);
  if (rows.length === 0) {
    return { title, suffix, chase: [], series: null };
  }

  const scoreKey = scoreColumnKey(rows[0]);
  const chase = rows.slice(0, 4).map((row) => ({
    manager: managerOf(row),
    score: scoreKey ? toNum(row[scoreKey]) : 0,
  }));

  let series: Array<Record<string, number>> | null = null;
  if (gwColumns(rows[0]).length > 0) {
    const topContenders = new Set(rows.slice(0, 3).map(managerOf));
    const contenderRows = rows.filter((row) => topContenders.has(managerOf(row)));
    series = cumulativeSeries(contenderRows);
  }

  return { title, suffix, chase, series };
}

/**
 * A single manager's cross-sheet profile: rank/totals, held trophies, and
 * form (per-GW points from `gw_scores`). Returns null only when the manager
 * appears in neither `classic_league_standings` nor `gw_scores`.
 */
export function managerProfile(data: DashboardData, name: string): ManagerProfile | null {
  const standings = getSheet(data, "classic_league_standings");
  const standingsIdx = standings.findIndex((row) => managerOf(row) === name);
  const classicRank = standingsIdx >= 0 ? standingsIdx + 1 : 0;
  const classicTotal = standingsIdx >= 0 ? toNum(standings[standingsIdx].Total) : 0;

  const h2hRows = getSheet(data, "h2h_league_standings");
  const h2hRow = h2hRows.find((row) => managerOf(row) === name);
  const h2hTotal = h2hRow ? toNum(h2hRow["Total H2H Point"]) : 0;

  const trophies = SPECIAL_AWARDS.filter((award) => {
    const rows = getSheet(data, award.key);
    return rows.length > 0 && managerOf(rows[0]) === name;
  }).map((award) => award.title);

  const gwScoreRows = getSheet(data, "gw_scores");
  const formRow = gwScoreRows.find((row) => managerOf(row) === name);
  const form = formRow ? gwColumns(formRow).map((col) => toNum(formRow[col])) : [];
  const bestGw = form.length > 0 ? Math.max(...form) : 0;
  const worstGw = form.length > 0 ? Math.min(...form) : 0;

  if (standingsIdx < 0 && !formRow) return null;

  return { name, classicRank, classicTotal, h2hTotal, trophies, form, bestGw, worstGw };
}
