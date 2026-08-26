import { NextResponse } from "next/server";
import { isGameweekLive, computeLiveStandings, type Fixture, type LeagueEntry } from "@/lib/live-compute";
import * as fpl from "@/lib/fpl";

export const revalidate = 60;

export type LivePayload =
  | { live: false }
  | { live: true; gameweek: number; standings: { manager: string; entry: number; points: number }[] };

type Deps = {
  leagueId: number;
  currentGameweek: () => Promise<{ id: number; finished: boolean } | null>;
  gameweekFixtures: (gw: number) => Promise<Fixture[]>;
  livePointsById: (gw: number) => Promise<Record<number, number>>;
  leagueEntries: (leagueId: number) => Promise<LeagueEntry[]>;
  entryPicks: (entry: number, gw: number) => Promise<{ element: number; multiplier: number }[]>;
};

export async function buildLivePayload(deps: Deps): Promise<LivePayload> {
  const current = await deps.currentGameweek();
  if (!current) return { live: false };

  const fixtures = await deps.gameweekFixtures(current.id);
  if (!isGameweekLive(fixtures)) return { live: false };

  const [live, entries] = await Promise.all([
    deps.livePointsById(current.id),
    deps.leagueEntries(deps.leagueId),
  ]);
  const picksByEntry: Record<number, { element: number; multiplier: number }[]> = {};
  await Promise.all(
    entries.map(async (e) => {
      picksByEntry[e.entry] = await deps.entryPicks(e.entry, current.id);
    }),
  );

  return {
    live: true,
    gameweek: current.id,
    standings: computeLiveStandings(entries, picksByEntry, live),
  };
}

export async function GET() {
  const leagueId = Number(process.env.NEXT_PUBLIC_CLASSIC_LEAGUE_ID) || 218144;
  try {
    const payload = await buildLivePayload({ leagueId, ...fpl });
    return NextResponse.json(payload);
  } catch {
    // fail closed on the live overlay — never break the page
    return NextResponse.json({ live: false } satisfies LivePayload);
  }
}
