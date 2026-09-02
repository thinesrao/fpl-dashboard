import Link from "next/link";

function formatUpdated(iso: string): string {
  // The pipeline writes a UTC timestamp that may lack a 'Z' suffix. Treat a
  // bare (offset-less) value as UTC so the conversion to MYT is correct
  // regardless of the runtime's own timezone.
  const hasTz = /[zZ]$|[+-]\d\d:?\d\d$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur",
  });
}

export function Header({ gameweek, lastUpdated }: { gameweek: number; lastUpdated: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[--line] bg-[rgba(10,10,15,0.82)] backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-5xl items-center gap-3.5 px-5">
        <img src="/logo-mark.png" alt="PepRoulette" className="h-9 w-auto" />
        <div className="font-display text-xl tracking-wide">
          <span className="text-[--ink]">PEP</span>
          <span className="text-[--pink]">ROULETTE</span>
        </div>
        <div className="flex-1" />
        <div className="text-xs text-[--muted]">
          <b className="text-[--ink]">Gameweek {gameweek}</b> · updated {formatUpdated(lastUpdated)} (MYT)
        </div>
        <Link href="/admin/login" className="text-xs text-[--muted] hover:text-[--ink]">
          Admin
        </Link>
      </div>
    </header>
  );
}
