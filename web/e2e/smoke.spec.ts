import { test, expect } from "@playwright/test";

// Runs against the committed fixture (web/fixtures/dashboard.sample.json,
// served by lib/data.ts when no live env is configured) via the dev server
// started by playwright.config.ts. Exercises the single-scroll story IA:
// header brand, verdict headline, race board, trophy cabinet, and the two
// tap-through overlays (trophy detail, manager profile).

test("dashboard renders the story IA and both overlays open", async ({ page }) => {
  await page.goto("/");

  // Header brand.
  await expect(page.getByText("PEPROULETTE")).toBeVisible();

  // Verdict headline names the fixture's GW1 manager-of-the-week.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Matthew Mohan");

  // Race board lists managers from classic_league_standings.
  await expect(page.getByRole("heading", { name: "The race" })).toBeVisible();
  const raceRow = page.getByRole("button", { name: /Danish Aziz/ }).first();
  await expect(raceRow).toBeVisible();

  // Trophy cabinet shows the fixture's Golden Boot coin.
  await expect(page.getByText(/trophy cabinet/i)).toBeVisible();
  const goldenBootCoin = page.getByRole("button", { name: /Golden Boot/ }).first();
  await expect(goldenBootCoin).toBeVisible();

  // Clicking a trophy coin opens its detail overlay.
  await goldenBootCoin.click();
  await expect(page.getByRole("heading", { name: "Golden Boot" })).toBeVisible();
  await expect(page.getByText("1. Faiz Rahman")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Golden Boot" })).toBeHidden();

  // Clicking a manager name in the race board opens their profile overlay.
  await raceRow.click();
  await expect(page.getByRole("heading", { name: "Danish Aziz" })).toBeVisible();
  await expect(page.getByText(/Rank 1/)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Danish Aziz" })).toBeHidden();
});
