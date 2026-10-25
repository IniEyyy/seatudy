import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers';

async function openFirstGradingPage(page) {
  await page.goto('/dashboard/instructor/submissions');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Student submissions' })
  ).toBeVisible();

  // "Tugas 1" has seeded submissions, so the analytics and bulk actions are
  // always populated regardless of the overview ordering.
  const assignmentRow = page
    .locator('.submissions-table tbody tr', { hasText: 'Tugas 1' })
    .first();
  await expect(assignmentRow).toBeVisible();
  await assignmentRow.getByRole('link', { name: /Review/i }).click();

  await expect(page).toHaveURL(
    /\/dashboard\/instructor\/assignments\/\d+\/submissions$/
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Tugas 1' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Submission progress' })
  ).toBeVisible();
}

test.describe('instructor grading', () => {
  test('shows submission progress and breakdown charts', async ({ page }) => {
    await openFirstGradingPage(page);

    await expect(page.locator('.isub-header .eyebrow')).toHaveText('Grading');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Submission breakdown' })
    ).toBeVisible();
    await expect(page.locator('.isub-progress')).toHaveAttribute('role', 'img');
    await expect(page.locator('.isub-progress-part').first()).toBeVisible();

    const progressLegend = page.locator('.isub-legend').first();
    await expect(progressLegend.getByText('On time')).toBeVisible();
    await expect(progressLegend.getByText('Late')).toBeVisible();
    await expect(progressLegend.getByText('Not submitted')).toBeVisible();

    const donut = page.getByRole('img', { name: /Submission breakdown:/ });
    await expect(donut).toBeVisible();
    await expect(donut.locator('canvas')).toBeVisible();
    await expect(page.locator('.isub-donut-center')).toContainText('learners');
    await expect(page.locator('.isub-chart-note')).toBeVisible();
  });

  test('supports selecting submissions for bulk grading', async ({ page }) => {
    await openFirstGradingPage(page);

    const selectAll = page.getByRole('checkbox', { name: 'Select all submitted students' });
    await expect(selectAll).toBeEnabled();
    await selectAll.check();

    const bulkBar = page.locator('.isub-bulk');
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText('selected');

    await selectAll.uncheck();
  });

  test('keeps grading analytics inside a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFirstGradingPage(page);
    await expect(page.locator('.isub-donut-wrap canvas')).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
