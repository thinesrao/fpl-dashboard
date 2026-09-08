import { monthlySheets, isMonthComplete } from "./monthly";
import type { DashboardData } from "./types";

const data: DashboardData = {
  sheets: {
    classic_monthly_august: [{ Standings: 1, Aug: 10 }],
    classic_monthly_september: [{ Standings: 1, Sep: 12 }],
  },
  meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
};

test("monthlySheets returns latest month first with title-cased labels", () => {
  const out = monthlySheets(data, "classic_monthly_");
  expect(out.map((m) => m.label)).toEqual(["September", "August"]);
  expect(out[0].rows[0].Sep).toBe(12);
});

test("monthlySheets returns empty when no matching sheets", () => {
  expect(monthlySheets(data, "h2h_monthly_")).toEqual([]);
});

test("isMonthComplete is false mid-month and true once the last GW finishes", () => {
  expect(isMonthComplete("August", 2)).toBe(false); // August ends at GW3
  expect(isMonthComplete("August", 3)).toBe(true);
  expect(isMonthComplete("august", 5)).toBe(true); // case-insensitive
});

test("isMonthComplete defaults unknown months to complete", () => {
  expect(isMonthComplete("Juneuary", 1)).toBe(true);
});

test("isMonthComplete prefers the live monthLastGw map over the fallback", () => {
  // Real 2026/27: August ends at GW2 (GW3 deadline is September). The live map
  // must win over the hardcoded fallback (which says GW3).
  const map = { August: 2, September: 5 };
  expect(isMonthComplete("August", 2, map)).toBe(true); // final by the real calendar
  expect(isMonthComplete("September", 4, map)).toBe(false);
  expect(isMonthComplete("september", 5, map)).toBe(true); // case-insensitive
});
