import { expect, test } from "@playwright/test";

import { clickWithPointer, loginAs, pause } from "./helpers";

test.describe("NVOMS Public Health Hub demo", () => {
  test("shows outbreak risk and missed dose layers in one hub", async ({ page }) => {
    await loginAs(page, "PUBLIC_HEALTH_OFFICIAL");

    await clickWithPointer(page, page.getByRole("link", { name: "Public Health Hub" }));
    await expect(page.getByRole("button", { name: "Outbreak Risk Layer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Outbreak Risk" })).toBeVisible();
    await expect(page.getByText("High-risk areas")).toBeVisible();
    await pause(page, 900);

    await page.getByLabel("Disease").pressSequentially("measles", { delay: 35 });
    await clickWithPointer(page, page.getByRole("button", { name: "Apply" }).first());
    await expect(page.getByRole("heading", { name: "Operational risk board" })).toBeVisible();
    await pause(page, 900);

    await clickWithPointer(page, page.getByRole("button", { name: "Missed Doses Layer" }));
    await expect(page.getByRole("heading", { name: "Missed Doses Clusters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cluster worklist" })).toBeVisible();
    await page.getByLabel("Minimum missed follow-ups").fill("2");
    await clickWithPointer(page, page.getByRole("button", { name: "Apply" }).first());
    await pause(page, 900);
  });

  test("keeps health workers out of public health monitoring", async ({ page }) => {
    await loginAs(page, "HEALTH_WORKER");

    await page.goto("/public-health");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await pause(page, 700);
  });
});
