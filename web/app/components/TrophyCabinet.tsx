"use client";
import type { DashboardData } from "@/lib/types";
import { cabinet } from "@/lib/story";
import { useOverlay } from "./OverlayContext";

const COIN_STYLES = [
  { light: "#ffe89a", base: "var(--gold)", glow: "rgba(255,210,63,.45)" },
  { light: "#ffa6c4", base: "var(--pink)", glow: "rgba(255,46,147,.45)" },
  { light: "#a6f0ff", base: "var(--cyan)", glow: "rgba(74,217,255,.45)" },
  { light: "#cbb0ff", base: "var(--purple)", glow: "rgba(155,92,255,.45)" },
  { light: "#e8ffab", base: "var(--lime)", glow: "rgba(198,255,0,.4)" },
];

/** Splits an award title like "🥇 Golden Boot" into its leading emoji and
 * the readable label that follows it. */
export function splitTitle(title: string): { emoji: string; label: string } {
  const spaceIdx = title.indexOf(" ");
  if (spaceIdx < 0) return { emoji: title, label: "" };
  return { emoji: title.slice(0, spaceIdx), label: title.slice(spaceIdx + 1) };
}

export function TrophyCabinet({ data }: { data: DashboardData }) {
  const entries = cabinet(data);
  const { openTrophy } = useOverlay();

  if (entries.length === 0) return null;

  return (
    <div>
      <h2 className="font-display mb-4 text-[13px] uppercase tracking-[0.2em] text-[--muted]">
        The trophy cabinet · {entries.length} up for grabs
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {entries.map((entry) => {
          const { emoji, label } = splitTitle(entry.title);
          const style = COIN_STYLES[entry.colorIdx % COIN_STYLES.length];
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => openTrophy(entry.key)}
              className="rounded-2xl border border-[--line] bg-[--panel] p-3.5 text-center transition hover:-translate-y-0.5 hover:border-[#3a3550]"
            >
              <div
                className="mx-auto mb-2 flex h-[46px] w-[46px] items-center justify-center rounded-full text-xl"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${style.light}, ${style.base})`,
                  boxShadow: `0 0 18px ${style.glow}`,
                }}
              >
                {emoji}
              </div>
              <div className="font-coin h-6 text-[10.5px] leading-tight font-semibold text-[--muted]">
                {label}
              </div>
              <div className="mt-1 truncate text-[11.5px] font-extrabold text-[--ink]">
                {entry.manager} · {entry.score}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
