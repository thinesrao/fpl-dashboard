"use client";
import { useEffect, useRef, useState } from "react";

type LiveRow = { manager: string; entry: number; points: number };
type LivePayload = { live: false } | { live: true; gameweek: number; standings: LiveRow[] };

async function defaultFetcher(): Promise<LivePayload> {
  const res = await fetch("/api/live");
  return res.json();
}

export function LiveSection({
  fetcher = defaultFetcher,
  highlight,
  liveIntervalMs = 60_000,
  idleIntervalMs = 300_000,
}: {
  fetcher?: () => Promise<LivePayload>;
  highlight?: string;
  liveIntervalMs?: number;
  idleIntervalMs?: number;
}) {
  const [data, setData] = useState<LivePayload>({ live: false });
  // Poll faster while a gameweek is live, slower otherwise (just to catch
  // matches kicking off). Read via a ref so the scheduler always sees the
  // latest state without re-running the effect.
  const liveRef = useRef(false);
  liveRef.current = data.live;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const schedule = () => {
      clear();
      // Don't poll while the tab is hidden — the visibility handler resumes it.
      if (cancelled || document.visibilityState === "hidden") return;
      timer = setTimeout(run, liveRef.current ? liveIntervalMs : idleIntervalMs);
    };

    const run = async () => {
      try {
        const payload = await fetcher();
        if (!cancelled) setData(payload);
      } catch {
        /* keep last state */
      }
      schedule();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
      else clear();
    };

    // Don't fetch on mount if opened in a background tab — the visibility
    // handler kicks off the first fetch when it becomes visible.
    if (document.visibilityState !== "hidden") run();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetcher, liveIntervalMs, idleIntervalMs]);

  if (!data.live) return null;

  return (
    <div className="mt-4 rounded-2xl border border-[rgba(255,77,109,0.28)] bg-[rgba(255,77,109,0.05)] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#ff8ba3]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[--live]" aria-hidden />
        LIVE · GW{data.gameweek}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.standings.map((r, i) => {
          const isMe = Boolean(highlight) && r.manager === highlight;
          return (
            <div
              key={r.entry}
              data-highlighted={isMe ? "true" : undefined}
              className={
                "flex items-center justify-between rounded-lg border px-3 py-2 " +
                (isMe
                  ? "border-[--accent] bg-[rgba(43,252,164,0.12)]"
                  : "border-[--line] bg-[--panel]")
              }
            >
              <span className="text-sm">
                <span className="text-[--muted]">{i + 1}.</span>{" "}
                <span className={isMe ? "font-semibold text-[--accent]" : ""}>{r.manager}</span>
              </span>
              <span className="font-display text-sm">{r.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
