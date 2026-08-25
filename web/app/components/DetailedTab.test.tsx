import { render, screen } from "@testing-library/react";
import { DetailedTab } from "./DetailedTab";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    golden_boot: [
      { Standings: 1, Team: "A", Manager: "Faiz", Goals: 7, GW1: 3, GW2: 4 },
      { Standings: 2, Team: "B", Manager: "Wei", Goals: 5, GW1: 2, GW2: 3 },
    ],
  },
  meta: { lastFinishedGw: 2, lastUpdatedUtc: "" },
};

test("renders a collapsible award section with the award title", () => {
  render(<DetailedTab data={data} />);
  expect(screen.getByText(/Golden Boot/)).toBeInTheDocument();
  expect(screen.getByText("Faiz")).toBeInTheDocument();
});
