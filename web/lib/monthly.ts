import type { DashboardData, SheetRow } from "./types";

export const MONTH_ORDER = [
  "August", "September", "October", "November", "December",
  "January", "February", "March", "April", "May",
];

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
