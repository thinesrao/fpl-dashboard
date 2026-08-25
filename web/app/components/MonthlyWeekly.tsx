"use client";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { monthlySheets } from "@/lib/monthly";
import { Tabs } from "./Tabs";
import { StandingsTable } from "./StandingsTable";

function Empty() {
  return <p className="text-sm text-[--muted]">No data yet.</p>;
}

function MonthlyList({ data, prefix }: { data: DashboardData; prefix: string }) {
  const months = monthlySheets(data, prefix);
  if (months.length === 0) return <Empty />;
  return (
    <div className="space-y-4">
      {months.map((m) => (
        <div key={m.label}>
          <h5 className="font-display mb-2 text-sm">{m.label}</h5>
          <StandingsTable rows={m.rows} />
        </div>
      ))}
    </div>
  );
}

export function MonthlyWeekly({ data }: { data: DashboardData }) {
  const weekly = getSheet(data, "weekly_manager_log");
  const challenge = getSheet(data, "fpl_challenge_weekly_log");
  return (
    <div className="mt-4 rounded-2xl border border-[--line] bg-[--panel] p-4">
      <h4 className="font-display mb-3 text-sm">Monthly &amp; Weekly Winners</h4>
      <Tabs
        items={[
          { key: "cm", label: "Classic Monthly", content: <MonthlyList data={data} prefix="classic_monthly_" /> },
          { key: "hm", label: "H2H Monthly", content: <MonthlyList data={data} prefix="h2h_monthly_" /> },
          { key: "motw", label: "Manager of the Week", content: weekly.length ? <StandingsTable rows={weekly} /> : <Empty /> },
          { key: "chal", label: "FPL Challenge", content: challenge.length ? <StandingsTable rows={challenge} /> : <Empty /> },
        ]}
      />
    </div>
  );
}
