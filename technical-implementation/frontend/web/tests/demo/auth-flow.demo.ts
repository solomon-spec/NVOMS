import { expect, test } from "@playwright/test";

import {
  clickWithPointer,
  demoPassword,
  loginAs,
  logoutFromUserMenu,
  pause,
  silenceExpectedLoginErrors,
  type DemoRole,
} from "./helpers";

type RoleDemo = {
  label: string;
  role: DemoRole;
  landingLink: string;
  visibleLinks: string[];
};

const seededRoles: RoleDemo[] = [
  {
    label: "Administrator",
    role: "ADMIN",
    landingLink: "Admin Console",
    visibleLinks: ["Dashboard", "Patients", "Immunizations", "Reports", "Admin Console"],
  },
  {
    label: "Health Worker",
    role: "HEALTH_WORKER",
    landingLink: "Offline Queue",
    visibleLinks: ["Today", "Patients", "Immunizations", "Case Reports", "Offline Queue"],
  },
  {
    label: "Public Health Official",
    role: "PUBLIC_HEALTH_OFFICIAL",
    landingLink: "Public Health Hub",
    visibleLinks: ["Dashboard", "Public Health Hub", "Case Reports", "Reports"],
  },
  {
    label: "Patient",
    role: "PATIENT",
    landingLink: "My Vaccination Card",
    visibleLinks: ["My Vaccination Card", "QR ID", "Upcoming Doses", "Alerts"],
  },
  {
    label: "Caregiver",
    role: "CAREGIVER",
    landingLink: "My Vaccination Card",
    visibleLinks: ["My Vaccination Card", "QR ID", "Upcoming Doses", "Alerts"],
  },
];

test.describe("NVOMS auth and role navigation demo", () => {
  test("walks through login, role-specific navigation, and logout for every seeded role", async ({
    page,
  }) => {
    await silenceExpectedLoginErrors(page);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in to NVOMS" })).toBeVisible();
    await pause(page, 1500);

    await reviewPasswordRecoveryScreens(page);
    await reviewLoginFailureCases(page);

    for (const role of seededRoles) {
      await loginAs(page, role.role);
      await reviewRoleWorkspace(page, role);
      await logoutFromUserMenu(page);
    }
  });
});

async function reviewPasswordRecoveryScreens(page: import("@playwright/test").Page) {
  await clickWithPointer(page, page.getByRole("link", { name: "Forgot password?" }));
  await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
  await pause(page, 1200);
  await page.locator('input[name="email"]').pressSequentially("unknown@nvoms.local", {
    delay: 45,
  });
  await pause(page, 500);
  await clickWithPointer(page, page.getByRole("button", { name: "Send Reset Link" }));
  await expect(page.getByText("Check your inbox")).toBeVisible();
  await pause(page, 1600);

  await page.goto("/reset-password/demo-invalid-token");
  await expect(page.getByRole("heading", { name: "Set New Password" })).toBeVisible();
  await page.getByPlaceholder("Enter new password").pressSequentially("password123", {
    delay: 45,
  });
  await pause(page, 300);
  await page.getByPlaceholder("Repeat new password").pressSequentially("different123", {
    delay: 45,
  });
  await pause(page, 400);
  await clickWithPointer(page, page.getByRole("button", { name: "Set Password" }));
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await pause(page, 1400);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to NVOMS" })).toBeVisible();
}

async function reviewLoginFailureCases(page: import("@playwright/test").Page) {
  await clickWithPointer(page, page.getByRole("button", { name: "Sign In" }));
  await expect(
    page.getByText("Enter both your work email and password to continue."),
  ).toBeVisible();
  await pause(page, 1600);

  await page.locator('input[name="email"]').pressSequentially("wrong-password-demo@nvoms.local", {
    delay: 45,
  });
  await pause(page, 300);
  await page.locator('input[name="password"]').pressSequentially("wrong-password", {
    delay: 60,
  });
  await pause(page, 600);
  await clickWithPointer(page, page.getByRole("button", { name: "Sign In" }));
  await expect(
    page.getByRole("main").getByText("The email or password is incorrect."),
  ).toBeVisible();
  await pause(page, 1800);

  await clearLoginForm(page);

  await page.locator('input[name="email"]').pressSequentially("unknown@nvoms.local", {
    delay: 45,
  });
  await pause(page, 300);
  await page.locator('input[name="password"]').pressSequentially(demoPassword, {
    delay: 60,
  });
  await pause(page, 600);
  await clickWithPointer(page, page.getByRole("button", { name: "Sign In" }));
  await expect(
    page.getByRole("main").getByText("The email or password is incorrect."),
  ).toBeVisible();
  await pause(page, 1800);

  await clearLoginForm(page);
}

async function reviewRoleWorkspace(
  page: import("@playwright/test").Page,
  role: RoleDemo,
) {
  for (const linkName of role.visibleLinks) {
    await expect(page.getByRole("link", { name: linkName })).toBeVisible();
  }

  await pause(page, 1200);
  await clickWithPointer(page, page.getByRole("link", { name: role.landingLink }));

  await expect(page.getByRole("heading", { name: role.landingLink })).toBeVisible();
  await pause(page, 1800);
}

async function clearLoginForm(page: import("@playwright/test").Page) {
  await page.locator('input[name="email"]').fill("");
  await page.locator('input[name="password"]').fill("");
  await pause(page, 700);
}
