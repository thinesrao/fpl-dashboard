import { render, screen, waitFor } from "@testing-library/react";
import { LiveSection } from "./LiveSection";

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

const livePayload = {
  live: true as const,
  gameweek: 2,
  standings: [
    { manager: "Alice", entry: 1, points: 68 },
    { manager: "Bob", entry: 2, points: 54 },
  ],
};

test("renders nothing when not live", async () => {
  const fetcher = async () => ({ live: false as const });
  const { container } = render(<LiveSection fetcher={fetcher} />);
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test("renders the live leaderboard when live", async () => {
  const fetcher = async () => livePayload;
  render(<LiveSection fetcher={fetcher} />);
  await waitFor(() => expect(screen.getByText(/LIVE/)).toBeInTheDocument());
  expect(screen.getByText(/GW2/)).toBeInTheDocument();
  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.getByText("68")).toBeInTheDocument();
});

test("highlights the selected manager's row", async () => {
  const fetcher = async () => livePayload;
  render(<LiveSection fetcher={fetcher} highlight="Alice" />);
  await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
  expect(screen.getByText("Alice").closest('[data-highlighted="true"]')).not.toBeNull();
  expect(screen.getByText("Bob").closest('[data-highlighted="true"]')).toBeNull();
});

test("polls repeatedly while live, then pauses when the tab is hidden", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return livePayload;
  };
  render(<LiveSection fetcher={fetcher} liveIntervalMs={20} idleIntervalMs={20} />);
  await waitFor(() => expect(calls).toBeGreaterThan(1), { timeout: 1000 });

  // Hide the tab — polling should stop.
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
  await new Promise((r) => setTimeout(r, 40)); // let any in-flight poll settle
  const settled = calls;
  await new Promise((r) => setTimeout(r, 80)); // would be several more intervals if still polling
  expect(calls).toBe(settled);

  // Restore for other tests.
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});
