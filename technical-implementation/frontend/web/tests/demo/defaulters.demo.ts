import { expect, test } from "@playwright/test";

import { clickWithPointer, loginAs, pause } from "./helpers";

test.describe("NVOMS Defaulter Clusters demo", () => {
  test("shows defaulter cluster triage and links back to risk review", async ({ page }) => {
    await loginAs(page, "PUBLIC_HEALTH_OFFICIAL");

    await clickWithPointer(page, page.getByRole("link", { name: "Defaulter Clusters" }));
    await expect(page.getByRole("heading", { name: "Defaulter Clusters" })).toBeVisible();
    await expect(page.getByText("Total defaulters")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cluster worklist" })).toBeVisible();
    await pause(page, 900);

    await page.getByLabel("Minimum defaulters").fill("2");
    await pause(page, 450);
    await clickWithPointer(page, page.getByRole("button", { name: "Apply" }));
    await expect(page.getByRole("heading", { name: "Cluster worklist" })).toBeVisible();
    await pause(page, 900);

    const reviewLink = page.getByRole("link", { name: "Review" }).first();
    if (await reviewLink.isVisible()) {
      await clickWithPointer(page, reviewLink);
      await expect(page.getByRole("heading", { name: "Risk Map" })).toBeVisible();
    } else {
      await expect(page.getByText("No defaulter clusters meet the selected threshold.")).toBeVisible();
    }
    await pause(page, 900);
  });

  test("allows administrators to review defaulter clusters", async ({ page }) => {
    await loginAs(page, "ADMIN");

    await clickWithPointer(page, page.getByRole("link", { name: "Defaulter Clusters" }));
    await expect(page.getByRole("heading", { name: "Defaulter Clusters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cluster worklist" })).toBeVisible();
    await pause(page, 700);
  });
});
