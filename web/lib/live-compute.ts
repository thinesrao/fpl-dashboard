export type Fixture = { started: boolean; finished_provisional: boolean };

export function isGameweekLive(fixtures: Fixture[]): boolean {
  return fixtures.some((f) => f.started && !f.finished_provisional);
}

export type LeagueEntry = { entry: number; name: string };
type Pick = { element: number; multiplier: number };

// Live totals are computed from the deadline-locked picks and are a
// provisional approximation: a captain who doesn't play still counts x2,
// and auto-substitutions / vice-captain promotion only resolve once the
// gameweek is finalized.
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
