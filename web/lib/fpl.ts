import type { Fixture, LeagueEntry } from "./live-compute";

export const FPL_BASE = "https://fantasy.premierleague.com/api";

async function getJson(url: string, revalidate: number): Promise<unknown> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`FPL ${res.status} for ${url}`);
  return res.json();
}

export async function currentGameweek(): Promise<{ id: number; finished: boolean } | null> {
  const data = (await getJson(`${FPL_BASE}/bootstrap-static/`, 60)) as {
    events: { id: number; is_current: boolean; finished: boolean }[];
  };
  const ev = data.events.find((e) => e.is_current);
  return ev ? { id: ev.id, finished: ev.finished } : null;
}

export async function gameweekFixtures(gw: number): Promise<Fixture[]> {
  const data = (await getJson(`${FPL_BASE}/fixtures/?event=${gw}`, 60)) as Fixture[];
  return data.map((f) => ({ started: !!f.started, finished_provisional: !!f.finished_provisional }));
}

export function mapLivePoints(
  elements: { id: number; stats: { total_points: number } }[],
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const e of elements) out[e.id] = e.stats.total_points;
  return out;
}

export async function livePointsById(gw: number): Promise<Record<number, number>> {
  const data = (await getJson(`${FPL_BASE}/event/${gw}/live/`, 60)) as {
    elements: { id: number; stats: { total_points: number } }[];
  };
  return mapLivePoints(data.elements);
}

export async function leagueEntries(leagueId: number): Promise<LeagueEntry[]> {
  const data = (await getJson(`${FPL_BASE}/leagues-classic/${leagueId}/standings/`, 3600)) as {
    standings: { results: { entry: number; player_name: string }[] };
  };
  return data.standings.results.map((r) => ({ entry: r.entry, name: r.player_name }));
}

export async function entryPicks(entry: number, gw: number): Promise<{ element: number; multiplier: number }[]> {
  const data = (await getJson(`${FPL_BASE}/entry/${entry}/event/${gw}/picks/`, 3600)) as {
    picks: { element: number; multiplier: number }[];
  };
  return data.picks.map((p) => ({ element: p.element, multiplier: p.multiplier }));
}
