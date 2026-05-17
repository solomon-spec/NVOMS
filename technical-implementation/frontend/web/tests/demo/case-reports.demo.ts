import { expect, test } from "@playwright/test";

import { clickWithPointer, loginAs, pause } from "./helpers";

test.describe("NVOMS Case Reports demo", () => {
  test("shows the case report work queue and creation entry point", async ({ page }) => {
    await loginAs(page, "HEALTH_WORKER");

    await clickWithPointer(page, page.getByRole("link", { name: "Case Reports" }));
    await expect(page.getByText("Case Reports").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Manage case reports and follow-up actions" })).toBeVisible();
    await expect(page.getByText("AEFI")).toBeVisible();
    await pause(page, 900);

    await clickWithPointer(page, page.getByRole("link", { name: "New report" }));
    await expect(page.getByRole("heading", { name: "Create case report" })).toBeVisible();
    await expect(page.getByLabel("Patient")).toBeVisible();
    await expect(page.getByText("Clinical Details")).toBeVisible();
    await pause(page, 900);
  });
});
