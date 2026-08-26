import { render, screen } from "@testing-library/react";
import { PenaltyForm } from "./PenaltyForm";

test("renders gameweek, player, and event-type inputs with only the 2 manual penalty types", () => {
  render(<PenaltyForm players={["A.Becker (Liverpool)"]} action={async () => {}} />);
  expect(screen.getByLabelText(/gameweek/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/player/i)).toBeInTheDocument();
  const select = screen.getByLabelText(/event/i);
  expect(select).toBeInTheDocument();
  ["Penalty Scored", "Penalty Won"].forEach((t) =>
    expect(screen.getByRole("option", { name: t })).toBeInTheDocument()
  );
  expect(screen.queryByRole("option", { name: "Penalty Missed" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Penalty Saved" })).not.toBeInTheDocument();
});
