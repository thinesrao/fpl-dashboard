import { mapLivePoints } from "./fpl";

test("mapLivePoints builds an id→total_points map", () => {
  const elements = [
    { id: 1, stats: { total_points: 6 } },
    { id: 2, stats: { total_points: 0 } },
  ];
  expect(mapLivePoints(elements)).toEqual({ 1: 6, 2: 0 });
});
