import { expect, type Locator, type Page } from "@playwright/test";

export const demoPassword = "password123";

export const demoAccounts = {
  ADMIN: {
    email: "admin@nvoms.local",
    roleLabel: "ADMIN",
  },
  HEALTH_WORKER: {
    email: "hw@nvoms.local",
    roleLabel: "HEALTH_WORKER",
  },
  PUBLIC_HEALTH_OFFICIAL: {
    email: "pho@nvoms.local",
    roleLabel: "PUBLIC_HEALTH_OFFICIAL",
  },
  PATIENT: {
    email: "patient@nvoms.local",
    roleLabel: "PATIENT",
  },
  CAREGIVER: {
    email: "caregiver@nvoms.local",
    roleLabel: "CAREGIVER",
  },
} as const;

export type DemoRole = keyof typeof demoAccounts;

export const pause = (page: Page, ms = 600) => page.waitForTimeout(Math.min(ms, 650));

export async function silenceExpectedLoginErrors(page: Page) {
  await page.addInitScript(() => {
    window.console.error = window.console.warn.bind(window.console);
  });
  await page
    .evaluate(() => {
      window.console.error = window.console.warn.bind(window.console);
    })
    .catch(() => undefined);
}

export async function loginAs(page: Page, role: DemoRole) {
  const account = demoAccounts[role];

  await silenceExpectedLoginErrors(page);
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to NVOMS" })).toBeVisible();
  await pause(page, 1000);

  await page.locator('input[name="email"]').fill("");
  await page.locator('input[name="email"]').pressSequentially(account.email, {
    delay: 45,
  });
  await pause(page, 350);
  await page.locator('input[name="password"]').fill("");
  await page.locator('input[name="password"]').pressSequentially(demoPassword, {
    delay: 65,
  });
  await pause(page, 600);

  await clickWithPointer(page, page.getByRole("button", { name: "Sign In" }));
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByText(`You are logged in as ${account.roleLabel}.`)).toBeVisible();
  await pause(page, 1200);
}

export async function logoutFromUserMenu(page: Page) {
  const sidebarLogout = page.getByRole("button", { name: "Log out" });
  if (await sidebarLogout.isVisible()) {
    await clickWithPointer(page, sidebarLogout);
  } else {
    await clickWithPointer(page, page.locator(".dropdown-toggle").first());
    await pause(page, 500);
    await clickWithPointer(page, page.getByText("Sign out", { exact: true }).first());
  }

  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("heading", { name: "Sign in to NVOMS" })).toBeVisible();
  await pause(page, 1200);
}

export async function clickWithPointer(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();

  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 18,
    });
    await pause(page, 120);
  }

  await locator.click();
}
