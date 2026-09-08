import { resultsStatus } from "./results-status";
import type { DashboardMeta } from "./types";

function meta(over: Partial<DashboardMeta>): DashboardMeta {
  return {
    lastFinishedGw: 2,
    lastUpdatedUtc: "",
    lastFinishedGwDataChecked: true,
    penaltiesReviewedThroughGw: 2,
    monthLastGw: {},
    ...over,
  };
}

test("final when bonus settled and penalties reviewed through the shown GW", () => {
  const s = resultsStatus(meta({}));
  expect(s.final).toBe(true);
  expect(s.label).toBe("Final result");
});

test("provisional when bonus points are still pending", () => {
  const s = resultsStatus(meta({ lastFinishedGwDataChecked: false }));
  expect(s.final).toBe(false);
  expect(s.detail).toMatch(/bonus/i);
});

test("provisional when penalties not yet reviewed through the shown GW", () => {
  const s = resultsStatus(meta({ penaltiesReviewedThroughGw: 1 }));
  expect(s.final).toBe(false);
  expect(s.detail).toMatch(/penalty/i);
});

test("provisional before any gameweek exists", () => {
  const s = resultsStatus(meta({ lastFinishedGw: 0, penaltiesReviewedThroughGw: 0 }));
  expect(s.final).toBe(false);
});
