import { render, screen, waitFor } from "@testing-library/react";
import { LiveSection } from "./LiveSection";

test("renders nothing when not live", async () => {
  const fetcher = async () => ({ live: false });
  const { container } = render(<LiveSection fetcher={fetcher as any} />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test("renders the live leaderboard when live", async () => {
  const fetcher = async () => ({
    live: true, gameweek: 2,
    standings: [{ manager: "Alice", entry: 1, points: 68 }, { manager: "Bob", entry: 2, points: 54 }],
  });
  render(<LiveSection fetcher={fetcher as any} />);
  await waitFor(() => expect(screen.getByText(/LIVE/)).toBeInTheDocument());
  expect(screen.getByText(/GW2/)).toBeInTheDocument();
  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.getByText("68")).toBeInTheDocument();
});
