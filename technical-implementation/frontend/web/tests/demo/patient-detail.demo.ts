import { expect, type Locator, type Page, test } from '@playwright/test';

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

test.describe('NVOMS patient detail demo', () => {
  test('opens a patient record, reviews identity sections, and hands off to immunization', async ({
    page,
  }) => {
    await page.goto('/login');
    await signIn(page, 'hw@nvoms.local');

    await clickWithPointer(page, page.getByRole('link', { name: 'Patients' }));
    await expect(page.getByRole('heading', { name: /Patient Registry/ })).toBeVisible();
    await pause(page, 1200);

    const firstPatientLink = page.getByRole('link', { name: /^Open patient record / }).first();
    const patientPath = await firstPatientLink.getAttribute('href');
    if (!patientPath) {
      throw new Error('Patient detail link was not available in the registry.');
    }

    await clickWithPointer(page, firstPatientLink);
    await page.waitForURL('**/patients/*', { timeout: 20000 });
    await expect(page.getByRole('link', { name: 'Back to Registry' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Identity and demographics')).toBeVisible();
    await expect(page.getByText('Caregiver, facility, and residence')).toBeVisible();
    await expect(page.getByText('Immunization summary')).toBeVisible();
    await pause(page, 1600);

    await clickWithPointer(page, page.getByRole('button', { name: 'Show QR' }).first());
    await expect(page.getByText('Patient QR')).toBeVisible();
    await pause(page, 1400);
    await clickWithPointer(page, page.getByRole('button', { name: 'Close QR' }));
    await pause(page, 800);

    await clickWithPointer(page, page.getByRole('link', { name: 'Open Immunization Record' }).first());
    await expect(
      page.getByRole('heading', { name: 'Due and overdue vaccination work' }),
    ).toBeVisible();
    await expect(page.getByText('Patient context')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Patient' })).toBeVisible();
    await pause(page, 1600);

    await resetSession(page);
    await page.goto('/login');
    await signIn(page, 'pho@nvoms.local');
    await page.goto(patientPath);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await pause(page, 1600);
  });
});

async function signIn(page: Page, email: string) {
  await expect(page.getByRole('heading', { name: 'Sign in to NVOMS' })).toBeVisible();
  await pause(page, 1000);

  await page.locator('input[name="email"]').pressSequentially(email, {
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
  await pause(page, 1000);
}

async function resetSession(page: Page) {
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
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
