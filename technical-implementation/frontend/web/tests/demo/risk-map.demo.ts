import { expect, test } from "@playwright/test";

import { clickWithPointer, loginAs, pause } from "./helpers";

test.describe("NVOMS Risk Map demo", () => {
  test("shows public health risk monitoring with filters and surveillance handoff", async ({ page }) => {
    await loginAs(page, "PUBLIC_HEALTH_OFFICIAL");

    await clickWithPointer(page, page.getByRole("link", { name: "Risk Map" }));
    await expect(page.getByRole("heading", { name: "Risk Map" })).toBeVisible();
    await expect(page.getByText("High-risk areas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational risk board" })).toBeVisible();
    await pause(page, 900);

    await page.getByLabel("Disease").pressSequentially("measles", { delay: 35 });
    await pause(page, 450);
    await clickWithPointer(page, page.getByRole("button", { name: "Apply" }));
    await expect(page.getByRole("heading", { name: "Operational risk board" })).toBeVisible();
    await pause(page, 900);

    await clickWithPointer(page, page.getByRole("button", { name: "Reset" }));
    await expect(page.getByRole("heading", { name: "Silent districts" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Active alerts" })).toBeVisible();
    await pause(page, 900);

    await clickWithPointer(page, page.getByRole("link", { name: "Open Surveillance" }));
    await expect(
      page.getByRole("heading", {
        name: "Monitor cases, follow-up actions, and outbreak alerts",
      }),
    ).toBeVisible();
    await pause(page, 900);
  });

  test("keeps health workers out of the public health risk map", async ({ page }) => {
    await loginAs(page, "HEALTH_WORKER");

    await page.goto("/risk-map");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await pause(page, 700);
  });
});
