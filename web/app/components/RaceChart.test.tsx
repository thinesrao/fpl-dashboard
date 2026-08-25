import { render, screen } from "@testing-library/react";
import { RaceChart } from "./RaceChart";

test("renders title and manager labels", () => {
  render(
    <RaceChart
      title="Classic League"
      caption="Total points"
      rows={[{ manager: "A", value: 212 }, { manager: "B", value: 199 }]}
    />
  );
  expect(screen.getByText("Classic League")).toBeInTheDocument();
  expect(screen.getByText("Total points")).toBeInTheDocument();
});
