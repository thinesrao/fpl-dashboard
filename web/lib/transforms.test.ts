import { toNum, topStandings, gwColumns, cumulativeSeries, awardLeader } from "./transforms";

test("toNum coerces strings and null", () => {
  expect(toNum("7")).toBe(7);
  expect(toNum(7)).toBe(7);
  expect(toNum(null)).toBe(0);
  expect(toNum("x")).toBe(0);
});

test("topStandings maps and truncates preserving order", () => {
  const rows = [
    { Manager: "A", Total: "212" },
    { Manager: "B", Total: 199 },
    { Manager: "C", Total: 191 },
  ];
  expect(topStandings(rows, "Total", 2)).toEqual([
    { manager: "A", value: 212 },
    { manager: "B", value: 199 },
  ]);
});

test("gwColumns returns sorted GW keys", () => {
  expect(gwColumns({ Manager: "A", GW2: 1, GW10: 2, GW1: 0 })).toEqual(["GW1", "GW2", "GW10"]);
});

test("cumulativeSeries accumulates per manager by gameweek", () => {
  const rows = [
    { Manager: "A", GW1: 2, GW2: 3 },
    { Manager: "B", GW1: 1, GW2: 1 },
  ];
  expect(cumulativeSeries(rows)).toEqual([
    { gameweek: 1, A: 2, B: 1 },
    { gameweek: 2, A: 5, B: 2 },
  ]);
});

test("awardLeader returns leader and gap to second", () => {
  const rows = [
    { Standings: 1, Team: "T", Manager: "A", Goals: 7 },
    { Standings: 2, Team: "U", Manager: "B", Goals: 5 },
  ];
  expect(awardLeader(rows)).toEqual({ manager: "A", score: 7, gap: 2 });
  expect(awardLeader([])).toBeNull();
});
