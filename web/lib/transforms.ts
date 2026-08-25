import type { SheetRow } from "./types";

export function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function topStandings(rows: SheetRow[], valueKey: string, n = 10) {
  return rows.slice(0, n).map((r) => ({
    manager: String(r.Manager ?? ""),
    value: toNum(r[valueKey]),
  }));
}

export function gwColumns(row: SheetRow): string[] {
  return Object.keys(row)
    .filter((k) => /^GW\d+$/.test(k))
    .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
}

export function cumulativeSeries(rows: SheetRow[]): Array<Record<string, number>> {
  if (rows.length === 0) return [];
  const cols = gwColumns(rows[0]);
  const running: Record<string, number> = {};
  return cols.map((col) => {
    const point: Record<string, number> = { gameweek: Number(col.slice(2)) };
    for (const r of rows) {
      const m = String(r.Manager ?? "");
      running[m] = (running[m] ?? 0) + toNum(r[col]);
      point[m] = running[m];
    }
    return point;
  });
}

export function awardLeader(rows: SheetRow[]) {
  if (rows.length === 0) return null;
  const keys = Object.keys(rows[0]);
  const scoreKey = keys[3]; // Standings, Team, Manager, <score>
  const score = toNum(rows[0][scoreKey]);
  const second = rows.length > 1 ? toNum(rows[1][scoreKey]) : score;
  return { manager: String(rows[0].Manager ?? ""), score, gap: Math.round((score - second) * 10) / 10 };
}
