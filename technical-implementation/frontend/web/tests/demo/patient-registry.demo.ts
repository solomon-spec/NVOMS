import { expect, type Locator, type Page, test } from '@playwright/test';

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

test.describe('NVOMS patient registry demo', () => {
  test('shows a high-volume registry with search, filters, empty state, and pagination controls', async ({
    page,
  }) => {
    await page.goto('/login');
    await signInAsHealthWorker(page);

    await clickWithPointer(page, page.getByRole('link', { name: 'Patients' }));
    await expect(page.getByRole('heading', { name: 'Patient Registry' })).toBeVisible();
    await expect(page.getByText(/Showing 1-25 of \d+ patients/)).toBeVisible();
    await pause(page, 1400);

    await page.locator('#page-size').selectOption('100');
    await expect(page.getByText(/Showing 1-100 of \d+ patients/)).toBeVisible();
    await pause(page, 1200);

    const tableScroll = page.getByTestId('patient-registry-table-scroll');
    await tableScroll.evaluate((node) => {
      node.scrollTop = node.scrollHeight / 2;
    });
    await pause(page, 1600);
    await tableScroll.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await pause(page, 1600);
    await tableScroll.evaluate((node) => {
      node.scrollTop = 0;
    });
    await pause(page, 900);

    await page.locator('#patient-search').pressSequentially('Amanuel', { delay: 55 });
    await expect(page.getByText(/Showing 1-\d+ of \d+ patients/)).toBeVisible();
    await pause(page, 1600);

    await page.locator('#patient-status').selectOption('verifying');
    await pause(page, 1400);

    await page.locator('#patient-search').fill('');
    await page.locator('#patient-status').selectOption('all');
    await page.locator('#patient-search').pressSequentially('no-demo-patient-match', {
      delay: 45,
    });
    await expect(page.getByRole('heading', { name: 'No patients found' })).toBeVisible();
    await pause(page, 1700);

    await clickWithPointer(page, page.getByRole('button', { name: 'Reset' }));
    await expect(page.getByText(/Showing 1-100 of \d+ patients/)).toBeVisible();
    await pause(page, 1400);

    await clickWithPointer(page, page.getByRole('button', { name: 'Next', exact: true }));
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
    await pause(page, 1600);

    await clickWithPointer(page, page.getByRole('button', { name: 'Previous', exact: true }));
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();
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
