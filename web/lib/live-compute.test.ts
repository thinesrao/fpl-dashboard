import { isGameweekLive, computeLiveStandings } from "./live-compute";

test("isGameweekLive: true when a fixture started and not all finished", () => {
  expect(isGameweekLive([{ started: true, finished_provisional: false }])).toBe(true);
  expect(isGameweekLive([{ started: true, finished_provisional: true }])).toBe(false);
  expect(isGameweekLive([{ started: false, finished_provisional: false }])).toBe(false);
  expect(isGameweekLive([])).toBe(false);
});

test("computeLiveStandings sums multiplier×points and sorts desc", () => {
  const entries = [{ entry: 1, name: "Alice" }, { entry: 2, name: "Bob" }];
  const picks = {
    1: [{ element: 10, multiplier: 2 }, { element: 11, multiplier: 1 }, { element: 99, multiplier: 0 }],
    2: [{ element: 10, multiplier: 1 }],
  };
  const live = { 10: 6, 11: 2, 99: 5 };
  expect(computeLiveStandings(entries, picks, live)).toEqual([
    { manager: "Alice", entry: 1, points: 14 }, // 2*6 + 1*2 + 0*5
    { manager: "Bob", entry: 2, points: 6 },    // 1*6
  ]);
});

test("computeLiveStandings tolerates missing picks/points", () => {
  const out = computeLiveStandings([{ entry: 3, name: "Cara" }], {}, {});
  expect(out).toEqual([{ manager: "Cara", entry: 3, points: 0 }]);
});
