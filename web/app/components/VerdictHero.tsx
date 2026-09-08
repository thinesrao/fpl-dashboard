import type { verdict } from "@/lib/story";
import type { ResultsStatus } from "@/lib/results-status";
import { ShareHighlight } from "./ShareHighlight";

function StatusChip({ status }: { status: ResultsStatus }) {
  const cls = status.final
    ? "border-[rgba(198,255,0,0.4)] bg-[rgba(198,255,0,0.12)] text-[--lime]"
    : "border-[rgba(255,210,63,0.4)] bg-[rgba(255,210,63,0.12)] text-[--gold]";
  return (
    <span
      title={status.detail}
      className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide " + cls}
    >
      <span className={"h-1.5 w-1.5 rounded-full " + (status.final ? "bg-[--lime]" : "bg-[--gold]")} aria-hidden />
      {status.final ? "Final" : "Provisional"}
    </span>
  );
}

export function VerdictHero({
  v,
  gameweek,
  status,
}: {
  v: ReturnType<typeof verdict>;
  gameweek: number;
  status: ResultsStatus;
}) {
  if (!v) {
    return (
      <section className="py-6">
        <p className="text-sm text-[--muted]">Awards land after gameweek 1.</p>
      </section>
    );
  }

  return (
    <section className="py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="font-display text-[13px] tracking-[0.22em] text-[--lime]">
          GAMEWEEK {gameweek} · THE VERDICT
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={status} />
          <ShareHighlight gameweek={gameweek} />
        </div>
      </div>
      <h1 className="font-display mt-2 text-[40px] leading-[0.9] uppercase sm:text-[60px]">
        <span>{v.manager} </span>
        <span className="text-[--pink]">{v.line}.</span>
      </h1>
      <div className="font-display mt-1.5 text-lg text-[--lime] sm:text-xl">
        {v.points} PTS — MANAGER OF THE WEEK 👑
      </div>
      {!status.final && (
        <div className="mt-1 text-xs text-[--muted]">Provisional — {status.detail.toLowerCase()}.</div>
      )}
    </section>
  );
}
