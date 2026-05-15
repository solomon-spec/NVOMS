import { expect, test } from "@playwright/test";

import { clickWithPointer, loginAs, pause } from "./helpers";

test.describe("NVOMS Patient Self-Service Demo", () => {
  test("walks through patient portal features", async ({ page }) => {
    await loginAs(page, "PATIENT");

    await clickWithPointer(page, page.getByRole("link", { name: "My Vaccination Card" }));
    await expect(page.getByRole("heading", { name: "My Vaccination Card" })).toBeVisible();
    await pause(page, 2000);

    await clickWithPointer(page, page.getByRole("link", { name: "Upcoming Doses" }));
    await expect(page.getByRole("heading", { name: "Vaccination Timeline" })).toBeVisible();
    await pause(page, 2000);

    await clickWithPointer(page, page.getByRole("link", { name: "Alerts" }));
    await expect(page.getByRole("heading", { name: "Alerts", exact: true })).toBeVisible();
    await pause(page, 2000);

    await clickWithPointer(page, page.getByRole("link", { name: "QR ID" }));
    await expect(page.getByRole("heading", { name: "QR ID" })).toBeVisible();
    await pause(page, 3000);
  });
});
