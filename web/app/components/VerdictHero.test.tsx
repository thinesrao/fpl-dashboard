import { render, screen } from "@testing-library/react";
import { VerdictHero } from "./VerdictHero";
import type { ResultsStatus } from "@/lib/results-status";

const FINAL: ResultsStatus = { final: true, label: "Final result", detail: "Bonus & penalties confirmed" };
const PROVISIONAL: ResultsStatus = { final: false, label: "Provisional", detail: "Bonus points pending" };

test("renders the manager, line and points when a verdict is present", () => {
  render(<VerdictHero v={{ manager: "Mohan", points: 85, line: "runs it" }} gameweek={1} status={FINAL} />);
  expect(screen.getByText(/Mohan/)).toBeInTheDocument();
  expect(screen.getByText(/runs it/)).toBeInTheDocument();
  expect(screen.getByText(/85/)).toBeInTheDocument();
  expect(screen.getByText(/MANAGER OF THE WEEK/i)).toBeInTheDocument();
  expect(screen.getByText(/GAMEWEEK 1/)).toBeInTheDocument();
});

test("shows a Final chip when results are final", () => {
  render(<VerdictHero v={{ manager: "Mohan", points: 85, line: "runs it" }} gameweek={1} status={FINAL} />);
  expect(screen.getByText("Final")).toBeInTheDocument();
});

test("shows a Provisional chip and reason when results aren't final yet", () => {
  render(<VerdictHero v={{ manager: "Mohan", points: 85, line: "runs it" }} gameweek={2} status={PROVISIONAL} />);
  expect(screen.getByText("Provisional")).toBeInTheDocument();
  expect(screen.getByText(/bonus points pending/i)).toBeInTheDocument();
});

test("renders a compact empty state when there is no verdict yet", () => {
  render(<VerdictHero v={null} gameweek={1} status={PROVISIONAL} />);
  expect(screen.queryByText(/MANAGER OF THE WEEK/i)).not.toBeInTheDocument();
  expect(screen.getByText(/awards/i)).toBeInTheDocument();
});
