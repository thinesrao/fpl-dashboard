export function AwardCard({
  title, suffix, leader,
}: { title: string; suffix: string; leader: { manager: string; score: number; gap: number } | null }) {
  const has = leader && leader.score > 0;
  return (
    <div className="rounded-2xl border border-[--line] p-4"
         style={{ background: "linear-gradient(180deg,var(--panel),var(--panel2))" }}>
      <p className="text-xs font-semibold text-[--muted]">{title}</p>
      <p className="font-display my-2 text-base">{has ? leader!.manager : "N/A"}</p>
      <p className="text-xs font-bold text-[--accent]">
        {has ? `${leader!.score} ${suffix}` : `0 ${suffix}`}
      </p>
      {has && leader!.gap > 0 && <p className="text-[11px] text-[--muted]">{leader!.gap} ahead</p>}
    </div>
  );
}
