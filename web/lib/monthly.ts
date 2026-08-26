import type { DashboardData, SheetRow } from "./types";

export const MONTH_ORDER = [
  "August", "September", "October", "November", "December",
  "January", "February", "March", "April", "May",
];

/** Last gameweek of each FPL month (mirrors the pipeline's FPL_MONTH_MAP).
 * Used to tell whether a monthly award is final or still in progress. */
const MONTH_LAST_GW: Record<string, number> = {
  august: 3, september: 6, october: 9, november: 13, december: 19,
  january: 24, february: 28, march: 31, april: 34, may: 38,
};

/** A month is complete once the last finished gameweek reaches its final GW.
 * Unknown months default to complete so we never show a misleading badge. */
export function isMonthComplete(monthLabel: string, lastFinishedGw: number): boolean {
  const lastGw = MONTH_LAST_GW[monthLabel.toLowerCase()];
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
