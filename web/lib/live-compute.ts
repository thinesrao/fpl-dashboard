export type Fixture = { started: boolean; finished_provisional: boolean };

export function isGameweekLive(fixtures: Fixture[]): boolean {
  if (fixtures.length === 0) return false;
  const anyStarted = fixtures.some((f) => f.started);
  const allFinished = fixtures.every((f) => f.finished_provisional);
  return anyStarted && !allFinished;
}

export type LeagueEntry = { entry: number; name: string };
type Pick = { element: number; multiplier: number };

export function computeLiveStandings(
  entries: LeagueEntry[],
  picksByEntry: Record<number, Pick[]>,
  livePointsById: Record<number, number>,
): { manager: string; entry: number; points: number }[] {
  return entries
    .map((e) => {
      const picks = picksByEntry[e.entry] ?? [];
      const points = picks.reduce(
        (sum, p) => sum + p.multiplier * (livePointsById[p.element] ?? 0),
        0,
      );
      return { manager: e.name, entry: e.entry, points };
    })
    .sort((a, b) => b.points - a.points || a.manager.localeCompare(b.manager));
}
