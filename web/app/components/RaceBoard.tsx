"use client";
import { useState } from "react";
import type { DashboardData } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { topStandings } from "@/lib/transforms";
import { useOverlay } from "./OverlayContext";

type Mode = "classic" | "h2h";

const VISIBLE_COUNT = 8;

export function RaceBoard({ data }: { data: DashboardData }) {
  const [mode, setMode] = useState<Mode>("classic");
  const [showAll, setShowAll] = useState(false);
  const { openManager } = useOverlay();

  const rows =
    mode === "classic"
      ? topStandings(getSheet(data, "classic_league_standings"), "Total", 999)
      : topStandings(getSheet(data, "h2h_league_standings"), "Total H2H Point", 999);

  const max = rows.reduce((m, r) => Math.max(m, r.value), 1);
  const visibleRows = showAll ? rows : rows.slice(0, VISIBLE_COUNT);

  return (
    <div className="rounded-2xl border border-[--line] bg-[--panel] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-[15px]">The race</h2>
        <div className="flex overflow-hidden rounded-full border border-[--line]">
          <button
            type="button"
            onClick={() => setMode("classic")}
            className={`px-3 py-1 text-xs font-semibold transition ${
              mode === "classic" ? "bg-[--lime] text-[--bg]" : "text-[--muted]"
            }`}
          >
            Classic
          </button>
          <button
            type="button"
            onClick={() => setMode("h2h")}
            className={`px-3 py-1 text-xs font-semibold transition ${
              mode === "h2h" ? "bg-[--lime] text-[--bg]" : "text-[--muted]"
            }`}
          >
            Head-to-Head
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {visibleRows.map((row, idx) => {
          const pct = max > 0 ? Math.max(4, (row.value / max) * 100) : 0;
          return (
            <button
              key={row.manager}
              type="button"
              onClick={() => openManager(row.manager)}
              className="grid w-full grid-cols-[28px_1fr_46px] items-center gap-2.5 text-left"
            >
              <div className="font-display text-center text-lg text-[--muted]">{idx + 1}</div>
              <div className="relative h-[30px] overflow-hidden rounded-lg bg-[--panel2]">
                <div
                  className="h-full rounded-lg"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg,var(--pink),var(--lime))",
                  }}
                />
                <div className="absolute inset-0 flex items-center pl-3 text-[13.5px] font-bold text-[--ink]">
                  {row.manager}
                </div>
              </div>
              <div className="font-display text-right text-base">{row.value}</div>
            </button>
          );
        })}
      </div>

      {rows.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full text-center text-xs text-[--muted]"
        >
          {showAll ? "▴ Show less" : `▾ Show all ${rows.length} managers · tap any name for their profile`}
        </button>
      )}
    </div>
  );
}
