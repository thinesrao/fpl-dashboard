export type SheetRow = Record<string, string | number | null>;

export type DashboardMeta = {
  lastFinishedGw: number;
  lastUpdatedUtc: string;
  // The fields below are always populated by normalizeDashboard for real data;
  // optional so lightweight hand-built test fixtures can omit them.
  /** Is the last finished gameweek's data checked (bonus points settled)? */
  lastFinishedGwDataChecked?: boolean;
  /** Gameweek through which manual penalties are confirmed by the admin. */
  penaltiesReviewedThroughGw?: number;
  /** Month name -> its last gameweek id, from the live FPL deadlines. Empty
   * when an older dashboard.json predates this field. */
  monthLastGw?: Record<string, number>;
};

export type DashboardData = {
  sheets: Record<string, SheetRow[]>;
  meta: DashboardMeta;
};

function parseMonthLastGw(raw: unknown): Record<string, number> {
  // Emitted as a JSON string by the pipeline; tolerate an object too.
  const source = typeof raw === "string" ? safeJson(raw) : raw;
  if (!source || typeof source !== "object") return {};
  const out: Record<string, number> = {};
  for (const [month, gw] of Object.entries(source as Record<string, unknown>)) {
    const n = Number(gw);
    if (Number.isFinite(n)) out[month] = n;
  }
  return out;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

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
      lastFinishedGwDataChecked: meta.last_finished_gw_data_checked === true,
      penaltiesReviewedThroughGw: Number(meta.penalties_reviewed_through_gw ?? 0) || 0,
      monthLastGw: parseMonthLastGw(meta.month_last_gw),
    },
  };
}

export function getSheet(data: DashboardData, name: string): SheetRow[] {
  return data.sheets[name] ?? [];
}
