import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers';

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('dashboard and mobile navigation fit the viewport', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Welcome back, Demo/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'My Courses', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await nav.getByRole('link', { name: 'My Courses', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your courses, in one place' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('course detail keeps its tabs usable on a phone', async ({ page }) => {
    await page.goto('/dashboard/student/courses');

    const card = page.locator('.catalog-card', { hasText: 'Belajar React dari Nol' }).first();
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: 'View course' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Belajar React dari Nol' })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('tab', { name: 'Materials' }).click();
    await expect(page.getByRole('heading', { name: 'Course materials' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
