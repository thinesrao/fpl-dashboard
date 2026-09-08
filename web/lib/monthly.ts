import type { DashboardData, SheetRow } from "./types";

export const MONTH_ORDER = [
  "August", "September", "October", "November", "December",
  "January", "February", "March", "April", "May",
];

/** Fallback last-gameweek-of-month, used only when the dashboard.json predates
 * the pipeline's live `month_last_gw` (derived from real FPL deadlines). The
 * live map is authoritative because postponed fixtures shift month boundaries. */
const MONTH_LAST_GW_FALLBACK: Record<string, number> = {
  august: 3, september: 6, october: 9, november: 13, december: 19,
  january: 24, february: 28, march: 31, april: 34, may: 38,
};

function lookupMonthLastGw(monthLabel: string, monthLastGw: Record<string, number>): number | undefined {
  const target = monthLabel.toLowerCase();
  for (const [month, gw] of Object.entries(monthLastGw)) {
    if (month.toLowerCase() === target) return gw;
  }
  return MONTH_LAST_GW_FALLBACK[target];
}

/** A month is complete once the last finished gameweek reaches its final GW.
 * Prefers the live `monthLastGw` map (from meta); unknown months default to
 * complete so we never show a misleading badge. */
export function isMonthComplete(
  monthLabel: string,
  lastFinishedGw: number,
  monthLastGw: Record<string, number> = {},
): boolean {
  const lastGw = lookupMonthLastGw(monthLabel, monthLastGw);
  if (lastGw === undefined) return true;
  return lastFinishedGw >= lastGw;
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const MONTH_ORDER_LOWER = MONTH_ORDER.map((m) => m.toLowerCase());

export function monthlySheets(data: DashboardData, prefix: string): { label: string; rows: SheetRow[] }[] {
  return Object.keys(data.sheets)
    .filter((n) => n.startsWith(prefix))
    .map((n) => ({ n, month: n.slice(prefix.length) }))
    .sort(
      (a, b) =>
        MONTH_ORDER_LOWER.indexOf(b.month.toLowerCase()) -
        MONTH_ORDER_LOWER.indexOf(a.month.toLowerCase())
    )
    .map(({ n, month }) => ({ label: titleCase(month), rows: data.sheets[n] }));
}
