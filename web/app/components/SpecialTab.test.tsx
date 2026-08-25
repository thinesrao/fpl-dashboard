import { render, screen } from "@testing-library/react";
import { SpecialTab } from "./SpecialTab";
import type { DashboardData } from "@/lib/types";

const data: DashboardData = {
  sheets: {
    golden_boot: [
      { Standings: 1, Team: "A", Manager: "Faiz", Goals: 7 },
      { Standings: 2, Team: "B", Manager: "Wei", Goals: 5 },
    ],
  },
  meta: { lastFinishedGw: 3, lastUpdatedUtc: "" },
};

test("renders an award card with leader and gap", () => {
  render(<SpecialTab data={data} />);
  expect(screen.getByText("🥇 Golden Boot")).toBeInTheDocument();
  expect(screen.getByText("Faiz")).toBeInTheDocument();
  expect(screen.getByText(/7 Goals/)).toBeInTheDocument();
});
