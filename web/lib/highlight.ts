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

/** Stat dimensions the tiles draw from, in priority order. Labels are
 * emoji-free (Satori has no emoji font). `positive` requires a score above zero
 * (skips not-yet-earned awards); `sign` prefixes the value with "+". */
const TILE_POOL: { label: string; key: string; positive?: boolean; sign?: boolean }[] = [
  { label: "Top score", key: "highest_gw_score" },
  { label: "Biggest climber", key: "shooting_stars", positive: true, sign: true },
  { label: "Penalty king", key: "penalty_king", positive: true },
  { label: "Golden boot", key: "golden_boot", positive: true },
  { label: "Playmaker", key: "playmaker", positive: true },
  { label: "Golden glove", key: "golden_glove", positive: true },
  { label: "Bench king", key: "bench_king", positive: true },
  { label: "Dream team", key: "dream_team", positive: true },
];

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

  // Fill up to four stat tiles from the pool below, each with a DISTINCT
  // manager: skip the headline manager (already the hero) and anyone already
  // shown in an earlier tile. This keeps the card full and varied while never
  // repeating a name — and there is deliberately no "Leader" tile, since the
  // gold podium row #1 already is the standings leader.
  const seen = new Set<string>();
  if (v?.manager) seen.add(v.manager);

  const tiles: HighlightTile[] = [];
  for (const a of TILE_POOL) {
    if (tiles.length >= 4) break;
    const leader = awardLeader(data, a.key, a.positive ?? false);
    if (!leader || seen.has(leader.manager)) continue;
    seen.add(leader.manager);
    tiles.push({
      label: a.label,
      name: leader.manager,
      value: a.sign ? `+${leader.score}` : `${leader.score}`,
    });
  }

  return {
    gameweek: data.meta.lastFinishedGw,
    headline: v ? { manager: v.manager, line: v.line, points: v.points } : null,
    podium,
    tiles,
  };
}
