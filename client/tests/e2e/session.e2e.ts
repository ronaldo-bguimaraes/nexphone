import { expect, test } from "@playwright/test";

const enabled = process.env.NEXPHONE_E2E === "1";

test.skip(!enabled, "Set NEXPHONE_E2E=1 with a running deployment to execute browser tests.");

test("pairs and displays the remote screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "NexPhone" })).toBeVisible();
  await expect(page.getByLabel("Pairing code")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect" })).toBeDisabled();
});

test("rejects a malformed pairing code", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Pairing code");
  await input.fill("1234");
  await expect(page.getByRole("button", { name: "Connect" })).toBeDisabled();
});
