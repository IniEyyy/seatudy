import { test, expect } from '@playwright/test';

test.describe('theme preference', () => {
  test.use({ colorScheme: 'dark' });

  test('follows the OS until the user chooses, then persists the choice', async ({ page }) => {
    await page.goto('/dashboard');
    const html = page.locator('html');

    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('theme')))
      .toBe('system');
    await expect(page.getByRole('button', { name: /Switch to light theme/ })).toBeVisible();

    // System mode still reacts to OS changes.
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: /Switch to dark theme/ })).toBeVisible();

    // The first click creates an explicit preference.
    await page.getByRole('button', { name: /Switch to dark theme/ }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('theme')))
      .toBe('dark');

    // Explicit choice no longer follows the OS…
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // …and survives a reload.
    await page.reload();
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: /Switch to light theme/ }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('theme')))
      .toBe('light');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});
