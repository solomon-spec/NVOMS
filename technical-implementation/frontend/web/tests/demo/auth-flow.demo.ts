import { expect, type Locator, type Page, test } from '@playwright/test';

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

type RoleDemo = {
  label: string;
  email: string;
  role: string;
  landingLink: string;
  visibleLinks: string[];
};

const seededRoles: RoleDemo[] = [
  {
    label: 'Administrator',
    email: 'admin@nvoms.local',
    role: 'ADMIN',
    landingLink: 'Admin Console',
    visibleLinks: ['Dashboard', 'Patients', 'Immunizations', 'Reports', 'Admin Console'],
  },
  {
    label: 'Health Worker',
    email: 'hw@nvoms.local',
    role: 'HEALTH_WORKER',
    landingLink: 'Offline Queue',
    visibleLinks: ['Today', 'Patients', 'Immunizations', 'Surveillance', 'Offline Queue'],
  },
  {
    label: 'Public Health Official',
    email: 'pho@nvoms.local',
    role: 'PUBLIC_HEALTH_OFFICIAL',
    landingLink: 'Risk Map',
    visibleLinks: ['Dashboard', 'Risk Map', 'Surveillance', 'Defaulter Clusters', 'Reports'],
  },
  {
    label: 'Patient',
    email: 'patient@nvoms.local',
    role: 'PATIENT',
    landingLink: 'My Vaccination Card',
    visibleLinks: ['My Vaccination Card', 'QR ID', 'Upcoming Doses', 'Alerts'],
  },
];

test.describe('NVOMS auth and role navigation demo', () => {
  test('walks through login, role-specific navigation, and logout for every seeded role', async ({
    page,
  }) => {
    await silenceExpectedLoginErrors(page);
    await page.goto('/login');
    await silenceExpectedLoginErrors(page);
    await expect(page.getByRole('heading', { name: 'Sign in to NVOMS' })).toBeVisible();
    await pause(page, 1500);

    await reviewLoginFailureCases(page);

    for (const role of seededRoles) {
      await signInAsRole(page, role);
      await reviewRoleWorkspace(page, role);
      await logOut(page);
    }
  });
});

async function reviewLoginFailureCases(page: Page) {
  await clickWithPointer(page, page.getByRole('button', { name: 'Sign In' }));
  await expect(
    page.getByText('Enter both your work email and password to continue.'),
  ).toBeVisible();
  await pause(page, 1600);

  await page.locator('input[name="email"]').pressSequentially('admin@nvoms.local', {
    delay: 45,
  });
  await pause(page, 300);
  await page.locator('input[name="password"]').pressSequentially('wrong-password', {
    delay: 60,
  });
  await pause(page, 600);
  await clickWithPointer(page, page.getByRole('button', { name: 'Sign In' }));
  await expect(page.getByText('The email or password is incorrect.')).toBeVisible();
  await pause(page, 1800);

  await clearLoginForm(page);

  await page.locator('input[name="email"]').pressSequentially('unknown@nvoms.local', {
    delay: 45,
  });
  await pause(page, 300);
  await page.locator('input[name="password"]').pressSequentially('password123', {
    delay: 60,
  });
  await pause(page, 600);
  await clickWithPointer(page, page.getByRole('button', { name: 'Sign In' }));
  await expect(page.getByText('The email or password is incorrect.')).toBeVisible();
  await pause(page, 1800);

  await clearLoginForm(page);
}

async function signInAsRole(page: Page, role: RoleDemo) {
  await expect(page.getByRole('heading', { name: 'Sign in to NVOMS' })).toBeVisible();
  await pause(page, 1000);

  await page.locator('input[name="email"]').pressSequentially(role.email, {
    delay: 45,
  });
  await pause(page, 350);
  await page.locator('input[name="password"]').pressSequentially('password123', {
    delay: 65,
  });
  await pause(page, 600);

  await clickWithPointer(page, page.getByRole('button', { name: 'Sign In' }));

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByText(`You are logged in as ${role.role}.`)).toBeVisible();
  await pause(page, 1600);
}

async function reviewRoleWorkspace(page: Page, role: RoleDemo) {
  for (const linkName of role.visibleLinks) {
    await expect(page.getByRole('link', { name: linkName })).toBeVisible();
  }

  await pause(page, 1200);
  await clickWithPointer(page, page.getByRole('link', { name: role.landingLink }));

  await expect(page.getByRole('heading', { name: role.landingLink })).toBeVisible();
  await pause(page, 1800);
}

async function logOut(page: Page) {
  await clickWithPointer(page, page.getByRole('button', { name: 'Log out' }));
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Sign in to NVOMS' })).toBeVisible();
  await pause(page, 1400);
}

async function clearLoginForm(page: Page) {
  await page.locator('input[name="email"]').fill('');
  await page.locator('input[name="password"]').fill('');
  await pause(page, 700);
}

async function silenceExpectedLoginErrors(page: Page) {
  await page.addInitScript(() => {
    window.console.error = window.console.warn.bind(window.console);
  });
  await page
    .evaluate(() => {
      window.console.error = window.console.warn.bind(window.console);
    })
    .catch(() => undefined);
}

async function clickWithPointer(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();

  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 18,
    });
    await pause(page, 250);
  }

  await locator.click();
}
