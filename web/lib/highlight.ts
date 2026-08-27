import { talkingPoints, type TalkingPoint } from "./story";
import { toNum } from "./transforms";
import { getSheet, type DashboardData, type SheetRow } from "./types";

/** A Manager-of-the-Week hero — one per competition (Classic, Challenge). */
export type Hero = { competition: string; manager: string; points: number };

/** One talking-point tile: a labelled callout about a manager. */
export type HighlightTile = { label: string; name: string; detail: string };

export type HighlightModel = {
  gameweek: number;
  /** The main highlights: Classic MotW first, then Challenge MotW. Each present
   * only when its weekly log has data. */
  heroes: Hero[];
  /** Auto-derived talking points of the week (from story.talkingPoints), minus
   * any that just restate a hero. */
  tiles: HighlightTile[];
};

/** Award sheets to backfill the tiles with once the genuine talking points run
 * out, so the card reliably fills up to four. Each is a season-standing leader;
 * `unit` is appended to the value for the tile detail. */
const AWARD_FILL: { label: string; key: string; unit: string }[] = [
  { label: "Golden boot", key: "golden_boot", unit: "goals" },
  { label: "Playmaker", key: "playmaker", unit: "assists" },
  { label: "Golden glove", key: "golden_glove", unit: "clean sheets" },
  { label: "Bench king", key: "bench_king", unit: "pts benched" },
  { label: "Transfer king", key: "transfer_king", unit: "pts" },
  { label: "Dream team", key: "dream_team", unit: "DT pts" },
  { label: "Defensive king", key: "defensive_king", unit: "pts" },
];

function managerOf(row: SheetRow): string {
  return String(row.Manager ?? "");
}

/** Leader of an award sheet (Standings, Team, Manager, <score>): the 4th column
 * is always the score. Null when empty or the leader's score isn't positive. */
function awardLeader(data: DashboardData, key: string): { manager: string; score: number } | null {
  const rows = getSheet(data, key);
  if (rows.length === 0) return null;
  const row0 = rows[0];
  const scoreKey = Object.keys(row0)[3];
  const score = scoreKey ? toNum(row0[scoreKey]) : 0;
  if (score <= 0) return null;
  return { manager: managerOf(row0), score };
}

/** Manager of the Week for a weekly log (Gameweek, Team, Manager, Score): the
 * row with the highest Gameweek, falling back to the last row. Null if empty. */
function latestWeeklyWinner(data: DashboardData, sheet: string): { manager: string; points: number } | null {
  const log = getSheet(data, sheet);
  if (log.length === 0) return null;
  let best = log[0];
  let maxGw = -Infinity;
  for (const row of log) {
    const gw = toNum(row.Gameweek);
    if (gw >= maxGw) {
      maxGw = gw;
      best = row;
    }
  }
  return { manager: managerOf(best), points: toNum(best.Score) };
}

/** Talking-point detail strings are authored for the DOM, where ▲/× render
 * fine; Satori (the image renderer) has no glyphs for them, so swap in ASCII. */
function sanitizeDetail(detail: string): string {
  return detail.replace(/▲/g, "+").replace(/×/g, "x");
}

/**
 * Auto-derive the shareable "highlight of the gameweek" card. The main
 * highlights are the two Managers of the Week (Classic + Challenge); the tiles
 * are the week's talking points (story.talkingPoints), each shown only when it
 * names a manager not already featured as a hero or an earlier tile.
 */
export function highlightModel(data: DashboardData): HighlightModel {
  const classic = latestWeeklyWinner(data, "weekly_manager_log");
  const challenge = latestWeeklyWinner(data, "fpl_challenge_weekly_log");

  const heroes: Hero[] = [];
  if (classic) heroes.push({ competition: "Classic", ...classic });
  if (challenge) heroes.push({ competition: "Challenge", ...challenge });

  // No manager appears twice: seed with the heroes, then add talking points for
  // anyone not already shown.
  const seen = new Set(heroes.map((h) => h.manager));

  const tp = talkingPoints(data);
  const candidates: { label: string; point: TalkingPoint | null }[] = [
    { label: "Highest score", point: tp.highest },
    { label: "Biggest riser", point: tp.riser },
    { label: "Worst luck", point: tp.badLuck },
    { label: "Wooden spoon", point: tp.spoon },
  ];

  const tiles: HighlightTile[] = [];
  for (const c of candidates) {
    if (tiles.length >= 4) break;
    if (!c.point || seen.has(c.point.manager)) continue;
    seen.add(c.point.manager);
    tiles.push({ label: c.label, name: c.point.manager, detail: sanitizeDetail(c.point.detail) });
  }

  // Backfill with award leaders so the card stays full when the week is short on
  // genuine talking points (e.g. no risers yet at GW1). Still de-duped by
  // manager against the heroes and earlier tiles.
  for (const a of AWARD_FILL) {
    if (tiles.length >= 4) break;
    const leader = awardLeader(data, a.key);
    if (!leader || seen.has(leader.manager)) continue;
    seen.add(leader.manager);
    tiles.push({ label: a.label, name: leader.manager, detail: `${leader.score} ${a.unit}` });
  }

  return { gameweek: data.meta.lastFinishedGw, heroes, tiles };
}
