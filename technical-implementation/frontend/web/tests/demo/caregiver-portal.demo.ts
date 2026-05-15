import { expect, test } from "@playwright/test";

import { clickWithPointer, loginAs, pause } from "./helpers";

test.describe("NVOMS Caregiver Portal Demo", () => {
  test("walks through caregiver dependent selection and schedule views", async ({
    page,
  }) => {
    await loginAs(page, "CAREGIVER");

    await clickWithPointer(page, page.getByRole("link", { name: "My Vaccination Card" }));
    await expect(page.getByRole("heading", { name: "My Vaccination Card" })).toBeVisible();
    await expect(page.getByText("Viewing Record For")).toBeVisible();
    await pause(page, 1800);

    await clickWithPointer(page, page.getByRole("link", { name: "Upcoming Doses" }));
    await expect(page.getByRole("heading", { name: "Vaccination Timeline" })).toBeVisible();
    await expect(page.getByText("Viewing Record For")).toBeVisible();
    await pause(page, 2000);

    await clickWithPointer(page, page.getByRole("link", { name: "Alerts" }));
    await expect(page.getByRole("heading", { name: "Alerts", exact: true })).toBeVisible();
    await pause(page, 2000);
  });
});
