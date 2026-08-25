"use client";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

type Row = { manager: string; value: number };

export function RaceChart({
  title, caption, rows, highlight,
}: { title: string; caption: string; rows: Row[]; highlight?: string }) {
  return (
    <div className="rounded-2xl border border-[--line] bg-[--panel] p-4">
      <h3 className="font-display text-[15px]">{title}</h3>
      <p className="mb-4 text-xs text-[--muted]">{caption}</p>
      <BarChart width={460} height={Math.max(120, rows.length * 34)} data={rows} layout="vertical"
                margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="manager" width={110} tick={{ fill: "#8a97a8", fontSize: 12 }}
               axisLine={false} tickLine={false} />
        <Bar dataKey="value" radius={[6, 6, 6, 6]} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.manager} fill={r.manager === highlight ? "#7bffcf" : "#2bfca4"} />
          ))}
          <LabelList dataKey="value" position="right" fill="#e8eef5" fontSize={12} />
        </Bar>
      </BarChart>
    </div>
  );
}
