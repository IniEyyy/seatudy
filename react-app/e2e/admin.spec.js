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

  test('sends admins from the old catalogue link to the course manager', async ({ page }) => {
    await page.goto('/dashboard/courses');
    await expect(page).toHaveURL(/\/dashboard\/admin\/courses$/);
    await expect(page.getByRole('heading', { name: 'Course manager' })).toBeVisible();
  });

  test('lists and filters courses in the course manager', async ({ page }) => {
    await page.goto('/dashboard/admin/courses');

    await expect(page.getByRole('heading', { name: 'Course manager' })).toBeVisible();
    await expect(page.locator('.manager-summary')).toContainText('Courses');
    await expect(page.getByRole('button', { name: /New course/ })).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search courses' });
    await search.fill('Belajar React dari Nol');
    await expect(page.locator('.manager-table')).toContainText('Belajar React dari Nol');
    await expect(page.locator('.manager-table')).toContainText('Demo Instructor');
    await expect(page.locator('.manager-table')).not.toContainText('Database PostgreSQL dari Dasar');
  });

  test('creates, edits, and deletes a course from the manager', async ({ page }) => {
    const title = `E2E course ${Date.now()}`;
    const editedTitle = `${title} edited`;

    await page.goto('/dashboard/admin/courses');
    await page.getByRole('button', { name: /New course/ }).click();

    const form = page.getByRole('dialog');
    await expect(form.getByRole('heading', { name: 'Create course' })).toBeVisible();
    await form.getByLabel('Instructor').selectOption({ label: 'Demo Instructor (instructor@seatudy.local)' });
    await form.getByLabel('Title').fill(title);
    await form.getByLabel('Description').fill('Created by the admin course manager E2E test.');
    await form.getByLabel('Category').fill('Testing');
    await form.getByLabel('Price (USD)').fill('25');
    await form.getByRole('button', { name: 'Create course' }).click();
    await expect(page.locator('.toast-message').filter({ hasText: 'Course created.' })).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search courses' });
    await search.fill(title);
    const createdRow = page.locator('.manager-table tbody tr').filter({ hasText: title });
    await expect(createdRow).toHaveCount(1);

    await createdRow.getByRole('button', { name: 'Edit' }).click();
    await expect(form.getByRole('heading', { name: 'Edit course' })).toBeVisible();
    await expect(form.getByLabel('Title')).toHaveValue(title);
    await form.getByLabel('Title').fill(editedTitle);
    await form.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.locator('.toast-message').filter({ hasText: 'Course updated.' })).toBeVisible();

    await search.fill(editedTitle);
    const editedRow = page.locator('.manager-table tbody tr').filter({ hasText: editedTitle });
    await expect(editedRow).toHaveCount(1);
    await editedRow.getByRole('button', { name: 'Delete' }).click();

    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog.getByRole('heading', { name: 'Delete this course?' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Delete course' }).click();
    await expect(page.locator('.toast-message').filter({ hasText: 'Course deleted.' })).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No courses match this view.');
  });

  test('keeps admins out of instructor-only routes', async ({ page }) => {
    await page.goto('/dashboard/instructor/courses');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Admin workspace')).toBeVisible();
  });
});
