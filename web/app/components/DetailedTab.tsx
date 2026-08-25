"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { gwColumns } from "@/lib/transforms";
import { SPECIAL_AWARDS } from "@/lib/awards";
import { ProgressionChart } from "./ProgressionChart";
import { StandingsTable } from "./StandingsTable";

export function DetailedTab({ data, highlight }: { data: DashboardData; highlight?: string }) {
  return (
    <div className="space-y-3">
      {SPECIAL_AWARDS.map((a) => {
        const rows = getSheet(data, a.key);
        if (rows.length === 0) return null;
        const hasGw = gwColumns(rows[0]).length > 0;
        return (
          <details key={a.key} className="rounded-2xl border border-[--line] bg-[--panel] p-4">
            <summary className="cursor-pointer font-display text-sm">{a.title}</summary>
            <div className="mt-3 space-y-3">
              {hasGw && (
                <div className="overflow-x-auto">
                  <ProgressionChart rows={rows} highlight={highlight} />
                </div>
              )}
              <StandingsTable rows={rows} highlight={highlight} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
