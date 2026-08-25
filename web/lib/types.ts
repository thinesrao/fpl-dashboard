export type SheetRow = Record<string, string | number | null>;

export type DashboardData = {
  sheets: Record<string, SheetRow[]>;
  meta: { lastFinishedGw: number; lastUpdatedUtc: string };
};

export function normalizeDashboard(raw: unknown): DashboardData {
  const obj = (raw ?? {}) as {
    sheets?: Record<string, SheetRow[]>;
    generated_from_metadata?: Record<string, unknown>;
  };
  const meta = obj.generated_from_metadata ?? {};
  return {
    sheets: obj.sheets ?? {},
    meta: {
      lastFinishedGw: Number(meta.last_finished_gw ?? 0) || 0,
      lastUpdatedUtc: String(meta.last_updated_utc ?? ""),
    },
  };
}

export function getSheet(data: DashboardData, name: string): SheetRow[] {
  return data.sheets[name] ?? [];
}
