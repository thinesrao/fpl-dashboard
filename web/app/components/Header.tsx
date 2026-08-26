import Link from "next/link";

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
}

export function Header({ gameweek, lastUpdated }: { gameweek: number; lastUpdated: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[--line] bg-[rgba(11,15,20,0.72)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5">
        <div className="flex items-center gap-2.5 font-display text-lg">
          <span
            className="h-7 w-7 rounded-lg"
            style={{ background: "conic-gradient(from 210deg,var(--accent),#39a0ff,var(--accent))" }}
            aria-hidden
          />
          PepRoulette™
        </div>
        <div className="flex-1" />
        <div className="text-xs text-[--muted]">
          <b className="text-[--ink]">Gameweek {gameweek}</b> · updated {formatUpdated(lastUpdated)} (UTC)
        </div>
        <Link href="/admin/login" className="ml-4 text-xs text-[--muted] hover:text-[--accent]">
          Admin
        </Link>
      </div>
    </header>
  );
}
