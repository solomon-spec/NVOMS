import { expect, type Locator, type Page, test } from '@playwright/test';

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

test.describe('NVOMS patient registration demo', () => {
  test('walks through validation, duplicate-review placeholder, and successful patient creation', async ({
    page,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const patientFirstName = `Demo${suffix}`;
    const caregiverPhone = `+251922${suffix}`;

    await page.goto('/login');
    await signInAsHealthWorker(page);

    await clickWithPointer(page, page.getByRole('link', { name: 'Patients' }));
    await expect(page.getByRole('heading', { name: /Patient Registry/ })).toBeVisible();
    await pause(page, 1000);

    await clickWithPointer(page, page.getByRole('link', { name: 'Register Patient' }));
    await page.waitForURL('**/patients/new', { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Register Patient' })).toBeVisible({
      timeout: 20000,
    });
    await pause(page, 1400);

    await clickWithPointer(page, page.getByRole('button', { name: 'Continue' }));
    await expect(page.getByText('Enter the patient first name.')).toBeVisible();
    await pause(page, 1500);

    await page.locator('#first_name').pressSequentially(patientFirstName, { delay: 55 });
    await page.locator('#middle_name').pressSequentially('Clinical', { delay: 45 });
    await page.locator('#last_name').pressSequentially('Registration', { delay: 55 });
    await page.locator('#date_of_birth').fill('2024-02-12');
    await page.locator('#sex').selectOption('female');
    await pause(page, 1000);
    await clickWithPointer(page, page.getByRole('button', { name: 'Continue' }));

    await expect(page.getByRole('heading', { name: 'Caregiver and facility' })).toBeVisible();
    await pause(page, 1000);
    await page.locator('#caregiver_name').pressSequentially('Demo Caregiver', {
      delay: 50,
    });
    await page.locator('#caregiver_phone').pressSequentially(caregiverPhone, {
      delay: 50,
    });
    await page.locator('#relationship').selectOption('mother');
    await page.locator('#preferred_language').selectOption('am');
    await selectFirstAvailableOption(page, '#registered_facility_id');
    await pause(page, 500);
    await selectFirstAvailableOption(page, '#residence_unit_id');
    await page.locator('#address_line').pressSequentially('Demo household cluster', {
      delay: 45,
    });
    await pause(page, 1100);
    await clickWithPointer(page, page.getByRole('button', { name: 'Continue' }));

    await expect(page.getByRole('heading', { name: 'Duplicate check' })).toBeVisible();
    await expect(page.getByText('Backend duplicate matching is not connected yet.')).toBeVisible();
    await pause(page, 1800);
    await clickWithPointer(page, page.getByRole('button', { name: 'Continue' }));

    await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible();
    await expect(page.getByText(patientFirstName)).toBeVisible();
    await pause(page, 1800);
    await clickWithPointer(page, page.getByRole('button', { name: 'Submit Registration' }));

    await expect(page.getByRole('heading', { name: 'Patient registered' })).toBeVisible();
    await expect(page.getByText(/Generated UID/)).toBeVisible();
    await pause(page, 2200);

    await clickWithPointer(page, page.getByRole('link', { name: 'Back to registry' }).last());
    await expect(page.getByRole('heading', { name: /Patient Registry/ })).toBeVisible();
    await pause(page, 1200);
  });
});

async function signInAsHealthWorker(page: Page) {
  await expect(page.getByRole('heading', { name: 'Sign in to NVOMS' })).toBeVisible();
  await pause(page, 1000);

  await page.locator('input[name="email"]').pressSequentially('hw@nvoms.local', {
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

async function selectFirstAvailableOption(page: Page, selector: string) {
  const value = await page.locator(selector).evaluate((select) => {
    const options = Array.from((select as HTMLSelectElement).options);
    return options.find((option) => option.value)?.value ?? '';
  });

  if (!value) {
    throw new Error(`No selectable option found for ${selector}`);
  }

  await page.locator(selector).selectOption(value);
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
