"use client";
import { useEffect } from "react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@/lib/types";
import { trophyChase } from "@/lib/story";
import { splitTitle } from "./TrophyCabinet";

const LINE_COLORS = ["var(--gold)", "var(--cyan)", "var(--pink)"];

export function TrophyDetail({
  data,
  trophyKey,
  onClose,
}: {
  data: DashboardData;
  trophyKey: string;
  onClose: () => void;
}) {
  const { title, chase, series } = trophyChase(data, trophyKey);
  const { emoji, label } = splitTitle(title);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const seriesKeys =
    series && series.length > 0
      ? Object.keys(series[0]).filter((k) => k !== "gameweek")
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[--line] bg-[--panel] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3.5 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
            style={{
              background: "radial-gradient(circle at 35% 30%, #ffe89a, var(--gold))",
            }}
          >
            {emoji}
          </div>
          <h2 className="font-display flex-1 text-lg uppercase">{label || title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl text-[--muted]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {chase.map((c, i) => (
            <div
              key={c.manager}
              className="flex items-center justify-between rounded-xl border border-[--line] bg-[--panel2] px-3 py-2"
            >
              <span className="text-sm font-semibold text-[--ink]">
                {i + 1}. {c.manager}
              </span>
              <span className="font-display text-base">{c.score}</span>
            </div>
          ))}
        </div>

        {series && series.length > 0 ? (
          <div className="mt-4" data-testid="trophy-chart">
            <LineChart width={460} height={180} data={series}>
              <XAxis
                dataKey="gameweek"
                tick={{ fill: "#8f8aa3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              {seriesKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[--muted]">
            No per-gameweek breakdown for this award
          </p>
        )}
      </div>
    </div>
  );
}
