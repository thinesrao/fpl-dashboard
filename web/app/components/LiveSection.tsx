"use client";
import { useEffect, useState } from "react";

type LiveRow = { manager: string; entry: number; points: number };
type LivePayload = { live: false } | { live: true; gameweek: number; standings: LiveRow[] };

async function defaultFetcher(): Promise<LivePayload> {
  const res = await fetch("/api/live");
  return res.json();
}

export function LiveSection({ fetcher = defaultFetcher }: { fetcher?: () => Promise<LivePayload> }) {
  const [data, setData] = useState<LivePayload>({ live: false });

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const payload = await fetcher();
        if (active) setData(payload);
      } catch {
        /* keep last state */
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { active = false; clearInterval(id); };
  }, [fetcher]);

  if (!data.live) return null;

  return (
    <div className="mt-4 rounded-2xl border border-[rgba(255,77,109,0.28)] bg-[rgba(255,77,109,0.05)] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#ff8ba3]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[--live]" aria-hidden />
        LIVE · GW{data.gameweek}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.standings.map((r, i) => (
          <div key={r.entry} className="flex items-center justify-between rounded-lg border border-[--line] bg-[--panel] px-3 py-2">
            <span className="text-sm"><span className="text-[--muted]">{i + 1}.</span> {r.manager}</span>
            <span className="font-display text-sm">{r.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
