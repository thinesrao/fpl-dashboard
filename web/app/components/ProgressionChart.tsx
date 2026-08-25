"use client";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { cumulativeSeries } from "@/lib/transforms";
import type { SheetRow } from "@/lib/types";

export function ProgressionChart({ rows, highlight }: { rows: SheetRow[]; highlight?: string }) {
  const series = cumulativeSeries(rows);
  if (series.length === 0) return null;
  const managers = Object.keys(series[0]).filter((k) => k !== "gameweek");
  return (
    <LineChart width={620} height={300} data={series} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
      <CartesianGrid stroke="#232c38" />
      <XAxis dataKey="gameweek" tick={{ fill: "#8a97a8", fontSize: 11 }} />
      <YAxis tick={{ fill: "#8a97a8", fontSize: 11 }} />
      {managers.map((m) => (
        <Line key={m} type="monotone" dataKey={m} dot={false} isAnimationActive={false}
              stroke={m === highlight ? "#2bfca4" : "#41506a"}
              strokeWidth={m === highlight ? 4 : 1.5} />
      ))}
    </LineChart>
  );
}
