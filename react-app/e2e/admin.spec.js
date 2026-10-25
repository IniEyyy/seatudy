import { test, expect } from '@playwright/test';

test.describe('admin workspace', () => {
  test('lists and searches accounts', async ({ page }) => {
    await page.goto('/dashboard/admin');

    await expect(page.getByRole('heading', { name: 'Manage accounts' })).toBeVisible();
    await expect(page.locator('.admin-count')).toContainText(/\d+ accounts/);
    await expect(page.locator('.admin-table')).toContainText('Demo Student');

    const search = page.getByRole('searchbox', { name: 'Search users' });
    await search.fill('student@seatudy.local');
    await expect(page.locator('.admin-table')).toContainText('student@seatudy.local');
    await expect(page.locator('.admin-table')).not.toContainText('instructor@seatudy.local');
  });

  test('keeps admins out of instructor-only routes', async ({ page }) => {
    await page.goto('/dashboard/instructor/courses');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Admin workspace')).toBeVisible();
  });
});
