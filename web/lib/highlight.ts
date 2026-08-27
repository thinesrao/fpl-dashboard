import { verdict } from "./story";
import { toNum } from "./transforms";
import { getSheet, type DashboardData, type SheetRow } from "./types";

/** One stat tile on the shareable highlight card. */
export type HighlightTile = { label: string; name: string; value: string };

export type HighlightModel = {
  gameweek: number;
  /** null before GW1 awards exist (mirrors verdict()). */
  headline: { manager: string; line: string; points: number } | null;
  podium: { rank: number; manager: string; points: number }[];
  tiles: HighlightTile[];
};

function managerOf(row: SheetRow): string {
  return String(row.Manager ?? "");
}

/** Award sheets share the shape Standings, Team, Manager, <score>; the 4th
 * column (index 3) is always the score. Returns null when the sheet is empty
 * or (when `positiveOnly`) the leader's score isn't above zero. */
function awardLeader(
  data: DashboardData,
  key: string,
  positiveOnly = false,
): { manager: string; score: number } | null {
  const rows = getSheet(data, key);
  if (rows.length === 0) return null;
  const row0 = rows[0];
  const scoreKey = Object.keys(row0)[3];
  const score = scoreKey ? toNum(row0[scoreKey]) : 0;
  if (positiveOnly && score <= 0) return null;
  return { manager: managerOf(row0), score };
}

/**
 * Auto-derive the shareable "highlight of the gameweek" card from the same
 * dashboard data the page renders. Pure: no rendering, no I/O. Tiles are
 * included only when their underlying award has data, so an early-season
 * gameweek simply shows fewer of them.
 */
export function highlightModel(data: DashboardData): HighlightModel {
  const v = verdict(data);

  const standings = getSheet(data, "classic_league_standings");
  const podium = standings.slice(0, 3).map((row, i) => ({
    rank: i + 1,
    manager: managerOf(row),
    points: toNum(row.Total),
  }));

  const tiles: HighlightTile[] = [];

  if (standings.length > 0) {
    tiles.push({
      label: "Leader",
      name: managerOf(standings[0]),
      value: `${toNum(standings[0].Total)}`,
    });
  }

  const topScore = awardLeader(data, "highest_gw_score");
  if (topScore) {
    tiles.push({ label: "Top score", name: topScore.manager, value: `${topScore.score}` });
  }

  const climber = awardLeader(data, "shooting_stars", true);
  if (climber) {
    tiles.push({ label: "Biggest climber", name: climber.manager, value: `+${climber.score}` });
  }

  const penalty = awardLeader(data, "penalty_king", true);
  if (penalty) {
    tiles.push({ label: "Penalty king", name: penalty.manager, value: `${penalty.score}` });
  }

  return {
    gameweek: data.meta.lastFinishedGw,
    headline: v ? { manager: v.manager, line: v.line, points: v.points } : null,
    podium,
    tiles: tiles.slice(0, 4),
  };
}
