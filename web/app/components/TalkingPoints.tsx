import type { TalkingPoint, talkingPoints } from "@/lib/story";

type Callout = {
  key: string;
  label: string;
  accent: "lime" | "pink" | "muted";
  point: TalkingPoint | null;
};

export function TalkingPoints({ tp }: { tp: ReturnType<typeof talkingPoints> }) {
  const callouts: Callout[] = [
    { key: "riser", label: "🔥 On the charge", accent: "lime", point: tp.riser },
    { key: "spoon", label: "🥄 Spoon watch", accent: "pink", point: tp.spoon },
    { key: "highest", label: "🚀 Highest GW", accent: "muted", point: tp.highest },
    { key: "badLuck", label: "😢 Bad luck", accent: "muted", point: tp.badLuck },
  ];

  const accentBorder: Record<Callout["accent"], string> = {
    lime: "border-[rgba(198,255,0,0.35)]",
    pink: "border-[rgba(255,46,147,0.35)]",
    muted: "border-[--line]",
  };
  const accentText: Record<Callout["accent"], string> = {
    lime: "text-[--lime]",
    pink: "text-[--pink]",
    muted: "text-[--muted]",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {callouts.map((c) =>
        c.point ? (
          <div
            key={c.key}
            className={`rounded-2xl border-[1.5px] ${accentBorder[c.accent]} bg-[--panel] p-3.5`}
          >
            <div className={`font-display text-[11px] uppercase tracking-wide ${accentText[c.accent]}`}>
              {c.label}
            </div>
            <div className="mt-1.5 text-sm font-extrabold text-[--ink]">{c.point.manager}</div>
            <div className="mt-0.5 text-xs text-[--muted]">{c.point.detail}</div>
          </div>
        ) : null
      )}
    </div>
  );
}
