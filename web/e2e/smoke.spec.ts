import { test, expect } from "@playwright/test";

test("dashboard renders the three tabs and switches", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("PepRoulette™")).toBeVisible();
  await expect(page.getByRole("button", { name: /Standard Awards/ })).toBeVisible();
  await page.getByRole("button", { name: /Special Awards/ }).click();
  await expect(page.getByText(/Golden Boot/)).toBeVisible();
});
