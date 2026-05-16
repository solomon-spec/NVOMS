import { expect, type Locator, type Page, test } from '@playwright/test';

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

test.describe('NVOMS immunization flow demo', () => {
  test('records a dose, showing safety checks and success flow', async ({ page }) => {
    // 1. Log in as Health Worker
    await page.goto('/login');
    await signInAsHealthWorker(page);

    // 2. Open Immunizations Workspace
    await clickWithPointer(page, page.getByRole('link', { name: 'Immunizations' }));
    await expect(page.getByRole('heading', { name: 'Record doses and manage vaccination schedules' })).toBeVisible();
    await pause(page, 1500);

    // 3. Search and select a patient
    const searchInput = page.getByPlaceholder('Search patient UID, name, caregiver phone');
    await searchInput.pressSequentially('Amanuel', { delay: 60 });
    await pause(page, 1500);
    
    // Select the first patient in the list
    const patientButton = page.locator('button').filter({ hasText: 'Amanuel' }).first();
    await expect(patientButton).toBeVisible({ timeout: 10000 });
    await clickWithPointer(page, patientButton);
    await pause(page, 1200);

    // 4. Safety case: Try to submit without selecting a vaccine
    // Clear the prefilled vaccine if any
    const vaccineSelect = page.getByLabel('Vaccine', { exact: true });
    await vaccineSelect.selectOption('');
    await pause(page, 500);

    const recordDoseBtn = page.getByRole('button', { name: 'Record dose' });
    await clickWithPointer(page, recordDoseBtn);
    await expect(page.getByText('Select a vaccine before recording the dose.')).toBeVisible();
    await pause(page, 1500);

    // 5. Walk through recording a dose
    // Select the first due schedule slot
    const slotButton = page.locator('button').filter({ hasText: /Due/i }).first();
    
    // If no slot is visible, try regenerating the schedule
    try {
      await expect(slotButton).toBeVisible({ timeout: 5000 });
    } catch {
      const regenBtn = page.getByRole('button', { name: /Regenerate schedule/i });
      await clickWithPointer(page, regenBtn);
      await expect(slotButton).toBeVisible({ timeout: 10000 });
    }
    
    await clickWithPointer(page, slotButton);
    await pause(page, 1000);

    // 6. Fix safety issue and enter valid data
    await vaccineSelect.selectOption({ index: 1 });
    await pause(page, 1000);

    const batchSelect = page.getByLabel('Vaccine batch');
    await batchSelect.selectOption({ index: 1 }); // Select the first available batch
    await pause(page, 1000);
    
    const routeInput = page.getByLabel('Route');
    await routeInput.pressSequentially('IM', { delay: 40 });
    await pause(page, 500);

    const siteInput = page.getByLabel('Site');
    await siteInput.pressSequentially('Left Deltoid', { delay: 40 });
    await pause(page, 800);

    // Select facility
    const facilitySelect = page.getByLabel('Facility');
    await facilitySelect.selectOption({ index: 1 });
    await pause(page, 1000);

    // 7. Click Record dose and show confirmation modal
    await clickWithPointer(page, recordDoseBtn);
    await pause(page, 1500);

    // Confirm modal should be visible
    await expect(page.getByRole('heading', { name: 'Confirm Dose Recording' })).toBeVisible();
    await pause(page, 2500); // Wait long enough for viewer to read the structured data

    // 8. Confirm and observe success
    const confirmBtn = page.getByRole('button', { name: 'Confirm and Record' });
    await clickWithPointer(page, confirmBtn);
    await pause(page, 1500);

    // Verify success notice appears
    await expect(page.getByText('Dose recorded.')).toBeVisible();
    await pause(page, 2000);
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
