import { expect, type Locator, type Page, test } from '@playwright/test';

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

test.describe('NVOMS patient detail demo', () => {
  test('opens a patient workspace, reviews clinical sections, and shows role protection', async ({
    page,
  }) => {
    await page.goto('/login');
    await signIn(page, 'hw@nvoms.local');

    await clickWithPointer(page, page.getByRole('link', { name: 'Patients' }));
    await expect(page.getByRole('heading', { name: /Patient Registry/ })).toBeVisible();
    await pause(page, 1200);

    const firstPatientLink = page.getByRole('link', { name: /^View patient / }).first();
    const patientPath = await firstPatientLink.getAttribute('href');
    if (!patientPath) {
      throw new Error('Patient detail link was not available in the registry.');
    }

    await clickWithPointer(page, firstPatientLink);
    await page.waitForURL('**/patients/*', { timeout: 20000 });
    await expect(page.getByRole('link', { name: 'Back to Patient Registry' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByText('Clinical next step')).toBeVisible();
    await pause(page, 1600);

    await clickWithPointer(page, page.getByRole('button', { name: 'Schedule' }));
    await expect(page.getByRole('heading', { name: 'Vaccination schedule' })).toBeVisible();
    await pause(page, 1800);

    await clickWithPointer(page, page.getByRole('button', { name: 'Dose history' }));
    await expect(
      page.getByRole('heading', { name: /No administered doses yet|Dose history/ }),
    ).toBeVisible();
    await pause(page, 1600);

    await clickWithPointer(page, page.getByRole('button', { name: 'Caregiver' }));
    await expect(page.getByText(/Reminder readiness|No caregiver linked/)).toBeVisible();
    await pause(page, 1800);

    await clickWithPointer(page, page.getByRole('link', { name: 'Record dose' }));
    await expect(
      page.getByRole('heading', { name: 'Record doses and manage vaccination schedules' }),
    ).toBeVisible();
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
