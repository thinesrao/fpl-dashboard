import type { SheetRow } from "@/lib/types";

export function StandingsTable({ rows, highlight }: { rows: SheetRow[]; highlight?: string }) {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>{cols.map((c) => <th key={c} className="border-b border-[--line] px-2 py-1.5 text-left text-[--muted]">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const on = String(r.Manager ?? "") === highlight;
            return (
              <tr key={i} className={on ? "bg-[--accent] text-[#06231a]" : ""}>
                {cols.map((c) => <td key={c} className="border-b border-[--line] px-2 py-1.5">{String(r[c] ?? "")}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
