import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ShareHighlight } from "./ShareHighlight";

function clickShare() {
  fireEvent.click(screen.getByRole("button", { name: /share gameweek highlight/i }));
}

function mockPngFetch() {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => blob }) as unknown as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  // jsdom lacks object-URL support; stub it for the download path.
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // @ts-expect-error clean up the optional Web Share API we defined per-test
  delete navigator.share;
  // @ts-expect-error clean up the optional Web Share API we defined per-test
  delete navigator.canShare;
});

test("falls back to a file download when Web Share is unavailable", async () => {
  const fetchMock = mockPngFetch();
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<ShareHighlight gameweek={7} />);
  clickShare();

  await waitFor(() => expect(clickSpy).toHaveBeenCalledOnce());
  expect(fetchMock).toHaveBeenCalledWith("/api/highlight");
  expect(URL.createObjectURL).toHaveBeenCalledOnce();
});

test("opens the native share sheet with the PNG file when available", async () => {
  mockPngFetch();
  const share = vi.fn(async () => {});
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

  render(<ShareHighlight gameweek={7} />);
  clickShare();

  await waitFor(() => expect(share).toHaveBeenCalledOnce());
  const arg = share.mock.calls[0][0] as { files: File[] };
  expect(arg.files[0]).toBeInstanceOf(File);
  expect(arg.files[0].name).toBe("peproulette-gw7.png");
  // Native share used → no download fallback.
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test("a cancelled share sheet does not trigger a download fallback", async () => {
  mockPngFetch();
  const abort = Object.assign(new Error("cancelled"), { name: "AbortError" });
  Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn(async () => { throw abort; }) });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

  render(<ShareHighlight gameweek={7} />);
  clickShare();

  await waitFor(() => expect(navigator.share).toHaveBeenCalledOnce());
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
