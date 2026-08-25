"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { topStandings } from "@/lib/transforms";
import { RaceChart } from "./RaceChart";
import { MonthlyWeekly } from "./MonthlyWeekly";

export function StandardTab({ data, highlight }: { data: DashboardData; highlight?: string }) {
  const classic = topStandings(getSheet(data, "classic_league_standings"), "Total");
  const h2h = topStandings(getSheet(data, "h2h_league_standings"), "Total H2H Point");
  const cup = getSheet(data, "cup_winner");
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <RaceChart title="Classic League" caption="Total points" rows={classic} highlight={highlight} />
        <RaceChart title="Head-to-Head" caption="Total H2H points" rows={h2h} highlight={highlight} />
      </div>
      {data.meta.lastFinishedGw >= 34 && cup.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[--line] bg-[--panel] p-4">
          <p className="text-xs text-[--muted]">League Cup Champion</p>
          <p className="font-display text-xl text-[--accent]">{String(cup[0].Winner ?? "")}</p>
        </div>
      )}
      <MonthlyWeekly data={data} />
    </div>
  );
}
