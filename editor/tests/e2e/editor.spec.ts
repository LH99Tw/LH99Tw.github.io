import { test, expect } from "@playwright/test";

test.describe.skip("editor e2e", () => {
  test("sidebar + preview smoke", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".editor-sidebar")).toBeVisible();
    await expect(page.locator(".preview-pane")).toBeVisible();
  });
});
