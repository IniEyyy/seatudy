import { test, expect } from '@playwright/test';

test.describe('authentication', () => {
  test('redirects anonymous visitors to the sign-in page', async ({ page }) => {
    await page.goto('/dashboard/student/courses');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in to Seatudy' })).toBeVisible();
    await expect(page).toHaveTitle('Sign in | Seatudy');
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('student@seatudy.local');
    await page.getByLabel('Password', { exact: true }).fill('NotThePassword1');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.locator('.auth-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('token')))
      .toBeFalsy();
  });

  test('signs a student in and reaches the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Student', exact: true }).click();
    await expect(page.getByLabel('Email address')).toHaveValue('student@seatudy.local');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Welcome back, Demo/i })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => Boolean(localStorage.getItem('token'))))
      .toBe(true);
  });
});
