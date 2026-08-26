import { buildLivePayload } from "./route";

const deps = {
  leagueId: 218144,
  currentGameweek: async () => ({ id: 2, finished: false }),
  gameweekFixtures: async () => [{ started: true, finished_provisional: false }],
  livePointsById: async () => ({ 10: 6 }),
  leagueEntries: async () => [{ entry: 1, name: "Alice" }],
  entryPicks: async () => [{ element: 10, multiplier: 2 }],
};

test("returns live standings when a gameweek is in progress", async () => {
  const payload = await buildLivePayload(deps);
  expect(payload).toEqual({
    live: true, gameweek: 2, standings: [{ manager: "Alice", entry: 1, points: 12 }],
  });
});

test("returns {live:false} when no current gameweek", async () => {
  expect(await buildLivePayload({ ...deps, currentGameweek: async () => null })).toEqual({ live: false });
});

test("returns {live:false} when fixtures are not in progress", async () => {
  const payload = await buildLivePayload({
    ...deps, gameweekFixtures: async () => [{ started: true, finished_provisional: true }],
  });
  expect(payload).toEqual({ live: false });
});
