import { expect, test } from '@playwright/test';

import { clickWithPointer, loginAs, pause } from "./helpers";

test.describe('NVOMS Disease Surveillance Flow demo', () => {
  test('displays surveillance queue, creates a report, and adds a follow-up', async ({ page }) => {
    // 1. Log in as Health Worker
    await loginAs(page, "HEALTH_WORKER");

    // 2. Open Surveillance Workspace
    await clickWithPointer(page, page.getByRole('link', { name: 'Surveillance' }));
    await expect(page.getByRole('heading', { name: 'Monitor cases, follow-up actions, and outbreak alerts' })).toBeVisible();
    await pause(page, 1500);

    // 3. Verify queue and alerts sections are visible
    await expect(page.getByRole('heading', { name: 'Triage queue', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Outbreak alerts', exact: true })).toBeVisible();
    await pause(page, 1000);

    // 4. Create New Surveillance Report
    await clickWithPointer(page, page.getByRole('link', { name: 'New report' }));
    await expect(page.getByRole('heading', { name: 'Create surveillance report' })).toBeVisible();
    await pause(page, 1500);

    // Select Patient
    const patientSelect = page.getByLabel('Patient');
    await patientSelect.selectOption({ index: 1 });
    await pause(page, 800);

    // Select Category
    const categorySelect = page.getByLabel('Category');
    await categorySelect.selectOption({ label: 'AEFI' });
    await pause(page, 800);

    // Fill Condition Type
    const conditionInput = page.getByLabel('Condition type');
    await conditionInput.pressSequentially('Severe allergic reaction', { delay: 40 });
    await pause(page, 800);

    // Fill Onset Date
    const onsetInput = page.getByLabel('Onset date');
    await onsetInput.fill('2024-10-15');
    await pause(page, 800);

    // Fill Severity
    const severitySelect = page.getByLabel('Severity');
    await severitySelect.selectOption({ label: 'Critical' });
    await pause(page, 800);

    // Fill Symptoms
    const symptomsInput = page.getByLabel('Symptoms');
    await symptomsInput.pressSequentially('Rash, Breathing Difficulty', { delay: 40 });
    await pause(page, 1000);

    // Submit form
    const submitBtn = page.getByRole('button', { name: 'Submit surveillance report' });
    await clickWithPointer(page, submitBtn);
    await pause(page, 2000);

    // 5. Verify Detail Workspace and add follow-up
    await expect(page).toHaveURL(/\/surveillance\/.+/);
    await expect(page.getByRole('heading', { name: 'Severe allergic reaction' })).toBeVisible();
    await pause(page, 1500);

    // Update status
    const statusSelect = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Update status' }) })
      .locator('select')
      .first();
    await statusSelect.selectOption({ label: 'Under follow-up' });
    await pause(page, 500);
    
    await clickWithPointer(page, page.getByRole('button', { name: 'Update status' }));
    await expect(page.getByText('Surveillance status updated')).toBeVisible();
    await pause(page, 1500);

    // Add a follow-up action
    const followUpInput = page.getByLabel('New follow-up action');
    await followUpInput.pressSequentially('Administered Epinephrine, monitoring patient.', { delay: 40 });
    await pause(page, 800);
    
    await clickWithPointer(page, page.getByRole('button', { name: 'Save follow-up' }));
    
    // Verify action was added
    await expect(page.getByText('Follow-up action recorded')).toBeVisible();
    await expect(page.getByText('Administered Epinephrine, monitoring patient.')).toBeVisible();
    await pause(page, 2000);
  });
});
