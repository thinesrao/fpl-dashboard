"use client";
import type { DashboardData, SheetRow } from "@/lib/types";
import { getSheet } from "@/lib/types";
import { monthlySheets, isMonthComplete } from "@/lib/monthly";

type HofCard = {
  key: string;
  label: string;
  winner: string;
  score: string;
  provisional?: boolean;
  /** The newest card in its group (latest gameweek / latest month) — accented
   * so the freshest result stands out from the history. */
  highlight?: boolean;
};

function managerOf(row: SheetRow): string {
  const v = row.Manager;
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function gameweekOf(row: SheetRow): number {
  const n = Number(row.Gameweek);
  return Number.isFinite(n) ? n : -Infinity;
}

/** Manager of the Week / FPL Challenge weekly logs share the same shape:
 * Gameweek, Team, Manager, Score. We keep the full history — one card per
 * gameweek — sorted newest-first, and flag the latest gameweek's card so it can
 * be accented. */
function weeklyLogCards(rows: SheetRow[], labelFor: (row: SheetRow) => string): HofCard[] {
  if (rows.length === 0) return [];
  const maxGw = Math.max(...rows.map(gameweekOf));
  return [...rows]
    .sort((a, b) => gameweekOf(b) - gameweekOf(a))
    .map((row) => {
      const label = labelFor(row);
      return {
        key: label,
        label,
        winner: managerOf(row) || "—",
        score: String(row.Score ?? ""),
        highlight: gameweekOf(row) === maxGw,
      };
    });
}

/** Monthly sheets (classic_monthly_*, h2h_monthly_*) are already sorted with
 * Standings 1 first and always carry Standings, Team, Manager, <total>, ...GW
 * in that column order (same convention as the award sheets in lib/story.ts).
 * We read the winner defensively: only trust the first row's Manager field
 * when it's a non-empty string, and only read the 4th column as the score
 * when we trusted the winner. Anything else falls back to a dash + "see
 * table" rather than guessing. */
function monthlyCards(data: DashboardData, prefix: string, tag: string): HofCard[] {
  const lastFinishedGw = data.meta.lastFinishedGw;
  // monthlySheets is sorted latest month first, so index 0 is the newest.
  return monthlySheets(data, prefix).map((m, idx) => {
    const row0 = m.rows[0];
    const manager = row0 ? managerOf(row0) : "";
    const confident = manager.trim().length > 0;
    const scoreKey = row0 ? Object.keys(row0)[3] : undefined;
    return {
      key: `${prefix}${m.label}`,
      label: `${m.label} (${tag})`,
      winner: confident ? manager : "—",
      score: confident && scoreKey ? String(row0?.[scoreKey] ?? "") : "see table",
      provisional: !isMonthComplete(m.label, lastFinishedGw),
      highlight: idx === 0,
    };
  });
}

function HofCardView({ card }: { card: HofCard }) {
  // Border/tint: ongoing month = gold; newest finalized card = lime; else muted.
  const accent = card.provisional
    ? "border-[rgba(255,210,63,0.5)] bg-[rgba(255,210,63,0.06)]"
    : card.highlight
      ? "border-[--lime] bg-[rgba(198,255,0,0.06)]"
      : "border-[--line] bg-[--panel]";
  return (
    <div className={"flex flex-col justify-between rounded-2xl border px-3.5 py-3 " + accent}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-xs text-[--muted]">{card.label}</span>
        {card.provisional ? (
          <span className="rounded-full border border-[rgba(255,210,63,0.4)] bg-[rgba(255,210,63,0.12)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[--gold]">
            So far
          </span>
        ) : card.highlight ? (
          <span className="rounded-full border border-[rgba(198,255,0,0.4)] bg-[rgba(198,255,0,0.14)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[--lime]">
            New
          </span>
        ) : null}
      </div>
      {card.provisional && (
        <div className="mt-1 text-[10px] uppercase tracking-wide text-[--muted]">Leading</div>
      )}
      <div className={(card.provisional ? "mt-0.5" : "mt-1") + " truncate text-sm font-bold text-[--ink]"}>{card.winner}</div>
      <div className="font-display mt-0.5 text-lg text-[--lime]">{card.score || "soon"}</div>
    </div>
  );
}

function HofPlaceholder() {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[--line] bg-[--panel] px-3.5 py-3">
      <div className="font-display text-xs text-[--muted]">Hall of Fame</div>
      <div className="mt-1 text-sm font-bold text-[--ink]">—</div>
      <div className="font-display mt-0.5 text-lg text-[--lime]">soon</div>
    </div>
  );
}

export function HallOfFame({ data }: { data: DashboardData }) {
  const cards: HofCard[] = [
    ...weeklyLogCards(getSheet(data, "weekly_manager_log"), (row) => `Classic GW${row.Gameweek ?? ""}`),
    ...weeklyLogCards(getSheet(data, "fpl_challenge_weekly_log"), (row) => `Challenge GW${row.Gameweek ?? ""}`),
    ...monthlyCards(data, "classic_monthly_", "Classic"),
    ...monthlyCards(data, "h2h_monthly_", "H2H"),
  ];

  return (
    <div>
      <h2 className="font-display mb-4 text-[13px] uppercase tracking-[0.2em] text-[--muted]">
        Hall of Fame
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {cards.length === 0 ? (
          <HofPlaceholder />
        ) : (
          cards.map((c) => <HofCardView key={c.key} card={c} />)
        )}
      </div>
    </div>
  );
}
