import { test, expect } from '@playwright/test';

test.describe('student workspace', () => {
  test('shows dashboard metrics and navigation', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Student workspace')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Welcome back, Demo/i })).toBeVisible();
    await expect(page.locator('.stat-card:not(.skeleton)')).toHaveCount(4);

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'My Courses', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Assignments', exact: true })).toBeVisible();
  });

  test('opens an enrolled course with materials and assignments', async ({ page }) => {
    await page.goto('/dashboard/student/courses');
    await expect(page.getByRole('heading', { name: 'Your courses, in one place' })).toBeVisible();

    const card = page.locator('.catalog-card', { hasText: 'Belajar React dari Nol' }).first();
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: 'View course' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Belajar React dari Nol' })
    ).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(5);
    await expect(page.locator('.sc-progress-bar')).toBeVisible();

    await page.getByRole('tab', { name: 'Materials' }).click();
    await expect(page.getByRole('heading', { name: 'Course materials' })).toBeVisible();
    await expect(page.locator('.sc-materials')).toContainText('Panduan React + Vite');

    await page.getByRole('tab', { name: 'Assignments' }).click();
    await expect(page.getByRole('heading', { name: 'Assignments', exact: true })).toBeVisible();
    await expect(page.locator('.sc-assignments')).toContainText('Tugas 1');
  });

  test('lists assignments from every enrolled course', async ({ page }) => {
    await page.goto('/dashboard');
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Assignments', exact: true })
      .click();

    await expect(page).toHaveURL(/\/dashboard\/student\/assignments$/);
    await expect(page.getByRole('heading', { name: 'My assignments' })).toBeVisible();
    await expect(page.locator('.sa-table')).toContainText('Tugas 1');
    await expect(page.locator('.sa-table')).toContainText('Audit UI Aplikasi');
  });

  test('keeps students out of admin routes', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Student workspace')).toBeVisible();
  });
});
