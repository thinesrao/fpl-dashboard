import type { verdict } from "@/lib/story";
import { ShareHighlight } from "./ShareHighlight";

export function VerdictHero({
  v,
  gameweek,
}: {
  v: ReturnType<typeof verdict>;
  gameweek: number;
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
        <ShareHighlight gameweek={gameweek} />
      </div>
      <h1 className="font-display mt-2 text-[40px] leading-[0.9] uppercase sm:text-[60px]">
        <span>{v.manager} </span>
        <span className="text-[--pink]">{v.line}.</span>
      </h1>
      <div className="font-display mt-1.5 text-lg text-[--lime] sm:text-xl">
        {v.points} PTS — MANAGER OF THE WEEK 👑
      </div>
    </section>
  );
}
